"""
Batched RAG validator for efficient validation of multiple entities.
Accumulates entities and processes them in batches to reduce API calls.
"""
import asyncio
from typing import Callable, Dict, List, Optional, Tuple

import structlog

logger = structlog.get_logger()


class BatchedRAGValidator:
    """
    Batches validation queries for efficiency.

    When multiple entities are extracted in quick succession, accumulates
    them and processes in a single batch to reduce latency and API calls.
    """

    def __init__(
        self,
        process_callback: Callable,
        batch_timeout: float = 0.5,
        max_batch_size: int = 5,
    ):
        self.process_callback = process_callback
        self.batch_timeout = batch_timeout
        self.max_batch_size = max_batch_size
        self.pending_validations: List[Tuple[Dict, Dict]] = []
        self._batch_lock = asyncio.Lock()
        self._batch_timer: Optional[asyncio.Task] = None

    async def validate_entity_batched(
        self,
        entity: Dict,
        context: Dict,
    ):
        """Add entity to batch for validation."""
        async with self._batch_lock:
            self.pending_validations.append((entity, context))

            if len(self.pending_validations) >= self.max_batch_size:
                await self._process_batch()
            else:
                if self._batch_timer:
                    self._batch_timer.cancel()

                self._batch_timer = asyncio.create_task(
                    self._wait_and_process()
                )

    async def _wait_and_process(self):
        """Wait for timeout then process accumulated batch."""
        await asyncio.sleep(self.batch_timeout)

        async with self._batch_lock:
            if self.pending_validations:
                await self._process_batch()

    async def _process_batch(self):
        """Process current batch of validations in parallel."""
        if not self.pending_validations:
            return

        batch = self.pending_validations.copy()
        self.pending_validations = []

        logger.info(
            "Processing validation batch",
            batch_size=len(batch),
        )

        tasks = [
            self.process_callback(entity, context)
            for entity, context in batch
        ]

        results = await asyncio.gather(*tasks, return_exceptions=True)

        successful = sum(1 for r in results if not isinstance(r, Exception))
        failed = len(results) - successful

        logger.info(
            "Batch validation completed",
            successful=successful,
            failed=failed,
        )

        return results
