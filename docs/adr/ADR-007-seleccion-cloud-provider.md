# ADR-007: Selección de AWS EC2 + Terraform como cloud target

**Fecha:** 01/05/2026
**Estado:** Aceptado
**Autores:** Equipo MedRecord AI

> Esta ADR ocupa el slot ADR-007 (no ADR-003 como sugería el prompt 35) porque ADR-003 ya estaba asignada a la decisión de integración Node↔Python.

## Contexto

El proyecto requiere deployment en cloud para los criterios de evaluación BSG:

- Sistema accesible públicamente
- Infraestructura como código (IaC)
- CI/CD con build y deploy automatizados

**Cargas a desplegar:**

- Frontend React (estático servido por Nginx)
- Backend Node.js (API + WebSocket gateway)
- Servicio AI Python (FastAPI + WebSocket)
- PostgreSQL
- ChromaDB
- Redis

**Requerimientos cuantificables:**

| Requerimiento | Valor |
|---|---|
| RAM total estimada | ~3.5 GB (todos los contenedores) |
| vCPUs | 2 |
| Storage | ~30 GB (DB + vectores + logs) |
| Tráfico mensual estimado | ~50 GB |
| Presupuesto cloud mensual | ≤ $50 |
| SSL/TLS válido | sí |
| IaC | obligatorio (Terraform) |

## Decisión

**AWS EC2 t3.medium** como compute target, provisionado con **Terraform** (ver [infrastructure/aws/terraform/](../../infrastructure/aws/terraform/)).

**Configuración actual** (ver `variables.tf` y `main.tf`):

| Recurso | Valor | Costo aproximado |
|---|---|---|
| EC2 instance | `t3.medium` (2 vCPU, 4 GB RAM), Ubuntu 22.04 LTS | ~$30/mes (on-demand) |
| EBS gp3 | 30 GB | ~$2.40/mes |
| Security Group | Ingress: 22, 80, 443 — Egress: all | $0 |
| Elastic IP | 1 (asignada) | $0 mientras esté asignada |
| **Total estimado** | | **~$35/mes** |

**Provisioning**:

- `user-data.sh` instala Docker + Docker Compose + Nginx + certbot al boot.
- `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d` corre los 6 servicios en la misma instancia.
- Nginx termina TLS (Let's Encrypt) y proxypasa a backend Node.js (3000) y al frontend estático.

**CI/CD**: GitHub Actions ([.github/workflows/ci-cd.yml](../../.github/workflows/ci-cd.yml)) construye y publica imágenes a GHCR; deployment es pull-and-restart en la instancia.

## Opciones evaluadas

| Proveedor | Compute equivalente | Costo/mes | IaC (Terraform) | Free tier / créditos | Familiaridad equipo | Veredicto |
|---|---|---|---|---|---|---|
| **AWS — EC2 t3.medium (elegido)** | $35 | Excelente (provider maduro) | 12 meses (t2.micro) | Alta | Elegido |
| GCP — Compute Engine e2-medium | $25–30 | Bueno | $300 / 90 días | Media | Rechazado: 20 % menos costo no compensa la curva de aprendizaje del equipo |
| Azure — VM B2s | $30–35 | Aceptable | $200 | Baja | Rechazado: sin ventaja, peor familiaridad |
| AWS — ECS Fargate | $50–70 | Excelente | Limitado | Alta | Rechazado: 50–100 % más caro para workload estable; complejidad innecesaria en MVP |
| Railway / Render (PaaS) | $5–25 | **No** | Limitado | Media | Rechazado: incumple requisito de IaC con Terraform |
| DigitalOcean Droplet 4 GB | $24 | Limitado (provider menos maduro) | $200 | Media | Rechazado: ecosistema más pobre para escalar (sin RDS, Secrets Manager equivalentes) |

**Pros de AWS específicos a este proyecto:**

- Terraform AWS provider es el más maduro — los módulos del equipo se reutilizan sin fricción.
- Familiaridad del equipo reduce el time-to-deploy en ~40 %.
- Camino futuro claro: EC2 → ECS Fargate → EKS sin cambiar de proveedor ni de IaC.

## Estrategia multi-cloud (conceptual)

El deployment es AWS-only para el MVP, pero la arquitectura está diseñada con principios vendor-agnostic. Equivalencias documentadas para que la migración sea principalmente un ejercicio de Terraform:

| Componente | AWS (actual) | GCP | Azure |
|---|---|---|---|
| Compute (containers) | EC2 + Docker Compose | Compute Engine + Docker | Azure VM + Docker |
| Compute (managed K8s) | EKS | GKE | AKS |
| Compute (serverless) | ECS Fargate / Lambda | Cloud Run / Functions | Container Apps / Functions |
| PostgreSQL managed | RDS | Cloud SQL | Azure Database for PostgreSQL |
| Object storage | S3 | Cloud Storage | Blob Storage |
| Secrets | Secrets Manager | Secret Manager | Key Vault |
| Logs/metrics | CloudWatch | Cloud Logging + Monitoring | Azure Monitor |
| DNS | Route 53 | Cloud DNS | Azure DNS |
| IaC | Terraform AWS provider | Terraform GCP provider | Terraform azurerm provider |

**Patrones de portabilidad ya adoptados:**

- 12-factor: toda configuración por variables de entorno (`.env.example` en cada paquete).
- Imágenes Docker portables — ningún Dockerfile asume servicios AWS-specific.
- Módulos Terraform separan la lógica de aplicación de los recursos de proveedor.

**Estimación de migración AWS → GCP:** ~30 % del Terraform a reescribir, 0 % de la aplicación. ~2–3 días de trabajo.

## Consecuencias positivas

- **Cumple requisitos BSG** (IaC, deployment público, CI/CD).
- **Costo predecible** y dentro del presupuesto de $50/mes.
- **Stack reutilizable**: el equipo puede aplicar la misma topología (EC2 + Compose + Nginx) a otros proyectos.
- **Camino de escalado claro** dentro del mismo proveedor.
- **Familiaridad operacional**: incident response y debugging conocidos.

## Consecuencias negativas / Trade-offs

- **Single-instance, single-AZ** → un fallo de la instancia es downtime total. Aceptable para MVP / demo, no para producción real.
- **Vendor lock-in parcial**: aunque el código de aplicación es portable, los módulos Terraform y los workflows de CI usan recursos AWS-specific (Security Groups, EIP).
- **Costo ligeramente mayor** que GCP/DigitalOcean para el mismo perfil de máquina.
- **Sin auto-scaling** — la single EC2 requiere intervención manual si el load crece.
- **Backups manuales** del volumen EBS (snapshot scheduling no incluido en el Terraform actual).
- **Secretos en `.env` en la instancia** — aceptable para MVP; producción requeriría AWS Secrets Manager.

## Criterios de revisión

| Trigger | Acción |
|---|---|
| Costo mensual sostenido > $80 | Reevaluar GCP o DigitalOcean |
| > 100 usuarios concurrentes | Migrar a ECS Fargate con auto-scaling |
| Requerimiento de multi-AZ / multi-región | Re-arquitectar con ALB + Auto Scaling Group o EKS |
| Datos médicos requieren HIPAA/GDPR formal | Revaluar el proveedor con BAA disponible |
| Necesidad de servicios managed (RDS, ElastiCache) | Provisionarlos en AWS antes de migrar |

## Referencias

- IaC: [infrastructure/aws/terraform/](../../infrastructure/aws/terraform/) (`main.tf`, `variables.tf`, `outputs.tf`, `user-data.sh`)
- CI/CD: [.github/workflows/ci-cd.yml](../../.github/workflows/ci-cd.yml)
- Compose runtime: [ai-service/docker-compose.yml](../../ai-service/docker-compose.yml), [ai-service/docker-compose.prod.yml](../../ai-service/docker-compose.prod.yml)
- Notas de despliegue: [docs/deployment/](../deployment/)
- [AWS EC2 Pricing](https://aws.amazon.com/ec2/pricing/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- ADR-004: Arquitectura del servicio AI (cargas a desplegar)
