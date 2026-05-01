import pytest

from src.transcription.diarization import (
    ConversationFormatter,
    DiarizedSegment,
    DiarizedTranscript,
    IncrementalDiarizer,
    IncrementalTranscriptBuilder,
    Speaker,
    SpeakerChangeEvent,
    SpeakerRole,
    SpeakerState,
)


class FakeRedis:
    """In-memory fake Redis for unit tests (only the methods we need)."""

    def __init__(self):
        self.store: dict[str, str] = {}

    async def get(self, key: str):
        return self.store.get(key)

    async def setex(self, key: str, ttl: int, value: str):
        self.store[key] = value


@pytest.fixture
def fake_redis():
    return FakeRedis()


class TestIncrementalDiarizer:
    @pytest.fixture
    def diarizer(self, fake_redis):
        return IncrementalDiarizer(redis_client=fake_redis)

    @pytest.mark.asyncio
    async def test_process_first_chunk_initializes_state(self, diarizer, fake_redis):
        result = await diarizer.process_chunk(
            transcript_text="Buenos días, ¿cómo se encuentra?",
            timestamp=1.0,
            session_id="test-session-1",
        )

        assert result.chunk_index == 0
        assert result.speaker_id in ["SPEAKER_0", "SPEAKER_1"]
        assert result.speaker_changed is False
        assert "speaker_state:test-session-1" in fake_redis.store

    @pytest.mark.asyncio
    async def test_process_chunk_detects_doctor_speaker(self, diarizer):
        result = await diarizer.process_chunk(
            transcript_text="Voy a recetarle ibuprofeno 400 miligramos cada 8 horas.",
            timestamp=5.0,
            session_id="test-session-2",
        )

        state = await diarizer.get_speaker_state("test-session-2")
        assert state is not None
        assert state.role_indicators[result.speaker_id]["doctor"] > 0

    @pytest.mark.asyncio
    async def test_process_chunk_detects_patient_speaker(self, diarizer):
        result = await diarizer.process_chunk(
            transcript_text="Me duele mucho la cabeza desde hace tres días.",
            timestamp=10.0,
            session_id="test-session-3",
        )

        state = await diarizer.get_speaker_state("test-session-3")
        assert state is not None
        assert state.role_indicators[result.speaker_id]["patient"] > 0

    @pytest.mark.asyncio
    async def test_speaker_change_emits_event(self, fake_redis):
        events_emitted: list[SpeakerChangeEvent] = []

        async def event_callback(event: SpeakerChangeEvent):
            events_emitted.append(event)

        diarizer = IncrementalDiarizer(
            redis_client=fake_redis, event_callback=event_callback
        )

        # Strong doctor signal first (>=2 doctor indicators)
        await diarizer.process_chunk(
            transcript_text="Voy a recetarle un medicamento, dosis de 400 miligramos.",
            timestamp=1.0,
            session_id="test-session-4",
        )
        # Strong patient signal next (>=2 patient indicators) → speaker change
        await diarizer.process_chunk(
            transcript_text="Me duele la cabeza, tengo dolor desde hace días.",
            timestamp=6.0,
            session_id="test-session-4",
        )

        assert len(events_emitted) >= 1
        assert events_emitted[-1].new_speaker_role == SpeakerRole.PATIENT

    @pytest.mark.asyncio
    async def test_confidence_increases_with_more_indicators(self, diarizer):
        session_id = "test-session-5"

        result1 = await diarizer.process_chunk(
            transcript_text="Voy a recetarle",
            timestamp=1.0,
            session_id=session_id,
        )
        confidence1 = result1.role_confidence

        result2 = await diarizer.process_chunk(
            transcript_text="este medicamento de 400 miligramos",
            timestamp=6.0,
            session_id=session_id,
        )
        confidence2 = result2.role_confidence

        if result1.speaker_id == result2.speaker_id:
            assert confidence2 >= confidence1

    @pytest.mark.asyncio
    async def test_finalize_assigns_complementary_role(self, diarizer):
        session_id = "test-session-finalize"

        # Make SPEAKER_0 clearly the doctor
        await diarizer.process_chunk(
            transcript_text="Voy a recetarle un medicamento, dosis 400 miligramos cada 8 horas.",
            timestamp=1.0,
            session_id=session_id,
        )

        state = await diarizer.finalize_session(session_id)
        roles = {sid: sp.role for sid, sp in state.speakers.items()}
        assert SpeakerRole.DOCTOR in roles.values()
        assert SpeakerRole.PATIENT in roles.values()


class TestIncrementalTranscriptBuilder:
    @pytest.fixture
    def builder(self, fake_redis):
        return IncrementalTranscriptBuilder(redis_client=fake_redis)

    @pytest.mark.asyncio
    async def test_add_chunk_creates_segment(self, builder):
        segment = await builder.add_chunk(
            session_id="test-session-6",
            text="Buenos días.",
            speaker_id="SPEAKER_0",
            speaker_role=SpeakerRole.DOCTOR,
            start_time=0.0,
            end_time=2.0,
        )

        assert segment.text == "Buenos días."
        assert segment.speaker.id == "SPEAKER_0"
        assert segment.speaker.role == SpeakerRole.DOCTOR

    @pytest.mark.asyncio
    async def test_get_current_transcript_builds_full_transcript(self, builder):
        session_id = "test-session-7"

        await builder.add_chunk(
            session_id=session_id,
            text="Buenos días.",
            speaker_id="SPEAKER_0",
            speaker_role=SpeakerRole.DOCTOR,
            start_time=0.0,
            end_time=2.0,
        )
        await builder.add_chunk(
            session_id=session_id,
            text="Hola doctor.",
            speaker_id="SPEAKER_1",
            speaker_role=SpeakerRole.PATIENT,
            start_time=3.0,
            end_time=5.0,
        )

        speaker_state = SpeakerState(
            session_id=session_id,
            speakers={
                "SPEAKER_0": Speaker(id="SPEAKER_0", role=SpeakerRole.DOCTOR),
                "SPEAKER_1": Speaker(id="SPEAKER_1", role=SpeakerRole.PATIENT),
            },
        )

        transcript = await builder.get_current_transcript(session_id, speaker_state)
        assert len(transcript.segments) == 2
        assert "Buenos días" in transcript.full_text
        assert "Hola doctor" in transcript.full_text


class TestConversationFormatter:
    def test_format_conversation_with_roles(self):
        transcript = DiarizedTranscript(
            segments=[],
            speakers=[
                Speaker(id="SPEAKER_0", role=SpeakerRole.DOCTOR),
                Speaker(id="SPEAKER_1", role=SpeakerRole.PATIENT),
            ],
            full_text="",
            text_by_speaker={},
            timeline=[
                DiarizedSegment(
                    text="Buenos días.",
                    speaker=Speaker(id="SPEAKER_0", role=SpeakerRole.DOCTOR),
                    start_time=0,
                    end_time=1,
                ),
                DiarizedSegment(
                    text="Hola doctor.",
                    speaker=Speaker(id="SPEAKER_1", role=SpeakerRole.PATIENT),
                    start_time=2,
                    end_time=3,
                ),
            ],
        )

        formatted = ConversationFormatter.format_conversation(transcript)
        assert "Doctor: Buenos días." in formatted
        assert "Paciente: Hola doctor." in formatted

    def test_format_speaker_summary(self):
        state = SpeakerState(
            session_id="test",
            speakers={
                "SPEAKER_0": Speaker(
                    id="SPEAKER_0",
                    role=SpeakerRole.DOCTOR,
                    confidence=0.92,
                    total_speech_duration=45.5,
                ),
                "SPEAKER_1": Speaker(
                    id="SPEAKER_1",
                    role=SpeakerRole.PATIENT,
                    confidence=0.88,
                    total_speech_duration=38.2,
                ),
            },
        )

        summary = ConversationFormatter.format_speaker_summary(state)
        assert "SPEAKER_0" in summary
        assert "doctor" in summary
        assert "0.92" in summary
        assert "45.5s" in summary
