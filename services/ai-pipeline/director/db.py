"""short_form 컨텍스트 조회 + edl/status 기록 — 상태 갱신 쓰기 (DESIGN §5).
태스크 단위 단일 연결 사용 (spatial/db.py의 다중 연결 tech-debt 반영)."""

import json
import os
from typing import Any

import psycopg
from dotenv import load_dotenv

from director.edl import MediaItem

load_dotenv()


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL 환경변수가 설정되지 않았습니다 (.env 참조)")
    return url


def connect() -> psycopg.Connection:
    return psycopg.connect(_database_url())


def fetch_context(conn: psycopg.Connection, short_form_id: str) -> dict[str, Any] | None:
    row = conn.execute(
        """SELECT s.id::text, s.trip_id::text, t.title, t.distance_m, t.media_count, t.pois,
                  extract(epoch FROM t.ended_at) - extract(epoch FROM t.started_at)
           FROM short_forms s JOIN trips t ON t.id = s.trip_id
           WHERE s.id = %s""",
        (short_form_id,),
    ).fetchone()
    if not row:
        return None

    media_rows = conn.execute(
        """SELECT id::text, extract(epoch FROM captured_at),
                  COALESCE((vision_score->>'score')::int, 0),
                  vision_score->>'category',
                  ST_X(location::geometry), ST_Y(location::geometry)
           FROM media WHERE trip_id = %s ORDER BY captured_at""",
        (row[1],),
    ).fetchall()

    return {
        "shortFormId": row[0],
        "tripId": row[1],
        "title": row[2],
        "stats": {
            "distanceM": row[3],
            "durationS": int(row[6]),
            "mediaCount": row[4],
        },
        "pois": row[5] or [],
        "media": [
            MediaItem(
                media_id=m[0], epoch_s=float(m[1]), score=m[2], category=m[3],
                lon=m[4], lat=m[5],
            )
            for m in media_rows
        ],
    }


def set_status(conn: psycopg.Connection, short_form_id: str, status: str) -> None:
    conn.execute(
        "UPDATE short_forms SET status = %s, updated_at = now() WHERE id = %s",
        (status, short_form_id),
    )
    conn.commit()


def save_edl(conn: psycopg.Connection, short_form_id: str, edl: dict[str, Any]) -> None:
    conn.execute(
        """UPDATE short_forms SET edl = %s, status = 'rendering',
           error_message = NULL, updated_at = now() WHERE id = %s""",
        (json.dumps(edl), short_form_id),
    )
    conn.commit()


def mark_failed(conn: psycopg.Connection, short_form_id: str, error: str) -> None:
    conn.execute(
        """UPDATE short_forms SET status = 'failed', error_message = %s,
           updated_at = now() WHERE id = %s""",
        (error[:500], short_form_id),
    )
    conn.commit()
