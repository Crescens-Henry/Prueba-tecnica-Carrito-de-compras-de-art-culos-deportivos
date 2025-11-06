# Frontend (React + Vite + TS)

Aplicación React con TypeScript y Vite. Integra autenticación, listado de productos con filtros/paginación, carrito con UI optimista y checkout simulado.

## Requisitos
- Node.js 18+
- Backend local corriendo en `http://127.0.0.1:3000` (ver `../Backend/README.md`)

## Configuración

Variables de entorno (archivo `Frontend/.env.local`):

```
# URL del backend; por defecto es http://localhost:3000
VITE_API_URL=http://127.0.0.1:3000
```

Sugerencia: usa `127.0.0.1` para evitar problemas de IPv6 con `localhost`.

## Scripts

```bash
# Instalar dependencias
npm install

# Modo desarrollo (Vite)
npm run dev

# Build de producción
npm run build

# Previsualizar build (sirve dist/)
npm run preview
```

## Funcionalidades
- Login/Registro (JWT almacenado en localStorage).
- Catálogo: búsqueda por texto, filtro por categoría, ordenación y paginación (12 x página).
- Productos agotados: visual y no agregables.
- Carrito: hidratación desde backend, toasts optimistas, actualización de cantidades, vaciar carrito.
- Checkout simulado y listados de órdenes.

## Estructura relevante
- `src/lib/api/http.ts`: cliente HTTP (usa `VITE_API_URL`).
- `src/lib/api/products.ts`: consumo de productos.
- `src/lib/api/cart.ts`: consumo de carrito.
- `src/store`: Redux Toolkit + persistencia.
- `src/pages`: pantallas (auth, products, cart, checkout).

## Solución de problemas
- 401/403: asegúrate de loguearte y que el header Authorization se incluya (lo gestiona el cliente HTTP).
- CORS: httpApi tiene CORS activado; usa siempre la misma máquina/puerto para backend y frontend.
- Conexión fallida: revisa `VITE_API_URL` y que el backend esté escuchando.
