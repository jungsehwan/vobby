"""media.vision_score 기록 — Python 워커의 허용된 유일한 쓰기 경로 (DESIGN §5)."""

import json
import os
from typing import Any

import psycopg
from dotenv import load_dotenv

load_dotenv()


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL 환경변수가 설정되지 않았습니다 (.env 참조)")
    return url


def update_vision_score(media_id: str, payload: dict[str, Any]) -> bool:
    """기록 성공 시 True, 해당 media 없으면 False (호출측에서 항목 error 처리)."""
    with psycopg.connect(_database_url()) as conn:
        with conn.cursor() as cur:
            cur.execute(
                "UPDATE media SET vision_score = %s, updated_at = now() WHERE id = %s",
                (json.dumps(payload), media_id),
            )
            return cur.rowcount == 1
