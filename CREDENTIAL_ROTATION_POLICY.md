# Política de Rotación de Credenciales — INsitu AI

**Efectiva desde:** 2026-04-20  
**Revisión:** Trimestral (cada 90 días)  
**Autorización requerida:** SuperAdmin únicamente

---

## Propósito

Mantener la seguridad de credenciales de terceros rotándolas periódicamente para minimizar el riesgo de exposición o compromiso.

---

## Cronograma de Rotación

| Credencial | Servicio | Frecuencia | Próxima Rotación | Responsable |
|---|---|---|---|---|
| `GOOGLE_GENAI_API_KEY_PRIMARY` | Google Cloud / Gemini | 90 días | 2026-07-19 | SuperAdmin |
| `DATABASE_URL` (password) | Supabase PostgreSQL | 90 días | 2026-07-19 | SuperAdmin |
| `GOOGLE_ADS_DEV_TOKEN` | Google Ads API | 90 días | 2026-07-19 | SuperAdmin |
| `GOOGLE_CREDENTIALS_B64` | GCP Service Account | 180 días | 2026-10-18 | SuperAdmin |
| `ADMIN_PASSWORD` | Local (INsitu) | 60 días | 2026-06-19 | SuperAdmin |
| `SMTP_PASS` | Mail hosting | 90 días | 2026-07-19 | SuperAdmin |
| `APIFY_API_TOKEN(S)` | Apify | 90 días | 2026-07-19 | SuperAdmin |

---

## Proceso de Rotación

### Paso 1: Autorización
- Solo SuperAdmin puede iniciar rotación
- Generar nueva credencial en el servicio externo
- **Nunca eliminar la antigua hasta confirmar funcionamiento**

### Paso 2: Actualización en `.env`
```bash
# 1. Editar .env con la nueva credencial
nano .env

# 2. Verificar que .env NO está en git
git status .env  # Debe decir "ignoring .env"

# 3. Actualizar también en Netlify dashboard
# Dashboard → Site settings → Environment → edit variable
```

### Paso 3: Verificación
- [ ] Deploy a staging o test endpoint
- [ ] Confirmar que el servicio externo responde con nueva credencial
- [ ] Monitorear logs por errores `401 Unauthorized`

### Paso 4: Desactivación de Credencial Antigua
- [ ] Esperar 24 horas después de deploy exitoso
- [ ] Revocar/deshabilitar credencial antigua en el servicio
- [ ] Documentar fecha de revocación en tabla abajo

### Paso 5: Documentación
```bash
# Actualizar este archivo con fecha real
# Ejemplo:
# | GOOGLE_GENAI_API_KEY_PRIMARY | Google Cloud | 90d | 2026-07-19 | 2026-04-20 ✓ |
```

---

## Historial de Rotaciones

| Credencial | Última Rotación | Próxima Fecha | Estado | Notas |
|---|---|---|---|---|
| GOOGLE_GENAI_API_KEY_PRIMARY | — | 2026-07-19 | Pendiente | Rotación inicial |
| DATABASE_URL (password) | — | 2026-07-19 | Pendiente | Rotación inicial |
| GOOGLE_ADS_DEV_TOKEN | — | 2026-07-19 | Pendiente | Rotación inicial |
| GOOGLE_CREDENTIALS_B64 | — | 2026-10-18 | Pendiente | Ciclo largo (180d) |
| ADMIN_PASSWORD | — | 2026-06-19 | Pendiente | Ciclo corto (60d) |
| SMTP_PASS | — | 2026-07-19 | Pendiente | Rotación inicial |
| APIFY_API_TOKEN(S) | — | 2026-07-19 | Pendiente | Rotación inicial |

---

## Alertas Automáticas

> ⚠️ **Implementar en el futuro:**
> - Recordatorio en Discord/Slack 7 días antes de vencimiento
> - Dashboard interno (SuperAdmin only) mostrando estado de rotaciones
> - Audit log de quién rotó qué y cuándo

---

## Emergencia: Credencial Comprometida

Si descubres que una credencial fue expuesta:

1. **Inmediato:** Rotar la credencial (mismo proceso, acelerado)
2. **Notificar:** Crear issue en GitHub (privado) documentando el incidente
3. **Auditar:** Revisar logs de acceso no autorizado desde la fecha de exposición
4. **Monitorear:** Vigilar actividad sospechosa en el servicio externo por 7 días

---

## Referencias Rápidas

- [Google Cloud Console (API Keys)](https://console.cloud.google.com/apis/credentials)
- [Supabase Dashboard (Database)](https://app.supabase.com)
- [Google Ads API Center](https://ads.google.com/intl/en/home/)
- [GCP Service Accounts](https://console.cloud.google.com/iam-admin/serviceaccounts)
- [Apify Dashboard](https://apify.com/account/integrations)
- [Netlify Environment Variables](https://app.netlify.com/sites) → Site settings → Environment
