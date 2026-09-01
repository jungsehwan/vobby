"""FFmpeg argv 조립 — 순수 함수 (design §0-3·0-4). 실행은 tasks.py."""

WIDTH, HEIGHT, FPS = 1080, 1920, 30
BG_COLOR = "0x1a1a1e"  # ui-tokens gray900
KENBURNS_ZOOM_TO = 1.12

def _base_video_args() -> list[str]:
    return ["-r", str(FPS), "-pix_fmt", "yuv420p", "-c:v", "libx264", "-preset", "fast", "-an"]


def still_clip_cmd(image_path: str, duration_s: float, out_path: str) -> list[str]:
    """정적 이미지 클립 — 텍스트 카드(Pillow 생성)용. drawtext 필터 비의존 (기술 노트)."""
    return [
        "ffmpeg", "-y",
        "-loop", "1", "-i", image_path,
        "-vf", f"scale={WIDTH}:{HEIGHT}",
        *_base_video_args(),
        "-t", str(duration_s),
        out_path,
    ]


def kenburns_clip_cmd(image_path: str, duration_s: float, out_path: str) -> list[str]:
    """9:16 중앙 크롭 + Ken Burns 줌인 (기획 Phase 4)."""
    frames = max(1, round(duration_s * FPS))
    # cover 스케일(비율 유지, 초과분 크롭) → zoompan 줌인
    vf = (
        f"scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,"
        f"crop={WIDTH}:{HEIGHT},"
        f"zoompan=z='1+({KENBURNS_ZOOM_TO}-1)*on/{frames}'"
        f":d={frames}:s={WIDTH}x{HEIGHT}:fps={FPS}"
    )
    return [
        "ffmpeg", "-y",
        "-loop", "1", "-i", image_path,
        "-vf", vf,
        *_base_video_args(),
        "-t", str(duration_s),
        out_path,
    ]


def concat_cmd(list_file: str, out_path: str) -> list[str]:
    return [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0", "-i", list_file,
        "-c", "copy",
        out_path,
    ]


def mux_audio_cmd(
    video_path: str, bgm_path: str | None, total_s: float, out_path: str
) -> list[str]:
    """BGM 트림+페이드아웃 먹싱 — 없으면 무음 트랙."""
    if bgm_path:
        audio_in = ["-i", bgm_path]
        afilter = f"atrim=0:{total_s},afade=t=out:st={total_s - 2}:d=2"
    else:
        audio_in = ["-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=44100"]
        afilter = f"atrim=0:{total_s}"
    return [
        "ffmpeg", "-y",
        "-i", video_path,
        *audio_in,
        "-filter_complex", f"[1:a]{afilter}[a]",
        "-map", "0:v", "-map", "[a]",
        "-c:v", "copy", "-c:a", "aac", "-shortest",
        out_path,
    ]


def thumbnail_cmd(video_path: str, at_s: float, out_path: str) -> list[str]:
    return ["ffmpeg", "-y", "-ss", str(at_s), "-i", video_path, "-frames:v", "1", out_path]
