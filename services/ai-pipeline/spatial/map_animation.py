"""궤적 점진 드로잉 프레임 시퀀스 생성 (design §0-1)."""

import math
import os

from PIL import Image, ImageDraw, ImageFont

from spatial.maptiles import ATTRIBUTION, MapCanvas

LINE_COLOR = "#2fa872"  # ui-tokens brand500
LINE_WIDTH = 10
HEAD_RADIUS = 14
START_RADIUS = 10
DEFAULT_FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"


def _font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(os.environ.get("RENDER_FONT_PATH", DEFAULT_FONT), size)


def _bbox(coords: list[tuple[float, float]]) -> tuple[float, float, float, float]:
    lons = [c[0] for c in coords]
    lats = [c[1] for c in coords]
    return min(lons), min(lats), max(lons), max(lats)


def _partial_points(points: list[tuple[float, float]], progress: float) -> list[tuple[float, float]]:
    """누적 픽셀 거리 기준 progress(0~1)까지의 점 목록 — 마지막 구간은 보간."""
    dists = [0.0]
    for (x1, y1), (x2, y2) in zip(points, points[1:]):
        dists.append(dists[-1] + math.hypot(x2 - x1, y2 - y1))
    target = dists[-1] * progress
    result = [points[0]]
    for i in range(1, len(points)):
        if dists[i] <= target:
            result.append(points[i])
            continue
        seg_len = dists[i] - dists[i - 1]
        if seg_len > 0:
            t = (target - dists[i - 1]) / seg_len
            x1, y1 = points[i - 1]
            x2, y2 = points[i]
            result.append((x1 + (x2 - x1) * t, y1 + (y2 - y1) * t))
        break
    return result


def _draw_overlay(base: Image.Image, title: str) -> Image.Image:
    """하단 타이틀 밴드 + 어트리뷰션 — 모든 프레임 공통 (베이스에 1회 합성)."""
    img = base.convert("RGBA")
    overlay = Image.new("RGBA", img.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    band_top = img.height - 340
    draw.rectangle((0, band_top, img.width, img.height), fill=(26, 26, 30, 200))
    font = _font(64)
    bbox = draw.textbbox((0, 0), title, font=font)
    draw.text(
        ((img.width - (bbox[2] - bbox[0])) / 2, band_top + 90), title, font=font, fill="white"
    )
    attr_font = _font(28)
    draw.text((24, band_top - 48), ATTRIBUTION, font=attr_font, fill=(60, 60, 60, 255))
    return Image.alpha_composite(img, overlay).convert("RGB")


def render_map_frames(
    coords: list[tuple[float, float]], title: str, workdir: str, frame_count: int
) -> str:
    """지도 위 궤적 점진 드로잉 PNG 시퀀스 생성 → ffmpeg 입력 패턴 반환."""
    canvas = MapCanvas(_bbox(coords), 1080, 1920)
    base = _draw_overlay(canvas.image, title)
    points = [canvas.to_px(lon, lat) for lon, lat in coords]

    frames_dir = os.path.join(workdir, "mapframes")
    os.makedirs(frames_dir, exist_ok=True)
    for i in range(frame_count):
        progress = i / (frame_count - 1) if frame_count > 1 else 1.0
        frame = base.copy()
        draw = ImageDraw.Draw(frame)
        partial = _partial_points(points, progress)
        if len(partial) >= 2:
            draw.line(partial, fill=LINE_COLOR, width=LINE_WIDTH, joint="curve")
        sx, sy = points[0]
        draw.ellipse(
            (sx - START_RADIUS, sy - START_RADIUS, sx + START_RADIUS, sy + START_RADIUS),
            fill="white", outline=LINE_COLOR, width=4,
        )
        hx, hy = partial[-1]
        draw.ellipse(
            (hx - HEAD_RADIUS, hy - HEAD_RADIUS, hx + HEAD_RADIUS, hy + HEAD_RADIUS),
            fill=LINE_COLOR, outline="white", width=4,
        )
        frame.save(os.path.join(frames_dir, f"frame{i:03d}.png"))
    return os.path.join(frames_dir, "frame%03d.png")
