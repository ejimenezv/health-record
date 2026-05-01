import json
from typing import Optional

import structlog

from src.transcription.diarization.models import (
    DiarizedSegment,
    DiarizedTranscript,
    Speaker,
    SpeakerRole,
    SpeakerState,
)

logger = structlog.get_logger()


class IncrementalTranscriptBuilder:
    def __init__(self, redis_client):
        self.redis = redis_client

    async def add_chunk(
        self,
        session_id: str,
        text: str,
        speaker_id: str,
        speaker_role: SpeakerRole,
        start_time: float,
        end_time: float,
    ) -> DiarizedSegment:
        transcript_state = await self._load_transcript_state(session_id)

        if transcript_state is None:
            transcript_state = {"segments": [], "speakers_seen": []}

        segment = DiarizedSegment(
            text=text,
            speaker=Speaker(id=speaker_id, role=speaker_role),
            start_time=start_time,
            end_time=end_time,
        )

        transcript_state["segments"].append(segment.model_dump(mode="json"))
        if speaker_id not in transcript_state["speakers_seen"]:
            transcript_state["speakers_seen"].append(speaker_id)

        await self._save_transcript_state(session_id, transcript_state)

        logger.debug(
            "Added chunk to incremental transcript",
            session_id=session_id,
            speaker=speaker_id,
            role=speaker_role.value,
            total_segments=len(transcript_state["segments"]),
        )

        return segment

    async def get_current_transcript(
        self, session_id: str, speaker_state: SpeakerState
    ) -> DiarizedTranscript:
        transcript_state = await self._load_transcript_state(session_id)

        if transcript_state is None:
            return DiarizedTranscript(
                segments=[],
                speakers=[],
                full_text="",
                text_by_speaker={},
                timeline=[],
            )

        segments = []
        for seg_dict in transcript_state["segments"]:
            speaker_id = seg_dict["speaker"]["id"]
            speaker = speaker_state.speakers.get(
                speaker_id, Speaker(id=speaker_id, role=SpeakerRole.UNKNOWN)
            )
            segments.append(
                DiarizedSegment(
                    text=seg_dict["text"],
                    speaker=speaker,
                    start_time=seg_dict["start_time"],
                    end_time=seg_dict["end_time"],
                )
            )

        text_by_speaker = {}
        for speaker_id in speaker_state.speakers.keys():
            texts = [
                seg.text for seg in segments if seg.speaker.id == speaker_id and seg.text
            ]
            text_by_speaker[speaker_id] = " ".join(texts)

        full_text = " ".join(seg.text for seg in segments if seg.text)
        timeline = sorted(segments, key=lambda x: x.start_time)

        return DiarizedTranscript(
            segments=segments,
            speakers=list(speaker_state.speakers.values()),
            full_text=full_text,
            text_by_speaker=text_by_speaker,
            timeline=timeline,
        )

    async def _load_transcript_state(self, session_id: str) -> Optional[dict]:
        key = f"transcript_state:{session_id}"
        data = await self.redis.get(key)
        if data:
            return json.loads(data)
        return None

    async def _save_transcript_state(self, session_id: str, state: dict) -> None:
        key = f"transcript_state:{session_id}"
        await self.redis.setex(key, 7200, json.dumps(state))


class ConversationFormatter:
    @staticmethod
    def format_conversation(
        transcript: DiarizedTranscript,
        include_timestamps: bool = False,
        use_role_labels: bool = True,
    ) -> str:
        lines = []
        for segment in transcript.timeline:
            if use_role_labels:
                if segment.speaker.role == SpeakerRole.DOCTOR:
                    label = "Doctor"
                elif segment.speaker.role == SpeakerRole.PATIENT:
                    label = "Paciente"
                else:
                    label = segment.speaker.id
            else:
                label = segment.speaker.id

            if include_timestamps:
                time_str = f"[{segment.start_time:.1f}s]"
                lines.append(f"{time_str} {label}: {segment.text}")
            else:
                lines.append(f"{label}: {segment.text}")

        return "\n\n".join(lines)

    @staticmethod
    def format_speaker_summary(speaker_state: SpeakerState) -> str:
        lines = ["Speaker Assignments:"]
        for speaker_id, speaker in speaker_state.speakers.items():
            lines.append(
                f"  {speaker_id}: {speaker.role.value} "
                f"(confidence: {speaker.confidence:.2f}, "
                f"duration: {speaker.total_speech_duration:.1f}s)"
            )
        return "\n".join(lines)
