# Chrome Web Store - insitu.company Campaign Validator

*Última actualización: Junio 2026*

Este documento contiene la copia oficial, metadatos y justificaciones de permisos requeridos para publicar la extensión de INsitu AI en el Chrome Web Store. **Copia y pega** estos textos directamente en tu Developer Dashboard.

---

## 1. Store Listing Details (Detalles de la Tienda)

### Name (Nombre)
insitu.company - Campaign Validator

### Summary (Resumen Corto - Max 132 chars)
Real-time validation for ad campaign nomenclature, budgets, and targeting structures across all major advertising platforms.

### Description (Descripción Detallada)
The **insitu.company Campaign Validator** is a professional productivity and governance tool designed for media planners and digital marketing teams. 

This extension helps maintain consistency, prevent budget errors, and enforce strict naming conventions across your active digital marketing campaigns. By analyzing active ad creation sessions locally, it provides real-time feedback and alerts directly in your browser.

**Key Features:**
- **Real-Time Validation:** Highlights configuration alerts, syntax errors, and nomenclature issues on page elements as you set up your campaigns.
- **Nomenclature Enforcement:** Instantly checks campaign and ad group names against pre-defined organizational naming templates.
- **Budget Safeguards:** Prevents accidental spend by flagging when entered budgets exceed the designated campaign limits.
- **Centralized Settings:** Synchronizes validation rules automatically with your secure insitu.company team workspace.

*Note: This extension is designed exclusively for authorized agency partners and internal team members with an active workspace subscription.*

### Category (Categoría)
Productivity (Productividad) o Developer Tools (Herramientas de Desarrollador).

---

## 2. Privacy & Data Use (Privacidad y Uso de Datos)

En el panel de **Privacy**, deberás responder al formulario de uso de datos.

- **Does this item collect or use user data? (¿Recopila datos del usuario?)**
  Yes.
- **Data Categories (Categorías de Datos):**
  - **Web history / Website content:** Yes. (Leemos la pantalla de la plataforma de anuncios para extraer el nombre de la campaña).
  - **Personally Identifiable Information (PII):** No.
  - **Authentication information:** No.
- **Do you certify that the data is not sold to third parties?**
  Yes. (Certifico que no se vende a terceros).
- **Do you certify that the data is not used for unrelated purposes?**
  Yes.
- **Do you certify that the data is not used for creditworthiness/lending?**
  Yes.

---

## 3. Permissions Justification (Justificación de Permisos)

El equipo de revisión de Google **rechazará la extensión** si no usas una razón técnica y específica para cada permiso. Usa exactamente estos textos cuando te los soliciten en la pestaña de Prácticas de privacidad:

### Single Purpose Description (Finalidad Única)
> "The single purpose of this extension is to provide real-time validation and governance of advertising campaign nomenclature, budgets, and tracking structures across digital ad platforms to ensure compliance with agency standards."

### `activeTab`
> "Required to capture the current active session state of the ad manager dashboard so that the validator popup can temporarily request structure details from the user's view without persistent tracking."

### `storage`
> "Required to store the user's secure session tokens, basic preferences, and nomenclature template configurations locally so they persist across browser sessions without requiring constant re-authentication."

### `host_permissions` (*<all_urls>* or specific domains)
> **For `https://business.facebook.com/*`, `https://ads.google.com/*`, etc.:**
> "Required to allow the content script to interact with the DOM of the supported advertising platforms. The extension reads the campaign nomenclature data inputted by the user on these specific domains to validate them against our agency's strict naming conventions."

### Remote Code (Uso de Código Remoto)
*(Si tu extensión usa Manifest V3, el código remoto ejecutable está prohibido, pero puedes justificar la carga de configuración externa así:)*
> "This extension does not execute remote JavaScript code. It only fetches structured JSON configuration files from our secure server (https://insitu.company) to update the nomenclature rules and budget thresholds locally."

---

## 4. Solución a Alertas de URLs y Certificaciones

### 🌐 URLs Inaccesibles (Página principal y Asistencia)
El error *"No se puede acceder a la URL"* ocurre si las URLs que pusiste no devuelven un código de estado 200 (OK) al momento de la revisión, o si pusiste un correo en vez de un enlace web.
- **Support URL:** Cambia `support@insitu.company` por un enlace web funcional como `https://insitu.company/support` o `https://docs.insitu.company`.
- **Homepage URL:** Asegúrate de que `https://insitu.company` esté en vivo, sin protección por contraseña (htpasswd) y cargue correctamente desde cualquier país.

### 📝 Certificación de Políticas
Para el error *"Para publicar el elemento, debes certificar que el uso que haces de los datos cumple las Políticas..."*:
- Ve a la pestaña **Prácticas de privacidad**.
- Haz scroll hasta la sección final.
- Marca la casilla de verificación que indica que certificas que el uso de datos cumple con las Políticas del Programa para Desarrolladores.

---

## 5. Pre-Publish Checklist (Revisión Final)

- [ ] ¿El archivo `.zip` fue generado con el script oficial `package-ext.sh`? (No debe contener `.git`, ni archivos Markdown).
- [ ] ¿Cuentas con un logotipo de 128x128px cargado en el Dashboard? (Obligatorio, aunque se quite del manifest, la tienda pide un logo).
- [ ] ¿Cuentas con una captura de pantalla de 1280x800px mostrando la extensión validando una campaña?
- [ ] ¿Están configuradas las URLs de asistencia y página principal a sitios web vivos y accesibles (https://...)?
- [ ] ¿Has marcado todas las casillas de certificación de uso de datos?
- [ ] ¿Tu enlace a la Política de Privacidad de INsitu AI está activo y accesible públicamente?
