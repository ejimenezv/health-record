"""Unit tests for the observability stack."""
import pytest

from src.core.health import ComponentHealth, HealthChecker, HealthStatus
from src.core.metrics import Counter, Gauge, Histogram, MetricsCollector


class TestCounter:
    def test_increment(self):
        counter = Counter("test", "Test counter")
        counter.inc()
        assert counter.get() == 1

    def test_increment_with_amount(self):
        counter = Counter("test", "Test counter")
        counter.inc(5)
        assert counter.get() == 5

    def test_increment_with_labels(self):
        counter = Counter("test", "Test counter")
        counter.inc(labels={"method": "GET"})
        counter.inc(labels={"method": "POST"})
        assert counter.get(labels={"method": "GET"}) == 1
        assert counter.get(labels={"method": "POST"}) == 1


class TestGauge:
    def test_set(self):
        gauge = Gauge("test", "Test gauge")
        gauge.set(10)
        assert gauge.get() == 10

    def test_inc_dec(self):
        gauge = Gauge("test", "Test gauge")
        gauge.inc()
        gauge.inc()
        gauge.dec()
        assert gauge.get() == 1


class TestHistogram:
    def test_observe(self):
        histogram = Histogram("test", "Test histogram")
        histogram.observe(0.5)
        histogram.observe(1.0)
        histogram.observe(1.5)

        stats = histogram.get_stats()
        assert stats["count"] == 3
        assert stats["sum"] == 3.0
        assert stats["avg"] == 1.0
        assert stats["min"] == 0.5
        assert stats["max"] == 1.5

    def test_percentiles(self):
        histogram = Histogram("test", "Test histogram")
        for i in range(1, 101):
            histogram.observe(float(i))
        stats = histogram.get_stats()
        assert 50 <= stats["p50"] <= 51
        assert 94 <= stats["p95"] <= 96
        assert 98 <= stats["p99"] <= 100


class TestMetricsCollector:
    def test_collector_exposes_websocket_metrics(self):
        collector = MetricsCollector()
        collector.websocket_connections_total.inc()
        collector.websocket_message_latency.observe(0.05)
        collector.realtime_e2e_latency.observe(1.2)

        snapshot = collector.get_all_metrics()
        assert snapshot["websocket"]["message_latency"]["count"] == 1
        assert snapshot["realtime"]["e2e_latency_stats"]["count"] == 1


class TestHealthChecker:
    @pytest.fixture
    def checker(self):
        return HealthChecker()

    @pytest.mark.asyncio
    async def test_healthy_check(self, checker):
        async def healthy_check():
            return ComponentHealth(name="test", status=HealthStatus.HEALTHY)

        checker.register_check("test", healthy_check)
        result = await checker.check_all()
        assert result.status == HealthStatus.HEALTHY
        assert len(result.components) == 1

    @pytest.mark.asyncio
    async def test_unhealthy_check(self, checker):
        async def unhealthy_check():
            return ComponentHealth(
                name="test", status=HealthStatus.UNHEALTHY, message="Connection failed"
            )

        checker.register_check("test", unhealthy_check)
        result = await checker.check_all()
        assert result.status == HealthStatus.UNHEALTHY

    @pytest.mark.asyncio
    async def test_degraded_check(self, checker):
        async def degraded_check():
            return ComponentHealth(name="test", status=HealthStatus.DEGRADED)

        checker.register_check("test", degraded_check)
        result = await checker.check_all()
        assert result.status == HealthStatus.DEGRADED

    @pytest.mark.asyncio
    async def test_check_exception(self, checker):
        async def failing_check():
            raise Exception("Check failed")

        checker.register_check("test", failing_check)
        result = await checker.check_all()
        assert result.status == HealthStatus.UNHEALTHY
