# Extension Publishing Guide - insitu.company Campaign Validator

## Overview

La extensión **insitu.company Campaign Validator** es una herramienta para validar nomenclatura de campañas publicitarias y establecer límites de presupuesto seguro en plataformas de publicidad.

## Features

✅ **Gobernanza de Nomenclatura**: Genera nombres de campaña siguiendo estándares insitu
✅ **Validación de URLs**: Crea URLs con UTMs estructurados automáticamente  
✅ **Límite de Presupuesto Seguro**: Previene gastos excesivos con alertas en tiempo real
✅ **Integración Multi-Canal**: Funciona en Meta Ads, Google Ads, TikTok, LinkedIn, Pinterest, etc.
✅ **Autenticación**: Solo usuarios validados de insitu.company pueden acceder

## Chrome Web Store Assets

Los siguientes assets ya están listos en `/extension/store-assets/`:

### 1. **Icon (128x128)**
- Ubicación: `extension/store-assets/icon-128.png`
- Especificaciones: 96x96 artwork + 16px padding transparente
- Colores: Magenta (#ff477b) con glow blanco para fondos oscuros
- Cumple con todos los requisitos de Google

### 2. **Promotional Image (440x280)**
- Ubicación: `extension/store-assets/promo-440x280.png`
- Requerida para destacarse en Chrome Web Store
- Diseño moderno con colores corporativos

### 3. **Screenshots (1280x800)**
- Screenshot 1: Pantalla de autenticación
- Screenshot 2: Generador de gobernanza
- Screenshot 3: Configuración de presupuesto
- Ubicación: `extension/store-assets/screenshot-*.png`

## Publishing Checklist

### Antes de publicar:

- [ ] Revisar que `manifest.json` esté correcto
- [ ] Validar que todos los permisos sean necesarios
- [ ] Confirmar que la autenticación funciona correctamente
- [ ] Probar en Chrome (extensión sin empaquetar)
- [ ] Revisar que los iconos se vean bien en ambos temas

### En Chrome Web Store Developer Console:

1. **Login** a [Chrome Web Store Developer Console](https://chrome.google.com/webstore/devconsole/)

2. **Create New Item**:
   - Seleccionar "Upload new item"
   - ZIP file: Empaquetar extensión (sin node_modules)

3. **Store Listing** (Llenar estos campos):
   - **Name**: insitu.company Campaign Validator
   - **Short description**: "Validación en tiempo real de nomenclatura y presupuestos para campañas publicitarias"
   - **Detailed description**:
     ```
     La extensión insitu.company Campaign Validator ayuda a los equipos de marketing a:
     
     ✓ Mantener consistencia en nomenclatura de campañas (PAÍS_CANAL_OBJETIVO_PRODUCTO_AÑO)
     ✓ Generar URLs con UTMs estructurados automáticamente
     ✓ Establecer límites de presupuesto diario seguro
     ✓ Recibir alertas en tiempo real si se excede el límite
     
     Funciona en:
     - Google Ads
     - Meta Ads (Facebook/Instagram)
     - TikTok Ads
     - LinkedIn Ads
     - Pinterest Ads
     - Y más plataformas
     
     Solo disponible para usuarios validados de insitu.company
     ```

   - **Category**: Productivity
   - **Language**: Spanish (es) - Puede agregar más idiomas luego
   - **Websites**: https://insitu.company
   - **Support email**: support@insitu.company

4. **Branding**:
   - **Icon**: Upload `extension/store-assets/icon-128.png`
   - **Promotional tiles**: Upload `extension/store-assets/promo-440x280.png`
   - **Screenshots**: Upload los 3 screenshots (1280x800)

5. **Privacy**:
   - Explicar qué datos maneja la extensión
   - Confirmar que solo autentica usuarios válidos
   - No recolecta datos de publicidad

6. **Technical**:
   - **Minimum Chrome version**: 120 (recomendado)
   - **Permissions**: Revisar que solo incluya lo necesario:
     - `activeTab`: Para inyectar validadores
     - Host permissions: Solo dominios de publicidad

7. **Submit for review**

## File Structure para empaquetar

```
extension/
├── manifest.json
├── popup.html
├── popup.js
├── background.js
├── validator.js
├── google-validator.js
├── meta-validator.js
├── google_injector.js
├── meta_injector.js
├── content-bridge.js
├── icons/
│   ├── icon-16.png
│   ├── icon-48.png
│   └── icon-128.png
└── store-assets/
    ├── icon-128.png (para web store)
    ├── promo-440x280.png
    ├── screenshot-1-auth.png
    ├── screenshot-2-generator.png
    └── screenshot-3-budget.png
```

## Creating the ZIP file

```bash
cd /Users/sanchezfj/INsitu-AI-2/extension
zip -r insitu-extension.zip . \
  -x "*.git*" \
  "node_modules/*" \
  "store-assets/*" \
  "create-icons.js" \
  "README.md"
```

## Backend Requirements

Asegurar que estos endpoints estén activos en Netlify:

- `/.netlify/functions/api-extension-auth` - POST para validar credenciales
- `/.netlify/functions/api-validate-token` - POST para validar sesiones

## Chrome Web Store Review Timeline

- **Submission**: 24 horas después del upload
- **Initial Review**: 1-3 días
- **Possible Rejection Reasons**:
  - Permisos no justificados
  - Autenticación no clara
  - UI/UX confusa
  - Privacy policy incompleta

## Post-Launch

Una vez aprobada:

1. Actualizar versión en `manifest.json` para futuras releases
2. Monitorear reviews y ratings
3. Responder a comentarios de usuarios
4. Planificar actualizaciones basadas en feedback

## Support & Maintenance

Para reportar problemas o mejorar la extensión:
- Email: support@insitu.company
- Repositorio: (internal)
- Versión actual: 1.0.0

---

**Última actualización**: 2026-06-21
**Estado**: Listo para publicar ✅
