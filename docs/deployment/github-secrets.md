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

### Frontend Build Args
- `VITE_API_URL`: Public backend API URL used at build time
- `VITE_WS_URL`: Public WebSocket URL used at build time

## Setup Instructions

1. Go to repository Settings -> Secrets and variables -> Actions
2. Click "New repository secret"
3. Add each secret listed above
4. Verify secrets are available in workflow runs
