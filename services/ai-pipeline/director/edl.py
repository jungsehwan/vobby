"""EDL v1 생성 — 순수 함수 (design §0-1·0-2). 렌더러(기능 13)의 입력 계약."""

from dataclasses import dataclass
from typing import Any

# 슬롯 구성 (30초 고정 — 가변 길이는 후속, plan §6)
TOTAL_S = 30
SLOTS = {"intro": (0, 3), "body": (3, 15), "highlight": (15, 25), "outro": (25, 30)}
MAX_BODY_CUTS = 4
MAX_HIGHLIGHT_CUTS = 3
BEAT_SNAP_TOLERANCE_S = 0.4


@dataclass(frozen=True)
class MediaItem:
    media_id: str
    epoch_s: float
    score: int  # vision_score.score, NULL→0
    category: str | None  # screenshot은 선정 제외
    lon: float | None
    lat: float | None


def _snap(t: float, beats: list[float]) -> float:
    """가장 가까운 비트로 스냅 (±허용 오차 내) — BGM 없으면 그대로."""
    if not beats:
        return round(t, 3)
    nearest = min(beats, key=lambda b: abs(b - t))
    return round(nearest if abs(nearest - t) <= BEAT_SNAP_TOLERANCE_S else t, 3)


def _cuts(slot: tuple[int, int], items: list[MediaItem], beats: list[float]) -> list[dict[str, Any]]:
    start, end = slot
    if not items:
        return []
    boundaries = [start + (end - start) * i / len(items) for i in range(len(items) + 1)]
    # 양끝은 슬롯 경계 고정, 내부 경계만 비트 스냅
    snapped = [float(start)] + [_snap(b, beats) for b in boundaries[1:-1]] + [float(end)]
    # 스냅으로 인한 역전 방지
    for i in range(1, len(snapped)):
        snapped[i] = max(snapped[i], snapped[i - 1] + 0.5)
    snapped[-1] = float(end)
    return [
        {
            "mediaId": item.media_id,
            "start": round(snapped[i], 3),
            "end": round(snapped[i + 1], 3),
            "effect": "kenburns",
        }
        for i, item in enumerate(items)
    ]


def _bbox(media: list[MediaItem]) -> list[float] | None:
    coords = [(m.lon, m.lat) for m in media if m.lon is not None and m.lat is not None]
    if not coords:
        return None
    lons, lats = [c[0] for c in coords], [c[1] for c in coords]
    return [min(lons), min(lats), max(lons), max(lats)]


def build_edl(
    title: str | None,
    stats: dict[str, Any],
    media: list[MediaItem],
    pois: list[dict[str, Any]],
    bgm: dict[str, Any] | None,
) -> dict[str, Any]:
    if not media:
        raise ValueError("소재 없음 — 미디어 0장으로 EDL을 만들 수 없습니다")

    usable = sorted(
        (m for m in media if m.category != "screenshot"),
        key=lambda m: m.epoch_s,
    ) or sorted(media, key=lambda m: m.epoch_s)  # 전부 screenshot이면 그대로 사용

    # Highlight: 점수 내림차순(동점 시 시간순) 상위
    by_score = sorted(usable, key=lambda m: (-m.score, m.epoch_s))
    highlight = sorted(by_score[:MAX_HIGHLIGHT_CUTS], key=lambda m: m.epoch_s)
    highlight_ids = {m.media_id for m in highlight}

    # Body: 나머지 중 POI spot당 최고점 1장 우선, 시간순 보충
    remaining = [m for m in usable if m.media_id not in highlight_ids]
    spot_media_ids: list[str] = []
    for poi in pois:
        if poi.get("type") != "spot":
            continue
        spot_ids = set(poi.get("mediaIds", []))
        candidates = [m for m in remaining if m.media_id in spot_ids]
        if candidates:
            spot_media_ids.append(max(candidates, key=lambda m: m.score).media_id)
    body = [m for m in remaining if m.media_id in spot_media_ids]
    for m in remaining:
        if len(body) >= MAX_BODY_CUTS:
            break
        if m.media_id not in {b.media_id for b in body}:
            body.append(m)
    body = sorted(body[:MAX_BODY_CUTS], key=lambda m: m.epoch_s)

    beats = (bgm or {}).get("beats", []) if bgm else []

    return {
        "version": 1,
        "durationS": TOTAL_S,
        "title": title,
        "bgm": (
            {"uri": bgm["uri"], "bpm": bgm.get("bpm"), "climax": bgm.get("climax")}
            if bgm
            else None
        ),
        "segments": [
            {
                "slot": "intro",
                "start": SLOTS["intro"][0],
                "end": SLOTS["intro"][1],
                "kind": "map_overview",
                "bbox": _bbox(usable),
            },
            {
                "slot": "body",
                "start": SLOTS["body"][0],
                "end": SLOTS["body"][1],
                "kind": "cuts",
                "cuts": _cuts(SLOTS["body"], body, beats),
            },
            {
                "slot": "highlight",
                "start": SLOTS["highlight"][0],
                "end": SLOTS["highlight"][1],
                "kind": "cuts",
                "cuts": _cuts(SLOTS["highlight"], highlight, beats),
            },
            {
                "slot": "outro",
                "start": SLOTS["outro"][0],
                "end": SLOTS["outro"][1],
                "kind": "stats",
                "stats": stats,
            },
        ],
    }
