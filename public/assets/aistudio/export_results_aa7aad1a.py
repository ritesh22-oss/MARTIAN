"""导出标准深度学习课程产出物（5 个文件）。

用法：
    python export_results.py --checkpoint outputs/E2_coral.pt --split mer_test

产出（全部在 outputs/ 下）：
    best_model.pth        最优权重（checkpoint 的副本）
    loss.csv              每轮 train_loss + val_mIoU，可导入 Excel 画 Loss 曲线
    metrics.csv           每类 IoU / Dice / Precision / Recall + 汇总指标
    prediction.png        单张测试图四联可视化：原图|真实|预测|叠加
    confusion_matrix.png  混淆矩阵热力图（行=真实类，列=预测类）

注：环境无 matplotlib，热力图用 PIL 手绘，无需额外安装依赖。
"""

from __future__ import annotations

import argparse
import csv
import shutil
from pathlib import Path

import numpy as np
import torch
from PIL import Image, ImageDraw, ImageFont
from torch.utils.data import DataLoader

from config import get_config
from data import CLASS_NAMES, SegmentationDataset, load_image, load_label, load_splits
from metrics import confusion_matrix
from utils import dataloader_kwargs, load_checkpoint, setup_device

# 类别颜色：soil=红 bedrock=绿 sand=蓝 big_rock=黄 ignore=黑
PALETTE = np.array([
    [255, 0, 0],     # 0: soil
    [0, 255, 0],     # 1: bedrock
    [0, 0, 255],     # 2: sand
    [255, 255, 0],   # 3: big_rock
    [0, 0, 0],       # 255: ignore
], dtype=np.uint8)

def _font(size: int):
    """加载字体；Windows 优先用 arial，失败则退回 PIL 默认字体。"""
    try:
        return ImageFont.truetype("arial.ttf", size)
    except Exception:
        return ImageFont.load_default()

def label_to_color(label: np.ndarray) -> np.ndarray:
    """类别编号图 (H,W) → RGB 彩色图 (H,W,3)。"""
    h, w = label.shape
    color = np.zeros((h, w, 3), dtype=np.uint8)
    for idx in range(4):
        color[label == idx] = PALETTE[idx]
    color[label == 255] = PALETTE[4]
    return color

def export_best_model(ckpt_path: str, out_dir: Path) -> None:
    """直接复制 checkpoint 为 best_model.pth（.pt/.pth 对 torch.load 等价）。"""
    dst = out_dir / "best_model.pth"
    shutil.copyfile(ckpt_path, dst)
    print("  best_model.pth  <-", ckpt_path)

def export_loss_csv(ckpt_path: str, out_dir: Path) -> None:
    """从 checkpoint 的 history 读取每轮指标，写成 loss.csv。

    旧版代码只记录了 val_miou，未记录 train_loss；此时 train_loss 列留空，
    E1 可手工填入终端输出（0.8582 / 0.5722 / 0.4672），或重跑一次训练。
    """
    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    hist = ckpt.get("history", {})
    val_miou = hist.get("val_miou", [])
    train_loss = hist.get("train_loss", [])

    path = out_dir / "loss.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["epoch", "train_loss", "val_mIoU"])
        for i, vm in enumerate(val_miou):
            tl = train_loss[i] if i < len(train_loss) else ""
            writer.writerow([i + 1, tl, round(vm, 4)])
    print(f"  loss.csv  ({len(val_miou)} epochs)")
    if not train_loss:
        print("  [提示] 旧 checkpoint 未记录 train_loss，可重跑训练或手工补入")


def export_loss_curve_png(ckpt_path: str, out_dir: Path, manual_losses: str | None = None) -> None:
    """画 Loss / mIoU 双轴训练曲线 → loss_curve.png（需要 matplotlib）。

    train_loss 数据来源优先级：命令行 --losses > checkpoint 里的 history。
    两者都没有时只画 val_mIoU 曲线。
    """
    import matplotlib
    matplotlib.use("Agg")  # 无窗口环境直接出图，不弹窗
    import matplotlib.pyplot as plt

    ckpt = torch.load(ckpt_path, map_location="cpu", weights_only=False)
    hist = ckpt.get("history", {})
    val_miou = hist.get("val_miou", [])
    train_loss = hist.get("train_loss", [])
    if manual_losses:
        train_loss = [float(x) for x in manual_losses.split(",")]

    if not val_miou and not train_loss:
        print("  [跳过] checkpoint 里没有可画的训练记录")
        return

    fig, ax1 = plt.subplots(figsize=(7, 5))
    epochs = list(range(1, max(len(val_miou), len(train_loss)) + 1))
    if train_loss:
        ax1.plot(epochs[: len(train_loss)], train_loss, "o-", color="tab:red", label="train_loss")
    ax1.set_xlabel("epoch")
    ax1.set_ylabel("train_loss", color="tab:red")
    ax1.tick_params(axis="y", labelcolor="tab:red")

    if val_miou:
        ax2 = ax1.twinx()
        ax2.plot(epochs[: len(val_miou)], val_miou, "s-", color="tab:blue", label="val_mIoU")
        ax2.set_ylabel("val_mIoU", color="tab:blue")
        ax2.tick_params(axis="y", labelcolor="tab:blue")

    fig.suptitle("Training Curve")
    fig.tight_layout()
    fig.savefig(out_dir / "loss_curve.png", dpi=150)
    plt.close(fig)
    print("  loss_curve.png")


def compute_cm(model, samples, cfg, device) -> torch.Tensor:
    """在指定 split 上累计混淆矩阵，返回 (num_classes, num_classes) 的 CPU 张量。

    行=真实类，列=预测类；ignore 像素不参与统计。
    """
    ds = SegmentationDataset(samples, cfg["image_size"], cfg["ignore_index"])
    loader = DataLoader(ds, shuffle=False, **dataloader_kwargs(cfg))
    cm = torch.zeros(cfg["num_classes"], cfg["num_classes"], device=device)
    with torch.no_grad():
        for images, labels in loader:
            images = images.to(device)
            labels = labels.to(device)
            logits = model(images)
            cm += confusion_matrix(logits.argmax(1), labels, cfg["num_classes"], cfg["ignore_index"])
    return cm.cpu()

def export_metrics_csv(cm: torch.Tensor, out_dir: Path) -> None:
    """由混淆矩阵计算每类 IoU/Dice/Precision/Recall，写入 metrics.csv。

    Dice = 2TP / (2TP + FP + FN)，与 IoU 的关系：Dice = 2·IoU / (1 + IoU)。
    """
    tp = torch.diag(cm)
    fp = cm.sum(0) - tp   # 列和减对角：被预测成该类但真实不是
    fn = cm.sum(1) - tp   # 行和减对角：真实是该类但被预测错
    iou = (tp / (tp + fp + fn).clamp(min=1.0))
    dice = (2 * tp / (2 * tp + fp + fn).clamp(min=1.0))
    precision = (tp / (tp + fp).clamp(min=1.0))
    recall = (tp / (tp + fn).clamp(min=1.0))

    path = out_dir / "metrics.csv"
    with open(path, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["class", "IoU", "Dice", "Precision", "Recall"])
        for i, name in enumerate(CLASS_NAMES):
            writer.writerow([name] + [round(v.item(), 4) for v in (iou[i], dice[i], precision[i], recall[i])])
        writer.writerow(["mIoU", round(iou.mean().item(), 4), round(dice.mean().item(), 4), "", ""])
    print("  metrics.csv  (per-class IoU/Dice/Precision/Recall)")

def export_cm_png(cm: torch.Tensor, out_dir: Path) -> None:
    """用 PIL 手绘混淆矩阵热力图：行归一化后颜色深浅表示比例，格内写数量和百分比。"""
    n = cm.shape[0]
    cm_np = cm.numpy()
    row_sum = cm_np.sum(axis=1, keepdims=True)
    cm_norm = cm_np / np.clip(row_sum, 1, None)   # 行归一化 = 各类的召回分布

    cell, margin_l, margin_t, margin_b, title_h = 150, 170, 70, 80, 60
    W = margin_l + cell * n + 40
    H = margin_t + cell * n + margin_b
    img = Image.new("RGB", (W, H), "white")
    draw = ImageDraw.Draw(img)
    f_title, f_label, f_cell = _font(30), _font(24), _font(22)

    draw.text((W // 2 - 180, 15), "Confusion Matrix (row-normalized)", fill="black", font=f_title)

    for i in range(n):
        for j in range(n):
            x0, y0 = margin_l + j * cell, margin_t + i * cell
            v = cm_norm[i, j]
            # 白→蓝渐变：v=0 白色（无样本），v=1 深蓝（全部命中）
            color = (int(255 - 200 * v), int(255 - 200 * v), 255)
            draw.rectangle([x0, y0, x0 + cell, y0 + cell], fill=color, outline="black", width=2)
            cnt, pct = int(cm_np[i, j]), v * 100
            text = f"{cnt}\n{pct:.1f}%"
            tb = draw.textbbox((0, 0), text, font=f_cell)
            tw, th = tb[2] - tb[0], tb[3] - tb[1]
            # 深色格子上用白字，浅色格子用黑字
            tcolor = "white" if v > 0.5 else "black"
            draw.text((x0 + (cell - tw) / 2, y0 + (cell - th) / 2), text, fill=tcolor, font=f_cell)

        # 左侧行标签（真实类）+ 底部列标签（预测类）
        y_mid = margin_t + i * cell + cell // 2
        draw.text((20, y_mid - 14), CLASS_NAMES[i], fill="black", font=f_label)
        x_mid = margin_l + i * cell + cell // 2 - 40
        draw.text((x_mid, margin_t + cell * n + 20), CLASS_NAMES[i], fill="black", font=f_label)

    draw.text((10, margin_t - 45), "True \\ Predicted", fill="black", font=f_label)
    img.save(out_dir / "confusion_matrix.png")
    print("  confusion_matrix.png")

def export_prediction_png(model, sample: dict, cfg, device, out_dir: Path) -> None:
    """单张图四联可视化：原图 | 真实标签 | 模型预测 | 半透明叠加。"""
    size = cfg["image_size"]
    raw = Image.open(sample["image"]).convert("RGB").resize((size, size), Image.BILINEAR)
    raw_np = np.array(raw)

    gt = load_label(sample["label"], size, sample["image"], cfg["ignore_index"]).numpy()
    gt_color = label_to_color(gt)

    img_t = load_image(sample["image"], size).unsqueeze(0).to(device)
    with torch.no_grad():
        pred = model(img_t).argmax(dim=1).squeeze(0).cpu().numpy()
    pred_color = label_to_color(pred)

    overlay = (raw_np.astype(float) * 0.45 + pred_color.astype(float) * 0.55).astype(np.uint8)

    gap, titles = 6, ["Input", "Ground Truth", "Prediction", "Overlay"]
    panels = [raw_np, gt_color, pred_color, overlay]
    W = size * 4 + gap * 3
    H = size + 50
    canvas = np.ones((H, W, 3), dtype=np.uint8) * 255
    for k, p in enumerate(panels):
        x = k * (size + gap)
        canvas[50:H, x:x + size, :] = p

    img = Image.fromarray(canvas)
    draw = ImageDraw.Draw(img)
    f_t = _font(28)
    for k, t in enumerate(titles):
        x = k * (size + gap) + size // 2 - len(t) * 8
        draw.text((max(x, 4), 8), t, fill="black", font=f_t)

    img.save(out_dir / "prediction.png")
    print("  prediction.png  (", Path(sample["image"]).name, ")")

def main():
    p = argparse.ArgumentParser(description="导出课程项目标准产出物")
    p.add_argument("--checkpoint", default="outputs/E2_coral.pt")
    p.add_argument("--split", default="mer_test")
    p.add_argument("--index", type=int, default=0, help="prediction.png 取第几张测试图")
    p.add_argument("--preset", default="budget", choices=["budget", "followup", "adda"])
    p.add_argument("--data-root", default=None)
    p.add_argument("--output-dir", default="outputs")
    p.add_argument("--losses", default=None,
                   help="手工提供每轮 train_loss，逗号分隔，如 0.8582,0.5722,0.4672")
    args = p.parse_args()

    cfg = get_config(args.preset, data_root=args.data_root, output_dir=args.output_dir)
    device = setup_device(cfg)
    out_dir = Path(cfg["output_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f"加载模型: {args.checkpoint}")
    model = load_checkpoint(args.checkpoint, cfg["num_classes"], device)
    model.eval()

    print("导出产出物:")
    export_best_model(args.checkpoint, out_dir)
    export_loss_csv(args.checkpoint, out_dir)
    export_loss_curve_png(args.checkpoint, out_dir, args.losses)

    # splits.json 固定在 outputs/ 里；--output-dir 只控制产出物写到哪里
    splits_dir = cfg["output_dir"]
    if not (Path(splits_dir) / "splits.json").exists():
        splits_dir = "outputs"
    splits = load_splits(splits_dir)
    samples = splits.get(args.split, [])
    if not samples:
        print(f"split '{args.split}' 为空，跳过评估类产出物")
        return

    print(f"在 {args.split}（{len(samples)} 张图）上评估...")
    cm = compute_cm(model, samples, cfg, device)
    export_metrics_csv(cm, out_dir)
    export_cm_png(cm, out_dir)
    export_prediction_png(model, samples[min(args.index, len(samples) - 1)], cfg, device, out_dir)

    print("\n全部完成！产出在", out_dir)

if __name__ == "__main__":
    main()