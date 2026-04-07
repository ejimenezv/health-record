# Prompt 28: Implement Unit Tests

## Objective
Create comprehensive unit tests for all AI service components, with **PRIMARY focus on real-time streaming architecture** and LEGACY support for batch processing. Target coverage: >80% for core business logic.

## Context
Unit tests verify individual components in isolation. This includes:

**Real-time streaming components (PRIMARY):**
- WebSocket event serialization/deserialization
- Event persistence service (PostgreSQL storage)
- Real-time session state management
- Incremental processing (streaming chunks vs batch)
- Alert priority queue (CRITICAL/HIGH/MEDIUM/LOW)
- Frontend hooks (useRealtimeSession state management)

**Batch processing components (LEGACY):**
- Audio processing (VAD, chunking)
- Transcription service
- Diarization logic
- Extraction service
- RAG pipeline components
- Cost tracking
- Security/auth

## Tasks

### 1. Create Test Configuration

Create `ai-service/tests/conftest.py`:

```python
"""
Pytest configuration and shared fixtures.
"""
import asyncio
from datetime import datetime
from typing import AsyncGenerator, Generator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi.testclient import TestClient
from httpx import AsyncClient

from src.api.main import app
from src.core.config import Settings, get_settings


# Test settings override
def get_test_settings() -> Settings:
    """Test settings with mocked values."""
    return Settings(
        OPENAI_API_KEY="sk-test-key",
        JWT_SECRET_KEY="test-secret-key",
        DATABASE_URL="sqlite:///./test.db",
        CHROMA_HOST="localhost",
        CHROMA_PORT=8001,
        API_ENV="test",
        DEBUG=True,
        MONTHLY_BUDGET_USD=50.0,
    )


@pytest.fixture
def settings() -> Settings:
    """Provide test settings."""
    return get_test_settings()


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Synchronous test client."""
    app.dependency_overrides[get_settings] = get_test_settings
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
async def async_client() -> AsyncGenerator[AsyncClient, None]:
    """Async test client."""
    app.dependency_overrides[get_settings] = get_test_settings
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac
    app.dependency_overrides.clear()


# Sample audio fixtures
@pytest.fixture
def sample_audio_bytes() -> bytes:
    """Generate sample audio bytes (silence)."""
    import struct

    sample_rate = 16000
    duration_sec = 5
    num_samples = sample_rate * duration_sec

    # WAV header
    header = b'RIFF'
    header += struct.pack('<I', 36 + num_samples * 2)
    header += b'WAVEfmt '
    header += struct.pack('<IHHIIHH', 16, 1, 1, sample_rate, sample_rate * 2, 2, 16)
    header += b'data'
    header += struct.pack('<I', num_samples * 2)

    # Silent audio data
    audio_data = b'\x00\x00' * num_samples

    return header + audio_data


@pytest.fixture
def sample_transcription() -> str:
    """Sample Spanish medical transcription."""
    return """
    DOCTOR: Buenos días, ¿cómo se encuentra hoy?
    PACIENTE: Buenos días doctor. Tengo un dolor de cabeza muy fuerte desde hace tres días.
    DOCTOR: ¿Dónde exactamente le duele?
    PACIENTE: Me duele en la frente y a veces detrás de los ojos.
    DOCTOR: ¿Ha tomado algo para el dolor?
    PACIENTE: Sí, paracetamol de 500mg pero no me alivia.
    DOCTOR: Por los síntomas parece una cefalea tensional.
            Le voy a recetar ibuprofeno de 400mg cada 8 horas por 5 días.
    PACIENTE: ¿Tiene algún efecto secundario?
    DOCTOR: Tómelo con las comidas para evitar molestias estomacales.
    """


@pytest.fixture
def sample_extraction_result() -> dict:
    """Sample extraction result."""
    return {
        "symptoms": [
            {
                "name": "cefalea",
                "location": "frente, detrás de los ojos",
                "duration": "3 días",
                "severity": None,
            }
        ],
        "diagnoses": [
            {
                "name": "Cefalea tensional",
                "icd10_code": "G44.2",
                "type": "primary",
            }
        ],
        "prescriptions": [
            {
                "medication": "Ibuprofeno",
                "dose": "400mg",
                "frequency": "cada 8 horas",
                "duration": "5 días",
            }
        ],
        "soap_note": {
            "subjective": "Paciente refiere dolor de cabeza en frente y detrás de los ojos, de 3 días de evolución.",
            "objective": "No se mencionan hallazgos físicos.",
            "assessment": "Cefalea tensional",
            "plan": "Ibuprofeno 400mg cada 8 horas por 5 días. Tomar con comidas.",
        },
    }


# Mock fixtures for external services
@pytest.fixture
def mock_openai_client():
    """Mock OpenAI client."""
    with patch("openai.AsyncOpenAI") as mock:
        client = AsyncMock()
        mock.return_value = client

        # Mock Whisper
        client.audio.transcriptions.create = AsyncMock(
            return_value=MagicMock(text="Transcripción de prueba")
        )

        # Mock Chat completion
        client.chat.completions.create = AsyncMock(
            return_value=MagicMock(
                choices=[MagicMock(message=MagicMock(content='{"result": "test"}'))],
                usage=MagicMock(prompt_tokens=100, completion_tokens=50)
            )
        )

        # Mock Embeddings
        client.embeddings.create = AsyncMock(
            return_value=MagicMock(
                data=[MagicMock(embedding=[0.1] * 1536)]
            )
        )

        yield client


@pytest.fixture
def mock_chroma_client():
    """Mock ChromaDB client."""
    with patch("chromadb.HttpClient") as mock:
        client = MagicMock()
        mock.return_value = client

        collection = MagicMock()
        client.get_or_create_collection.return_value = collection

        # Mock query
        collection.query.return_value = {
            "ids": [["doc1", "doc2"]],
            "documents": [["Content 1", "Content 2"]],
            "metadatas": [[{"source": "test1"}, {"source": "test2"}]],
            "distances": [[0.1, 0.2]],
        }

        yield client
```

### 2. Create Audio Processing Tests

Create `ai-service/tests/unit/test_audio_processor.py`:

```python
"""
Unit tests for audio processing module.
"""
import io
import pytest
from unittest.mock import patch, MagicMock

from src.transcription.audio_processor import (
    AudioProcessor,
    detect_voice_activity,
    chunk_audio,
    AudioChunk,
)


class TestAudioProcessor:
    """Tests for AudioProcessor class."""

    def test_init_with_default_config(self):
        """Test processor initialization with defaults."""
        processor = AudioProcessor()
        assert processor.sample_rate == 16000
        assert processor.chunk_max_duration == 600  # 10 minutes
        assert processor.silence_threshold == 2.0

    def test_init_with_custom_config(self):
        """Test processor initialization with custom config."""
        processor = AudioProcessor(
            sample_rate=8000,
            chunk_max_duration=300,
            silence_threshold=1.5,
        )
        assert processor.sample_rate == 8000
        assert processor.chunk_max_duration == 300
        assert processor.silence_threshold == 1.5

    @pytest.mark.asyncio
    async def test_process_audio_returns_chunks(self, sample_audio_bytes):
        """Test that process_audio returns list of chunks."""
        processor = AudioProcessor()

        with patch.object(processor, '_apply_vad') as mock_vad:
            mock_vad.return_value = sample_audio_bytes

            with patch.object(processor, '_chunk_audio') as mock_chunk:
                mock_chunk.return_value = [
                    AudioChunk(data=sample_audio_bytes, start_time=0.0, end_time=5.0)
                ]

                chunks = await processor.process(sample_audio_bytes)

                assert len(chunks) == 1
                assert chunks[0].start_time == 0.0
                assert chunks[0].end_time == 5.0

    @pytest.mark.asyncio
    async def test_vad_reduces_audio_size(self):
        """Test that VAD reduces audio with silence."""
        processor = AudioProcessor()

        # Create audio with silence
        with patch('src.transcription.audio_processor.silero_vad') as mock_vad:
            # Mock VAD to indicate 50% of audio is speech
            mock_vad.return_value = [(0.0, 2.5), (3.0, 5.0)]

            result = await processor._apply_vad(b'\x00' * 10000)

            # VAD should have been called
            mock_vad.assert_called_once()


class TestChunking:
    """Tests for audio chunking logic."""

    def test_short_audio_single_chunk(self):
        """Short audio should produce single chunk."""
        # 5 minutes of audio
        chunks = chunk_audio(
            duration_sec=300,
            speech_regions=[(0, 300)],
            max_chunk_duration=600,
        )
        assert len(chunks) == 1

    def test_long_audio_multiple_chunks(self):
        """Long audio should produce multiple chunks."""
        # 25 minutes of audio
        chunks = chunk_audio(
            duration_sec=1500,
            speech_regions=[(0, 1500)],
            max_chunk_duration=600,
        )
        assert len(chunks) >= 3

    def test_chunks_have_overlap(self):
        """Chunks should have overlap for continuity."""
        chunks = chunk_audio(
            duration_sec=1200,  # 20 minutes
            speech_regions=[(0, 1200)],
            max_chunk_duration=600,
            overlap_sec=2.0,
        )

        if len(chunks) > 1:
            # Check overlap between first and second chunk
            assert chunks[1].start_time < chunks[0].end_time

    def test_chunks_cut_at_silence(self):
        """Chunks should prefer cutting at silence boundaries."""
        speech_regions = [
            (0, 300),      # 5 min speech
            (320, 600),    # 20 sec silence, then 4.6 min speech
            (650, 900),    # 50 sec silence, then 4 min speech
        ]

        chunks = chunk_audio(
            duration_sec=900,
            speech_regions=speech_regions,
            max_chunk_duration=600,
        )

        # Should cut at silence boundaries when possible
        assert len(chunks) >= 1
```

### 3. Create Diarization Tests

Create `ai-service/tests/unit/test_diarizer.py`:

```python
"""
Unit tests for speaker diarization.
"""
import pytest
from src.transcription.diarizer import (
    Diarizer,
    SpeakerRole,
    DiarizedSegment,
    detect_speaker_changes,
    classify_speaker_role,
)


class TestDiarizer:
    """Tests for Diarizer class."""

    def test_init_default(self):
        """Test diarizer initialization."""
        diarizer = Diarizer()
        assert diarizer.min_turn_duration == 1.5
        assert diarizer.doctor_keywords is not None
        assert diarizer.patient_keywords is not None

    @pytest.mark.asyncio
    async def test_diarize_simple_conversation(self, sample_transcription):
        """Test diarization of simple doctor-patient conversation."""
        diarizer = Diarizer()

        segments = await diarizer.diarize(sample_transcription)

        assert len(segments) > 0
        # Should identify both speakers
        roles = {s.speaker for s in segments}
        assert SpeakerRole.DOCTOR in roles
        assert SpeakerRole.PATIENT in roles


class TestSpeakerDetection:
    """Tests for speaker detection heuristics."""

    def test_detect_speaker_change_on_long_pause(self):
        """Speaker change detected after long pause."""
        timestamps = [
            (0.0, 5.0),    # First utterance
            (7.0, 10.0),   # After 2 second pause
        ]

        changes = detect_speaker_changes(
            timestamps,
            min_pause=1.5,
        )

        assert 1 in changes  # Second segment is a speaker change

    def test_no_speaker_change_on_short_pause(self):
        """No speaker change on short pause."""
        timestamps = [
            (0.0, 5.0),    # First utterance
            (5.5, 10.0),   # Only 0.5 second pause
        ]

        changes = detect_speaker_changes(
            timestamps,
            min_pause=1.5,
        )

        assert 1 not in changes


class TestSpeakerClassification:
    """Tests for speaker role classification."""

    def test_classify_doctor_by_prescription(self):
        """Text with prescription language classified as doctor."""
        text = "Le voy a recetar ibuprofeno de 400mg cada 8 horas."

        role = classify_speaker_role(text)

        assert role == SpeakerRole.DOCTOR

    def test_classify_doctor_by_diagnosis(self):
        """Text with diagnosis language classified as doctor."""
        text = "El diagnóstico es cefalea tensional."

        role = classify_speaker_role(text)

        assert role == SpeakerRole.DOCTOR

    def test_classify_patient_by_symptoms(self):
        """Text with symptom description classified as patient."""
        text = "Me duele mucho la cabeza desde hace tres días."

        role = classify_speaker_role(text)

        assert role == SpeakerRole.PATIENT

    def test_classify_patient_by_feeling(self):
        """Text with feeling description classified as patient."""
        text = "Siento un dolor punzante en el pecho."

        role = classify_speaker_role(text)

        assert role == SpeakerRole.PATIENT

    def test_ambiguous_text_returns_unknown(self):
        """Ambiguous text returns unknown role."""
        text = "Sí, entiendo."

        role = classify_speaker_role(text)

        assert role == SpeakerRole.UNKNOWN
```

### 4. Create Extraction Tests

Create `ai-service/tests/unit/test_extractor.py`:

```python
"""
Unit tests for medical extraction service.
"""
import json
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from src.transcription.extractor import (
    ExtractionService,
    MedicalExtraction,
    Symptom,
    Diagnosis,
    Prescription,
    SOAPNote,
)


class TestExtractionService:
    """Tests for ExtractionService class."""

    def test_init_with_config(self, settings):
        """Test service initialization."""
        service = ExtractionService(settings=settings)
        assert service.model == settings.EXTRACTION_MODEL
        assert service.temperature == settings.EXTRACTION_TEMPERATURE

    @pytest.mark.asyncio
    async def test_extract_returns_medical_extraction(
        self, settings, sample_transcription, mock_openai_client
    ):
        """Test extraction returns proper structure."""
        service = ExtractionService(settings=settings)

        # Mock the LLM response
        mock_response = {
            "symptoms": [{"name": "cefalea", "location": "cabeza", "duration": "3 días"}],
            "diagnoses": [{"name": "Cefalea tensional", "icd10_code": "G44.2"}],
            "prescriptions": [{"medication": "Ibuprofeno", "dose": "400mg"}],
            "soap_note": {
                "subjective": "Dolor de cabeza",
                "objective": "",
                "assessment": "Cefalea tensional",
                "plan": "Ibuprofeno",
            },
        }

        mock_openai_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content=json.dumps(mock_response)))],
            usage=MagicMock(prompt_tokens=500, completion_tokens=200)
        )

        with patch.object(service, '_openai_client', mock_openai_client):
            result = await service.extract(sample_transcription)

        assert isinstance(result, MedicalExtraction)
        assert len(result.symptoms) == 1
        assert len(result.diagnoses) == 1
        assert len(result.prescriptions) == 1

    @pytest.mark.asyncio
    async def test_extract_with_rag_context(
        self, settings, sample_transcription, mock_openai_client
    ):
        """Test extraction uses RAG context when provided."""
        service = ExtractionService(settings=settings)

        rag_context = {
            "ibuprofeno": "AINE, dosis adulto 400-800mg cada 6-8h",
            "cefalea tensional": "CIE-10: G44.2",
        }

        mock_response = {
            "symptoms": [],
            "diagnoses": [],
            "prescriptions": [],
            "soap_note": {"subjective": "", "objective": "", "assessment": "", "plan": ""},
        }

        mock_openai_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content=json.dumps(mock_response)))],
            usage=MagicMock(prompt_tokens=500, completion_tokens=200)
        )

        with patch.object(service, '_openai_client', mock_openai_client):
            await service.extract(sample_transcription, rag_context=rag_context)

        # Verify RAG context was included in the prompt
        call_args = mock_openai_client.chat.completions.create.call_args
        messages = call_args.kwargs.get('messages', call_args[1].get('messages', []))
        system_message = messages[0]['content']

        assert "ibuprofeno" in system_message.lower() or "rag" in system_message.lower()


class TestSymptomModel:
    """Tests for Symptom model."""

    def test_symptom_creation(self):
        """Test symptom model creation."""
        symptom = Symptom(
            name="cefalea",
            location="frente",
            severity=7,
            duration="3 días",
        )

        assert symptom.name == "cefalea"
        assert symptom.location == "frente"
        assert symptom.severity == 7
        assert symptom.duration == "3 días"

    def test_symptom_optional_fields(self):
        """Test symptom with only required fields."""
        symptom = Symptom(name="dolor")

        assert symptom.name == "dolor"
        assert symptom.location is None
        assert symptom.severity is None


class TestDiagnosisModel:
    """Tests for Diagnosis model."""

    def test_diagnosis_with_icd10(self):
        """Test diagnosis with ICD-10 code."""
        diagnosis = Diagnosis(
            name="Migraña sin aura",
            icd10_code="G43.0",
            type="primary",
            confidence="high",
        )

        assert diagnosis.icd10_code == "G43.0"
        assert diagnosis.type == "primary"

    def test_diagnosis_without_icd10(self):
        """Test diagnosis without ICD-10 code."""
        diagnosis = Diagnosis(name="Posible infección viral")

        assert diagnosis.icd10_code is None


class TestSOAPNote:
    """Tests for SOAP note generation."""

    def test_soap_note_complete(self):
        """Test complete SOAP note."""
        soap = SOAPNote(
            subjective="Paciente refiere dolor de cabeza de 3 días.",
            objective="Sin hallazgos anormales.",
            assessment="Cefalea tensional",
            plan="Ibuprofeno 400mg c/8h x 5 días",
        )

        assert all([soap.subjective, soap.objective, soap.assessment, soap.plan])

    def test_soap_note_allows_empty_objective(self):
        """SOAP note can have empty objective if no exam mentioned."""
        soap = SOAPNote(
            subjective="Dolor de cabeza",
            objective="",
            assessment="Cefalea",
            plan="Analgésicos",
        )

        assert soap.objective == ""
```

### 5. Create RAG Pipeline Tests

Create `ai-service/tests/unit/test_rag_pipeline.py`:

```python
"""
Unit tests for RAG pipeline.
"""
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from src.rag.pipeline import (
    RAGPipeline,
    DocumentChunker,
    EmbeddingService,
    VectorStore,
    QueryResult,
)


class TestDocumentChunker:
    """Tests for document chunking."""

    def test_chunk_short_document(self):
        """Short document produces single chunk."""
        chunker = DocumentChunker(chunk_size=1000, overlap=200)

        text = "Este es un documento corto."
        chunks = chunker.chunk(text)

        assert len(chunks) == 1
        assert chunks[0].text == text

    def test_chunk_long_document(self):
        """Long document produces multiple chunks."""
        chunker = DocumentChunker(chunk_size=100, overlap=20)

        text = "Lorem ipsum " * 100  # ~1200 chars
        chunks = chunker.chunk(text)

        assert len(chunks) > 1

    def test_chunks_have_overlap(self):
        """Chunks overlap for context continuity."""
        chunker = DocumentChunker(chunk_size=100, overlap=20)

        text = "A" * 50 + "B" * 50 + "C" * 50 + "D" * 50
        chunks = chunker.chunk(text)

        if len(chunks) > 1:
            # End of first chunk should appear in beginning of second
            overlap_region = chunks[0].text[-20:]
            assert overlap_region in chunks[1].text or len(chunks[1].text) < 20

    def test_preserves_metadata(self):
        """Chunker preserves document metadata."""
        chunker = DocumentChunker(chunk_size=1000, overlap=200)

        text = "Documento de prueba"
        metadata = {"source": "test.pdf", "page": 1}
        chunks = chunker.chunk(text, metadata=metadata)

        assert chunks[0].metadata["source"] == "test.pdf"


class TestEmbeddingService:
    """Tests for embedding generation."""

    @pytest.mark.asyncio
    async def test_generate_embedding(self, mock_openai_client):
        """Test embedding generation."""
        service = EmbeddingService()

        with patch.object(service, '_client', mock_openai_client):
            embedding = await service.embed("Texto de prueba")

        assert len(embedding) == 1536  # text-embedding-3-small dimension

    @pytest.mark.asyncio
    async def test_batch_embedding(self, mock_openai_client):
        """Test batch embedding generation."""
        service = EmbeddingService()

        mock_openai_client.embeddings.create.return_value = MagicMock(
            data=[
                MagicMock(embedding=[0.1] * 1536),
                MagicMock(embedding=[0.2] * 1536),
            ]
        )

        with patch.object(service, '_client', mock_openai_client):
            embeddings = await service.embed_batch(["Texto 1", "Texto 2"])

        assert len(embeddings) == 2


class TestVectorStore:
    """Tests for vector store operations."""

    @pytest.mark.asyncio
    async def test_add_documents(self, mock_chroma_client):
        """Test adding documents to vector store."""
        store = VectorStore()

        with patch.object(store, '_client', mock_chroma_client):
            await store.add(
                ids=["doc1"],
                embeddings=[[0.1] * 1536],
                documents=["Test document"],
                metadatas=[{"source": "test"}],
            )

        mock_chroma_client.get_or_create_collection().add.assert_called_once()

    @pytest.mark.asyncio
    async def test_query_returns_results(self, mock_chroma_client):
        """Test querying vector store."""
        store = VectorStore()

        with patch.object(store, '_client', mock_chroma_client):
            results = await store.query(
                query_embedding=[0.1] * 1536,
                n_results=5,
            )

        assert len(results) > 0
        assert "doc1" in results[0].id


class TestRAGPipeline:
    """Tests for complete RAG pipeline."""

    @pytest.mark.asyncio
    async def test_ingest_document(
        self, mock_openai_client, mock_chroma_client
    ):
        """Test document ingestion."""
        pipeline = RAGPipeline()

        with patch.object(pipeline.embeddings, '_client', mock_openai_client):
            with patch.object(pipeline.store, '_client', mock_chroma_client):
                result = await pipeline.ingest(
                    content="Ibuprofeno es un antiinflamatorio no esteroideo.",
                    metadata={"source": "vademecum.pdf"},
                )

        assert result.chunks_created > 0

    @pytest.mark.asyncio
    async def test_query_with_context(
        self, mock_openai_client, mock_chroma_client
    ):
        """Test query with context retrieval."""
        pipeline = RAGPipeline()

        mock_openai_client.chat.completions.create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Respuesta de prueba"))],
            usage=MagicMock(prompt_tokens=100, completion_tokens=50)
        )

        with patch.object(pipeline.embeddings, '_client', mock_openai_client):
            with patch.object(pipeline.store, '_client', mock_chroma_client):
                with patch.object(pipeline, '_llm_client', mock_openai_client):
                    result = await pipeline.query(
                        "¿Cuáles son las contraindicaciones del ibuprofeno?"
                    )

        assert isinstance(result, QueryResult)
        assert result.response is not None
        assert len(result.sources) > 0


class TestRAGIntegration:
    """Tests for RAG integration with extraction."""

    @pytest.mark.asyncio
    async def test_get_medication_context(
        self, mock_openai_client, mock_chroma_client
    ):
        """Test retrieving medication context for extraction."""
        pipeline = RAGPipeline()

        mock_chroma_client.get_or_create_collection().query.return_value = {
            "ids": [["med1"]],
            "documents": [["Ibuprofeno: AINE, dosis 400-800mg"]],
            "metadatas": [[{"type": "medication"}]],
            "distances": [[0.1]],
        }

        with patch.object(pipeline.embeddings, '_client', mock_openai_client):
            with patch.object(pipeline.store, '_client', mock_chroma_client):
                context = await pipeline.get_medication_context("ibuprofeno")

        assert "ibuprofeno" in context.lower() or "aine" in context.lower()

    @pytest.mark.asyncio
    async def test_get_icd10_suggestion(
        self, mock_openai_client, mock_chroma_client
    ):
        """Test ICD-10 code suggestion."""
        pipeline = RAGPipeline()

        mock_chroma_client.get_or_create_collection().query.return_value = {
            "ids": [["icd1"]],
            "documents": [["Migraña - G43.9"]],
            "metadatas": [[{"type": "icd10"}]],
            "distances": [[0.05]],
        }

        with patch.object(pipeline.embeddings, '_client', mock_openai_client):
            with patch.object(pipeline.store, '_client', mock_chroma_client):
                code = await pipeline.suggest_icd10("migraña")

        assert code is not None
```

### 6. Create Cost Tracker Tests

Create `ai-service/tests/unit/test_cost_tracker.py`:

```python
"""
Unit tests for cost tracking.
"""
from datetime import datetime, timedelta

import pytest

from src.services.cost_tracker import (
    CostTracker,
    CostEvent,
    CostSummary,
)
from src.services.model_selector import (
    ModelSelector,
    ModelTier,
    MODEL_CONFIGS,
)


class TestCostTracker:
    """Tests for CostTracker class."""

    def test_init_with_budget(self):
        """Test tracker initialization with budget."""
        tracker = CostTracker(monthly_budget=100.0)
        assert tracker.monthly_budget == 100.0

    def test_track_event(self):
        """Test tracking a cost event."""
        tracker = CostTracker(monthly_budget=100.0)

        tracker.track(
            service="openai",
            operation="transcription",
            tokens_input=1000,
            tokens_output=0,
            cost_usd=0.006,
        )

        assert len(tracker.events) == 1
        assert tracker.events[0].cost_usd == 0.006

    def test_get_summary(self):
        """Test getting cost summary."""
        tracker = CostTracker(monthly_budget=100.0)

        tracker.track("openai", "transcription", 1000, 0, 0.10)
        tracker.track("openai", "extraction", 500, 200, 0.05)

        summary = tracker.get_summary()

        assert summary.total_cost_usd == 0.15
        assert summary.budget_remaining_usd == 99.85
        assert summary.events_count == 2

    def test_budget_percent_used(self):
        """Test budget percentage calculation."""
        tracker = CostTracker(monthly_budget=50.0)

        tracker.track("openai", "test", 0, 0, 25.0)

        summary = tracker.get_summary()

        assert summary.budget_percent_used == 50.0

    def test_summary_by_service(self):
        """Test cost breakdown by service."""
        tracker = CostTracker(monthly_budget=100.0)

        tracker.track("openai", "whisper", 0, 0, 0.10)
        tracker.track("openai", "gpt4", 0, 0, 0.20)
        tracker.track("openai", "gpt4", 0, 0, 0.15)

        summary = tracker.get_summary()

        assert summary.by_service["openai"] == 0.45

    def test_summary_by_operation(self):
        """Test cost breakdown by operation."""
        tracker = CostTracker(monthly_budget=100.0)

        tracker.track("openai", "transcription", 0, 0, 0.10)
        tracker.track("openai", "extraction", 0, 0, 0.20)
        tracker.track("openai", "extraction", 0, 0, 0.15)

        summary = tracker.get_summary()

        assert summary.by_operation["transcription"] == 0.10
        assert summary.by_operation["extraction"] == 0.35

    def test_summary_with_date_filter(self):
        """Test summary filtering by date."""
        tracker = CostTracker(monthly_budget=100.0)

        # Add old event
        old_event = CostEvent(
            service="openai",
            operation="old",
            tokens_input=0,
            tokens_output=0,
            cost_usd=1.00,
            timestamp=datetime.now() - timedelta(days=40),
        )
        tracker.events.append(old_event)

        # Add recent event
        tracker.track("openai", "recent", 0, 0, 0.50)

        # Get current month summary
        summary = tracker.get_summary(
            since=datetime.now().replace(day=1)
        )

        assert summary.total_cost_usd == 0.50


class TestModelSelector:
    """Tests for model selection logic."""

    def test_select_cheap_for_simple_task(self):
        """Simple tasks use cheap model."""
        selector = ModelSelector()

        config = selector.select_model(
            task_type="medication_lookup",
            input_length=100,
        )

        assert config.model_id == "gpt-4o-mini"

    def test_select_balanced_for_extraction(self):
        """Extraction tasks use balanced model."""
        selector = ModelSelector()

        config = selector.select_model(
            task_type="full_extraction",
            input_length=5000,
        )

        assert config.model_id == "gpt-4o"

    def test_force_tier_overrides_selection(self):
        """Force tier overrides automatic selection."""
        selector = ModelSelector()

        config = selector.select_model(
            task_type="simple_validation",
            input_length=100,
            force_tier=ModelTier.PREMIUM,
        )

        assert config.model_id == "gpt-4-turbo"

    def test_budget_constraint_forces_cheap_model(self):
        """High budget usage forces cheaper model."""
        tracker = CostTracker(monthly_budget=10.0)
        tracker.track("openai", "test", 0, 0, 8.5)  # 85% used

        selector = ModelSelector(cost_tracker=tracker)

        config = selector.select_model(
            task_type="full_extraction",  # Would normally use balanced
            input_length=5000,
        )

        assert config.model_id == "gpt-4o-mini"  # Forced to cheap

    def test_estimate_cost(self):
        """Test cost estimation for different tiers."""
        selector = ModelSelector()

        estimates = selector.estimate_cost(
            task_type="extraction",
            input_tokens=1000,
            expected_output_tokens=500,
        )

        assert "gpt-4o-mini" in estimates
        assert "gpt-4o" in estimates
        assert "gpt-4-turbo" in estimates
        assert estimates["gpt-4o-mini"] < estimates["gpt-4o"]
        assert estimates["gpt-4o"] < estimates["gpt-4-turbo"]
```

### 7. Create WebSocket Event Serialization Tests

Create `ai-service/tests/unit/test_websocket_events.py`:

```python
"""
Unit tests for WebSocket event serialization and deserialization.
"""
import pytest
import json
from datetime import datetime
from pydantic import ValidationError

from src.websocket.events import (
    WSTranscriptUpdateEvent,
    WSSpeakerChangedEvent,
    WSExtractionUpdateEvent,
    WSValidationAlertEvent,
    WSEntityValidatedEvent,
    WSCostUpdateEvent,
    WSSessionCompleteEvent,
    WSErrorEvent,
    serialize_event,
    deserialize_event,
)


class TestEventSerialization:
    """Tests for WebSocket event serialization."""

    def test_serialize_transcript_update_event(self):
        """Test transcript_update event serialization."""
        event = WSTranscriptUpdateEvent(
            session_id="session-123",
            timestamp=datetime.now(),
            data={
                "chunk_index": 1,
                "text": "Buenos días doctor",
                "is_final": True,
                "confidence": 0.95,
                "start_time": 0.0,
                "end_time": 2.5,
            }
        )

        json_str = serialize_event(event)
        parsed = json.loads(json_str)

        assert parsed["event"] == "transcript_update"
        assert parsed["session_id"] == "session-123"
        assert parsed["data"]["text"] == "Buenos días doctor"
        assert parsed["data"]["is_final"] is True

    def test_serialize_speaker_changed_event(self):
        """Test speaker_changed event serialization."""
        event = WSSpeakerChangedEvent(
            session_id="session-123",
            timestamp=datetime.now(),
            data={
                "role": "DOCTOR",
                "confidence": 0.88,
                "timestamp": 5.2,
            }
        )

        json_str = serialize_event(event)
        parsed = json.loads(json_str)

        assert parsed["event"] == "speaker_changed"
        assert parsed["data"]["role"] == "DOCTOR"
        assert parsed["data"]["confidence"] == 0.88

    def test_serialize_extraction_update_event(self):
        """Test extraction_update event serialization."""
        event = WSExtractionUpdateEvent(
            session_id="session-123",
            timestamp=datetime.now(),
            data={
                "entity_type": "SYMPTOM",
                "entity_value": "cefalea",
                "entity_id": "entity-456",
                "confidence": 0.92,
                "status": "pending_validation",
                "metadata": {"location": "frente", "duration": "3 días"},
            }
        )

        json_str = serialize_event(event)
        parsed = json.loads(json_str)

        assert parsed["event"] == "extraction_update"
        assert parsed["data"]["entity_type"] == "SYMPTOM"
        assert parsed["data"]["entity_value"] == "cefalea"

    def test_serialize_validation_alert_critical(self):
        """Test CRITICAL validation_alert event serialization."""
        event = WSValidationAlertEvent(
            session_id="session-123",
            timestamp=datetime.now(),
            data={
                "alert_id": "alert-789",
                "alert_type": "DRUG_INTERACTION",
                "severity": "CRITICAL",
                "message": "Interacción grave detectada: Warfarina + Ibuprofeno",
                "related_entities": ["entity-1", "entity-2"],
                "recommended_action": "Revisar prescripción inmediatamente",
                "requires_immediate_attention": True,
            }
        )

        json_str = serialize_event(event)
        parsed = json.loads(json_str)

        assert parsed["event"] == "validation_alert"
        assert parsed["data"]["severity"] == "CRITICAL"
        assert parsed["data"]["requires_immediate_attention"] is True

    def test_serialize_cost_update_event(self):
        """Test cost_update event serialization."""
        event = WSCostUpdateEvent(
            session_id="session-123",
            timestamp=datetime.now(),
            data={
                "operation": "transcription",
                "cost_usd": 0.05,
                "cumulative_cost_usd": 0.15,
                "tokens_used": 1000,
                "budget_remaining_usd": 49.85,
            }
        )

        json_str = serialize_event(event)
        parsed = json.loads(json_str)

        assert parsed["event"] == "cost_update"
        assert parsed["data"]["operation"] == "transcription"
        assert parsed["data"]["cumulative_cost_usd"] == 0.15

    def test_serialize_session_complete_event(self):
        """Test session_complete event serialization."""
        event = WSSessionCompleteEvent(
            session_id="session-123",
            timestamp=datetime.now(),
            data={
                "total_duration_sec": 180.5,
                "total_cost_usd": 0.25,
                "entities_extracted": 15,
                "alerts_count": 2,
                "final_status": "completed",
            }
        )

        json_str = serialize_event(event)
        parsed = json.loads(json_str)

        assert parsed["event"] == "session_complete"
        assert parsed["data"]["final_status"] == "completed"


class TestEventDeserialization:
    """Tests for WebSocket event deserialization."""

    def test_deserialize_transcript_update(self):
        """Test deserializing transcript_update from JSON."""
        json_data = {
            "event": "transcript_update",
            "session_id": "session-123",
            "timestamp": "2025-01-15T10:30:00Z",
            "data": {
                "chunk_index": 1,
                "text": "Buenos días",
                "is_final": True,
                "confidence": 0.95,
                "start_time": 0.0,
                "end_time": 2.0,
            }
        }

        event = deserialize_event(json.dumps(json_data))

        assert isinstance(event, WSTranscriptUpdateEvent)
        assert event.session_id == "session-123"
        assert event.data["text"] == "Buenos días"

    def test_deserialize_invalid_event_type(self):
        """Test deserializing with invalid event type."""
        json_data = {
            "event": "invalid_event_type",
            "session_id": "session-123",
            "timestamp": "2025-01-15T10:30:00Z",
            "data": {}
        }

        with pytest.raises(ValueError):
            deserialize_event(json.dumps(json_data))

    def test_deserialize_missing_required_field(self):
        """Test deserializing with missing required field."""
        json_data = {
            "event": "transcript_update",
            # Missing session_id
            "timestamp": "2025-01-15T10:30:00Z",
            "data": {"text": "test"}
        }

        with pytest.raises((ValidationError, KeyError)):
            deserialize_event(json.dumps(json_data))


class TestEventValidation:
    """Tests for event data validation."""

    def test_alert_severity_validation(self):
        """Test that alert severity must be valid enum."""
        with pytest.raises(ValidationError):
            WSValidationAlertEvent(
                session_id="session-123",
                timestamp=datetime.now(),
                data={
                    "alert_id": "alert-1",
                    "alert_type": "DRUG_INTERACTION",
                    "severity": "INVALID_SEVERITY",  # Invalid
                    "message": "Test",
                }
            )

    def test_entity_type_validation(self):
        """Test that entity_type must be valid enum."""
        valid_types = ["SYMPTOM", "DIAGNOSIS", "MEDICATION", "PROCEDURE", "ALLERGY"]

        for entity_type in valid_types:
            event = WSExtractionUpdateEvent(
                session_id="session-123",
                timestamp=datetime.now(),
                data={
                    "entity_type": entity_type,
                    "entity_value": "test",
                    "entity_id": "entity-1",
                    "confidence": 0.9,
                    "status": "pending_validation",
                }
            )
            assert event.data["entity_type"] == entity_type
```

### 8. Create Event Persistence Service Tests

Create `ai-service/tests/unit/test_event_persistence.py`:

```python
"""
Unit tests for event persistence service.
"""
import pytest
from datetime import datetime
from unittest.mock import AsyncMock, MagicMock, patch

from src.services.event_persistence import (
    EventPersistenceService,
)
from src.websocket.events import (
    WSTranscriptUpdateEvent,
    WSValidationAlertEvent,
)


class TestEventPersistenceService:
    """Tests for EventPersistenceService class."""

    @pytest.mark.asyncio
    async def test_save_transcript_event(self):
        """Test saving transcript event to PostgreSQL."""
        service = EventPersistenceService()

        event = WSTranscriptUpdateEvent(
            session_id="session-123",
            timestamp=datetime.now(),
            data={
                "chunk_index": 1,
                "text": "Buenos días",
                "is_final": True,
                "confidence": 0.95,
                "start_time": 0.0,
                "end_time": 2.0,
            }
        )

        with patch.object(service.db, 'query', new_callable=AsyncMock) as mock_query:
            await service.saveTranscriptEvent("session-123", event)

            # Verify database insert was called
            mock_query.assert_called_once()
            call_args = mock_query.call_args
            assert "INSERT INTO transcription_events" in call_args[0][0]

    @pytest.mark.asyncio
    async def test_save_critical_alert(self):
        """Test saving CRITICAL validation alert."""
        service = EventPersistenceService()

        event = WSValidationAlertEvent(
            session_id="session-123",
            timestamp=datetime.now(),
            data={
                "alert_id": "alert-1",
                "alert_type": "DRUG_INTERACTION",
                "severity": "CRITICAL",
                "message": "Interacción grave",
                "requires_immediate_attention": True,
            }
        )

        with patch.object(service.db, 'query', new_callable=AsyncMock) as mock_query:
            with patch('src.services.event_persistence.logger') as mock_logger:
                await service.saveValidationAlert("session-123", event)

                # Verify CRITICAL alert was logged
                mock_logger.warn.assert_called_once()
                assert "CRITICAL" in str(mock_logger.warn.call_args)

    @pytest.mark.asyncio
    async def test_get_session_events_ordered_by_timestamp(self):
        """Test retrieving session events in chronological order."""
        service = EventPersistenceService()

        mock_events = [
            {"event": "transcript_update", "timestamp": "2025-01-15T10:30:01Z"},
            {"event": "speaker_changed", "timestamp": "2025-01-15T10:30:05Z"},
            {"event": "extraction_update", "timestamp": "2025-01-15T10:30:10Z"},
        ]

        with patch.object(service.db, 'query', new_callable=AsyncMock) as mock_query:
            mock_query.return_value = mock_events

            events = await service.getSessionEvents("session-123")

            # Events should be ordered by timestamp
            assert len(events) == 3
            assert events[0]["event"] == "transcript_update"

    @pytest.mark.asyncio
    async def test_save_event_non_blocking(self):
        """Test that event persistence doesn't block processing."""
        service = EventPersistenceService()

        event = WSTranscriptUpdateEvent(
            session_id="session-123",
            timestamp=datetime.now(),
            data={
                "chunk_index": 1,
                "text": "test",
                "is_final": True,
                "confidence": 0.9,
                "start_time": 0.0,
                "end_time": 1.0,
            }
        )

        # Simulate slow database write
        async def slow_db_write(*args, **kwargs):
            import asyncio
            await asyncio.sleep(0.1)

        with patch.object(service.db, 'query', side_effect=slow_db_write):
            import time
            start = time.perf_counter()

            # Event persistence should be non-blocking (fire-and-forget or fast)
            await service.saveTranscriptEvent("session-123", event)

            elapsed = (time.perf_counter() - start) * 1000

            # Should complete quickly (< 200ms including 100ms mock delay)
            assert elapsed < 200
```

### 9. Create Incremental Processing Tests

Create `ai-service/tests/unit/test_incremental_processing.py`:

```python
"""
Unit tests for incremental vs batch processing.
"""
import pytest
from unittest.mock import AsyncMock, patch

from src.transcription.incremental_processor import IncrementalProcessor
from src.transcription.batch_processor import BatchProcessor


class TestIncrementalVsBatch:
    """Tests comparing incremental and batch processing."""

    @pytest.mark.asyncio
    async def test_incremental_processes_chunks_as_they_arrive(self):
        """Test incremental processor handles streaming chunks."""
        processor = IncrementalProcessor()

        chunks = [
            {"chunk_index": 0, "audio_data": b'\x00' * 1000},
            {"chunk_index": 1, "audio_data": b'\x00' * 1000},
            {"chunk_index": 2, "audio_data": b'\x00' * 1000},
        ]

        results = []
        async for result in processor.process_stream(chunks):
            results.append(result)

        # Should emit results incrementally
        assert len(results) >= 1
        assert all("chunk_index" in r for r in results)

    @pytest.mark.asyncio
    async def test_batch_processes_all_at_once(self):
        """Test batch processor waits for complete audio."""
        processor = BatchProcessor()

        audio_data = b'\x00' * 10000

        result = await processor.process(audio_data)

        # Should return single complete result
        assert result is not None
        assert "transcription" in result

    @pytest.mark.asyncio
    async def test_incremental_lower_latency(self):
        """Test that incremental processing has lower time-to-first-result."""
        incremental = IncrementalProcessor()
        batch = BatchProcessor()

        audio_chunks = [b'\x00' * 1000 for _ in range(10)]

        # Measure time to first result (incremental)
        import time
        start_incr = time.perf_counter()
        async for result in incremental.process_stream(audio_chunks):
            time_to_first_incr = (time.perf_counter() - start_incr) * 1000
            break  # Just first result

        # Measure time to result (batch)
        start_batch = time.perf_counter()
        await batch.process(b''.join(audio_chunks))
        time_to_result_batch = (time.perf_counter() - start_batch) * 1000

        # Incremental should be faster to first result
        assert time_to_first_incr < time_to_result_batch
```

### 10. Create Alert Priority Queue Tests

Create `ai-service/tests/unit/test_alert_priority_queue.py`:

```python
"""
Unit tests for alert priority queue.
"""
import pytest
import asyncio
from src.services.alert_priority_queue import AlertPriorityQueue, Alert


class TestAlertPriorityQueue:
    """Tests for priority-based alert handling."""

    @pytest.mark.asyncio
    async def test_critical_alerts_processed_first(self):
        """Test that CRITICAL alerts are processed before lower priority."""
        queue = AlertPriorityQueue()

        # Add alerts in mixed order
        await queue.add(Alert(id="1", severity="MEDIUM", message="Medium alert"))
        await queue.add(Alert(id="2", severity="CRITICAL", message="Critical alert"))
        await queue.add(Alert(id="3", severity="HIGH", message="High alert"))
        await queue.add(Alert(id="4", severity="LOW", message="Low alert"))

        # Process alerts
        processed = []
        for _ in range(4):
            alert = await queue.get()
            processed.append(alert.severity)

        # Should be in priority order
        assert processed[0] == "CRITICAL"
        assert processed[1] == "HIGH"
        assert processed[2] == "MEDIUM"
        assert processed[3] == "LOW"

    @pytest.mark.asyncio
    async def test_critical_alert_latency_target(self):
        """Test that CRITICAL alerts are delivered within 1 second."""
        queue = AlertPriorityQueue()

        import time
        start = time.perf_counter()

        critical_alert = Alert(
            id="critical-1",
            severity="CRITICAL",
            message="Drug interaction detected"
        )

        await queue.add(critical_alert)
        result = await queue.get()

        elapsed_ms = (time.perf_counter() - start) * 1000

        # Should be delivered in < 1 second
        assert elapsed_ms < 1000
        assert result.severity == "CRITICAL"

    @pytest.mark.asyncio
    async def test_alerts_with_same_priority_fifo(self):
        """Test that alerts with same priority are FIFO."""
        queue = AlertPriorityQueue()

        await queue.add(Alert(id="1", severity="HIGH", message="First HIGH"))
        await queue.add(Alert(id="2", severity="HIGH", message="Second HIGH"))
        await queue.add(Alert(id="3", severity="HIGH", message="Third HIGH"))

        first = await queue.get()
        second = await queue.get()
        third = await queue.get()

        assert first.id == "1"
        assert second.id == "2"
        assert third.id == "3"
```

### 11. Create Frontend Hook Tests

Create `frontend/src/hooks/__tests__/useRealtimeSession.test.ts`:

```typescript
/**
 * Unit tests for useRealtimeSession hook.
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useRealtimeSession } from '../useRealtimeSession';
import WS from 'jest-websocket-mock';

describe('useRealtimeSession', () => {
  let mockServer: WS;

  beforeEach(() => {
    mockServer = new WS('ws://localhost:3000/ws/session/test-session?token=test-token');
  });

  afterEach(() => {
    WS.clean();
  });

  it('should initialize with idle state', () => {
    const { result } = renderHook(() => useRealtimeSession());

    expect(result.current.status).toBe('idle');
    expect(result.current.sessionId).toBeNull();
    expect(result.current.transcriptChunks).toEqual([]);
  });

  it('should create session and update state', async () => {
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: async () => ({
          sessionId: 'session-123',
          websocketUrl: 'ws://localhost:3000/ws/session/session-123',
        }),
      })
    ) as jest.Mock;

    const { result } = renderHook(() => useRealtimeSession());

    await act(async () => {
      await result.current.createSession('patient-123', 'general', 'es');
    });

    expect(result.current.sessionId).toBe('session-123');
    expect(result.current.status).toBe('connecting');

    await mockServer.connected;
    expect(result.current.status).toBe('connected');
  });

  it('should handle transcript_update events', async () => {
    const { result } = renderHook(() => useRealtimeSession());

    // Setup WebSocket connection
    await act(async () => {
      await result.current.createSession('patient-123', 'general', 'es');
    });

    await mockServer.connected;

    // Send transcript event
    const transcriptEvent = {
      event: 'transcript_update',
      session_id: 'session-123',
      timestamp: new Date().toISOString(),
      data: {
        chunk_index: 1,
        text: 'Buenos días doctor',
        is_final: true,
        confidence: 0.95,
        start_time: 0.0,
        end_time: 2.5,
      },
    };

    act(() => {
      mockServer.send(JSON.stringify(transcriptEvent));
    });

    await waitFor(() => {
      expect(result.current.transcriptChunks.length).toBe(1);
      expect(result.current.transcriptChunks[0].text).toBe('Buenos días doctor');
    });
  });

  it('should handle CRITICAL validation alerts with sound', async () => {
    const mockPlaySound = jest.fn();
    global.AudioContext = jest.fn().mockImplementation(() => ({
      createOscillator: () => ({
        connect: jest.fn(),
        start: jest.fn(),
        stop: jest.fn(),
        frequency: { value: 0 },
      }),
      createGain: () => ({
        connect: jest.fn(),
        gain: { value: 0 },
      }),
      destination: {},
    })) as any;

    const { result } = renderHook(() => useRealtimeSession());

    await act(async () => {
      await result.current.createSession('patient-123', 'general', 'es');
    });

    await mockServer.connected;

    const criticalAlert = {
      event: 'validation_alert',
      session_id: 'session-123',
      timestamp: new Date().toISOString(),
      data: {
        alert_id: 'alert-1',
        alert_type: 'DRUG_INTERACTION',
        severity: 'CRITICAL',
        message: 'Interacción grave detectada',
        requires_immediate_attention: true,
      },
    };

    act(() => {
      mockServer.send(JSON.stringify(criticalAlert));
    });

    await waitFor(() => {
      expect(result.current.alerts.length).toBe(1);
      expect(result.current.alerts[0].severity).toBe('CRITICAL');
      // Alert sound should have been played
    });
  });

  it('should handle cost_update events and track cumulative cost', async () => {
    const { result } = renderHook(() => useRealtimeSession());

    await act(async () => {
      await result.current.createSession('patient-123', 'general', 'es');
    });

    await mockServer.connected;

    const costEvent = {
      event: 'cost_update',
      session_id: 'session-123',
      timestamp: new Date().toISOString(),
      data: {
        operation: 'transcription',
        cost_usd: 0.05,
        cumulative_cost_usd: 0.15,
        tokens_used: 1000,
        budget_remaining_usd: 49.85,
      },
    };

    act(() => {
      mockServer.send(JSON.stringify(costEvent));
    });

    await waitFor(() => {
      expect(result.current.cost.total_usd).toBe(0.15);
      expect(result.current.cost.budget_remaining_usd).toBe(49.85);
    });
  });

  it('should handle binary audio streaming', async () => {
    const { result } = renderHook(() => useRealtimeSession());

    // Mock MediaRecorder
    global.MediaRecorder = jest.fn().mockImplementation(() => ({
      start: jest.fn(),
      stop: jest.fn(),
      ondataavailable: null,
      state: 'inactive',
    })) as any;

    global.navigator.mediaDevices = {
      getUserMedia: jest.fn().mockResolvedValue({} as MediaStream),
    } as any;

    await act(async () => {
      await result.current.createSession('patient-123', 'general', 'es');
    });

    await mockServer.connected;

    await act(async () => {
      await result.current.startRecording();
    });

    expect(result.current.isRecording).toBe(true);
  });
});
```

## Expected Deliverables

1. `ai-service/tests/conftest.py` - Shared fixtures and configuration
2. `ai-service/tests/unit/test_audio_processor.py` - Audio processing tests (batch/legacy)
3. `ai-service/tests/unit/test_diarizer.py` - Diarization tests (batch/legacy)
4. `ai-service/tests/unit/test_extractor.py` - Extraction service tests (batch/legacy)
5. `ai-service/tests/unit/test_rag_pipeline.py` - RAG pipeline tests
6. `ai-service/tests/unit/test_cost_tracker.py` - Cost tracking tests
7. **`ai-service/tests/unit/test_websocket_events.py` - WebSocket event tests (NEW)**
8. **`ai-service/tests/unit/test_event_persistence.py` - Event persistence tests (NEW)**
9. **`ai-service/tests/unit/test_incremental_processing.py` - Incremental processing tests (NEW)**
10. **`ai-service/tests/unit/test_alert_priority_queue.py` - Alert priority tests (NEW)**
11. **`frontend/src/hooks/__tests__/useRealtimeSession.test.ts` - Frontend hook tests (NEW)**

## Verification Steps

### Real-Time Component Tests (PRIMARY)
1. WebSocket event tests pass: `pytest tests/unit/test_websocket_events.py -v`
2. Event persistence tests pass: `pytest tests/unit/test_event_persistence.py -v`
3. Incremental processing tests pass: `pytest tests/unit/test_incremental_processing.py -v`
4. Alert priority queue tests pass: `pytest tests/unit/test_alert_priority_queue.py -v`
5. Frontend hook tests pass: `npm test -- useRealtimeSession.test.ts`
6. All 8+ event types have serialization/deserialization tests
7. CRITICAL alert priority is verified (<1s latency)
8. Event persistence is non-blocking (<50ms)

### Batch/Legacy Component Tests
1. All tests pass: `pytest tests/unit/ -v`
2. Coverage report: `pytest tests/unit/ --cov=src --cov-report=html`
3. Coverage > 80% for core modules
4. Tests run in isolation (no external dependencies)
5. Fixtures are reusable across tests

## Notes

### Real-Time Testing Notes
- Use `pytest-asyncio` for async WebSocket and event tests
- Mock WebSocket connections for isolated unit tests
- Test event serialization round-trip (serialize → deserialize → verify)
- Verify alert priority queue respects CRITICAL (highest) → HIGH → MEDIUM → LOW order
- Frontend tests use `@testing-library/react` and `jest-websocket-mock`
- Ensure event persistence doesn't block real-time processing (<50ms target)

### General Testing Notes
- Use pytest-asyncio for async tests
- Mock all external services (OpenAI, ChromaDB, WebSockets)
- Test both success and error cases
- Include edge cases (empty input, large files, invalid events, etc.)
- Tests should run fast (<30 seconds for all unit tests for Python, <10s for frontend)
- Use parameterized tests for testing multiple event types or alert severities
