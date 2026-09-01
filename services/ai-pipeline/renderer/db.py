"""렌더 컨텍스트 조회 + 산출물 기록 — 단일 연결 (DESIGN §5)."""

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


def storage_root() -> str:
    root = os.environ.get("MEDIA_STORAGE_ROOT")
    if not root:
        raise RuntimeError("MEDIA_STORAGE_ROOT 환경변수가 설정되지 않았습니다 (.env 참조)")
    return root


def resolve_media_path(storage_key: str) -> str:
    """로컬 스토리지 규약 — S3 도입 시 이 함수만 교체 (design §0-2)."""
    return os.path.join(storage_root(), storage_key)


def connect() -> psycopg.Connection:
    return psycopg.connect(_database_url())


def fetch_render_context(conn: psycopg.Connection, short_form_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        "SELECT edl, trip_id::text FROM short_forms WHERE id = %s",
        (short_form_id,),
    ).fetchone()
    if not row:
        return None
    edl, trip_id = row
    keys = conn.execute(
        "SELECT id::text, storage_key FROM media WHERE trip_id = %s",
        (trip_id,),
    ).fetchall()
    return {"edl": edl, "storageKeys": {k[0]: k[1] for k in keys}}


def save_render_result(
    conn: psycopg.Connection,
    short_form_id: str,
    video_key: str,
    thumbnail_key: str,
    duration_s: int,
) -> None:
    conn.execute(
        """UPDATE short_forms SET status = 'done', video_key = %s, thumbnail_key = %s,
           duration_s = %s, error_message = NULL, updated_at = now() WHERE id = %s""",
        (video_key, thumbnail_key, duration_s, short_form_id),
    )
    conn.commit()


def mark_failed(conn: psycopg.Connection, short_form_id: str, error: str) -> None:
    conn.execute(
        """UPDATE short_forms SET status = 'failed', error_message = %s,
           updated_at = now() WHERE id = %s""",
        (error[:500], short_form_id),
    )
    conn.commit()
