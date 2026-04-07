# Prompt 33: Setup CI/CD Pipeline with GitHub Actions

## Objective
Create a complete CI/CD pipeline using GitHub Actions that builds, tests, and deploys the MedRecord AI system to AWS EC2. The pipeline should demonstrate automated testing, quality gates, and deployment automation.

## Context
The CI/CD pipeline will:
- Build all services (Frontend, Backend, AI Service)
- Run all test suites (unit, integration, load, RAGAS)
- Enforce quality gates (coverage >80%, RAGAS metrics)
- Deploy to AWS EC2 on successful builds
- Support multiple environments (staging, production)

## Tasks

### 1. Create Main CI/CD Workflow

Create `.github/workflows/ci-cd.yml`:

```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

env:
  NODE_VERSION: '18'
  PYTHON_VERSION: '3.11'
  REGISTRY: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # Job 1: Build and test Frontend
  frontend-test:
    name: Frontend Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: packages/frontend/package-lock.json

      - name: Install dependencies
        run: |
          cd packages/frontend
          npm ci

      - name: Lint
        run: |
          cd packages/frontend
          npm run lint

      - name: Type check
        run: |
          cd packages/frontend
          npm run type-check

      - name: Run tests (including real-time components)
        run: |
          cd packages/frontend
          npm run test:coverage
          # Tests include: useRealtimeSession, LiveTranscriptionView,
          # ValidationAlertPanel, LiveEntityList, LiveCostMonitor

      - name: Check coverage threshold
        run: |
          cd packages/frontend
          npm run coverage:check

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/frontend/coverage/coverage-final.json
          flags: frontend

  # Job 2: Build and test Backend
  backend-test:
    name: Backend Tests
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: medrecord_test
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          cache-dependency-path: packages/backend/package-lock.json

      - name: Install dependencies
        run: |
          cd packages/backend
          npm ci

      - name: Run database migrations
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/medrecord_test
        run: |
          cd packages/backend
          npm run migrate:test

      - name: Lint
        run: |
          cd packages/backend
          npm run lint

      - name: Run tests (including real-time streaming)
        env:
          DATABASE_URL: postgresql://test:test@localhost:5432/medrecord_test
          NODE_ENV: test
        run: |
          cd packages/backend
          npm run test:coverage
          # Tests include: WebSocket Gateway, Event Persistence Service,
          # Session Management Controller

      - name: Check coverage threshold
        run: |
          cd packages/backend
          npm run coverage:check

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./packages/backend/coverage/coverage-final.json
          flags: backend

  # Job 3: Build and test AI Service
  ai-service-test:
    name: AI Service Tests
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}
          cache: 'pip'
          cache-dependency-path: ai-service/requirements*.txt

      - name: Install dependencies
        run: |
          cd ai-service
          pip install -r requirements.txt
          pip install -r requirements-test.txt

      - name: Lint with Ruff
        run: |
          cd ai-service
          ruff check src/

      - name: Type check with MyPy
        run: |
          cd ai-service
          mypy src/

      - name: Format check with Black
        run: |
          cd ai-service
          black --check src/

      - name: Run unit tests
        run: |
          cd ai-service
          pytest tests/unit/ -v --cov=src --cov-report=xml --cov-report=term

      - name: Run integration tests
        run: |
          cd ai-service
          pytest tests/integration/ -v --cov=src --cov-append --cov-report=xml

      - name: Check coverage threshold
        run: |
          cd ai-service
          coverage report --fail-under=80

      - name: Upload coverage
        uses: codecov/codecov-action@v3
        with:
          files: ./ai-service/coverage.xml
          flags: ai-service

  # Job 4: RAGAS Evaluation (only on main/develop)
  ragas-evaluation:
    name: RAGAS Quality Check
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main' || github.ref == 'refs/heads/develop'

    steps:
      - uses: actions/checkout@v3

      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: ${{ env.PYTHON_VERSION }}

      - name: Install dependencies
        run: |
          cd ai-service
          pip install -r requirements.txt
          pip install -r requirements-test.txt

      - name: Run RAGAS evaluation
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          cd ai-service
          pytest tests/ragas/ -v -m ragas --tb=short

      - name: Run real-time RAG performance tests
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
        run: |
          cd ai-service
          pytest tests/ragas/test_realtime_rag_performance.py -v -m performance --tb=short
          # Verifies latency targets: CRITICAL <1s, HIGH <2s, MEDIUM <3s

      - name: Generate RAGAS report
        if: always()
        run: |
          cd ai-service
          python tests/ragas/generate_report.py

      - name: Upload RAGAS report
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: ragas-report
          path: ai-service/reports/ragas_*.md

      - name: Check RAGAS requirements
        run: |
          cd ai-service
          python -c "
          import json
          with open('reports/ragas_results.json') as f:
              results = json.load(f)
          met = results['requirements_met']
          if not all(met.values()):
              print('❌ RAGAS requirements not met!')
              print(f'Faithfulness: {results[\"metrics\"][\"faithfulness\"]:.3f} (req: >0.80)')
              print(f'Context Precision: {results[\"metrics\"][\"context_precision\"]:.3f} (req: >0.75)')
              exit(1)
          print('✅ All RAGAS requirements met')
          "

  # Job 5: Build Docker Images
  build-images:
    name: Build Docker Images
    runs-on: ubuntu-latest
    needs: [frontend-test, backend-test, ai-service-test]
    if: github.event_name == 'push'

    permissions:
      contents: read
      packages: write

    outputs:
      image-tag: ${{ steps.meta.outputs.tags }}

    steps:
      - uses: actions/checkout@v3

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v2

      - name: Log in to Container Registry
        uses: docker/login-action@v2
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata (tags, labels)
        id: meta
        uses: docker/metadata-action@v4
        with:
          images: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=sha,prefix={{branch}}-

      - name: Build and push AI Service image
        uses: docker/build-push-action@v4
        with:
          context: ./ai-service
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/ai-service:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push Backend image
        uses: docker/build-push-action@v4
        with:
          context: ./packages/backend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/backend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Build and push Frontend image
        uses: docker/build-push-action@v4
        with:
          context: ./packages/frontend
          push: true
          tags: ${{ env.REGISTRY }}/${{ env.IMAGE_NAME }}/frontend:${{ github.sha }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

  # Job 6: Deploy to Staging (develop branch)
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    needs: [build-images, ragas-evaluation]
    if: github.ref == 'refs/heads/develop' && github.event_name == 'push'
    environment:
      name: staging
      url: https://staging.medrecord.example.com

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to EC2 (Staging)
        env:
          EC2_HOST: ${{ secrets.STAGING_EC2_HOST }}
          SSH_PRIVATE_KEY: ${{ secrets.EC2_SSH_PRIVATE_KEY }}
        run: |
          echo "$SSH_PRIVATE_KEY" > private_key
          chmod 600 private_key

          # Copy deployment script
          scp -i private_key -o StrictHostKeyChecking=no \
            infrastructure/scripts/deploy.sh \
            ubuntu@$EC2_HOST:/home/ubuntu/

          # Execute deployment
          ssh -i private_key -o StrictHostKeyChecking=no \
            ubuntu@$EC2_HOST \
            "bash /home/ubuntu/deploy.sh staging ${{ github.sha }}"

      - name: Health check
        run: |
          sleep 30
          curl -f https://staging.medrecord.example.com/health || exit 1

  # Job 7: Deploy to Production (main branch)
  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    needs: [build-images, ragas-evaluation]
    if: github.ref == 'refs/heads/main' && github.event_name == 'push'
    environment:
      name: production
      url: https://medrecord.example.com

    steps:
      - uses: actions/checkout@v3

      - name: Configure AWS credentials
        uses: aws-actions/configure-aws-credentials@v2
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Deploy to EC2 (Production)
        env:
          EC2_HOST: ${{ secrets.PRODUCTION_EC2_HOST }}
          SSH_PRIVATE_KEY: ${{ secrets.EC2_SSH_PRIVATE_KEY }}
        run: |
          echo "$SSH_PRIVATE_KEY" > private_key
          chmod 600 private_key

          # Copy deployment script
          scp -i private_key -o StrictHostKeyChecking=no \
            infrastructure/scripts/deploy.sh \
            ubuntu@$EC2_HOST:/home/ubuntu/

          # Execute deployment
          ssh -i private_key -o StrictHostKeyChecking=no \
            ubuntu@$EC2_HOST \
            "bash /home/ubuntu/deploy.sh production ${{ github.sha }}"

      - name: Health check
        run: |
          sleep 30
          curl -f https://medrecord.example.com/health || exit 1

      - name: Notify deployment success
        if: success()
        run: |
          echo "✅ Production deployment successful!"
          echo "Deployed commit: ${{ github.sha }}"

      - name: Rollback on failure
        if: failure()
        env:
          EC2_HOST: ${{ secrets.PRODUCTION_EC2_HOST }}
          SSH_PRIVATE_KEY: ${{ secrets.EC2_SSH_PRIVATE_KEY }}
        run: |
          echo "$SSH_PRIVATE_KEY" > private_key
          chmod 600 private_key

          ssh -i private_key -o StrictHostKeyChecking=no \
            ubuntu@$EC2_HOST \
            "bash /home/ubuntu/rollback.sh"
```

### 2. Create Deployment Script

Create `infrastructure/scripts/deploy.sh`:

```bash
#!/bin/bash
set -e

ENVIRONMENT=$1
IMAGE_TAG=$2

if [ -z "$ENVIRONMENT" ] || [ -z "$IMAGE_TAG" ]; then
    echo "Usage: ./deploy.sh <environment> <image-tag>"
    exit 1
fi

echo "Deploying MedRecord AI to $ENVIRONMENT with tag $IMAGE_TAG"

# Navigate to deployment directory
cd /home/ubuntu/medrecord

# Login to GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u $GITHUB_USERNAME --password-stdin

# Pull latest images
docker pull ghcr.io/your-org/medrecord/ai-service:$IMAGE_TAG
docker pull ghcr.io/your-org/medrecord/backend:$IMAGE_TAG
docker pull ghcr.io/your-org/medrecord/frontend:$IMAGE_TAG

# Tag images for docker-compose
docker tag ghcr.io/your-org/medrecord/ai-service:$IMAGE_TAG medrecord-ai-service:latest
docker tag ghcr.io/your-org/medrecord/backend:$IMAGE_TAG medrecord-backend:latest
docker tag ghcr.io/your-org/medrecord/frontend:$IMAGE_TAG medrecord-frontend:latest

# Stop current containers
docker-compose -f docker-compose.$ENVIRONMENT.yml down

# Start new containers
docker-compose -f docker-compose.$ENVIRONMENT.yml up -d

# Run migrations
docker-compose -f docker-compose.$ENVIRONMENT.yml exec -T backend npm run migrate

# Wait for services to be healthy
echo "Waiting for services to be healthy..."
sleep 15

# Check health
curl -f http://localhost:8000/health || exit 1

echo "✅ Deployment successful!"

# Clean up old images
docker image prune -f
```

### 3. Create Rollback Script

Create `infrastructure/scripts/rollback.sh`:

```bash
#!/bin/bash
set -e

echo "Rolling back MedRecord AI deployment..."

cd /home/ubuntu/medrecord

# Restore from backup
if [ -f docker-compose.backup.yml ]; then
    docker-compose -f docker-compose.backup.yml up -d
    echo "✅ Rollback successful!"
else
    echo "❌ No backup found!"
    exit 1
fi
```

### 4. Create Security Scanning Workflow

Create `.github/workflows/security.yml`:

```yaml
name: Security Scanning

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]
  schedule:
    # Run security scans weekly on Mondays at 9 AM
    - cron: '0 9 * * 1'

jobs:
  dependency-scan:
    name: Dependency Vulnerability Scan
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run npm audit (Frontend)
        run: |
          cd packages/frontend
          npm audit --audit-level=moderate

      - name: Run npm audit (Backend)
        run: |
          cd packages/backend
          npm audit --audit-level=moderate

      - name: Run pip safety check (AI Service)
        run: |
          cd ai-service
          pip install safety
          safety check -r requirements.txt

  secret-scan:
    name: Secret Scanning
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3
        with:
          fetch-depth: 0

      - name: Run Gitleaks
        uses: gitleaks/gitleaks-action@v2
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}

  sast-scan:
    name: Static Application Security Testing
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: auto

  container-scan:
    name: Container Image Scanning
    runs-on: ubuntu-latest
    if: github.event_name == 'push'

    steps:
      - uses: actions/checkout@v3

      - name: Build AI Service image
        run: docker build -t medrecord-ai:test ./ai-service

      - name: Scan AI Service image
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: medrecord-ai:test
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy results to GitHub Security
        uses: github/codeql-action/upload-sarif@v2
        with:
          sarif_file: 'trivy-results.sarif'
```

### 5. Configure GitHub Secrets

Document required secrets in `docs/deployment/github-secrets.md`:

```markdown
# GitHub Secrets Configuration

## Required Secrets

### AWS Credentials
- `AWS_ACCESS_KEY_ID`: AWS access key for deployment
- `AWS_SECRET_ACCESS_KEY`: AWS secret access key
- `AWS_REGION`: AWS region (default: us-east-1)

### EC2 Connection
- `PRODUCTION_EC2_HOST`: Production EC2 instance public IP/hostname
- `STAGING_EC2_HOST`: Staging EC2 instance public IP/hostname
- `EC2_SSH_PRIVATE_KEY`: SSH private key for EC2 access

### Container Registry
- `GITHUB_TOKEN`: Auto-provided by GitHub Actions
- `GITHUB_USERNAME`: Your GitHub username

### AI Services
- `OPENAI_API_KEY`: OpenAI API key for AI service

### Application
- `JWT_SECRET_KEY_PRODUCTION`: JWT secret for production
- `JWT_SECRET_KEY_STAGING`: JWT secret for staging
- `DATABASE_URL_PRODUCTION`: Production database URL
- `DATABASE_URL_STAGING`: Staging database URL

## Setup Instructions

1. Go to repository Settings → Secrets and variables → Actions
2. Click "New repository secret"
3. Add each secret listed above
4. Verify secrets are available in workflow runs
```

### 6. Create Branch Protection Rules Documentation

Create `docs/deployment/branch-protection.md`:

```markdown
# Branch Protection Rules

## Main Branch
- Require pull request reviews (1 approver)
- Require status checks to pass:
  - Frontend Tests
  - Backend Tests
  - AI Service Tests
  - RAGAS Evaluation
  - Security Scanning
- Require branches to be up to date
- Require signed commits (recommended)
- Include administrators

## Develop Branch
- Require pull request reviews (1 approver)
- Require status checks to pass:
  - Frontend Tests
  - Backend Tests
  - AI Service Tests
- Allow force pushes for hotfixes (with caution)

## Setup

1. Go to Settings → Branches → Branch protection rules
2. Add rule for `main` branch
3. Configure settings as above
4. Add rule for `develop` branch
5. Test with a sample PR
```

## Expected Deliverables

1. `.github/workflows/ci-cd.yml` - Main CI/CD pipeline
2. `.github/workflows/security.yml` - Security scanning workflow
3. `infrastructure/scripts/deploy.sh` - Deployment script
4. `infrastructure/scripts/rollback.sh` - Rollback script
5. `docs/deployment/github-secrets.md` - Secrets documentation
6. `docs/deployment/branch-protection.md` - Branch protection guide

## Verification Steps

1. Push to develop branch triggers:
   - All test suites run
   - Images build
   - Deployment to staging
2. RAGAS quality gates enforce requirements
3. Security scans catch vulnerabilities
4. Production deploys only from main branch
5. Failed deployments trigger rollback

## Notes

- CI/CD pipeline demonstrates professional DevOps practices
- Quality gates ensure code quality before deployment
- RAGAS evaluation validates AI quality
- Security scanning is automated
- Multi-environment support (staging, production)
- Automated rollback on deployment failure
- Docker layer caching speeds up builds
- GitHub Container Registry for image storage
- **Real-Time Streaming Tests**: Pipeline includes WebSocket Gateway, Event Persistence, and real-time component tests
- **Performance Tests**: RAG validation latency tests verify CRITICAL <1s, HIGH <2s, MEDIUM <3s targets
