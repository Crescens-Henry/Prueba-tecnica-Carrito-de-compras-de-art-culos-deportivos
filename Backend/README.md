## Backend (Serverless + DynamoDB Local)

API local basada en AWS Lambda (Serverless Offline) y DynamoDB Local. Incluye autenticación JWT, catálogo de productos, carrito, checkout simulado y órdenes.

### Requisitos
- Windows/Mac/Linux con Docker Desktop y Docker Compose
- Node.js 18+
- Opcional (para seed con imágenes reales): clave de API de Pexels

### Variables de entorno (Backend/.env)
Crea un archivo `.env` en `Backend/` con al menos:

```
AWS_REGION=us-east-1
DYNAMODB_ENDPOINT=http://127.0.0.1:8000
JWT_SECRET=dev-secret
LOG_LEVEL=info
IS_LOCAL=true
BCRYPT_SALT_ROUNDS=1
# Optimización de cliente DynamoDB (desarrollo)
DDB_PREFER_IPV4=true
DDB_MAX_ATTEMPTS=1
DDB_USE_CUSTOM_HTTP=true
DDB_CONN_TIMEOUT_MS=1500
DDB_SOCKET_TIMEOUT_MS=4000
# Carrito: caché desactivada por defecto (rendimiento real)
CART_CACHE_TTL_MS=0
# Seed (opcional)
PEXELS_API_KEY=<tu_api_key_pexels>
SEED_COUNT=100
```

Si no defines `PEXELS_API_KEY`, el script de seed fallará; puedes añadir imágenes locales en el Frontend como alternativa.

### Infra local (Docker)
- DynamoDB Local en `docker-compose.yml` (puerto 8000). Modo inMemory para velocidad.
- UI opcional dynamodb-admin en http://127.0.0.1:8001

Comandos (ejecútalos dentro de `Backend/`):

```bash
# 1) DynamoDB Local
npm run db:up

# 2) Crear/Asegurar tablas (Users, Products, Carts, Orders)
npm run db:tables

# 3) Seed de productos (usa Pexels si tienes API key)
npm run db:seed

# (Opcional) UI admin
npm run dbAdmin:up

# Parar servicios
npm run dbAdmin:down
npm run db:down
```

Recomendado: en Docker Desktop, subir recursos (>=2 vCPU, >=2GB RAM) para acelerar DynamoDB Local.

### Ejecutar API local

```bash
npm run dev:api
```

Por defecto, Serverless Offline escucha en `http://127.0.0.1:3000` (ver `serverless.yml`). Si ves `EADDRINUSE`, libera el puerto o cambia `custom.serverless-offline.httpPort`.

### Esquema de tablas (DynamoDB)
- Users: PK `userId` (S)
- Products: PK `productId` (S)
- Carts: PK `userId` (S), SK `productId` (S) — un ítem por producto en carrito
- Orders: PK `userId` (S), SK `orderId` (S)

### Endpoints (HTTP API)

Auth (públicos):
- POST /auth/register { email, password, name } → { token, user }
- POST /auth/login { email, password } → { token, user }

Productos (JWT requerido):
- GET /products?search=&category=&min=&max=&sort=&pageSize=&cursor=
  - sort: price_asc | price_desc | name_asc | name_desc
- GET /products/{id}

Carrito (JWT requerido):
- GET /cart → { items: [{ productId, quantity, priceAtAdd, name?, image?, stock? }], total }
- POST /cart/items { productId, quantity }
- PATCH /cart/items/{productId} { quantity }
- DELETE /cart/items/{productId}

Checkout y órdenes (JWT requerido):
- POST /checkout → crea order y limpia carrito
- GET /orders
- GET /orders/{orderId}

Cabeceras:
- Authorization: Bearer <token>
- Content-Type: application/json

### Ejemplos rápidos (bash)

```bash
# Registrar usuario
curl -sS -X POST http://127.0.0.1:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Secret#123","name":"Usuario Test"}'

# Login → TOKEN
TOKEN=$(curl -sS -X POST http://127.0.0.1:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@test.com","password":"Secret#123"}' | jq -r .token)

# Listar productos
curl -sS -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3000/products | jq '.items[0:2]'

# Carrito: añadir, ver, actualizar, eliminar
PID=$(curl -sS -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3000/products | jq -r '.items[0].id')
curl -sS -X POST http://127.0.0.1:3000/cart/items \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"productId":"'"$PID"'","quantity":2}'
curl -sS -H "Authorization: Bearer $TOKEN" http://127.0.0.1:3000/cart | jq
curl -sS -X PATCH http://127.0.0.1:3000/cart/items/$PID \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"quantity":3}'
curl -sS -X DELETE http://127.0.0.1:3000/cart/items/$PID -H "Authorization: Bearer $TOKEN"
```

### Rendimiento y diagnósticos
- Cliente DynamoDB con keep-alive + timeouts bajos (ver `src/db.ts` y env `DDB_*`).
- Proyecciones para reducir payload (e.g., Products/Cart con `ProjectionExpression`).
- Prefiere `http://127.0.0.1` sobre `localhost` para evitar IPv6.
- Logs estructurados con duración en ms por request (`src/logger.ts`, middleware `withHttp`).

Problemas comunes:
- Puertos ocupados (`EADDRINUSE`): cambia `httpPort`/`lambdaPort` en `serverless.yml` o cierra procesos.
- Dynamo sin datos tras reinicio: el modo `-inMemory` se limpia al reiniciar; vuelve a `npm run db:reseed` o usa volumen persistente (ver docker-compose).
- Seed lento/sin imágenes: asegura `PEXELS_API_KEY`; o reduce `SEED_COUNT`.

### Emails de confirmación de pedido

Al hacer checkout se envía un correo de confirmación:

- En local/offline: se usa un modo "mock" que solo loguea el contenido del email (no envía nada).
- Envío real con SMTP (gratis si usas tu SMTP, p.ej. Gmail con App Password para pruebas) o con AWS SES (pago muy bajo, gratis si envías desde EC2).

Config (en `.env` local — recomendado; para AWS define en `serverless.yml` o Secrets Manager):

```
# Modo por defecto
EMAIL_PROVIDER=console   # console | smtp | ses
FROM_EMAIL=no-reply@example.com

# Si eliges SMTP
SMTP_HOST=
SMTP_PORT=
SMTP_SECURE=false  # true para 465 (TLS), false para 587
SMTP_USER=
SMTP_PASS=
```

Para usar SMTP (ej. Gmail con App Password - pruebas):

1) Activa 2FA en tu cuenta de Gmail.
2) Crea un App Password (tipo "Mail").
3) Configura:
  - SMTP_HOST=smtp.gmail.com
  - SMTP_PORT=465
  - SMTP_SECURE=true
  - SMTP_USER=tu-correo@gmail.com
  - SMTP_PASS=<app-password>
4) Ajusta FROM_EMAIL al mismo correo o uno permitido por tu servidor.

Para usar AWS SES (despliegue):

1) Cambia `EMAIL_PROVIDER=ses` y ajusta `FROM_EMAIL` a un correo verificado en SES.
2) Asegura que el rol tenga permisos `ses:SendEmail` (ya añadido en `serverless.yml`).
3) Si tu cuenta está en sandbox de SES, el correo destino también debe estar verificado.
4) Define estas variables en `serverless.yml` (solo en despliegue) o usa SSM/Secrets Manager; en local usa `.env`.

Consejo: En local, usamos `dotenv` para cargar `Backend/.env`, por eso no definimos variables de email en `serverless.yml` para que no sobrescriban tu `.env`.

Código relevante:
- Utilidad: `src/utils/email.ts`
- Envío en checkout: `src/orders.ts` (se captura error y no bloquea la respuesta)
