"""진행률 키 규약 — Main API가 이 키를 읽는다 (design §0-2).

키: vobby:progress:{task_id}
값: JSON {"status": str, "detail": Any, "updatedAt": iso8601}
TTL: 1시간 — 완료 후 무한 잔존 금지
"""

import json
import os
from datetime import datetime, timezone
from typing import Any

import redis
from dotenv import load_dotenv

load_dotenv()

PROGRESS_TTL_SECONDS = 60 * 60
_KEY_PREFIX = "vobby:progress:"

_client: redis.Redis | None = None


def _get_client() -> redis.Redis:
    global _client
    if _client is None:
        url = os.environ.get("REDIS_URL")
        if not url:
            raise RuntimeError("REDIS_URL 환경변수가 설정되지 않았습니다 (.env 참조)")
        _client = redis.Redis.from_url(url)
    return _client


def set_progress(task_id: str, status: str, detail: Any = None) -> None:
    payload = {
        "status": status,
        "detail": detail,
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    _get_client().set(
        f"{_KEY_PREFIX}{task_id}",
        json.dumps(payload, ensure_ascii=False),
        ex=PROGRESS_TTL_SECONDS,
    )
