"""BGM 분석 — 순수 함수 (design §0-1). 결과 형식은 EDL(기능 11)의 입력 계약."""

from typing import Any

import librosa
import numpy as np

# Highlight 컷 배치용 구간 길이와 상응 (plan §4)
CLIMAX_WINDOW_S = 10.0


def analyze_audio(path: str) -> dict[str, Any]:
    y, sr = librosa.load(path, mono=True)
    duration = float(librosa.get_duration(y=y, sr=sr))

    tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
    bpm = float(np.atleast_1d(tempo)[0])
    beats = librosa.frames_to_time(beat_frames, sr=sr)

    onsets = librosa.onset.onset_detect(y=y, sr=sr, units="time")

    # 클라이맥스: RMS 이동 평균 최대 구간 (Drop 근사)
    rms = librosa.feature.rms(y=y)[0]
    hop_duration = float(librosa.frames_to_time(1, sr=sr))
    window_frames = max(1, int(CLIMAX_WINDOW_S / hop_duration))
    if len(rms) <= window_frames:
        climax = {"start": 0.0, "end": round(duration, 3)}
    else:
        moving = np.convolve(rms, np.ones(window_frames) / window_frames, mode="valid")
        start_frame = int(moving.argmax())
        start = float(librosa.frames_to_time(start_frame, sr=sr))
        climax = {
            "start": round(start, 3),
            "end": round(min(start + CLIMAX_WINDOW_S, duration), 3),
        }

    return {
        "bpm": round(bpm, 1) if bpm > 0 else None,
        "beats": [round(float(t), 3) for t in beats],
        "onsets": [round(float(t), 3) for t in onsets],
        "climax": climax,
        "durationS": round(duration, 3),
    }
