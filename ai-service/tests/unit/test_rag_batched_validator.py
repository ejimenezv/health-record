"""Unit tests for src/rag/batched_validator.py."""
import asyncio
from unittest.mock import AsyncMock

import pytest

from src.rag.batched_validator import BatchedRAGValidator


@pytest.mark.asyncio
async def test_processes_batch_when_max_size_reached():
    callback = AsyncMock(return_value="ok")
    validator = BatchedRAGValidator(
        process_callback=callback,
        batch_timeout=10.0,
        max_batch_size=3,
    )

    for i in range(3):
        await validator.validate_entity_batched(
            entity={"name": f"med_{i}"},
            context={"session_id": "s1"},
        )

    assert callback.await_count == 3
    assert validator.pending_validations == []


@pytest.mark.asyncio
async def test_processes_batch_after_timeout():
    callback = AsyncMock(return_value="ok")
    validator = BatchedRAGValidator(
        process_callback=callback,
        batch_timeout=0.05,
        max_batch_size=10,
    )

    await validator.validate_entity_batched({"name": "med_1"}, {})
    await validator.validate_entity_batched({"name": "med_2"}, {})

    await asyncio.sleep(0.2)

    assert callback.await_count == 2
    assert validator.pending_validations == []


@pytest.mark.asyncio
async def test_handles_callback_exceptions():
    callback = AsyncMock(side_effect=RuntimeError("boom"))
    validator = BatchedRAGValidator(
        process_callback=callback,
        batch_timeout=10.0,
        max_batch_size=2,
    )

    await validator.validate_entity_batched({"name": "a"}, {})
    await validator.validate_entity_batched({"name": "b"}, {})

    assert callback.await_count == 2
    assert validator.pending_validations == []


@pytest.mark.asyncio
async def test_process_batch_noop_when_empty():
    callback = AsyncMock()
    validator = BatchedRAGValidator(process_callback=callback)

    result = await validator._process_batch()

    assert result is None
    callback.assert_not_called()
