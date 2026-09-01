"""spatial.extract_pois — 여행 POI 추출·기록 (재실행 멱등, design §0-2)."""

from typing import Any

from celery import shared_task

from common.progress import set_progress
from spatial.clustering import cluster_pois
from spatial.db import fetch_trip_media_points, trip_exists, update_trip_pois


@shared_task(name="spatial.extract_pois", bind=True)
def extract_pois(self, trip_id: str) -> dict[str, Any]:
    task_id = self.request.id
    set_progress(task_id, "processing")

    if not trip_exists(trip_id):
        # 조용한 성공 금지 (plan §5) — 잡 실패로 표면화
        set_progress(task_id, "failed", detail={"error": f"trip {trip_id} 없음"})
        raise ValueError(f"trip {trip_id} 없음")

    points = fetch_trip_media_points(trip_id)
    pois = cluster_pois(points)
    update_trip_pois(trip_id, pois)

    summary = {
        "tripId": trip_id,
        "gpsMediaCount": len(points),
        "pois": pois,
        "poiCount": len(pois),
    }
    set_progress(task_id, "done", detail=summary)
    return summary
