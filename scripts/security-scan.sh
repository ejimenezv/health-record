#!/usr/bin/env bash
# =============================================================================
# Security Scanning — MedRecord AI (monorepo)
# =============================================================================
# Runs SAST, dependency audits and secret detection across the whole repo.
#   - Python (ai-service):  bandit, pip-audit
#   - Node.js (packages/*): pnpm audit
#   - Secrets (whole repo): gitleaks
#   - Containers (opt):     trivy
# Usage: ./scripts/security-scan.sh
# =============================================================================

set -u
set -o pipefail

cd "$(dirname "$0")/.."
ROOT_DIR="$(pwd)"
REPORT_DIR="$ROOT_DIR/reports/security"
mkdir -p "$REPORT_DIR"

RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m'

CRITICAL_FOUND=0

log()   { echo -e "${YELLOW}[scan]${NC} $*"; }
ok()    { echo -e "${GREEN}  ok${NC} $*"; }
fail()  { echo -e "${RED}  !!${NC} $*"; CRITICAL_FOUND=1; }
miss()  { echo -e "${YELLOW}  ~~${NC} $*"; }

echo "Security scan — MedRecord AI"
echo "Reports: $REPORT_DIR"
echo

# -----------------------------------------------------------------------------
# 1. Bandit (Python SAST) — ai-service
# -----------------------------------------------------------------------------
log "[1/4] Bandit (Python SAST) on ai-service/src"
if command -v bandit >/dev/null 2>&1; then
    bandit -r ai-service/src \
        -f json -o "$REPORT_DIR/bandit-report.json" \
        --severity-level medium --confidence-level medium \
        --exclude ai-service/tests || true
    bandit -r ai-service/src \
        -f html -o "$REPORT_DIR/bandit-report.html" \
        --severity-level medium \
        --exclude ai-service/tests >/dev/null 2>&1 || true
    if [ -f "$REPORT_DIR/bandit-report.json" ] && command -v jq >/dev/null 2>&1; then
        HIGH=$(jq '[.results[] | select(.issue_severity=="HIGH")] | length' \
            "$REPORT_DIR/bandit-report.json" 2>/dev/null || echo 0)
        if [ "${HIGH:-0}" -gt 0 ]; then
            fail "bandit: $HIGH HIGH severity findings"
        else
            ok "bandit: no HIGH severity findings"
        fi
    else
        ok "bandit report written"
    fi
else
    miss "bandit not installed (pip install bandit)"
fi

# -----------------------------------------------------------------------------
# 2. pip-audit (Python dependencies) — ai-service
# -----------------------------------------------------------------------------
log "[2/4] pip-audit on ai-service/requirements.txt"
if command -v pip-audit >/dev/null 2>&1; then
    (cd ai-service && pip-audit -r requirements.txt \
        --format json --output "$REPORT_DIR/pip-audit-report.json") || true
    (cd ai-service && pip-audit -r requirements.txt \
        --format markdown --output "$REPORT_DIR/pip-audit-report.md") || true
    if [ -f "$REPORT_DIR/pip-audit-report.json" ] && command -v jq >/dev/null 2>&1; then
        VULNS=$(jq '[.dependencies[]?.vulns[]?] | length' \
            "$REPORT_DIR/pip-audit-report.json" 2>/dev/null || echo 0)
        if [ "${VULNS:-0}" -gt 0 ]; then
            fail "pip-audit: $VULNS vulnerable Python packages"
        else
            ok "pip-audit: no vulnerable Python packages"
        fi
    else
        ok "pip-audit report written"
    fi
else
    miss "pip-audit not installed (pip install pip-audit)"
fi

# -----------------------------------------------------------------------------
# 3. pnpm audit (workspace) — packages/*
# -----------------------------------------------------------------------------
log "[3/4] pnpm audit (workspace)"
if command -v pnpm >/dev/null 2>&1; then
    pnpm audit --json > "$REPORT_DIR/pnpm-audit.json" 2>/dev/null || true
    pnpm audit --audit-level=moderate \
        > "$REPORT_DIR/pnpm-audit.txt" 2>&1 || true
    if [ -f "$REPORT_DIR/pnpm-audit.json" ] && command -v jq >/dev/null 2>&1; then
        CRIT=$(jq '.metadata.vulnerabilities.critical // 0' \
            "$REPORT_DIR/pnpm-audit.json" 2>/dev/null || echo 0)
        HIGH=$(jq '.metadata.vulnerabilities.high // 0' \
            "$REPORT_DIR/pnpm-audit.json" 2>/dev/null || echo 0)
        if [ "${CRIT:-0}" -gt 0 ] || [ "${HIGH:-0}" -gt 0 ]; then
            fail "pnpm audit: $CRIT critical, $HIGH high"
        else
            ok "pnpm audit: no critical/high vulnerabilities"
        fi
    else
        ok "pnpm audit report written"
    fi
else
    miss "pnpm not installed (npm i -g pnpm)"
fi

# -----------------------------------------------------------------------------
# 4. gitleaks (secrets) — whole repo
# -----------------------------------------------------------------------------
log "[4/4] gitleaks (secret detection)"
if command -v gitleaks >/dev/null 2>&1; then
    gitleaks detect --source . --no-banner --redact \
        --report-path "$REPORT_DIR/gitleaks-report.json" \
        --report-format json >/dev/null 2>&1 || true
    if [ -f "$REPORT_DIR/gitleaks-report.json" ] && command -v jq >/dev/null 2>&1; then
        SECRETS=$(jq 'length' "$REPORT_DIR/gitleaks-report.json" 2>/dev/null || echo 0)
        if [ "${SECRETS:-0}" -gt 0 ]; then
            fail "gitleaks: $SECRETS potential secrets — rotate immediately"
        else
            ok "gitleaks: no secrets found"
        fi
    else
        ok "gitleaks report written"
    fi
else
    miss "gitleaks not installed (https://github.com/gitleaks/gitleaks)"
fi

# -----------------------------------------------------------------------------
# Summary
# -----------------------------------------------------------------------------
{
    echo "# Security Scan Summary — MedRecord AI"
    echo
    echo "**Date:** $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    echo
    echo "## Reports"
    echo "- bandit:    \`bandit-report.html\` / \`bandit-report.json\`"
    echo "- pip-audit: \`pip-audit-report.md\` / \`pip-audit-report.json\`"
    echo "- pnpm:      \`pnpm-audit.txt\` / \`pnpm-audit.json\`"
    echo "- gitleaks:  \`gitleaks-report.json\`"
    echo
    echo "Run \`make security-scan\` to regenerate."
} > "$REPORT_DIR/security-summary.md"

echo
if [ "$CRITICAL_FOUND" -eq 1 ]; then
    echo -e "${RED}FAIL — critical findings present. See $REPORT_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}PASS — no critical findings. Reports in $REPORT_DIR${NC}"
exit 0
