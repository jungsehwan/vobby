"""OSM 타일 다운로드·캐시·스티치 (design §0-2). Mapbox 전환 시 TILE_URL_TEMPLATE만 교체."""

import math
import os
import urllib.request

from PIL import Image

from spatial.mercator import TILE_SIZE, fit_zoom, lonlat_to_world_px

DEFAULT_TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png"
USER_AGENT = "VobbyDev/0.1 (dev; contact: jungsh@rsupport.com)"
ATTRIBUTION = "© OpenStreetMap contributors"


def _tile_url(z: int, x: int, y: int) -> str:
    template = os.environ.get("TILE_URL_TEMPLATE", DEFAULT_TILE_URL)
    return template.format(z=z, x=x, y=y)


def _cache_dir() -> str:
    root = os.environ.get("MEDIA_STORAGE_ROOT")
    if not root:
        raise RuntimeError("MEDIA_STORAGE_ROOT 환경변수가 설정되지 않았습니다")
    return os.path.join(root, "tilecache")


def _fetch_tile(z: int, x: int, y: int) -> Image.Image:
    cache_path = os.path.join(_cache_dir(), str(z), str(x), f"{y}.png")
    if not os.path.exists(cache_path):
        os.makedirs(os.path.dirname(cache_path), exist_ok=True)
        req = urllib.request.Request(_tile_url(z, x, y), headers={"User-Agent": USER_AGENT})
        with urllib.request.urlopen(req, timeout=15) as res:
            data = res.read()
        with open(cache_path, "wb") as f:
            f.write(data)
    return Image.open(cache_path).convert("RGB")


class MapCanvas:
    """bbox 중심의 스티치된 지도 + 경위도→캔버스 픽셀 변환."""

    def __init__(self, bbox: tuple[float, float, float, float], width: int, height: int):
        self.width, self.height = width, height
        self.zoom = fit_zoom(bbox, width, height)
        center_lon = (bbox[0] + bbox[2]) / 2
        center_lat = (bbox[1] + bbox[3]) / 2
        cx, cy = lonlat_to_world_px(center_lon, center_lat, self.zoom)
        # 캔버스 좌상단의 월드 픽셀 원점
        self.origin_x = cx - width / 2
        self.origin_y = cy - height / 2
        self.image = self._stitch()

    def _stitch(self) -> Image.Image:
        img = Image.new("RGB", (self.width, self.height), "#dddddd")
        tx0 = math.floor(self.origin_x / TILE_SIZE)
        ty0 = math.floor(self.origin_y / TILE_SIZE)
        tx1 = math.floor((self.origin_x + self.width) / TILE_SIZE)
        ty1 = math.floor((self.origin_y + self.height) / TILE_SIZE)
        n = 2**self.zoom
        for tx in range(tx0, tx1 + 1):
            for ty in range(ty0, ty1 + 1):
                if not (0 <= ty < n):
                    continue
                tile = _fetch_tile(self.zoom, tx % n, ty)
                img.paste(tile, (round(tx * TILE_SIZE - self.origin_x), round(ty * TILE_SIZE - self.origin_y)))
        return img

    def to_px(self, lon: float, lat: float) -> tuple[float, float]:
        wx, wy = lonlat_to_world_px(lon, lat, self.zoom)
        return wx - self.origin_x, wy - self.origin_y
