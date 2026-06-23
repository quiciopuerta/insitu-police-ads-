# Cómo Loguearte en la Extensión

## 🎯 Opción 1: Desarrollo Local (Más Rápido)

Si estás probando la extensión localmente, **no necesitas nada especial**:

1. Carga la extensión sin empaquetar en Chrome
2. Verás un hint violeta diciendo "🔧 Modo Desarrollo"
3. Los campos se completarán automáticamente con:
   - **Email**: `test@insitu.company`
   - **Contraseña**: `test123`
4. ¡Click en "Acceder" y listo!

```
Email: test@insitu.company
Contraseña: test123
```

**Nota**: Estas credenciales solo funcionan en desarrollo local. Una vez en producción, usarás tu email y contraseña reales.

---

## 🚀 Opción 2: Producción (Tu Cuenta Real)

### Para usuarios finales:

1. **Abre la Extensión de Chrome**
   - Click en el ícono de insitu.company en tu barra de herramientas
   - Se abrirá la pantalla de login

2. **Ingresa tus credenciales**
   - **Email**: El email de tu cuenta en insitu.company
   - **Contraseña**: Tu contraseña de insitu.company
   - Click en "Acceder"

3. **Listo**
   - ¡Ya puedes usar la extensión!
   - Tu sesión durará 30 días
   - Si vences tu suscripción, la extensión se deshabilitará automáticamente

### Ejemplo:

```
Email: juan@tuempresa.com
Contraseña: MiContraseña123!
```

---

## 🔑 Para Administradores

### Verificar login de usuario:

```bash
curl -X POST https://insitu.company/.netlify/functions/api-extension-auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "usuario@empresa.com",
    "password": "password-aqui"
  }'
```

### Resetear sesión de un usuario:

```bash
# En el admin dashboard → Usuarios → seleccionar usuario → Resetear sesión
```

---

## ❓ Preguntas Frecuentes

### ¿Qué pasa si pierdo mi API Key?

Genera una nueva en Configuración → Extensiones. La antigua se invalidará automáticamente.

### ¿Es segura mi API Key?

✅ **Sí**. 
- Se transmite por HTTPS
- Se valida en cada login
- Se expira en 30 días
- Solo funciona con la extensión

### ¿Puedo tener múltiples API Keys?

Sí, genera una nueva en cualquier momento. La anterior sigue siendo válida hasta que generes una nueva.

### ¿Qué sucede si mi suscripción expira?

La extensión dejará de funcionar automáticamente. Renova tu suscripción en Configuración → Planes.

---

## 🧪 Testing

### Credenciales de desarrollo:

```
Email: test@insitu.company
API Key: dev-key-12345
```

Estas **solo funcionan en localhost**. Para testing en producción, usa tu cuenta real.

### Endpoint de prueba:

```bash
curl -X POST https://insitu.company/.netlify/functions/api-extension-auth \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@insitu.company",
    "apiKey": "dev-key-12345"
  }'
```

---

## 🔒 Seguridad

- **Nunca compartas tu API Key** en mensajes, emails o redes sociales
- **Almacenamiento local**: Tu API Key se guarda solo en el navegador
- **Expiración**: Los tokens expiran cada 30 días
- **Revocación**: Puedes revocar cualquier token en Configuración

---

## 📞 Soporte

¿Problemas con tu API Key?

- Email: support@insitu.company
- Chat: En el dashboard de insitu.company
- Docs: https://docs.insitu.company/extension

---

**Última actualización**: 2026-06-21
