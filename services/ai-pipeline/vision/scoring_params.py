"""스코어링 파라미터 — 튜닝 지점 (design §0-1). 실사용 데이터로 조정 예정."""

MODEL_NAME = "ViT-B-32"
MODEL_PRETRAINED = "laion2b_s34b_b79k"

# 심미: 긍정/부정 프롬프트 그룹 softmax → aesthetic 0~1
AESTHETIC_POSITIVE = [
    "a stunning professional photograph",
    "a beautiful well-composed photo",
    "an award-winning travel photo",
]
AESTHETIC_NEGATIVE = [
    "a poorly taken photo",
    "a boring low-quality snapshot",
    "an accidental photo",
]

# 카테고리: 숏폼 소재 분류 (argmax)
CATEGORY_PROMPTS = {
    "scenery": "a photo of beautiful scenery or landscape",
    "people": "a photo of people smiling or posing",
    "action": "a photo of dynamic sports or outdoor activity",
    "food": "a photo of food or drinks",
    "screenshot": "a screenshot or a photo of a document",
}

# 숏폼 소재 적합도 보너스 (design §0-1)
CATEGORY_BONUS = {
    "scenery": 1.0,
    "people": 1.0,
    "action": 1.0,
    "food": 0.6,
    "screenshot": 0.0,
}

# 블러: Laplacian variance 정규화 — VAR_FLOOR 이하=0, VAR_CEIL 이상=1
BLUR_VAR_FLOOR = 20.0
BLUR_VAR_CEIL = 400.0

# 종합 가중치
WEIGHT_AESTHETIC = 0.6
WEIGHT_BLUR = 0.3
WEIGHT_CATEGORY = 0.1
