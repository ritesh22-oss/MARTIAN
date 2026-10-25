"""Real inference runner for AI4MARS 4-class terrain segmentation.

Loads the verified ResNet34-U-Net checkpoint, performs standard ImageNet preprocessing,
runs forward inference to generate pixel-level classification (soil, bedrock, sand, big_rock),
and outputs mask and overlay data.
"""

from __future__ import annotations

import argparse
import base64
import io
import json
import os
import sys
from pathlib import Path

# AI4MARS 4 terrain classes and color palette
CLASS_NAMES = ["soil", "bedrock", "sand", "big_rock"]
PALETTE = {
    0: (255, 0, 0),      # Soil: Red
    1: (0, 255, 0),      # Bedrock: Green
    2: (0, 0, 255),      # Sand: Blue
    3: (255, 255, 0),    # Big Rock: Yellow
    255: (0, 0, 0)       # Null/Ignore: Black
}

CANDIDATE_CHECKPOINTS = [
    "outputs/best_model.pth",
    "outputs/joint.pt",
    "outputs/adda.pt",
    "outputs/E2_coral.pt",
    "outputs/E1.pt",
    "models/ai4mars_resnet34_unet.pt",
    "models/best_model.pth",
]


def find_checkpoint(custom_path: str | None = None) -> str | None:
    if custom_path and os.path.exists(custom_path):
        return custom_path
    for path in CANDIDATE_CHECKPOINTS:
        if os.path.exists(path):
            return path
    return None


def check_status(custom_path: str | None = None) -> dict:
    ckpt = find_checkpoint(custom_path)
    torch_available = False
    try:
        import torch
        torch_available = True
    except ImportError:
        pass

    return {
        "checkpointAvailable": ckpt is not None,
        "activeCheckpoint": ckpt,
        "searchedPaths": CANDIDATE_CHECKPOINTS,
        "torchAvailable": torch_available,
        "classes": [
            {"id": 0, "name": "soil", "label": "Soil / Regolith", "color": "#FF0000", "rgb": [255, 0, 0]},
            {"id": 1, "name": "bedrock", "label": "Bedrock Outcrop", "color": "#00FF00", "rgb": [0, 255, 0]},
            {"id": 2, "name": "sand", "label": "Sand / Dunes", "color": "#0000FF", "rgb": [0, 0, 255]},
            {"id": 3, "name": "big_rock", "label": "Big Rock / Boulder", "color": "#FFFF00", "rgb": [255, 255, 0]},
        ],
        "trainingSteps": [
            "1. Download AI4MARS dataset into ai4mars-dataset-merged-0.6/",
            "2. Generate data splits: python make_splits_50e75ab0.py",
            "3. Supervised MSL Pretraining: python train_6c0c9c61.py --method supervised --out-ckpt outputs/E1.pt",
            "4. Domain Adaptation (MER Target): python train_6c0c9c61.py --method semisup_joint --init-ckpt outputs/E1.pt --out-ckpt outputs/joint.pt",
            "5. Export best model: python export_results_aa7aad1a.py --checkpoint outputs/joint.pt --split mer_test"
        ]
    }


def run_inference(image_path_or_b64: str, checkpoint_path: str, size: int = 256) -> dict:
    try:
        import numpy as np
        import torch
        import torchvision.transforms as transforms
        from PIL import Image
    except ImportError as e:
        return {
            "status": "error",
            "error_code": "PYTORCH_NOT_INSTALLED",
            "message": f"PyTorch or Torchvision is not installed in the environment: {str(e)}"
        }

    # Dynamically import model from script dir
    sys.path.append(os.path.dirname(os.path.abspath(__file__)))
    try:
        from model import NavSegmenter
    except ImportError:
        return {
            "status": "error",
            "error_code": "MODEL_DEF_ERROR",
            "message": "Could not import NavSegmenter from model.py"
        }

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")

    # Load checkpoint
    if not os.path.exists(checkpoint_path):
        return {
            "status": "error",
            "error_code": "CHECKPOINT_NOT_FOUND",
            "message": f"Specified checkpoint does not exist: {checkpoint_path}"
        }

    try:
        model = NavSegmenter(num_classes=4, pretrained=False)
        ckpt = torch.load(checkpoint_path, map_location=device, weights_only=False)
        state_dict = ckpt["model"] if "model" in ckpt else ckpt
        model.load_state_dict(state_dict)
        model.to(device)
        model.eval()
    except Exception as e:
        return {
            "status": "error",
            "error_code": "CHECKPOINT_LOAD_FAILED",
            "message": f"Failed loading checkpoint {checkpoint_path}: {str(e)}"
        }

    # Load and preprocess image
    try:
        if image_path_or_b64.startswith("data:image"):
            header, encoded = image_path_or_b64.split(",", 1)
            img_bytes = base64.b64decode(encoded)
            raw_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
        elif os.path.exists(image_path_or_b64):
            raw_img = Image.open(image_path_or_b64).convert("RGB")
        else:
            img_bytes = base64.b64decode(image_path_or_b64)
            raw_img = Image.open(io.BytesIO(img_bytes)).convert("RGB")
    except Exception as e:
        return {
            "status": "error",
            "error_code": "IMAGE_DECODE_ERROR",
            "message": f"Could not decode input image: {str(e)}"
        }

    # Preprocessing
    orig_w, orig_h = raw_img.size
    resized_img = raw_img.resize((size, size), Image.BILINEAR)

    tfm = transforms.Compose([
        transforms.ToTensor(),
        transforms.Normalize((0.485, 0.456, 0.406), (0.229, 0.224, 0.225))
    ])
    tensor_input = tfm(resized_img).unsqueeze(0).to(device)

    # Inference forward pass
    with torch.no_grad():
        logits = model(tensor_input)
        pred_map = logits.argmax(dim=1).squeeze(0).cpu().numpy()

    # Per-class distribution
    total_pixels = size * size
    class_counts = {name: int((pred_map == idx).sum()) for idx, name in enumerate(CLASS_NAMES)}
    class_percentages = {
        name: round((count / total_pixels) * 100, 2)
        for name, count in class_counts.items()
    }

    # Build RGB mask image
    mask_rgb = np.zeros((size, size, 3), dtype=np.uint8)
    for idx, name in enumerate(CLASS_NAMES):
        mask_rgb[pred_map == idx] = PALETTE[idx]

    mask_img = Image.fromarray(mask_rgb)

    # Build Alpha composite overlay
    raw_np = np.array(resized_img)
    overlay_np = (raw_np.astype(float) * 0.45 + mask_rgb.astype(float) * 0.55).astype(np.uint8)
    overlay_img = Image.fromarray(overlay_np)

    # Convert to base64
    def to_b64_url(img: Image.Image) -> str:
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode("utf-8")

    return {
        "status": "success",
        "checkpointUsed": checkpoint_path,
        "inputDimensions": {"width": orig_w, "height": orig_h, "processedSize": size},
        "classDistribution": class_percentages,
        "classPixelCounts": class_counts,
        "maskDataUrl": to_b64_url(mask_img),
        "overlayDataUrl": to_b64_url(overlay_img)
    }


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--status", action="store_true", help="Check checkpoint availability")
    p.add_argument("--checkpoint", default=None, help="Path to checkpoint")
    p.add_argument("--image", default=None, help="Path or base64 image")
    p.add_argument("--size", type=int, default=256, help="Input size")
    args = p.parse_args()

    if args.status:
        result = check_status(args.checkpoint)
        print(json.dumps(result, indent=2))
        return

    ckpt = find_checkpoint(args.checkpoint)
    if not ckpt:
        print(json.dumps({
            "status": "error",
            "error_code": "CHECKPOINT_NOT_FOUND",
            "message": "AI4MARS checkpoint weights were not found in repository.",
            "searchedPaths": CANDIDATE_CHECKPOINTS,
            "trainingSteps": check_status()["trainingSteps"]
        }, indent=2))
        sys.exit(2)

    if not args.image:
        print(json.dumps({"status": "error", "message": "--image argument required"}))
        sys.exit(1)

    res = run_inference(args.image, ckpt, args.size)
    print(json.dumps(res))


if __name__ == "__main__":
    main()
