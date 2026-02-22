# Health Record - Development Setup (Windows PowerShell)

Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  Health Record - Development Setup" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan

# Check prerequisites
Write-Host "`nChecking prerequisites..." -ForegroundColor Yellow

# Check pnpm
try {
    $null = Get-Command pnpm -ErrorAction Stop
} catch {
    Write-Host "pnpm is not installed. Please install it first: npm install -g pnpm" -ForegroundColor Red
    exit 1
}

# Check docker
try {
    $null = Get-Command docker -ErrorAction Stop
} catch {
    Write-Host "Docker is not installed. Please install Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "All prerequisites met!" -ForegroundColor Green

# Copy environment files
Write-Host "`nSetting up environment files..." -ForegroundColor Yellow
if (!(Test-Path ".env")) {
    Copy-Item ".env.example" ".env"
}
if (!(Test-Path "packages/backend/.env")) {
    Copy-Item "packages/backend/.env.example" "packages/backend/.env"
}
if (!(Test-Path "packages/frontend/.env")) {
    Copy-Item "packages/frontend/.env.example" "packages/frontend/.env"
}
Write-Host "Environment files created!" -ForegroundColor Green

# Install dependencies
Write-Host "`nInstalling dependencies..." -ForegroundColor Yellow
pnpm install

# Start database
Write-Host "`nStarting PostgreSQL database..." -ForegroundColor Yellow
docker-compose -f docker/docker-compose.yml up -d

# Wait for database to be ready
Write-Host "Waiting for database to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Generate Prisma client
Write-Host "`nGenerating Prisma client..." -ForegroundColor Yellow
Push-Location packages/backend
pnpm db:generate
Pop-Location

Write-Host "`n==========================================" -ForegroundColor Green
Write-Host "  Setup Complete!" -ForegroundColor Green
Write-Host "==========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:"
Write-Host "  1. Run 'pnpm dev' to start development servers"
Write-Host "  2. Backend: http://localhost:3001/api/v1/health"
Write-Host "  3. Frontend: http://localhost:5173"
Write-Host ""
