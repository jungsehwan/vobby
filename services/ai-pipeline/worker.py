"""Vobby AI 파이프라인 Celery 워커 진입점.

실행: .venv/bin/celery -A worker worker --loglevel=info
"""

import os

from celery import Celery
from dotenv import load_dotenv

load_dotenv()


def _require_env(key: str) -> str:
    value = os.environ.get(key)
    if not value:
        # 브로커 URL 없이 기본값(localhost:6379 — 타 프로젝트 redis)으로
        # 조용히 붙는 사고를 막는다 (main-api data-source와 동일 원칙)
        raise RuntimeError(f"{key} 환경변수가 설정되지 않았습니다 (.env 참조)")
    return value


app = Celery(
    "vobby-pipeline",
    broker=_require_env("CELERY_BROKER_URL"),
    backend=_require_env("CELERY_RESULT_BACKEND"),
    include=["common.tasks", "vision.tasks"],
)

app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
)
