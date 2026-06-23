# Guía de Exportación y Despliegue en cPanel

Tu proyecto "INsitu-AI-2" ya está configurado para exportarse correctamente.

## 1. Generar los Archivos (Build)
Para obtener la versión más reciente de tu aplicación, ejecuta el siguiente comando en esta carpeta:

```bash
npm run build
```

Esto actualizará la carpeta `dist`.

## 2. Archivos a Exportar
Los archivos que necesitas subir a tu cPanel se encuentran dentro de la carpeta **`dist`**.

Contenido típico de `dist`:
- `index.html` (El archivo principal)
- `assets/` (Carpeta con tus scripts JS y estilos CSS procesados)
- `.htaccess` (Archivo de configuración para Apache, ya incluido)
- `robots.txt` / `sitemap.xml` (Archivos SEO)

## 3. Subir a cPanel

1.  **Comprimir**: Entra a la carpeta `dist`. Selecciona **todos** los archivos y comprímelos en un `.zip`.
    *   *Nota:* No subas la carpeta `dist` completa, sino su *contenido*.
2.  **Subir**:
    *   Ve al "Administrador de Archivos" en cPanel.
    *   Navega a `public_html` (o la carpeta de tu subdominio).
    *   Sube el `.zip` y descomprímelo.
3.  **Verificar**: Confirma que veas `index.html` y `.htaccess` en la carpeta de destino.

¡Eso es todo!
