"""
Dynamic model selection based on task complexity and budget.
Adapted for real-time streaming operations.
"""
from dataclasses import dataclass
from enum import Enum

from src.core.config import get_settings
from src.services.cost_tracker import CostTracker
from src.utils.logger import get_logger

settings = get_settings()
logger = get_logger(__name__)


class ModelTier(Enum):
    """Available model tiers."""
    FAST_CHEAP = "gpt-4o-mini"
    BALANCED = "gpt-4o"
    PREMIUM = "gpt-4-turbo"


@dataclass
class ModelConfig:
    """Configuration for a model tier."""
    model_id: str
    max_tokens: int
    temperature: float
    cost_per_1k_input: float
    cost_per_1k_output: float
    use_cases: list[str]


MODEL_CONFIGS = {
    ModelTier.FAST_CHEAP: ModelConfig(
        model_id="gpt-4o-mini",
        max_tokens=1000,
        temperature=0.1,
        cost_per_1k_input=0.00015,
        cost_per_1k_output=0.0006,
        use_cases=[
            "medication_lookup",
            "simple_extraction",
            "validation",
            "incremental_entity_extraction",
        ],
    ),
    ModelTier.BALANCED: ModelConfig(
        model_id="gpt-4o",
        max_tokens=2048,
        temperature=0.1,
        cost_per_1k_input=0.005,
        cost_per_1k_output=0.015,
        use_cases=[
            "full_extraction",
            "complex_analysis",
            "cie10_suggestion",
            "session_summary",
        ],
    ),
    ModelTier.PREMIUM: ModelConfig(
        model_id="gpt-4-turbo",
        max_tokens=4096,
        temperature=0.1,
        cost_per_1k_input=0.01,
        cost_per_1k_output=0.03,
        use_cases=[
            "differential_diagnosis",
            "complex_cases",
        ],
    ),
}


class ModelSelector:
    """
    Selects optimal model based on task and budget.
    Real-time aware with per-session cost tracking.
    """

    def __init__(self, cost_tracker: CostTracker | None = None):
        self.cost_tracker = cost_tracker or CostTracker()

    def select_model(
        self,
        task_type: str,
        input_length: int,
        session_id: str | None = None,
        force_tier: ModelTier | None = None,
    ) -> ModelConfig:
        """Select optimal model for task."""
        if force_tier:
            return MODEL_CONFIGS[force_tier]

        summary = self.cost_tracker.get_summary()
        budget_percent_used = summary.budget_percent_used

        if budget_percent_used > 80:
            logger.warning(
                "Budget >80%, forcing cheaper model",
                extra={"budget_percent_used": budget_percent_used},
            )
            return MODEL_CONFIGS[ModelTier.FAST_CHEAP]

        if session_id:
            session_cost = self._get_session_cost(session_id)
            if session_cost > 0.50:
                logger.info(
                    "Session cost high, using cheaper model",
                    extra={"session_id": session_id, "session_cost": session_cost},
                )
                return MODEL_CONFIGS[ModelTier.FAST_CHEAP]

        if task_type in [
            "medication_lookup",
            "simple_validation",
            "incremental_entity_extraction",
        ]:
            return MODEL_CONFIGS[ModelTier.FAST_CHEAP]

        elif task_type in [
            "full_extraction",
            "cie10_suggestion",
            "session_summary",
        ]:
            return MODEL_CONFIGS[ModelTier.BALANCED]

        elif task_type in ["complex_analysis", "differential_diagnosis"]:
            if budget_percent_used < 50:
                return MODEL_CONFIGS[ModelTier.PREMIUM]
            return MODEL_CONFIGS[ModelTier.BALANCED]

        return MODEL_CONFIGS[ModelTier.BALANCED]

    def _get_session_cost(self, session_id: str) -> float:
        """Calculate total cost for a session."""
        session_events = [
            e for e in self.cost_tracker.events
            if e.metadata.get("session_id") == session_id
        ]
        return sum(e.cost_usd for e in session_events)

    def estimate_cost(
        self,
        task_type: str,
        input_tokens: int,
        expected_output_tokens: int = 500,
    ) -> dict[str, float]:
        """Estimate cost for different model tiers."""
        estimates = {}

        for tier, config in MODEL_CONFIGS.items():
            cost = (
                (input_tokens / 1000) * config.cost_per_1k_input
                + (expected_output_tokens / 1000) * config.cost_per_1k_output
            )
            estimates[tier.value] = round(cost, 6)

        return estimates
