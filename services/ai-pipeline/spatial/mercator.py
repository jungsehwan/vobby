"""Web Mercator 좌표 변환 — 순수 함수 (map-animation design §0-1)."""

import math

TILE_SIZE = 256
MAX_ZOOM = 17


def lonlat_to_world_px(lon: float, lat: float, zoom: int) -> tuple[float, float]:
    """경위도 → 줌 z의 월드 픽셀 좌표 (타일 좌표 × 256)."""
    scale = TILE_SIZE * (2**zoom)
    x = (lon + 180.0) / 360.0 * scale
    lat_rad = math.radians(lat)
    y = (1.0 - math.log(math.tan(lat_rad) + 1.0 / math.cos(lat_rad)) / math.pi) / 2.0 * scale
    return x, y


def fit_zoom(bbox: tuple[float, float, float, float], width: int, height: int, padding: float = 0.18) -> int:
    """bbox(+여백)가 캔버스에 들어가는 최대 줌 — 요청 타일 수 절제의 핵심."""
    min_lon, min_lat, max_lon, max_lat = bbox
    for zoom in range(MAX_ZOOM, 0, -1):
        x1, y1 = lonlat_to_world_px(min_lon, max_lat, zoom)
        x2, y2 = lonlat_to_world_px(max_lon, min_lat, zoom)
        if (x2 - x1) * (1 + padding * 2) <= width and (y2 - y1) * (1 + padding * 2) <= height:
            return zoom
    return 1
