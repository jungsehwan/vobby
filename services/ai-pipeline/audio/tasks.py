"""audio.analyze_bgm — BGM 분석 태스크 (URL은 임시 파일 경유, design §0-3)."""

import os
import tempfile
import urllib.request
from typing import Any

from celery import shared_task

from audio.analysis import analyze_audio
from common.progress import set_progress


@shared_task(name="audio.analyze_bgm", bind=True)
def analyze_bgm(self, uri: str) -> dict[str, Any]:
    task_id = self.request.id
    set_progress(task_id, "processing")

    tmp_path: str | None = None
    try:
        path = uri
        if uri.startswith(("http://", "https://")):
            suffix = os.path.splitext(uri)[1] or ".audio"
            with urllib.request.urlopen(uri, timeout=30) as res:
                with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
                    tmp.write(res.read())
                    tmp_path = tmp.name
            path = tmp_path
        if not os.path.exists(path):
            raise FileNotFoundError(f"오디오 파일 없음: {uri}")

        result = analyze_audio(path)
    except Exception as e:
        # 조용한 성공 금지 — 잡 실패로 표면화 (plan §5)
        set_progress(task_id, "failed", detail={"error": str(e), "uri": uri})
        raise
    finally:
        if tmp_path:
            os.unlink(tmp_path)

    summary = {"uri": uri, **result}
    set_progress(task_id, "done", detail=summary)
    return summary
