# AWS Infrastructure - Single EC2 Instance

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      Internet                                │
└────────────────────────┬────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                  AWS EC2 Instance (t3.medium)                │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Nginx (Port 80, 443)                     │  │
│  │              - SSL Termination                        │  │
│  │              - Reverse Proxy                          │  │
│  │              - Static file serving                    │  │
│  └──────────┬──────────────────────────────┬─────────────┘  │
│             │                               │                │
│             ▼                               ▼                │
│  ┌──────────────────┐          ┌──────────────────────┐     │
│  │  Frontend        │          │  Backend             │     │
│  │  (React)         │          │  (Node.js)           │     │
│  │  Port 3000       │          │  Port 3001           │     │
│  └──────────────────┘          └──────────┬───────────┘     │
│                                            │                 │
│                                            ▼                 │
│                               ┌──────────────────────┐       │
│                               │  AI Service          │       │
│                               │  (Python/FastAPI)    │       │
│                               │  Port 8000           │       │
│                               └──────────┬───────────┘       │
│                                          │                   │
│             ┌────────────────────────────┼──────────┐        │
│             │                            │          │        │
│             ▼                            ▼          ▼        │
│  ┌──────────────────┐       ┌──────────────┐  ┌─────────┐  │
│  │  PostgreSQL      │       │  ChromaDB    │  │  Redis  │  │
│  │  Port 5432       │       │  Port 8001   │  │  Port   │  │
│  │  (Docker)        │       │  (Docker)    │  │  6379   │  │
│  └──────────────────┘       └──────────────┘  └─────────┘  │
└─────────────────────────────────────────────────────────────┘
```

## Resources

### EC2 Instance
- **Type**: t3.medium (2 vCPU, 4GB RAM)
- **OS**: Ubuntu 22.04 LTS
- **Storage**: 30GB gp3 EBS volume
- **Security Group**: Allow ports 80, 443, 22

### Estimated Costs (Monthly)
- EC2 t3.medium: ~$30
- EBS 30GB: ~$3
- Data transfer: ~$2-5
- **Total**: ~$35-40/month

## Requirements

### Software
- Docker Engine 24+
- Docker Compose 2.20+
- Nginx
- Certbot (Let's Encrypt)
- Git

### Domain
- Domain name pointing to EC2 public IP
- DNS A record configured
