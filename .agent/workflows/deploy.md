---
description: despliegue de la aplicación en cPanel/Producción
---

Este flujo de trabajo describe cómo desplegar la aplicación fullstack (Frontend + Backend) manteniendo la integridad de la base de datos de producción.

## Requisitos Previos
1. Tener acceso al Administrador de Archivos de cPanel.
2. Tener configurada una aplicación Node.js en cPanel.

## Pasos para el Despliegue

### 1. Generar el Paquete de Actualización
Ejecuta el siguiente comando para generar un archivo ZIP que contenga el frontend compilado y el código del servidor, excluyendo la base de datos de desarrollo.

// turbo
```bash
npm run build && zip -r production_update.zip dist server package.json package-lock.json -x "server/database.sqlite"
```

### 2. Subir a cPanel
1. Ve al **Administrador de Archivos** en cPanel.
2. Sube el archivo `production_update.zip` a la raíz de tu instalación (donde residen las carpetas `dist/` y `server/`).

### 3. Extraer Archivos
1. Selecciona `production_update.zip` y haz clic en **Extract**.
2. Confirma que los archivos se sobrescriban. 
   * **Nota:** Al haber excluido `server/database.sqlite` del ZIP, tus usuarios y registros actuales NO se verán afectados.

### 4. Reiniciar el Servidor Node.js
1. En cPanel, busca **Setup Node.js App**.
2. Localiza tu aplicación y haz clic en el botón **Restart**.

---
*Generado por Antigravity para INsitu AI*
