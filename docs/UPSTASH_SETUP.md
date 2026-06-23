# Configuración de Rate Limiting con Upstash Redis

## Paso 1: Crear una cuenta Upstash

1. Ve a [https://upstash.com](https://upstash.com)
2. Crea una cuenta gratuita (no requiere tarjeta de crédito para el plan free)
3. Inicia sesión en el console

## Paso 2: Crear una base de datos Redis

1. En el console, haz clic en **"Create Database"**
2. Elige:
   - **Name**: `insitu-ratelimit` (o lo que prefieras)
   - **Region**: Elige la región más cercana a tu servidor de Netlify (ej: `us-east-1`)
   - **Type**: Elige **Free** (perfecto para rate limiting)
3. Haz clic en **"Create"**

## Paso 3: Obtener las credenciales

Una vez creada la DB:

1. Abre tu DB en el console
2. Ve a la pestaña **"REST API"**
3. Copiar los valores:
   - **UPSTASH_REDIS_REST_URL** (ej: `https://xxx.upstash.io`)
   - **UPSTASH_REDIS_REST_TOKEN** (ej: `AAFrxxxx...`)

## Paso 4: Configurar variables en `.env` y Netlify

### Local (`.env`)

```env
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=AAFrxxxx...
```

### Netlify Dashboard

1. Ve a **Site Settings** → **Environment** → **Add from .env**
2. O manualmente en **Environment variables** agregar:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

## Paso 5: Deploy y Verificar

```bash
npm run build
git add -A
git commit -m "feat: implement distributed rate limiting with Upstash Redis"
git push
```

Los Netlify Functions ahora usarán rate limiting distribuido automáticamente.

---

## Límites por Endpoint

| Endpoint | Límite | Ventana |
|---|---|---|
| `POST /api/auth/login` | 5 intentos | 15 minutos por IP |
| `POST /api/auth/register` | 3 intentos | 60 minutos por IP |
| `POST /api/contact` | 5 envíos | 60 minutos por IP |
| `GET/POST /api/leads` | 50 requests | 15 minutos por usuario |

---

## Prueba Manual

### Test de rate limiting en login

```bash
# Intento 1-5: debe funcionar
curl -X POST https://insitu.company/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Intento 6: debe retornar 429 Too Many Requests
curl -X POST https://insitu.company/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Respuesta esperada:
# {"error": "Demasiados intentos de login. Intenta de nuevo en 15 minutos."}
```

### Monitorear uso en Upstash

En el console de Upstash:
1. Abre tu DB
2. Ve a la pestaña **"Monitor"** para ver requests en tiempo real
3. Cada llamada a `checkRateLimit()` crea entradas en Redis

---

## Fallback si Upstash está inactivo

El código en `_lib/rateLimiter.ts` incluye fallback:

```typescript
if (!process.env.UPSTASH_REDIS_REST_URL) {
  console.warn("[rateLimiter] Upstash not configured, rate limiting disabled");
  return { success: true, remaining: config.max - 1 };
}
```

Si Upstash no está disponible:
- Los requests se permite sin rate limiting
- Se registra una advertencia en los logs
- La app sigue funcionando (fail-open, no fail-closed)

---

## Troubleshooting

### Error: "401 Unauthorized" en rate limiting

**Causa:** Token de Upstash inválido o expirado.

**Solución:**
1. Verifica que `UPSTASH_REDIS_REST_TOKEN` está correcto en Netlify dashboard
2. Regenera el token en el console de Upstash si es necesario
3. Redeploy la app

### Error: "ECONNREFUSED" en logs

**Causa:** Upstash no está disponible (internet lento o outage).

**Solución:**
- El fallback permite requests sin límite
- Monitorea [status.upstash.com](https://status.upstash.com)
- Los límites se reestablecen cuando Upstash vuelva a estar disponible

### Rate limiting no está funcionando

**Verificar:**
1. En Netlify dashboard, confirma que las variables de entorno están establecidas
2. En Upstash console → **Monitor**, verifica que hay actividad (requests a Redis)
3. Revisa los logs en Netlify Functions para ver warnings

---

## Costos

**Plan Free de Upstash:**
- 100 comandos/día gratis (suficiente para rate limiting)
- Ideal para desarrollo y pequeña escala
- Escala automáticamente si necesitas más

Para producción a gran escala, considera el plan pagado.
