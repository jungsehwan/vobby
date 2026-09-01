"""사진 좌표 시퀀스 → POI 클러스터링 — 순수 함수 (design §0-1)."""

import math
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any

# 파라미터 — 실데이터로 튜닝 예정 (plan §6)
SPOT_RADIUS_M = 150.0
MIN_SPOT_PHOTOS = 2
MIN_DWELL_S = 600

_EARTH_RADIUS_M = 6_371_000


@dataclass(frozen=True)
class MediaPoint:
    media_id: str
    epoch_s: float
    lon: float
    lat: float


def _haversine(lon1: float, lat1: float, lon2: float, lat2: float) -> float:
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = (
        math.sin(dlat / 2) ** 2
        + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    )
    return 2 * _EARTH_RADIUS_M * math.asin(math.sqrt(a))


def _iso(epoch_s: float) -> str:
    return datetime.fromtimestamp(epoch_s, tz=timezone.utc).isoformat()


def _poi(poi_type: str, cluster: list[MediaPoint]) -> dict[str, Any]:
    lon = sum(p.lon for p in cluster) / len(cluster)
    lat = sum(p.lat for p in cluster) / len(cluster)
    return {
        "type": poi_type,
        "lon": round(lon, 6),
        "lat": round(lat, 6),
        "startedAt": _iso(cluster[0].epoch_s),
        "endedAt": _iso(cluster[-1].epoch_s),
        "mediaIds": [p.media_id for p in cluster],
        "mediaCount": len(cluster),
        "dwellS": int(cluster[-1].epoch_s - cluster[0].epoch_s),
    }


def cluster_pois(points: list[MediaPoint]) -> list[dict[str, Any]]:
    """시간순 GPS 사진에서 start/spot/end POI 산출. GPS 0장이면 []."""
    if not points:
        return []

    ordered = sorted(points, key=lambda p: p.epoch_s)
    pois: list[dict[str, Any]] = [_poi("start", [ordered[0]])]

    # 그리디 시공간 클러스터 — 중심과의 거리로 편입 판정 (시간 순서 보존)
    clusters: list[list[MediaPoint]] = []
    current = [ordered[0]]
    for point in ordered[1:]:
        center_lon = sum(p.lon for p in current) / len(current)
        center_lat = sum(p.lat for p in current) / len(current)
        if _haversine(center_lon, center_lat, point.lon, point.lat) <= SPOT_RADIUS_M:
            current.append(point)
        else:
            clusters.append(current)
            current = [point]
    clusters.append(current)

    for cluster in clusters:
        dwell = cluster[-1].epoch_s - cluster[0].epoch_s
        if len(cluster) >= MIN_SPOT_PHOTOS or dwell >= MIN_DWELL_S:
            pois.append(_poi("spot", cluster))

    pois.append(_poi("end", [ordered[-1]]))
    return pois
