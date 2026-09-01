"""큐 왕복 검증용 태스크 — 실제 파이프라인 태스크(마일스톤 3·4)의 진행률 보고 패턴 원형."""

from typing import Any

from celery import shared_task

from common.progress import set_progress


@shared_task(name="pipeline.ping", bind=True)
def ping(self, payload: Any = None) -> dict:
    task_id = self.request.id
    set_progress(task_id, "processing")
    result = {"echo": payload}
    set_progress(task_id, "done", detail=result)
    return result
