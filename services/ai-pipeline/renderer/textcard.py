"""텍스트 카드 PNG 생성 — Pillow (drawtext 필터가 없는 FFmpeg 빌드 대응, 기술 노트 참조)."""

import os

from PIL import Image, ImageDraw, ImageFont

from renderer.commands import BG_COLOR, HEIGHT, WIDTH

DEFAULT_FONT = "/System/Library/Fonts/AppleSDGothicNeo.ttc"


def _font(size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(os.environ.get("RENDER_FONT_PATH", DEFAULT_FONT), size)


def make_text_card(text: str, out_path: str, font_size: int = 64) -> str:
    img = Image.new("RGB", (WIDTH, HEIGHT), f"#{BG_COLOR.removeprefix('0x')}")
    draw = ImageDraw.Draw(img)
    font = _font(font_size)
    bbox = draw.multiline_textbbox((0, 0), text, font=font, spacing=28, align="center")
    x = (WIDTH - (bbox[2] - bbox[0])) / 2 - bbox[0]
    y = (HEIGHT - (bbox[3] - bbox[1])) / 2 - bbox[1]
    draw.multiline_text((x, y), text, font=font, fill="white", spacing=28, align="center")
    img.save(out_path)
    return out_path
