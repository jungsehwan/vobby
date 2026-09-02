"""pipeline.generate_short_form — 단계 태스크를 로컬 실행으로 잇는 오케스트레이터 (design §0-1).

Node(main-api)는 이 태스크 하나만 발행한다. 단계별 재시도·격리 규약은
각 단계 태스크(vision/spatial/director/renderer)가 그대로 소유한다.
"""

import os
from typing import Any

from celery import shared_task

from common.progress import set_progress
from director.tasks import generate_edl
from renderer import db
from renderer.tasks import render_short_form
from spatial.tasks import extract_pois
from vision.tasks import score_media


def _run_local(task, args: list[Any]) -> Any:
    """단계 태스크를 같은 워커에서 동기 실행 — throw=True가 실패를 즉시 전파.
    .get()은 태스크 내부 동기 서브태스크 가드에 걸리므로 .result로 읽는다."""
    return task.apply(args=args, throw=True).result


@shared_task(name="pipeline.generate_short_form", bind=True)
def generate_short_form(self, short_form_id: str) -> dict[str, Any]:
    task_id = self.request.id

    def stage(name: str) -> None:
        set_progress(task_id, "processing", detail={"stage": name})

    with db.connect() as conn:
        row = conn.execute(
            "SELECT trip_id::text FROM short_forms WHERE id = %s", (short_form_id,)
        ).fetchone()
        if not row:
            set_progress(task_id, "failed", detail={"error": f"short_form {short_form_id} 없음"})
            raise ValueError(f"short_form {short_form_id} 없음")
        trip_id = row[0]

        conn.execute(
            "UPDATE short_forms SET status = 'analyzing', updated_at = now() WHERE id = %s",
            (short_form_id,),
        )
        conn.commit()

        # 미채점 미디어만 스코어링 — 재요청 시 기존 점수 재사용 (멱등)
        pending = conn.execute(
            """SELECT id::text, storage_key FROM media
               WHERE trip_id = %s AND storage_key IS NOT NULL AND vision_score IS NULL
               ORDER BY captured_at""",
            (trip_id,),
        ).fetchall()

    try:
        stage("scoring")
        if pending:
            _run_local(
                score_media,
                [[{"mediaId": m[0], "uri": db.resolve_media_path(m[1])} for m in pending]],
            )

        stage("pois")
        _run_local(extract_pois, [trip_id])

        stage("edl")
        bgm_uri = os.environ.get("DEFAULT_BGM_PATH") or None
        _run_local(generate_edl, [short_form_id, bgm_uri])

        stage("render")
        result = _run_local(render_short_form, [short_form_id])
    except Exception as e:
        # 단계가 이미 failed를 기록했어도 동일 사유 덮어쓰기 — 조용한 실패 금지 (plan §5)
        with db.connect() as conn:
            db.mark_failed(conn, short_form_id, str(e))
        set_progress(task_id, "failed", detail={"error": str(e)})
        raise

    set_progress(task_id, "done", detail=result)
    return result
