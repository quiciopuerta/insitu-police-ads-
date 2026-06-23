# SETUP: Auto-Updates en INsitu AI Desktop

## Status Actual

✅ **Código implementado** (ya en main)
⏳ **Configuración pendiente** (tú debes hacer esto)

---

## ¿Por qué?

Cuando actualices la versión en el código y hagas push, GitHub Actions automáticamente:
1. Compila la app para macOS, Linux, Windows
2. Crea un GitHub Release con los binarios
3. Los usuarios obtienen **updates automáticas al iniciar la app**

Sin acción manual cada release. Todo automatizado.

---

## Pasos de Setup (Una sola vez)

### PASO 1: Generar claves de firma

En tu terminal, en el directorio del proyecto:

```bash
npm run tauri:gen-keys
```

Verás output como:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA2x...
[contenido largo]
-----END RSA PRIVATE KEY-----

-----BEGIN RSA PUBLIC KEY-----
RSA2048 [base64encodedkey]
-----END RSA PUBLIC KEY-----
```

**Copia ambas claves a un archivo temporal (las necesitarás en los pasos 2 y 3)**

---

### PASO 2: Guardar Private Key en GitHub Secrets

1. Ve a: https://github.com/quiciopuerta/INsitu-AI-2/settings/secrets/actions

2. Click **"New repository secret"**

3. Rellena:
   - **Name**: `TAURI_PRIVATE_KEY`
   - **Value**: Todo el bloque private key que copiaste (incluyendo `-----BEGIN` y `-----END`)

4. Click **"Add secret"**

5. Repite para crear otro secret:
   - **Name**: `TAURI_KEY_PASSWORD`
   - **Value**: (déjalo vacío / empty)

**Resultado esperado:**
En https://github.com/quiciopuerta/INsitu-AI-2/settings/secrets/actions deberías ver:
```
✓ TAURI_PRIVATE_KEY
✓ TAURI_KEY_PASSWORD
```

---

### PASO 3: Actualizar Public Key en el código

1. Abre `src-tauri/tauri.conf.json`

2. Encuentra esta línea:
   ```json
   "pubkey": "YOUR_TAURI_KEY_HERE"
   ```

3. Reemplázala con:
   ```json
   "pubkey": "RSA2048 [el public key base64 del output del paso 1]"
   ```

   **Ejemplo (con un key ficticio):**
   ```json
   "pubkey": "RSA2048 dW50cnVzdGVkIGNvbW1lbnQ6IHRoaXMgaXMgYSBwdWJsaWMga2V5IHZlcmlmaWNhdGlvbiBvYmplY3Q6IAAAA"
   ```

4. Guarda el archivo

5. Commitea y pushea:
   ```bash
   git add src-tauri/tauri.conf.json
   git commit -m "fix: add Tauri signing public key"
   git push origin main
   ```

---

## Verificación: ¿Funcionó?

1. Ve a: https://github.com/quiciopuerta/INsitu-AI-2/actions

2. Deberías ver que el workflow `Build and Release` se ejecutó

3. Si es verde ✅ → configuración exitosa

4. Si es rojo ❌ → revisa los logs (click en el workflow fallido)

---

## Listo para usar (desde ahora en adelante)

Cada vez que quieras lanzar una versión nueva:

```bash
npm run version 1.1.0
git add .
git commit -m "bump: version to 1.1.0"
git push origin main
```

**Luego:**
- GitHub Actions compila automáticamente (3-5 minutos)
- Crea un Release con todos los binarios
- Los usuarios obtienen updates al reiniciar la app

---

## Troubleshooting

### ❌ Workflow falla en "Build Tauri app"

**Problema**: El GitHub Actions dice error durante compilación

**Solución**:
- Verifica que copiaste bien el TAURI_PRIVATE_KEY (sin espacios extra, completo)
- Verifica que TAURI_KEY_PASSWORD está vacío (no tiene ningún valor)

**Debug**:
1. Ve a https://github.com/quiciopuerta/INsitu-AI-2/actions
2. Click en el workflow rojo
3. Expand "Build Tauri app" step
4. Lee el error completo

---

### ❌ Public key rechazado

**Problema**: Compiló pero la app rechaza updates con "Invalid signature"

**Solución**:
- El public key en tauri.conf.json no coincide con la private key en GitHub Secrets
- Regenera ambas: `npm run tauri:gen-keys`
- Actualiza secrets y tauri.conf.json

---

### ❌ Updates no funcionan en la app

**Problema**: Abres la app compilada pero no chequea actualizaciones

**Verificación**:
1. Abre DevTools: `Cmd+Option+I` (macOS) o `Ctrl+Shift+I` (Linux/Windows)
2. Go to Console tab
3. Busca logs sobre "updater" o "latest.json"
4. Si ves error de conexión → verifica internet

---

## Más info

Lee `AUTO_UPDATES.md` para:
- Arquitectura detallada
- Cómo funciona el update flow
- Troubleshooting avanzado
- Mejoras futuras

---

## URLs útiles

| Recurso | Link |
|---------|------|
| Este setup | Este archivo |
| Documentación completa | [AUTO_UPDATES.md](AUTO_UPDATES.md) |
| GitHub Secrets | https://github.com/quiciopuerta/INsitu-AI-2/settings/secrets/actions |
| GitHub Actions | https://github.com/quiciopuerta/INsitu-AI-2/actions |
| GitHub Releases | https://github.com/quiciopuerta/INsitu-AI-2/releases |
| Código Tauri | src-tauri/ |

---

**⏱️ Tiempo estimado: 5-10 minutos**

¿Necesitas ayuda con algún paso? Revisa el troubleshooting arriba o contacta support.
