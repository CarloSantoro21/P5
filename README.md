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
| `/` | `Hello, World!` (o `?name=Carlo` → `Hello, Carlo!`) |
| `/health` | `{"status":"ok"}` |

## Deploy

Cada push a `main` dispara `.github/workflows/deploy.yml`.
Requiere dos secrets en el repo:

- `CLOUDFLARE_API_TOKEN` — token con permiso *Edit Cloudflare Workers*
- `CLOUDFLARE_ACCOUNT_ID` — ID de la cuenta de Cloudflare

Deploy manual: `npx wrangler deploy`
