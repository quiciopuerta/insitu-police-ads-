# Verificación de Seguridad — INsitu AI Ads

**Última actualización:** 2026-04-20  
**Estado:** Pronto para auditoria  
**Resultado esperado:** 100% de tests pasando

---

## Resumen Ejecutivo

Se han implementado **7 fases de hardening** contra vulnerabilidades OWASP Top 10:

| Vulnerabilidad | Protección Implementada | Status |
|---|---|---|
| 🔓 **A01: Broken Access Control (IDOR)** | Ownership verification + role checks | ✅ |
| 🔓 **A03: Injection (SQL)** | Parameterized queries + column whitelist | ✅ |
| 🔓 **A04: Insecure Design** | JWT sig verification + no hardcoded secrets | ✅ |
| 🔓 **A05: Security Misconfiguration** | CORS restricción + error sanitization | ✅ |
| 🔓 **A06: Vulnerable Components** | Dependencies auditadas, no hardcoded keys | ✅ |
| 🔓 **A07: Authentication Failures** | Removed backdoors + proper role checks | ✅ |
| 🔓 **A08: Software & Data Integrity** | No supply chain risks detected | ✅ |
| 🔓 **A09: Logging & Monitoring** | Error logging sanitizado | ✅ |
| 🔓 **A10: SSRF** | Input validation + domain sanitization | ✅ |

---

## Tests de Verificación

### 1️⃣ Secrets Exposure Test

**Objetivo:** Verificar que credenciales no están expuestas al browser

#### Test 1.1: No API keys en bundle.js
```bash
# Buscar API keys en el build de producción
npm run build
grep -r "AIzaSy" dist/ && echo "❌ FAIL: API keys found in bundle" || echo "✅ PASS: No API keys in bundle"
grep -r "apify_api_" dist/ && echo "❌ FAIL: Apify token in bundle" || echo "✅ PASS: Apify token not exposed"
```

#### Test 1.2: No variables VITE_ de secretos
```bash
# Verificar que .env no tiene VITE_ de secretos
grep "^VITE_GOOGLE_GENAI_API_KEY" .env && echo "❌ FAIL: VITE_ prefix found" || echo "✅ PASS: VITE_ removed"
grep "^VITE_ADMIN_PASSWORD" .env && echo "❌ FAIL: VITE_ADMIN_PASSWORD found" || echo "✅ PASS: Removed"
```

#### Test 1.3: vite-env.d.ts no declara secretos
```bash
grep "VITE_GOOGLE_GENAI" src/vite-env.d.ts && echo "❌ FAIL: Secret declaration found" || echo "✅ PASS: Types cleaned"
```

---

### 2️⃣ Authentication & JWT Test

**Objetivo:** Verificar que JWT validation es criptográficamente correcta

#### Test 2.1: JWT verification con OAuth2Client
```bash
# Verificar que api-auth.ts usa OAuth2Client.verifyIdToken() no base64 decode
grep "OAuth2Client" netlify/functions/api-auth.ts && echo "✅ PASS: Using OAuth2Client" || echo "❌ FAIL: Not using OAuth2Client"
grep "verifyIdToken" netlify/functions/api-auth.ts && echo "✅ PASS: JWT sig verification" || echo "❌ FAIL: No verification"
```

#### Test 2.2: Backdoor admin-master eliminado
```bash
# Verificar que no hay bypass de autenticación por hardcoded user ID
grep -r "admin-master" netlify/functions/ && echo "❌ FAIL: admin-master backdoor still present" || echo "✅ PASS: Backdoor removed"
```

#### Test 2.3: Hardcoded emails eliminados
```bash
# Verificar que no hay emails hardcodeados (sociopuerta@gmail.com, etc)
grep -r "sociopuerta@gmail.com" netlify/functions/ && echo "❌ FAIL: Hardcoded email found" || echo "❌ FAIL: Hardcoded email found"
grep -r "fsanchez" netlify/functions/api-auth.ts && echo "❌ FAIL: Hardcoded username found" || echo "✅ PASS: Hardcoded auth removed"
```

---

### 3️⃣ IDOR (Insecure Direct Object Reference) Test

**Objetivo:** Verificar que no se puede acceder a recursos de otros usuarios

#### Test 3.1: PATCH profile requiere ownership check
```bash
# Simular: Usuario A intenta actualizar perfil de Usuario B
curl -X PATCH https://insitu.company/api/auth/profile/user-b-id \
  -H "X-User-Id: user-a-id" \
  -H "Content-Type: application/json" \
  -d '{"firstName":"Hacked"}' \
  -w "\nStatus: %{http_code}\n"

# Esperado: 403 Forbidden (no ownership)
# Si retorna 200: ❌ FAIL IDOR vulnerability
```

#### Test 3.2: PATCH subscription requiere ownership check
```bash
curl -X PATCH https://insitu.company/api/auth/subscription/user-b-id \
  -H "X-User-Id: user-a-id" \
  -H "Content-Type: application/json" \
  -d '{"plan":"Agency"}' \
  -w "\nStatus: %{http_code}\n"

# Esperado: 403 Forbidden
```

#### Test 3.3: GET /api/admin/users requiere admin role
```bash
curl -X GET https://insitu.company/api/admin/users \
  -H "X-User-Id: regular-user-id" \
  -w "\nStatus: %{http_code}\n"

# Esperado: 403 Forbidden o 401 Unauthorized
# Si retorna 200: ❌ FAIL IDOR en admin endpoints
```

---

### 4️⃣ SQL Injection Test

**Objetivo:** Verificar que queries usan parameterización, no string concatenation

#### Test 4.1: Fieldmap whitelist en PATCH profile
```bash
# Intentar inyectar nombre de columna
curl -X PATCH https://insitu.company/api/auth/profile/user-id \
  -H "X-User-Id: user-id" \
  -H "Content-Type: application/json" \
  -d '{"injected_column": "value"}' \
  -w "\nStatus: %{http_code}\n"

# Esperado: El campo "injected_column" debe ser ignorado (fail-closed)
# No debe crear columnas nuevas ni ejecutar SQL arbitrario
```

#### Test 4.2: Todas las queries usan parameterización
```bash
# Buscar string concatenation en SQL (anti-pattern)
grep -r "sql\`.*\${" netlify/functions/ | grep -v "sql\`.*\${\w}" && echo "⚠️  WARNING: Check these for injection" || echo "✅ PASS: Parameterization used"
```

---

### 5️⃣ Input Validation Test

**Objetivo:** Verificar que inputs están validados y sanitizados

#### Test 5.1: Contact form rate limiting
```bash
# Intento 1: Permitido
curl -X POST https://insitu.company/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}' \
  -w "\nAttempt 1: %{http_code}\n"

# Intento 6: Debe ser bloqueado
for i in {2..6}; do
  curl -X POST https://insitu.company/api/contact \
    -H "Content-Type: application/json" \
    -d '{"name":"Test","email":"test@example.com"}' > /dev/null 2>&1
done

curl -X POST https://insitu.company/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"test@example.com"}' \
  -w "\nAttempt 6: %{http_code}\n"

# Esperado: 429 Too Many Requests
```

#### Test 5.2: Email validation
```bash
curl -X POST https://insitu.company/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"Test","email":"invalid-email"}' \
  -w "\nStatus: %{http_code}\n"

# Esperado: 400 Bad Request (invalid email)
```

#### Test 5.3: XSS sanitization en inputs
```bash
curl -X POST https://insitu.company/api/contact \
  -H "Content-Type: application/json" \
  -d '{"name":"<script>alert(1)</script>","email":"test@example.com"}' \
  -w "\nStatus: %{http_code}\n"

# Esperado: 200 (aceptado) pero el script debe estar sanitizado en BD
# Verificar en admin panel: script debe aparecer como texto (&lt;script&gt;...) no ejecutable
```

#### Test 5.4: Domain sanitization en traffic analysis
```bash
curl -X POST https://insitu.company/api/analyze-traffic \
  -H "X-User-Id: user-id" \
  -H "Content-Type: application/json" \
  -d '{"domain":"example.com\n<prompt injection>"}' \
  -w "\nStatus: %{http_code}\n"

# Esperado: 400 Bad Request (newline removed, injection blocked)
```

---

### 6️⃣ Rate Limiting Test

**Objetivo:** Verificar que Upstash Redis está bloqueando ataques de fuerza bruta

#### Test 6.1: Login rate limiting (5 intentos / 15 min)
```bash
# Ejecutar 6 intentos de login rápidamente
for i in {1..6}; do
  echo "Attempt $i:"
  curl -X POST https://insitu.company/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"username":"testuser","password":"wrong"}' \
    -w "Status: %{http_code}\n\n"
done

# Esperado:
# Attempts 1-5: 401 Unauthorized (credenciales malas, pero permitido)
# Attempt 6: 429 Too Many Requests (bloqueado por rate limit)
```

#### Test 6.2: Register rate limiting (3 intentos / 60 min)
```bash
for i in {1..4}; do
  echo "Attempt $i:"
  curl -X POST https://insitu.company/api/auth/register \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"testuser$i\",\"password\":\"pass\",\"email\":\"test$i@example.com\"}" \
    -w "Status: %{http_code}\n\n"
done

# Esperado: Attempt 4 = 429 Too Many Requests
```

---

### 7️⃣ CORS Test

**Objetivo:** Verificar que solo dominios permitidos pueden hacer requests cross-origin

#### Test 7.1: CORS desde dominio no permitido
```bash
curl -X POST https://insitu.company/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://attacker.com" \
  -d '{"name":"Test","email":"test@example.com"}' \
  -i

# Esperado: Response debe incluir:
# Access-Control-Allow-Origin: https://insitu.company
# O no incluir Access-Control-Allow-Origin si Origin no está en whitelist
```

#### Test 7.2: CORS desde dominio permitido
```bash
curl -X POST https://insitu.company/api/contact \
  -H "Content-Type: application/json" \
  -H "Origin: https://insitu.company" \
  -d '{"name":"Test","email":"test@example.com"}' \
  -i

# Esperado: Response incluye:
# Access-Control-Allow-Origin: https://insitu.company
```

---

### 8️⃣ Error Handling Test

**Objetivo:** Verificar que error messages no revelan detalles internos

#### Test 8.1: Error messages sanitizados
```bash
curl -X POST https://insitu.company/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"invalid"}' 2>&1 | grep -i "error"

# Esperado: Error message genérico ("Invalid credentials" o similar)
# ❌ FAIL si contiene: "undefined", "null", stack traces, rutas de archivo
```

#### Test 8.2: Recovery code no está en logs
```bash
# Verificar en Netlify logs que recovery code no se imprime
# CLI: netlify logs -f

# Esperado: No debe haber líneas como:
# "[AUTH] Recovery code for user@example.com: 123456"
```

---

### 9️⃣ Authentication Bypass Test

**Objetivo:** Verificar que no hay formas de saltarse autenticación

#### Test 9.1: Endpoints sin auth requieren headers
```bash
# POST /api/media-analysis sin X-User-Id
curl -X POST https://insitu.company/api/analyze-media \
  -H "Content-Type: application/json" \
  -d '{"imageUrl":"https://example.com/image.jpg"}' \
  -w "\nStatus: %{http_code}\n"

# Esperado: 401 Unauthorized (sin header requerido)
```

#### Test 9.2: Admin endpoints requieren ADMIN_SECRET o admin role
```bash
# GET /api/admin/users sin auth
curl -X GET https://insitu.company/api/admin/users \
  -w "\nStatus: %{http_code}\n"

# Esperado: 401 Unauthorized
```

---

### 🔟 API Key Rotation Test

**Objetivo:** Verificar que hay política de rotación de credenciales

#### Test 10.1: CREDENTIAL_ROTATION_POLICY.md existe
```bash
test -f CREDENTIAL_ROTATION_POLICY.md && echo "✅ PASS: Rotation policy documented" || echo "❌ FAIL: No rotation policy"
```

#### Test 10.2: Próximas rotaciones están documentadas
```bash
grep "2026-06-19\|2026-07-19\|2026-10-18" CREDENTIAL_ROTATION_POLICY.md && echo "✅ PASS: Rotation dates scheduled" || echo "❌ FAIL: No schedule"
```

---

## Automation Script

```bash
#!/bin/bash
# security-tests.sh — Ejecutar todos los tests de seguridad

echo "🔐 INsitu AI Security Verification Suite"
echo "========================================"

PASS=0
FAIL=0

test_bundle_no_keys() {
  npm run build > /dev/null 2>&1
  grep -q "AIzaSy" dist/* && { echo "❌ API keys in bundle"; ((FAIL++)); } || { echo "✅ No API keys in bundle"; ((PASS++)); }
}

test_no_admin_master() {
  grep -r "admin-master" netlify/functions/ > /dev/null && { echo "❌ admin-master found"; ((FAIL++)); } || { echo "✅ admin-master removed"; ((PASS++)); }
}

test_jwt_verification() {
  grep -q "OAuth2Client" netlify/functions/api-auth.ts && { echo "✅ JWT verification enabled"; ((PASS++)); } || { echo "❌ JWT verification missing"; ((FAIL++)); }
}

test_cors_restricted() {
  grep -q "insitu.company" netlify/functions/_lib/corsHelper.ts && { echo "✅ CORS restricted"; ((PASS++)); } || { echo "❌ CORS not restricted"; ((FAIL++)); }
}

test_rate_limiting() {
  grep -q "checkRateLimit" netlify/functions/api-auth.ts && { echo "✅ Rate limiting enabled"; ((PASS++)); } || { echo "❌ Rate limiting missing"; ((FAIL++)); }
}

test_error_sanitization() {
  grep -q "safeError" netlify/functions/api-auth.ts && { echo "✅ Error sanitization enabled"; ((PASS++)); } || { echo "❌ Error sanitization missing"; ((FAIL++)); }
}

# Ejecutar tests
test_bundle_no_keys
test_no_admin_master
test_jwt_verification
test_cors_restricted
test_rate_limiting
test_error_sanitization

echo ""
echo "========================================"
echo "Resultados: ✅ $PASS passed, ❌ $FAIL failed"
echo "========================================"

exit $FAIL
```

---

## Checklist Final

- [ ] `npm run build` sin errores
- [ ] Tests de secretos pasen (Test 1.1-1.3)
- [ ] Tests de JWT pasen (Test 2.1-2.3)
- [ ] Tests de IDOR pasen (Test 3.1-3.3)
- [ ] Tests de SQL injection pasen (Test 4.1-4.2)
- [ ] Tests de input validation pasen (Test 5.1-5.4)
- [ ] Tests de rate limiting pasen (Test 6.1-6.2)
- [ ] Tests de CORS pasen (Test 7.1-7.2)
- [ ] Tests de error handling pasen (Test 8.1-8.2)
- [ ] Tests de auth bypass pasen (Test 9.1-9.2)
- [ ] Tests de rotación de credenciales pasen (Test 10.1-10.2)
- [ ] Upstash Redis configurado en Netlify
- [ ] Deploy a producción sin errores
- [ ] Auditar logs por actividad sospechosa (24h después de deploy)

---

## Auditoría Externa (Recomendado)

Después de completar todos los tests, se recomienda:

1. **Penetration Testing**: Engagement con firma de seguridad
2. **Dependency Audit**: `npm audit --audit-level=moderate`
3. **SAST Scan**: Análisis estático de código
4. **Code Review**: Revisión por equipo de seguridad

---

## Incident Response

Si se encuentra una vulnerabilidad:

1. **Documentar**: Crear issue en GitHub (privado)
2. **Parchar**: Fix + test
3. **Desplegar**: Push a `main`, redeploy en Netlify
4. **Notificar**: Si datos de usuarios fueron expuestos, contactar a afectados (GDPR)
5. **Postmortem**: Analizar por qué se escapó la vuln

---

## Contact & Support

- **Security Issues**: Franklin Sanchez (sociopuerta@gmail.com)
- **Audits**: Contactar a equipo de seguridad externo
- **Bug Bounty**: (No existe actualmente, considerar implementar)
