# Pre-Delivery Checklist — MedRecord AI

**Fecha de entrega:** 2026-05-03
**Versión:** v1.0.0

Completar este checklist ANTES de la entrega final a BSG.

El estado actual y los gaps reales (issues abiertos OI-1..OI-5) están
documentados en [`delivery-4/README.md`](delivery-4/README.md). Este
checklist tracking se cierra con esos gaps reconocidos.

---

## Verificación automática

Ejecutar desde la raíz del monorepo:

```bash
make pre-delivery
```

Este comando ejecuta:

- Verificación de archivos requeridos (`make check-files`)
- Linters (Ruff + ESLint en backend y frontend)
- Type checking (MyPy + tsc)
- Tests (unit + integration + RAGAS)
- Security scan (Bandit + pip-audit + pnpm audit + gitleaks)

Tests pesados se ejecutan a demanda:

```bash
make test-load        # Locust 50 users / 2 min
make test-websocket   # WebSocket / streaming en AI + backend
make coverage         # Reporte HTML de cobertura del AI service
make health           # Estado en vivo de cada componente
```

---

## Checklist manual

### 1. Repositorio Git

- [ ] Historial de commits limpio (Conventional Commits)
- [ ] Tag `v1.0.0` creado: `git tag -a v1.0.0 -m "Entrega final BSG" && git push origin v1.0.0`
- [ ] `.env` no está commiteado: `git check-ignore .env` retorna `.env`
- [ ] No hay credenciales en el historial: `make security-gitleaks` pasa
- [ ] CI/CD en verde (.github/workflows/ci-cd.yml, security.yml, ragas-evaluation.yml)

### 2. Documentación

- [ ] `README.md` permite levantar el sistema en <15 minutos
- [ ] Diagramas C4 (`docs/architecture/diagrams/c4-context.md`, `c4-container.md`) actualizados
- [ ] Mínimo 2 ADRs en `docs/adr/` (hay 7 actualmente)
- [ ] `docs/api/openapi.yaml` refleja los endpoints reales
- [ ] `docs/security/threat-model.md` actualizado (STRIDE, ≥4 amenazas)
- [x] Enlace al video demo añadido al README — <https://www.youtube.com/watch?v=ezQXaWdaTKk>

### 3. Código y tests

- [ ] Cobertura AI service ≥60% (`make coverage`)
- [ ] Suites unit + integration verdes (`make test`)
- [ ] RAGAS dentro de objetivos:
  - Faithfulness > 0.80
  - Context Precision > 0.75
  - Answer Relevancy > 0.80
- [ ] Load test ejecutado (50 users, p95 < 3 s)
- [ ] Lint y type-check sin errores (`make lint && make typecheck`)
- [ ] Latencias real-time medidas:
  - Transcripción p95 < 2 s
  - Extracción p95 < 3 s
  - Alertas críticas p95 < 1 s

### 4. Seguridad

- [ ] `make security-scan` sin issues críticos
- [ ] `.env.example` cubre todas las variables usadas
- [ ] `.gitignore` excluye `.env*`, `*.pem`, `*.key`, `secrets/`
- [ ] JWT obligatorio en todos los endpoints excepto `/health` y `/metrics`
- [ ] Rate limiting verificado en Nginx (ver `infrastructure/aws/nginx/`)

### 5. Despliegue e infraestructura

- [ ] Sistema desplegado en AWS con URL pública
- [ ] `terraform plan` limpio en `infrastructure/aws/terraform/`
- [ ] TLS configurado (Let's Encrypt u otro)
- [ ] `curl https://<dominio>/health` retorna `healthy`
- [ ] WebSocket funcional en producción (`wscat -c wss://<dominio>/ws/...`)

### 6. Observabilidad

- [ ] Logging estructurado (JSON) activo
- [ ] `/health` reporta el estado de cada componente
- [ ] Métricas de costos disponibles (tokens, $/sesión, modo batch vs realtime)
- [ ] Logs incluyen tokens, latencia, costo y stack trace en errores

### 7. Datos reales (no estimaciones)

- [ ] Costos reales de AWS documentados — **gap declarado** en [delivery-4/02-cost-analysis.md §3](delivery-4/02-cost-analysis.md); no hay deployment AWS aún
- [x] Resultados RAGAS reales en `ai-service/reports/ragas_results.json` (Faithfulness 0.938, Context Precision 1.000)
- [x] Latencia medida (no estimada) en README — pasos OK; pasos pendientes (realtime E2E) declarados como bloqueados por OI-1

### 8. Video demo

- [x] Duración ≤ 30 minutos
- [x] Cubre: demo funcional → arquitectura/ADRs → resultados → reflexión
- [x] Enlace en README — <https://www.youtube.com/watch?v=ezQXaWdaTKk>

### 9. Entrega final

- [ ] Formulario BSG enviado con: URL del repo, URL del sistema, URL del video, tag `v1.0.0`
- [ ] Email de confirmación al instructor

---

## Comando final

```bash
make pre-delivery
git tag -a v1.0.0 -m "Entrega final BSG"
git push origin main --tags
```

---

## Deduciones automáticas a evitar

| Situación | Penalización |
|-----------|--------------|
| Credenciales en repositorio | −15 |
| Entrega tarde (1 día) | −5 |
| Sistema no desplegado (solo localhost) | −8 |
| Archivos mínimos faltantes | −2 por archivo (máx −10) |
| Video > 30 min | Solo se evalúan los primeros 30 min |

---

**Última revisión:** 2026-05-01
**Revisado por:** Enrique Jiménez Vázquez
