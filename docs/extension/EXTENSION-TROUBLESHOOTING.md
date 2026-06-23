# Solución de Problemas - Extensión

## ❌ Error: "Failed to fetch"

### ¿Qué significa?

El navegador intentó conectarse al backend de insitu.company pero **no pudo**. Esto es normal en desarrollo local.

### ✅ Solución (Funciona ahora mismo)

**La extensión tiene modo offline.** Simplemente usa las credenciales de desarrollo:

```
Email:      test@insitu.company
Contraseña: test123
```

**Estas credenciales funcionan SIN necesidad de backend.** Verás el hint violeta explicándolo.

---

## Por qué ocurre "Failed to fetch"

### Caso 1: Desarrollando Localmente ✅ (NORMAL)
- Estás cargando la extensión sin empaquetar
- El backend de Netlify no está disponible
- **Solución**: Usa `test@insitu.company` / `test123`

### Caso 2: Sin conexión a Internet ⚠️
- La extensión intenta conectarse al backend pero no hay red
- **Solución**: Usa las credenciales de development (funcionan offline)

### Caso 3: Backend Down 🔴 (Raro)
- El servidor de insitu.company está caído
- **Solución**: Espera a que se recupere, o usa dev credentials mientras tanto

---

## ✅ Credenciales que Funcionan (SIN Backend)

### Development Mode (Localhost)
```
Email:      test@insitu.company
Contraseña: test123
Status:     ✅ Funciona offline
```

Los campos se completarán automáticamente. Solo haz click en "Acceder".

---

## 🚀 Credenciales de Producción (CON Backend)

Usa tu email y contraseña reales de insitu.company:

```
Email:      tu@email.com
Contraseña: tu_contraseña
Status:     ✅ Requiere backend disponible
```

---

## Verificar si el Backend está disponible

### Método 1: Test manual

```bash
curl -X POST https://insitu.company/.netlify/functions/api-extension-auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@insitu.company",
    "password": "test123"
  }'
```

Si obtienes respuesta JSON: ✅ Backend funciona
Si obtienes error: ❌ Backend no disponible

### Método 2: Ver en la consola del navegador

1. Abre la extensión
2. Click derecho → "Inspeccionar"
3. Ve a la pestaña "Console"
4. Deberías ver:
   - ✅ Si funciona: `"valid: true"`
   - ❌ Si no: `"Failed to fetch"` o error de CORS

---

## Soluciones según tu caso

### 📱 Estoy probando localmente

✅ **Usa**: `test@insitu.company` / `test123`

No necesitas que el backend esté funcionando. Estos son credenciales especiales que funcionan offline.

### 🌐 Estoy en producción

✅ **Asegúrate de que**:
- Tienes conexión a internet
- insitu.company está disponible
- Tu suscripción está activa
- Usas tus credenciales reales (no las de test)

### 🔧 Estoy desarrollando el backend

✅ **Mientras trabajas**:
- Usa dev credentials en la extensión
- Desarrolla el backend en paralelo
- Una vez que esté listo, la extensión se conectará automáticamente

---

## El flujo de autenticación

```
┌─────────────────────┐
│  Ingresa credenciales
└──────────┬──────────┘
           │
           ▼
    ¿Backend disponible?
    ├─ SÍ → Valida contra servidor ✅
    └─ NO → Usa validación local
           ├─ Si es test@... → Funciona ✅
           └─ Si es otra → Error
```

---

## Preguntas Frecuentes

### P: ¿Por qué no funciona con mis credenciales reales?

**R**: Si estás offline o el backend no está disponible, solo funcionan las credenciales de test (`test@insitu.company` / `test123`).

Para producción, necesitas que el backend esté disponible.

### P: ¿Se guardará mi login?

**R**: Sí. La extensión crea un token válido por 30 días. Mientras no limpies los datos de Chrome, seguirá funcionando.

### P: ¿Puedo usar esto en producción?

**R**: No. Las credenciales `test@insitu.company` / `test123` son SOLO para desarrollo local. En producción debe usar sus credenciales reales.

### P: ¿Qué pasa si reseteo la extensión?

**R**: Tendrás que volver a loguearte. Se borra el token pero el email y contraseña no se guardan (por seguridad).

---

## Debug Mode

Para ver mensajes de error detallados:

1. Abre la extensión
2. Click derecho → "Inspeccionar" 
3. Ve a Console
4. Verás logs como:
   ```
   Token validation error: Failed to fetch
   Backend unavailable, using local validation
   ```

Esto te ayudará a entender qué está pasando.

---

## Checklist de Solución

- [ ] ¿Usas `test@insitu.company` / `test123` en localhost?
- [ ] ¿La extensión está correctamente cargada en `chrome://extensions/`?
- [ ] ¿Ves el hint violeta "🔧 Modo Desarrollo"?
- [ ] ¿Los campos están pre-rellenados?
- [ ] ¿Hiciste click en "Acceder"?

Si respondiste SÍ a todo, debería funcionar. 

---

**Última actualización**: 2026-06-21
