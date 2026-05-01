"""
RAG Prefetcher for preloading common medical knowledge.
Pre-fetches frequently used medications and diagnoses during idle time.
"""
import asyncio
from typing import Dict, Optional

import structlog

logger = structlog.get_logger()


class RAGPrefetcher:
    """
    Prefetches common medical knowledge to reduce lookup latency.

    Pre-loads frequently used medications and diagnoses into memory
    cache during idle time (session start, low activity periods).
    """

    COMMON_MEDICATIONS = [
        "Paracetamol", "Ibuprofeno", "Amoxicilina",
        "Omeprazol", "Metformina", "Atorvastatina",
        "Enalapril", "Losartán", "Amlodipino",
        "Levotiroxina", "Simvastatina", "Pantoprazol",
        "Bisoprolol", "Furosemida", "Hidroclorotiazida",
        "Diclofenaco", "Tramadol", "Metamizol",
        "Lorazepam", "Alprazolam", "Diazepam",
        "Prednisona", "Dexametasona", "Azitromicina",
        "Ciprofloxacino", "Levofloxacino", "Ceftriaxona",
        "Insulina", "Glibenclamida", "Sitagliptina",
    ]

    def __init__(self, retriever_service):
        self.retriever = retriever_service
        self.common_medications: Dict[str, Dict] = {}
        self.common_diagnoses: Dict[str, Dict] = {}
        self._prefetch_complete = False
        self._prefetch_task: Optional[asyncio.Task] = None

    async def start_prefetch(self):
        """Start background prefetching of common knowledge."""
        if self._prefetch_task and not self._prefetch_task.done():
            logger.debug("Prefetch already in progress")
            return

        self._prefetch_task = asyncio.create_task(
            self._prefetch_common_knowledge()
        )

    async def _prefetch_common_knowledge(self):
        """Pre-fetch common medications from RAG."""
        logger.info(
            "Starting RAG prefetch",
            medications_count=len(self.COMMON_MEDICATIONS),
        )

        prefetched = 0
        for medication in self.COMMON_MEDICATIONS:
            try:
                docs = await self.retriever.retrieve_medications(
                    medication_name=medication,
                    top_k=1,
                )

                if docs:
                    self.common_medications[medication.lower()] = {
                        "content": docs[0].content,
                        "metadata": docs[0].metadata,
                        "similarity": docs[0].similarity_score,
                    }
                    prefetched += 1

            except Exception as e:
                logger.warning(
                    "Prefetch failed for medication",
                    medication=medication,
                    error=str(e),
                )

            await asyncio.sleep(0.05)

        self._prefetch_complete = True

        logger.info(
            "RAG prefetch completed",
            prefetched=prefetched,
            total=len(self.COMMON_MEDICATIONS),
        )

    def get_prefetched_medication(self, medication_name: str) -> Optional[Dict]:
        """Get prefetched medication data."""
        normalized = medication_name.lower().strip()
        return self.common_medications.get(normalized)

    def is_prefetched(self, medication_name: str) -> bool:
        """Check if medication is in prefetch cache."""
        return medication_name.lower().strip() in self.common_medications

    @property
    def prefetch_complete(self) -> bool:
        """Check if initial prefetch is complete."""
        return self._prefetch_complete

    @property
    def cache_size(self) -> int:
        """Get number of prefetched medications."""
        return len(self.common_medications)
