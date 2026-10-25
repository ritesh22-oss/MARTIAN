"""Load AI4MARS images/masks and build train/val/test splits.

数据模块（全项目唯一直接读取数据集文件的地方），负责三件事：
1. 把磁盘上的图片和标签文件两两配对（MSL / MER / m2020 三个探测器）；
2. 把彩色标签 mask 解码成 0~3 的类别编号，并忽略无效像素；
3. 按 config.py 中规定的数量切分 train/val/test，写入 outputs/splits.json。
"""

from __future__ import annotations

import csv
import json
import random
from functools import lru_cache
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torch.utils.data import Dataset
from torchvision import transforms

# 四个地形类别，编号 0~3 即网络最终输出的通道顺序
CLASS_NAMES = ["soil", "bedrock", "sand", "big_rock"]
# ImageNet 标准化参数：编码器用 ImageNet 预训练权重，输入必须按同样方式标准化
IMAGENET_MEAN = (0.485, 0.456, 0.406)
IMAGENET_STD = (0.229, 0.224, 0.225)


def decode_label_array(arr: np.ndarray, ignore_index: int = 255) -> np.ndarray:
    """RGB or grayscale mask to class indices 0-3; invalid -> ignore.

    AI4MARS 的标签图本质是“单通道类别图”：像素值 0/1/2/3 分别表示
    soil/bedrock/sand/big_rock；但文件可能以灰度或 RGB 形式保存。
    本函数统一把它转成 int64 的类别编号矩阵，无法判定的像素标为 255，
    训练损失计算时会被忽略（ignore_index=255）。
    """
    if arr.ndim == 2:
        # 灰度图：像素值本身就是类别编号，直接转整型即可
        out = arr.astype(np.int64, copy=True)
    elif arr.ndim == 3 and arr.shape[2] >= 3:
        # RGB 图：数据集约定三个通道值相同（如 (1,1,1) 表示类别 1）
        r, g, b = (arr[:, :, i].astype(np.int64) for i in range(3))
        out = r.copy()
        null = (r == 255) & (g == 255) & (b == 255)        # 白色：未标注区域
        mismatch = (r != g) | (r != b)                    # 三通道不一致：非合法编码
        out[null] = ignore_index
        out[mismatch & ~null] = ignore_index
    else:
        raise ValueError("unexpected label shape:", arr.shape)
    # 兜底：类别编号只允许 0~3，其他值一律视为忽略像素
    out[(out < 0) | (out > 3)] = ignore_index
    return out


def _resolve_msl_aux_mask(image_path: Path, kind: str) -> Path | None:
    """Find mxy (rover) or rng (>30m) aux mask for an MSL image.

    MSL 数据除了地形标签外，还带两张“辅助 mask”：
    - mxy：标记火星车车身/器械占据的像素（不该学）；
    - rng：标记距离超过 30 米的远处像素（标签不可靠）。
    本函数根据原图路径，按数据集的目录约定找到对应的辅助 mask 文件。
    """
    if "images" not in image_path.parts:
        return None
    images_idx = image_path.parts.index("images")
    msl_root = Path(*image_path.parts[:images_idx])  # 由图片路径反推出 msl 根目录
    stem = image_path.stem
    # 不同版本数据集子目录/文件命名略有差异，列出候选逐一尝试
    subdirs = ("mxy",) if kind == "mxy" else ("rng-30m", "rng")
    names = (
        (stem + ".png", stem + "_mxy.png", stem + "_MXY.png")
        if kind == "mxy"
        else (stem + ".png", stem + "_rng-30m.png", stem + "_RNG.png")
    )
    for sub in subdirs:
        base = msl_root / "images" / sub
        for name in names:
            p = base / name
            if p.exists():
                return p
    return None


def apply_aux_ignore(label: np.ndarray, image_path: Path, ignore_index: int = 255) -> np.ndarray:
    """MSL only: ignore rover body and distant pixels.

    仅对 MSL 图片生效：把辅助 mask 中标记的“车身”和“远处”像素
    在标签矩阵中改成 255，使模型不在这些位置计算损失。
    """
    if "/msl/" not in image_path.as_posix():
        return label  # MER / m2020 没有辅助 mask，原样返回
    out = label.copy()
    for kind in ("mxy", "rng"):
        aux_path = _resolve_msl_aux_mask(image_path, kind)
        if aux_path is None:
            continue
        aux = np.array(Image.open(aux_path))
        if aux.ndim == 3:
            aux = aux[:, :, 0]  # 辅助 mask 取第一个通道即可
        if aux.shape != label.shape:
            # 尺寸不一致时用最近邻缩放（保持 0/非0 的二值结构）
            aux = np.array(Image.fromarray(aux).resize((label.shape[1], label.shape[0]), Image.NEAREST))
        out[aux > 0] = ignore_index
    return out


def load_image(path: str, size: int) -> torch.Tensor:
    """读取一张原图：转 RGB → resize 到 size×size → 转张量 → ImageNet 标准化。

    输出形状为 (3, size, size)，像素均值约为 0。
    """
    img = Image.open(path).convert("RGB")
    tfm = transforms.Compose([
        transforms.Resize((size, size)),
        transforms.ToTensor(),                        # PIL 图 → [0,1] 浮点张量，形状变为 C×H×W
        transforms.Normalize(IMAGENET_MEAN, IMAGENET_STD),
    ])
    return tfm(img)


def load_label(path: str, size: int, image_path: str, ignore_index: int = 255) -> torch.Tensor:
    """读取一张标签图：最近邻缩放 → 解码类别 → MSL 额外忽略车身/远处。

    注意缩放必须用 NEAREST（最近邻），不能用双线性插值，
    否则类别编号（如 1、2）会被插出小数，产生非法类别。
    输出形状为 (size, size)，dtype 为 int64。
    """
    lbl = Image.open(path)
    resized = transforms.Resize((size, size), interpolation=transforms.InterpolationMode.NEAREST)(lbl)
    arr = decode_label_array(np.array(resized), ignore_index=ignore_index)
    arr = apply_aux_ignore(arr, Path(image_path), ignore_index=ignore_index)
    return torch.from_numpy(arr)


class SegmentationDataset(Dataset):
    """有标签数据集：每条样本返回 (图片张量, 标签张量)。

    samples 来自 splits.json，每个元素形如 {"image": 图片路径, "label": 标签路径}。
    真正的读盘动作发生在 __getitem__ 里（DataLoader 多进程按需读取，节省内存）。
    """

    def __init__(self, samples: list[dict], image_size: int = 512, ignore_index: int = 255):
        self.samples = samples
        self.image_size = image_size
        self.ignore_index = ignore_index

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int):
        s = self.samples[idx]
        image = load_image(s["image"], self.image_size)
        label = load_label(s["label"], self.image_size, s["image"], self.ignore_index)
        return image, label


class UnlabeledDataset(Dataset):
    """无标签数据集：只返回图片张量，供 UDA / 半监督训练使用 MER 无标注图像。"""

    def __init__(self, samples: list[dict], image_size: int = 512):
        self.samples = samples          # 元素形如 {"image": 图片路径}，没有 label 字段
        self.image_size = image_size

    def __len__(self) -> int:
        return len(self.samples)

    def __getitem__(self, idx: int) -> torch.Tensor:
        return load_image(self.samples[idx]["image"], self.image_size)


def _list_pairs(image_dir: Path, label_dir: Path, resolver, exts=(".JPG", ".jpg", ".jpeg", ".png")):
    """通用“图片-标签配对”扫描器。

    遍历 image_dir 下每张图片，用 resolver(label_dir, 文件名主干) 找到
    对应的标签文件，两者都存在才收入结果列表。
    不同探测器标签命名规则不同，通过传入不同的 resolver 来适配。
    """
    if not image_dir.is_dir() or not label_dir.is_dir():
        return []
    pairs = []
    for img in sorted(image_dir.iterdir()):
        if img.suffix not in exts:
            continue
        lbl = resolver(label_dir, img.stem)  # resolver 负责按命名规则拼出标签路径
        if lbl is not None and lbl.exists():
            pairs.append((img, lbl))
    return pairs


def _msl_dirs(root: Path):
    """定位 MSL 的图片目录、训练标签目录、测试标签目录。

    数据集存在“带 ncam 前缀”和“不带前缀”两种目录布局，依次尝试。
    """
    candidates = (
        (root / "msl/ncam/images/edr", root / "msl/ncam/labels/train",
         root / "msl/ncam/labels/test/masked-gold-min3-100agree"),
        (root / "msl/images/edr", root / "msl/labels/train",
         root / "msl/labels/test/masked-gold-min3-100agree"),
    )
    for image_dir, train_dir, test_dir in candidates:
        if image_dir.is_dir() and train_dir.is_dir():
            return image_dir, train_dir, test_dir
    return candidates[0]


def list_msl_train_pairs(root: Path):
    """MSL 训练池：训练标签与图片同名（仅扩展名换成 .png）。"""
    image_dir, train_dir, _ = _msl_dirs(root)
    return _list_pairs(image_dir, train_dir, lambda d, s: d / (s + ".png"))


def list_msl_test_pairs(root: Path):
    """MSL 测试集：标签文件名带 _merged 后缀（多位标注者合并后的金标准）。"""
    image_dir, _, test_dir = _msl_dirs(root)
    return _list_pairs(image_dir, test_dir, lambda d, s: d / (s + "_merged.png"))


def _mer_train_resolver(label_dir: Path, stem: str) -> Path | None:
    """MER 训练标签命名为 <主干>_merged*.png，可能有多个，取排序后最后一个。"""
    matches = sorted(label_dir.glob(stem + "_merged*.png"))
    return matches[-1] if matches else None


def list_mer_train_pairs(root: Path):
    """MER 训练图片在 images/eff，合并标签在 labels/train/merged-unmasked。"""
    return _list_pairs(root / "mer/images/eff", root / "mer/labels/train/merged-unmasked", _mer_train_resolver)


@lru_cache(maxsize=1)
def _mer_test_csv(root_str: str) -> dict:
    """解析 MER 测试集 test.csv，建立 {图片主干: (标签文件名, 原始图片名)} 映射。

    测试集图片名与标签名不一致，必须靠官方 CSV 才能正确配对。
    lru_cache 保证只解析一次（DataLoader 多进程外的主进程中复用）。
    """
    csv_path = Path(root_str) / "mer/labels/test/masked-gold-min3-100agree/test.csv"
    mapping: dict = {}
    if not csv_path.exists():
        return mapping
    with csv_path.open() as f:
        for row in csv.reader(f):
            if len(row) < 2:
                continue
            stem, img_name = row[0].strip(), row[1].strip()
            # 在 CSV 同目录按主干搜索对应的 *_merged.png 标签
            lbl = next((p.name for p in csv_path.parent.glob(stem + "*_merged.png")), None)
            if lbl:
                mapping[stem] = (lbl, img_name)
    return mapping


def list_mer_test_pairs(root: Path):
    """依据 test.csv 配对 MER 官方测试集图片与金标准标签。"""
    mapping = _mer_test_csv(str(root))
    pairs = []
    for _, (lbl_name, img_name) in mapping.items():
        img = root / "mer/images/test" / img_name
        lbl = root / "mer/labels/test/masked-gold-min3-100agree" / lbl_name
        if img.exists() and lbl.exists():
            pairs.append((img, lbl))
    return sorted(pairs, key=lambda x: x[0].name)


def list_m2020_nav_pairs(root: Path):
    """扫描 m2020（毅力号）NavCam 数据：以标签文件为基准反查图片。"""
    img_dir, lbl_dir = root / "m2020/images/ncam", root / "m2020/labels/NAV"
    if not img_dir.is_dir() or not lbl_dir.is_dir():
        return []
    pairs = []
    for lbl in sorted(lbl_dir.glob("*.png")):
        base = lbl.stem.split("_merged")[0]  # 去掉 _merged... 后缀得到图片主干
        for ext in (".jpeg", ".jpg", ".JPG"):
            img = img_dir / (base + ext)
            if img.exists():
                pairs.append((img, lbl))
                break
    return pairs


def _to_records(pairs) -> list[dict]:
    """把 (图片Path, 标签Path) 元组列表转成可写入 JSON 的字典记录。"""
    return [{"image": str(img), "label": str(lbl)} for img, lbl in pairs]


def create_splits(cfg: dict) -> dict:
    """Write splits.json under output_dir.

    按 config.py 的数量设置完成整个实验的数据切分：
    - MSL：大训练池 → 训练集 + 验证集；另有固定测试集；
    - MER：少量训练标签 → 200 张标注适应集 + 200 张验证集 + 官方测试集；
           其余 eff 图片作为无标注 UDA 池（排除掉已被选用/测试的图片）；
    - m2020：额外的泛化验证集。
    使用固定 seed 的随机数打乱，保证每次划分可复现。
    """
    root = Path(cfg["data_root"])
    rng = random.Random(cfg["seed"])

    # 1) 扫描三个探测器的全部可用 (图片, 标签) 对
    msl_pool = list_msl_train_pairs(root)
    msl_test = list_msl_test_pairs(root)
    mer_train = list_mer_train_pairs(root)
    mer_test = list_mer_test_pairs(root)
    m2020 = list_m2020_nav_pairs(root)
    for pool in (msl_pool, msl_test, mer_train, mer_test, m2020):
        rng.shuffle(pool)  # 固定种子打乱，保证可复现

    # 2) MSL 训练池按顺序切成训练集 / 验证集（数量见 config.py）
    msl_train = msl_pool[: cfg["msl_train_size"]]
    msl_val = msl_pool[cfg["msl_train_size"]: cfg["msl_train_size"] + cfg["msl_val_size"]]
    # 3) MER 少量标注数据切成“适应训练集”和验证集（模拟标注预算受限场景）
    mer_adapt = mer_train[: cfg["mer_labeled_adapt_size"]]
    mer_val = mer_train[cfg["mer_labeled_adapt_size"]: cfg["mer_labeled_adapt_size"] + cfg["mer_val_size"]]

    # 4) 构建 MER 无标注池：收集 images/eff 下全部图片，
    #    排除测试集、验证集、标注适应集已占用的图片，避免数据泄漏
    eff = sorted({p for ext in ("*.JPG", "*.jpg", "*.jpeg", "*.JPEG")
                  for p in (root / "mer/images/eff").glob(ext)})
    exclude = {p.stem for p, _ in mer_test}
    exclude |= {Path(r["image"]).stem for r in _to_records(mer_val)}
    exclude |= {Path(r["image"]).stem for r in _to_records(mer_adapt)}
    mer_uda = [p for p in eff if p.stem not in exclude]
    rng.shuffle(mer_uda)

    # 5) 汇总所有划分（路径转字符串后可直接序列化为 JSON）
    splits = {
        "msl_train": _to_records(msl_train),                              # MSL 监督预训练数据
        "msl_val": _to_records(msl_val),                                  # MSL 验证集
        "msl_test": _to_records(msl_test[: cfg["msl_test_size"]]),        # MSL 测试集
        "mer_test": _to_records(mer_test[: cfg["mer_test_size"]]),        # MER 官方测试集（最终考场）
        "mer_val": _to_records(mer_val),                                  # MER 验证集
        "mer_labeled_adapt": _to_records(mer_adapt),                      # 200 张 MER 标注数据
        "mer_uda": [{"image": str(p)} for p in mer_uda[: cfg["mer_uda_size"]]],  # 2000 张无标注图
        "m2020_val": _to_records(m2020[: cfg["m2020_val_size"]]),         # 跨探测器泛化验证
        "meta": {"seed": cfg["seed"]},
    }

    # 6) 写出到 outputs/splits.json，后续训练/评估都读这一个文件，保证各实验同源
    out = Path(cfg["output_dir"]) / "splits.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w") as f:
        json.dump(splits, f, indent=2)
    return splits


def load_splits(output_dir: str) -> dict:
    """读取 create_splits 生成的 splits.json（训练/评估时的数据清单来源）。"""
    with (Path(output_dir) / "splits.json").open() as f:
        return json.load(f)
