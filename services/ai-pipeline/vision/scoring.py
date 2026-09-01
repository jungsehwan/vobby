"""이미지 1장 스코어링 — 순수 로직 (Celery 비의존, 테스트 대상)."""

import io
import urllib.request
from functools import lru_cache
from typing import Any

import cv2
import numpy as np
import torch
from PIL import Image

from vision import scoring_params as P


def blur_score(image: Image.Image) -> float:
    """Laplacian variance 기반 선명도 0~1 — 낮을수록 흐림 (기획 Phase 1 필터 흡수)."""
    gray = cv2.cvtColor(np.array(image.convert("RGB")), cv2.COLOR_RGB2GRAY)
    variance = float(cv2.Laplacian(gray, cv2.CV_64F).var())
    normalized = (variance - P.BLUR_VAR_FLOOR) / (P.BLUR_VAR_CEIL - P.BLUR_VAR_FLOOR)
    return max(0.0, min(1.0, normalized))


@lru_cache(maxsize=1)
def _load_model():
    """워커 프로세스당 1회 로드 (design §0-2). 첫 호출 시 가중치 자동 다운로드."""
    import open_clip

    device = "mps" if torch.backends.mps.is_available() else "cpu"
    model, _, preprocess = open_clip.create_model_and_transforms(
        P.MODEL_NAME, pretrained=P.MODEL_PRETRAINED
    )
    tokenizer = open_clip.get_tokenizer(P.MODEL_NAME)
    model = model.to(device).eval()

    prompts = (
        P.AESTHETIC_POSITIVE + P.AESTHETIC_NEGATIVE + list(P.CATEGORY_PROMPTS.values())
    )
    with torch.no_grad():
        text_features = model.encode_text(tokenizer(prompts).to(device))
        text_features /= text_features.norm(dim=-1, keepdim=True)
    return model, preprocess, text_features, device


def load_image(uri: str) -> Image.Image:
    if uri.startswith(("http://", "https://")):
        with urllib.request.urlopen(uri, timeout=15) as res:
            return Image.open(io.BytesIO(res.read())).convert("RGB")
    return Image.open(uri).convert("RGB")


def score_image(image: Image.Image) -> dict[str, Any]:
    model, preprocess, text_features, device = _load_model()

    with torch.no_grad():
        image_features = model.encode_image(preprocess(image).unsqueeze(0).to(device))
        image_features /= image_features.norm(dim=-1, keepdim=True)
        similarity = (100.0 * image_features @ text_features.T).squeeze(0)

    n_pos = len(P.AESTHETIC_POSITIVE)
    n_neg = len(P.AESTHETIC_NEGATIVE)
    aes_logits = similarity[: n_pos + n_neg]
    # 긍정 그룹 확률 합 = aesthetic
    aes_probs = torch.softmax(aes_logits, dim=0)
    aesthetic = float(aes_probs[:n_pos].sum())

    cat_logits = similarity[n_pos + n_neg :]
    cat_probs = torch.softmax(cat_logits, dim=0)
    categories = list(P.CATEGORY_PROMPTS.keys())
    best_idx = int(cat_probs.argmax())
    category = categories[best_idx]

    blur = blur_score(image)
    score = round(
        100
        * (
            P.WEIGHT_AESTHETIC * aesthetic
            + P.WEIGHT_BLUR * blur
            + P.WEIGHT_CATEGORY * P.CATEGORY_BONUS[category]
        )
    )

    return {
        "score": score,
        "aesthetic": round(aesthetic, 4),
        "blur": round(blur, 4),
        "category": category,
        "categoryProbs": {
            c: round(float(p), 4) for c, p in zip(categories, cat_probs)
        },
        "model": f"{P.MODEL_NAME}/{P.MODEL_PRETRAINED}",
    }
