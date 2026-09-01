"""vision.score_media — 이미지 목록 스코어링 (항목 실패 격리, design §0-4)."""

from datetime import datetime, timezone
from typing import Any

from celery import shared_task

from common.progress import set_progress
from vision.db import update_vision_score
from vision.scoring import load_image, score_image


@shared_task(name="vision.score_media", bind=True)
def score_media(self, items: list[dict[str, Any]]) -> dict[str, Any]:
    task_id = self.request.id
    total = len(items)
    results: list[dict[str, Any]] = []
    scored = 0
    failed = 0

    for i, item in enumerate(items):
        uri = item.get("uri", "")
        media_id = item.get("mediaId")
        try:
            payload = score_image(load_image(uri))
            payload["scoredAt"] = datetime.now(timezone.utc).isoformat()
            if media_id is not None:
                if not update_vision_score(media_id, payload):
                    raise ValueError(f"media {media_id} 없음")
            results.append({"uri": uri, "mediaId": media_id, **payload})
            scored += 1
        except Exception as e:  # 항목 격리 — 한 파일이 잡 전체를 죽이지 않는다 (plan §5)
            results.append({"uri": uri, "mediaId": media_id, "error": str(e)})
            failed += 1
        set_progress(task_id, "processing", detail={"done": i + 1, "total": total})

    summary = {"results": results, "scored": scored, "failed": failed}
    set_progress(task_id, "done", detail=summary)
    return summary
