"""trip 미디어 좌표 조회 + trips.pois 기록 (허용된 쓰기 — DESIGN §5)."""

import json
import os
from typing import Any

import psycopg
from dotenv import load_dotenv

from spatial.clustering import MediaPoint

load_dotenv()


def _database_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL 환경변수가 설정되지 않았습니다 (.env 참조)")
    return url


def trip_exists(trip_id: str) -> bool:
    with psycopg.connect(_database_url()) as conn:
        row = conn.execute("SELECT 1 FROM trips WHERE id = %s", (trip_id,)).fetchone()
        return row is not None


def fetch_trip_media_points(trip_id: str) -> list[MediaPoint]:
    with psycopg.connect(_database_url()) as conn:
        rows = conn.execute(
            """SELECT id::text, extract(epoch FROM captured_at),
                      ST_X(location::geometry), ST_Y(location::geometry)
               FROM media
               WHERE trip_id = %s AND location IS NOT NULL
               ORDER BY captured_at""",
            (trip_id,),
        ).fetchall()
    return [MediaPoint(media_id=r[0], epoch_s=float(r[1]), lon=r[2], lat=r[3]) for r in rows]


def update_trip_pois(trip_id: str, pois: list[dict[str, Any]]) -> None:
    with psycopg.connect(_database_url()) as conn:
        conn.execute(
            "UPDATE trips SET pois = %s, updated_at = now() WHERE id = %s",
            (json.dumps(pois), trip_id),
        )
