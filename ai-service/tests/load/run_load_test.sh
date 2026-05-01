#!/bin/bash
# Run load tests with different scenarios.
#
# Auth: locust mints JWTs in-process via src.security.auth.create_token. We
# must run from ai-service/ so the import resolves and JWT_SECRET_KEY is read
# from the ai-service .env (or whatever environment is active).

set -e

cd "$(dirname "$0")/../.."  # → ai-service/

echo "MedRecord AI - Load Testing Suite"
echo "=================================="

if ! command -v locust &> /dev/null; then
    echo "Error: Locust not installed. Run: pip install locust"
    exit 1
fi

echo "Checking if AI service is running..."
if ! curl -s http://localhost:8000/health > /dev/null; then
    echo "Warning: AI service not accessible at http://localhost:8000"
    echo "Please start the service first"
    exit 1
fi

mkdir -p reports

run_scenario() {
    local name=$1
    local users=$2
    local spawn_rate=$3
    local duration=$4
    local user_class=$5

    echo ""
    echo "Running: $name"
    echo "Users: $users, Spawn rate: $spawn_rate, Duration: $duration"
    echo "----------------------------------------"

    locust \
        -f tests/load/locustfile.py \
        --headless \
        --users "$users" \
        --spawn-rate "$spawn_rate" \
        --run-time "$duration" \
        --host http://localhost:8000 \
        --html "reports/load_test_${name}.html" \
        --csv "reports/load_test_${name}" \
        $user_class

    echo "Report saved: reports/load_test_${name}.html"
}

# Scenario 1: Light load - RAG queries only
run_scenario "light_rag" 10 2 "2m" "RAGQueryUser"

# Scenario 2: Medium mixed load (all user classes)
run_scenario "medium_mixed" 25 5 "3m" ""

# Scenario 3: Heavy peak load
run_scenario "heavy_peak" 50 10 "3m" ""

# Scenario 4: Streaming-session lifecycle stress
run_scenario "streaming_stress" 20 5 "3m" "StreamingSessionUser"

# Scenario 5: Spike test
echo ""
echo "Running: Spike Test"
echo "----------------------------------------"
locust \
    -f tests/load/locustfile.py \
    --headless \
    --users 100 \
    --spawn-rate 50 \
    --run-time 1m \
    --host http://localhost:8000 \
    --html reports/load_test_spike.html

echo ""
echo "=================================="
echo "Load testing completed!"
echo "Check reports/ directory for detailed results"
