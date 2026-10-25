"""Training config and presets (budget, followup, adda)."""

from __future__ import annotations

import copy

DEFAULT_DATA_ROOT = "ai4mars-dataset-merged-0.6"

DEFAULTS: dict = {
    "data_root": DEFAULT_DATA_ROOT,
    "output_dir": "outputs",
    "num_classes": 4,
    "ignore_index": 255,
    # 轻量级：512→256，显存约省 4 倍
    "image_size": 256,
    "seed": 42,

    # 轻量级：训练池从 3000 缩到 500
    "msl_train_size": 500,
    # 轻量级：验证集从 200 缩到 50
    "msl_val_size": 50,
    "msl_test_size": 322,
    # 轻量级：MER 标注数据从 200 缩到 50
    "mer_labeled_adapt_size": 50,
    # 轻量级：MER 验证集从 200 缩到 50
    "mer_val_size": 50,
    # 轻量级：无标注数据从 2000 缩到 200
    "mer_uda_size": 200,
    "mer_test_size": 204,
    "m2020_val_size": 200,

    # 轻量级：batch 从 16 缩到 4（RTX 5060 8GB）
    "batch_size": 4,
    # 轻量级：数据加载进程从 4 缩到 2
    "num_workers": 2,
    "pin_memory": True,
    "amp": True,
    "use_cuda": True,
    "cudnn_benchmark": True,

    "lr": 1.0e-4,
    "lr_encoder": 1.0e-5,
    "lr_decoder": 1.0e-4,
    "weight_decay": 1.0e-4,

    # 轻量级：监督训练从 15 轮缩到 3 轮
    "epochs_supervised": 3,
    "early_stop_patience": 5,

    # 轻量级：UDA 内部循环从 8 缩到 2
    "uda_epochs": 2,
    "uda_lambda": 0.1,
    "dann_lambda_max": 0.1,
    "mmd_sigma": 1.0,

    # 轻量级：UDA 训练从 10 缩到 2
    "epochs_uda": 2,
    # 轻量级：半监督训练从 10 缩到 2
    "epochs_semisup": 2,
    "uda_lr_factor": 0.1,
    "semisup_lr_factor": 0.1,
    "semisup_lambda_uda": 1.0,
    "semisup_lambda_ramp_epochs": 0,
    "semisup_pseudo_warmup_epochs": 1,
    "uda_confidence_threshold": 0.9,
    "uda_confidence_threshold_end": None,
    "uda_confidence_ramp_epochs": None,
    "uda_min_pseudo_pixels": 100,
    "uda_freeze_encoder_epochs": 0,
    "ema_decay": None,
    "combo_extra_pseudo_epochs": 0,
    "combo_extra_pseudo_lr_factor": 0.05,

    "adda_epochs_disc": 5,
    "adda_epochs_adapt": 10,
    "adda_disc_lr": 1.0e-4,
    "adda_encoder_lr": 2.0e-5,
    "adda_decoder_lr": 5.0e-5,
    "adda_lambda_seg": 1.0,
    "adda_lambda_adv": 0.1,
    "adda_lambda_coral": 0.1,
    "adda_adv_ramp": True,
    "adda_train_decoder": True,
}

PRESET_BUDGET: dict = {}

PRESET_ADDA: dict = {
    "batch_size": 32,
}

PRESET_FOLLOWUP: dict = {
    "epochs_supervised": 12,
    "early_stop_patience": 4,
    "epochs_uda": 12,
    "epochs_semisup": 12,
    "uda_lr_factor": 0.05,
    "semisup_lr_factor": 0.05,
    "semisup_lambda_uda": 0.5,
    "semisup_lambda_ramp_epochs": 4,
    "semisup_pseudo_warmup_epochs": 2,
    "uda_confidence_threshold": 0.92,
    "uda_confidence_threshold_end": 0.97,
    "uda_confidence_ramp_epochs": 8,
    "uda_min_pseudo_pixels": 200,
    "ema_decay": 0.995,
    "uda_freeze_encoder_epochs": 2,
    "combo_extra_pseudo_epochs": 4,
    "combo_extra_pseudo_lr_factor": 0.02,
}

PRESETS = {"budget": PRESET_BUDGET, "followup": PRESET_FOLLOWUP, "adda": PRESET_ADDA}


def get_config(preset: str = "budget", **overrides) -> dict:
    if preset not in PRESETS:
        raise ValueError("unknown preset:", preset, "choose from", list(PRESETS))
    cfg = copy.deepcopy(DEFAULTS)
    cfg.update(PRESETS[preset])
    cfg.update({k: v for k, v in overrides.items() if v is not None})
    return cfg
