"""director.generate_edl — 분석 결과 결합 → EDL 기록 + status 전이 (design §0-3)."""

from typing import Any

from celery import shared_task

from audio.analysis import analyze_audio
from common.progress import set_progress
from director import db
from director.edl import build_edl


@shared_task(name="director.generate_edl", bind=True)
def generate_edl(self, short_form_id: str, bgm_uri: str | None = None) -> dict[str, Any]:
    task_id = self.request.id
    set_progress(task_id, "processing")

    with db.connect() as conn:
        ctx = db.fetch_context(conn, short_form_id)
        if ctx is None:
            set_progress(task_id, "failed", detail={"error": f"short_form {short_form_id} 없음"})
            raise ValueError(f"short_form {short_form_id} 없음")

        db.set_status(conn, short_form_id, "analyzing")
        try:
            bgm = None
            if bgm_uri:
                # BGM 분석 실패는 잡 실패 — 사용자가 고른 BGM을 조용히 무시하지 않는다 (plan §5)
                bgm = {"uri": bgm_uri, **analyze_audio(bgm_uri)}

            edl = build_edl(
                title=ctx["title"],
                stats=ctx["stats"],
                media=ctx["media"],
                pois=ctx["pois"],
                bgm=bgm,
            )
            db.save_edl(conn, short_form_id, edl)
        except Exception as e:
            db.mark_failed(conn, short_form_id, str(e))
            set_progress(task_id, "failed", detail={"error": str(e)})
            raise

    summary = {
        "shortFormId": short_form_id,
        "status": "rendering",
        "segments": len(edl["segments"]),
        "bodyCuts": len(edl["segments"][1]["cuts"]),
        "highlightCuts": len(edl["segments"][2]["cuts"]),
        "bgm": bool(bgm),
    }
    set_progress(task_id, "done", detail=summary)
    return summary
