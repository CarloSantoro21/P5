# P5 — Cloudflare Worker

Hello World en Cloudflare Workers, desplegado automáticamente con GitHub Actions.

## Local

```bash
npm install
npm run dev       # http://localhost:8787
```

## Endpoints

| Ruta | Respuesta |
| --- | --- |
| `/` | `holuwu soy carluwu` (o `?name=Carlo` → `holuwu soy Carlo`) |
| `/health` | `{"status":"ok"}` |

## Tests

```bash
npm test                # unit tests (Vitest + Workers runtime)
npm run test:coverage   # tests + reporte de coverage en coverage/
```

Los tests corren en el runtime de Workers con una D1 local, así que no tocan la base real.

## UAT (User Acceptance Testing)

Pruebas de aceptación en `uat/` que llaman al Worker desplegado y guardan cada respuesta como evidencia:

```bash
UAT_BASE_URL=https://p7-prod.alessandrosantoro212121.workers.dev \
UAT_REFERENCE_URL=https://p5.alessandrosantoro212121.workers.dev \
npm run test:uat
```

Genera `uat-report/uat-report.html` (reporte autocontenido con veredicto, casos y evidencia) y `uat-report/junit.xml`.

## Deploy

Cada push a `main` dispara `.github/workflows/deploy.yml`, con dos jobs:

1. **build-test**: build, unit tests con coverage, publica los artifacts `worker-build` (`dist/`) y `coverage-report`, y despliega a `p5`.
2. **deploy-prod**: descarga `worker-build`, lo despliega al Worker `p7-prod` (entorno `production` de `wrangler.jsonc`), corre el UAT contra Prod y publica el artifact `uat-report`.

Ambos Workers usan la D1 `p6`. Requiere dos secrets en el repo:

- `API_KEY` — token de Cloudflare con permisos *Workers Scripts: Edit* y *D1: Edit*
- `ACCOUNT_ID` — ID de la cuenta de Cloudflare

Deploy manual: `npm run deploy` (p5) o `npm run deploy:prod` (p7-prod)
