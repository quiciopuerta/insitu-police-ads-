# Auto-Updates en Tauri — INsitu AI Desktop

## Visión General

La app Tauri chequea automáticamente si hay nuevas versiones disponibles **al iniciar**. Si encuentra una versión más nueva, la descarga silenciosamente y pide al usuario que reinicie para instalarla.

Flujo:
```
Git push a main → GitHub Actions compila → Crea GitHub Release → 
Genera manifest (latest.json) → Tauri chequea → Descarga binario → Instala
```

---

## Configuración Requerida (Una sola vez)

### 1. Generar claves de firma de Tauri

Ejecuta en tu máquina (local, una sola vez):

```bash
npm run tauri:gen-keys
```

Esto mostrará output similar a:

```
-----BEGIN RSA PRIVATE KEY-----
MIIEowIBAAKCAQEA2x...
-----END RSA PRIVATE KEY-----

-----BEGIN RSA PUBLIC KEY-----
RSA2048 base64encodedpublickey
-----END RSA PUBLIC KEY-----
```

### 2. Guardar claves en GitHub Secrets

Ve a: https://github.com/quiciopuerta/INsitu-AI-2/settings/secrets/actions

Crea dos secrets:

| Secret | Valor |
|--------|-------|
| `TAURI_PRIVATE_KEY` | Todo el bloque private key del output (incluyendo BEGIN/END) |
| `TAURI_KEY_PASSWORD` | Dejar vacío (si se solicita en el script, dejarlo en blanco) |

### 3. Actualizar public key en tauri.conf.json

Abre `src-tauri/tauri.conf.json` y reemplaza:

```json
"pubkey": "YOUR_TAURI_KEY_HERE"
```

Con:

```json
"pubkey": "RSA2048 [el public key base64 del output del script]"
```

Ejemplo:
```json
"pubkey": "RSA2048 dW50cnVzdGVkIGNvbW1lbnQ6IHRoaXMgaXMgYSBwdWJsaWMga2V5IHNlZXMgc2FkdGc="
```

---

## Uso Normal (cada release)

### Bumpar versión

Cuando quieras lanzar una nueva versión:

```bash
npm run version 1.1.0
```

Esto:
- Actualiza `package.json` a 1.1.0
- Actualiza `src-tauri/Cargo.toml` a 1.1.0
- Actualiza `src-tauri/tauri.conf.json` a 1.1.0

### Commitear y pushear

```bash
git add .
git commit -m "bump: version to 1.1.0"
git push origin main
```

GitHub Actions automáticamente:
1. ✅ Compila la app para macOS (aarch64 + x86_64), Linux, Windows
2. ✅ Genera `latest.json` (manifest de actualización)
3. ✅ Crea un GitHub Release con los binarios
4. ✅ Sube `latest.json` a la release

---

## Cómo funciona el update en la app

### En el código (ya configurado)

1. **`src-tauri/lib.rs`**: Plugin updater registrado
2. **`src-tauri/tauri.conf.json`**: Endpoint configurado a GitHub Releases
3. **Al iniciar**: Tauri consulta `https://releases.githubusercontent.com/repos/quiciopuerta/INsitu-AI-2/releases/latest/download/latest.json`

### Respuesta del manifest `latest.json`

```json
{
  "version": "1.1.0",
  "pub_date": "2026-06-16T10:00:00Z",
  "notes": "Release notes aqui",
  "platforms": {
    "darwin-aarch64": {
      "url": "https://releases.githubusercontent.com/repos/.../insitu-ai-aarch64-macos.tar.gz",
      "signature": "..."
    },
    "darwin-x86_64": { ... },
    "linux-x86_64": { ... },
    "windows-x86_64": { ... }
  }
}
```

Tauri automáticamente:
1. Detecta que `1.1.0 > app_version`
2. Descarga el binario para su plataforma
3. Valida la firma con la public key
4. Muestra diálogo: "Nueva versión disponible. ¿Actualizar?"
5. Usuario clickea "Actualizar" → instala en background
6. Al reiniciar → app actualizada

---

## Troubleshooting

### GitHub Actions falla en compilación

**Problema**: Workflow muestra error en "Build Tauri app"

**Solución**:
- Verifica que `TAURI_PRIVATE_KEY` esté correctamente guardado en secrets (sin espacios extra)
- Verifica que `TAURI_KEY_PASSWORD` esté vacío
- Revisa los logs de la action en GitHub

### Manifest `latest.json` no se crea

**Problema**: La action completó pero no hay `latest.json` en la release

**Solución**:
- Confirma que `tauri-apps/tauri-action@v0` está configurado en el workflow
- Verifica que `releaseDraft: false` (debe ser false para que sea visible)

### App no detecta updates

**Problema**: Abro la app pero no chequea actualizaciones

**Soluciones**:
1. Verifica que internet está conectado (update chequea en línea)
2. Verifica que `src-tauri/tauri.conf.json` tiene `"active": true` en updater
3. Abre DevTools (Cmd+Option+I macOS) y busca logs sobre "updater"
4. Verifica que el manifest URL es accesible: https://releases.githubusercontent.com/repos/quiciopuerta/INsitu-AI-2/releases/latest/download/latest.json

### Error: "Invalid signature"

**Problema**: App rechaza el binario descargado

**Causas**:
- Public key en `tauri.conf.json` no coincide con la clave privada en GitHub Secrets
- Regenera ambas con `npm run tauri:gen-keys` y actualiza

---

## URLs Útiles

| Recurso | URL |
|---------|-----|
| GitHub Releases | https://github.com/quiciopuerta/INsitu-AI-2/releases |
| Secrets del repo | https://github.com/quiciopuerta/INsitu-AI-2/settings/secrets/actions |
| Actions | https://github.com/quiciopuerta/INsitu-AI-2/actions |
| Manifest actual | https://releases.githubusercontent.com/repos/quiciopuerta/INsitu-AI-2/releases/latest/download/latest.json |

---

## Próximas mejoras (futuro)

- [ ] Diálogo con notas de release (changelog)
- [ ] Check manual desde UI ("About" → "Check for updates")
- [ ] Updates en background cada 30min (sin esperar a restart)
- [ ] Rollback automático si update falla
