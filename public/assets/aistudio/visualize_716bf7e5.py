"""可视化预测结果：把原图、真实标签、模型预测拼成三联图保存为 PNG。

用法：
    python visualize.py --checkpoint outputs/E2_coral.pt --split mer_test --num 5
    python visualize.py --checkpoint outputs/E1_lite.pt --split msl_test --num 3

输出：
    outputs/vis_0.png, outputs/vis_1.png, ...
每张图从左到右是：原图 | 真实标签 | 模型预测
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
import torch
from PIL import Image

from config import get_config
from data import CLASS_NAMES, load_image, load_label, load_splits
from utils import load_checkpoint, setup_device

# ── 颜色方案：每个类别对应的 RGB 颜色 ──────────────────────────────
# soil=红, bedrock=绿, sand=蓝, big_rock=黄, ignore=黑
PALETTE = np.array([
    [255, 0, 0],      # 0: soil   土壤
    [0, 255, 0],      # 1: bedrock 基岩
    [0, 0, 255],      # 2: sand   沙地
    [255, 255, 0],    # 3: big_rock 大石块
    [0, 0, 0],        # 255: ignore 忽略区域
], dtype=np.uint8)


def label_to_color(label: np.ndarray) -> np.ndarray:
    """把类别编号数组（0~3, 255）转成 RGB 彩色图，用于可视化。"""
    h, w = label.shape
    color = np.zeros((h, w, 3), dtype=np.uint8)
    for idx, rgb in enumerate(PALETTE):
        if idx < 4:
            color[label == idx] = rgb
        else:
            pass  # idx=4 对应 PALETTE[4]=黑色，但下面单独处理 ignore
    color[label == 255] = PALETTE[4]  # ignore 区域涂黑
    return color


def main():
    parser = argparse.ArgumentParser(description="可视化火星地形分割预测结果")
    parser.add_argument("--checkpoint", required=True, help="模型 checkpoint 路径")
    parser.add_argument("--split", default="mer_test", help="要可视化的 split 名称")
    parser.add_argument("--num", type=int, default=5, help="可视化多少张图")
    parser.add_argument("--preset", default="budget", choices=["budget", "followup", "adda"])
    parser.add_argument("--data-root", default=None)
    parser.add_argument("--output-dir", default="outputs")
    args = parser.parse_args()

    # ── 加载配置、模型、数据划分 ────────────────────────────────────
    cfg = get_config(args.preset, data_root=args.data_root, output_dir=args.output_dir)
    device = setup_device(cfg)
    splits = load_splits(cfg["output_dir"])
    model = load_checkpoint(args.checkpoint, cfg["num_classes"], device)
    model.eval()

    samples = splits.get(args.split, [])
    if not samples:
        print(f"split '{args.split}' 为空或不存在")
        return

    n = min(args.num, len(samples))
    print(f"正在生成 {n} 张可视化图（split: {args.split}）...")

    out_dir = Path(cfg["output_dir"])
    out_dir.mkdir(parents=True, exist_ok=True)

    for i in range(n):
        s = samples[i]
        img_path = s["image"]
        label_path = s["label"]

        # ── 1. 加载原图（未标准化的版本，用于显示）──────────────────
        raw_img = Image.open(img_path).convert("RGB")
        raw_img = raw_img.resize((cfg["image_size"], cfg["image_size"]), Image.BILINEAR)

        # ── 2. 加载真实标签 ──────────────────────────────────────────
        label_tensor = load_label(label_path, cfg["image_size"], img_path, cfg["ignore_index"])
        label_np = label_tensor.numpy()
        label_color = label_to_color(label_np)

        # ── 3. 模型预测 ─────────────────────────────────────────────
        img_tensor = load_image(img_path, cfg["image_size"]).unsqueeze(0).to(device)
        with torch.no_grad():
            logits = model(img_tensor)  # (1, 4, H, W)
            pred = logits.argmax(dim=1).squeeze(0).cpu().numpy()  # (H, W)

        pred_color = label_to_color(pred)

        # ── 4. 拼接三联图：原图 | 真实标签 | 预测 ────────────────────
        gap = 4  # 图片之间留 4 像素白色间隔
        h, w = cfg["image_size"], cfg["image_size"]
        total_w = w * 3 + gap * 2
        canvas = np.ones((h, total_w, 3), dtype=np.uint8) * 255  # 白底

        canvas[:, :w, :] = np.array(raw_img)           # 左：原图
        canvas[:, w + gap:2 * w + gap, :] = label_color  # 中：真实标签
        canvas[:, 2 * w + 2 * gap:, :] = pred_color      # 右：预测

        out_path = out_dir / f"vis_{i}.png"
        Image.fromarray(canvas).save(out_path)
        print(f"  保存 {out_path}")

    print(f"完成！{n} 张图已保存到 {out_dir}/")


if __name__ == "__main__":
    main()
