"""renderer.render_short_form — EDL을 9:16 mp4로 합성 (design §0-1)."""

import os
import subprocess
import tempfile
from typing import Any

from celery import shared_task

from common.progress import set_progress
from renderer import commands, db
from renderer.textcard import make_text_card


def _run(argv: list[str]) -> None:
    proc = subprocess.run(argv, capture_output=True, text=True)
    if proc.returncode != 0:
        # stderr 마지막 줄들이 FFmpeg 오류의 실체 (plan §5)
        tail = "\n".join(proc.stderr.strip().splitlines()[-4:])
        raise RuntimeError(f"ffmpeg 실패: {tail}")


def _write_text(workdir: str, name: str, text: str) -> str:
    path = os.path.join(workdir, name)
    with open(path, "w", encoding="utf-8") as f:
        f.write(text)
    return path


def _render_segments(
    edl: dict[str, Any], storage_keys: dict[str, str | None], workdir: str, task_id: str
) -> list[str]:
    clips: list[str] = []
    segments = edl["segments"]
    for i, seg in enumerate(segments):
        out = os.path.join(workdir, f"seg{i}.mp4")
        duration = float(seg["end"]) - float(seg["start"])

        if seg["kind"] == "map_overview":
            # 자리 표시자 — 기능 12(map-animation)에서 궤적 조감으로 교체
            card = make_text_card(
                edl.get("title") or "Vobby 여행",
                os.path.join(workdir, "intro.png"),
                font_size=72,
            )
            _run(commands.still_clip_cmd(card, duration, out))
            clips.append(out)
        elif seg["kind"] == "stats":
            s = seg["stats"]
            distance = f"{s['distanceM'] / 1000:.1f}km" if s.get("distanceM") else "-"
            lines = f"이동 {distance}\n{round(s['durationS'] / 60)}분의 기록\n사진 {s['mediaCount']}장"
            card = make_text_card(lines, os.path.join(workdir, "outro.png"), font_size=56)
            _run(commands.still_clip_cmd(card, duration, out))
            clips.append(out)
        elif seg["kind"] == "cuts":
            for j, cut in enumerate(seg["cuts"]):
                key = storage_keys.get(cut["mediaId"])
                if not key:
                    raise ValueError(f"원본 누락: media {cut['mediaId']} (storage_key 없음)")
                image = db.resolve_media_path(key)
                if not os.path.exists(image):
                    raise ValueError(f"원본 누락: {image}")
                cut_out = os.path.join(workdir, f"seg{i}c{j}.mp4")
                _run(
                    commands.kenburns_clip_cmd(
                        image, float(cut["end"]) - float(cut["start"]), cut_out
                    )
                )
                clips.append(cut_out)

        set_progress(task_id, "processing", detail={"segment": i + 1, "total": len(segments)})
    return clips


@shared_task(name="renderer.render_short_form", bind=True)
def render_short_form(self, short_form_id: str) -> dict[str, Any]:
    task_id = self.request.id
    set_progress(task_id, "processing")

    with db.connect() as conn:
        ctx = db.fetch_render_context(conn, short_form_id)
        if ctx is None:
            set_progress(task_id, "failed", detail={"error": f"short_form {short_form_id} 없음"})
            raise ValueError(f"short_form {short_form_id} 없음")
        if not ctx["edl"]:
            db.mark_failed(conn, short_form_id, "EDL 없음 — director.generate_edl 선행 필요")
            set_progress(task_id, "failed", detail={"error": "EDL 없음"})
            raise ValueError("EDL 없음")

        edl = ctx["edl"]
        try:
            renders_dir = os.path.join(db.storage_root(), "renders")
            os.makedirs(renders_dir, exist_ok=True)
            video_key = f"renders/{short_form_id}.mp4"
            thumb_key = f"renders/{short_form_id}.jpg"

            with tempfile.TemporaryDirectory(prefix="vobby-render-") as workdir:
                clips = _render_segments(edl, ctx["storageKeys"], workdir, task_id)

                list_file = _write_text(
                    workdir, "concat.txt", "".join(f"file '{c}'\n" for c in clips)
                )
                silent = os.path.join(workdir, "video.mp4")
                _run(commands.concat_cmd(list_file, silent))

                bgm_uri = (edl.get("bgm") or {}).get("uri")
                final = os.path.join(db.storage_root(), video_key)
                _run(commands.mux_audio_cmd(silent, bgm_uri, float(edl["durationS"]), final))
                # 썸네일: highlight 시작 지점 프레임
                _run(
                    commands.thumbnail_cmd(
                        final, float(edl["segments"][2]["start"]),
                        os.path.join(db.storage_root(), thumb_key),
                    )
                )

            db.save_render_result(
                conn, short_form_id, video_key, thumb_key, int(edl["durationS"])
            )
        except Exception as e:
            db.mark_failed(conn, short_form_id, str(e))
            set_progress(task_id, "failed", detail={"error": str(e)})
            raise

    summary = {
        "shortFormId": short_form_id,
        "status": "done",
        "videoKey": video_key,
        "thumbnailKey": thumb_key,
        "durationS": int(edl["durationS"]),
    }
    set_progress(task_id, "done", detail=summary)
    return summary
