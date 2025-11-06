# Prueba Técnica CLARO – Monorepo (Frontend + Backend)

Proyecto full‑stack para catálogo de productos deportivos con autenticación JWT, carrito y checkout simulado. Incluye:
- Backend: Serverless (Offline) + DynamoDB Local (Docker) con TypeScript.
- Frontend: React + Vite + TypeScript con Redux Toolkit.

## Requisitos
- Node.js 18+
- Docker Desktop con Docker Compose
- Opcional: API key de Pexels para sembrar productos con imágenes reales

## Estructura
```
./
├─ Backend/          # API Serverless + scripts infra/seed
├─ Frontend/         # Aplicación React
└─ docker-compose.yml# DynamoDB Local + dynamodb-admin
```

## Inicio rápido (desde cero)

1) Infraestructura local (DynamoDB Local)
- Abre una terminal en `Backend/` y ejecuta:

```bash
npm install
npm run db:up
npm run db:tables
```

2) Variables de entorno
- Crea `Backend/.env` con esta base (ajusta según tu entorno):

```
AWS_REGION=us-east-1
DYNAMODB_ENDPOINT=http://127.0.0.1:8000
JWT_SECRET=dev-secret
LOG_LEVEL=info
IS_LOCAL=true
BCRYPT_SALT_ROUNDS=1
DDB_PREFER_IPV4=true
DDB_MAX_ATTEMPTS=1
DDB_USE_CUSTOM_HTTP=true
DDB_CONN_TIMEOUT_MS=1500
DDB_SOCKET_TIMEOUT_MS=4000
CART_CACHE_TTL_MS=0
# Seed (opcional)
PEXELS_API_KEY=<tu_api_key_pexels>
SEED_COUNT=100
```

3) Sembrar datos
- Con la terminal aún en `Backend/`:

```bash
npm run db:seed
```

4) Levantar el backend (Serverless Offline)

```bash
npm run dev:api
```

- La API quedará en `http://127.0.0.1:3000`.
- UI de DynamoDB Admin opcional en `http://127.0.0.1:8001` (ejecuta `npm run dbAdmin:up`).

5) Levantar el frontend (otra terminal)

```bash
cd Frontend
npm install
# Configura la URL del backend (recomendado IPv4):
echo "VITE_API_URL=http://127.0.0.1:3000" > .env.local
npm run dev
```

## Scripts útiles (Backend)
- `npm run db:up` / `npm run db:down`: iniciar/detener DynamoDB Local
- `npm run db:tables`: crear/asegurar tablas (Users, Products, Carts, Orders)
- `npm run db:seed`: sembrar productos (usa Pexels si hay API key)
- `npm run db:reseed`: tablas + seed en un paso
- `npm run dbAdmin:up` / `npm run dbAdmin:down`: UI admin de DynamoDB
- `npm run dev:api`: API local (Serverless Offline)

## Scripts útiles (Frontend)
- `npm run dev`: modo desarrollo
- `npm run build`: build de producción
- `npm run preview`: vista previa del build

## Endpoints clave (resumen)
- Auth: `POST /auth/register`, `POST /auth/login`
- Productos: `GET /products`, `GET /products/{id}`
- Carrito: `GET /cart`, `POST /cart/items`, `PATCH /cart/items/{productId}`, `DELETE /cart/items/{productId}`
- Checkout/Órdenes: `POST /checkout`, `GET /orders`, `GET /orders/{orderId}`

Para detalles, ver `Backend/README.md`.

## Solución de problemas
- Puertos ocupados (EADDRINUSE): edita `Backend/serverless.yml` sección `custom.serverless-offline` o libera el puerto.
- DynamoDB sin datos tras reinicio: el contenedor corre en modo `-inMemory`; vuelve a ejecutar `npm run db:reseed` o cambia a volumen persistente (ver `docker-compose.yml`).
- Conexión fallida desde frontend: configura `Frontend/.env.local` con `VITE_API_URL=http://127.0.0.1:3000`.
- Seed lento/sin imágenes: define `PEXELS_API_KEY` o reduce `SEED_COUNT`.

## Licencia
Uso interno para la prueba técnica.
