<div align="center">

  
  # INsitu Police Ads - Gestión Estratégica
  
  **Plataforma de Inteligencia Artificial para la automatización, monitorización y optimización de flujos publicitarios.**
</div>

---

## 🚀 Descripción del Proyecto

**INsitu Police Ads** es un subsistema aislado de INsitu AI diseñado para operar como centro de control estratégico y monitoreo de campañas. Permite a los analistas de tráfico y media buyers gestionar cuentas, generar scripts de automatización para Google Ads y mantener un control estricto sobre el rendimiento y las políticas de la pauta publicitaria.

El objetivo principal es proporcionar un ecosistema de monitorización independiente que se conecte de forma segura a la base de datos central.

## ✨ Características Principales

*   **🤖 Auditoría Creativa con IA**: Análisis neuro-visual de imágenes y videos publicitarios para predecir su efectividad y carga cognitiva.
*   **🔍 Análisis de Competencia**: Investigación exhaustiva de competidores, incluyendo palabras clave, backlinks y estrategias de anuncios.
*   **🎨 Gestión de Identidad de Marca**: Centralización y análisis de los valores, tono y estética de la marca para asegurar coherencia en todas las campañas.
*   **📊 Reportes Automatizados**: Generación de informes detallados en PDF y exportación de datos en CSV para agencias y equipos de marketing.
*   **🌍 Soporte Multilenguaje**: Interfaz y análisis disponibles en Español e Inglés.

## 🛠️ Stack Tecnológico

Este proyecto ha sido construido utilizando tecnologías modernas para garantizar rendimiento, escalabilidad y una experiencia de usuario premium:

*   **Frontend**: React 19, TypeScript, Vite
*   **Desktop App (Local AI)**: Tauri v2, Rust, Ollama
*   **Estilos**: TailwindCSS 3.4
*   **Inteligencia Artificial**: Google Gemini 1.5 Pro / Flash (Cloud) y Llama 3 (Local)
*   **Manejo de Estado**: React Hooks & Context API
*   **Generación de Documentos**: jsPDF
*   **Arquitectura Híbrida**: Permite ejecución 100% en la nube o ejecución local privada manteniendo el mismo control de límites y tokens de suscripción.

## 📦 Instalación y Configuración Local

Sigue estos pasos para ejecutar el proyecto en tu entorno local:

1.  **Clonar el repositorio**:
    ```bash
    git clone https://github.com/quiciopuerta/INsitu-AI-2.git
    cd INsitu-AI-2
    ```

2.  **Instalar dependencias**:
    ```bash
    npm install
    ```

3.  **Configurar variables de entorno**:
    Crea un archivo `.env` en la raíz del proyecto y añade tu API Key de Gemini:
    ```env
    VITE_GEMINI_API_KEY=tu_api_key_aqui
    ```

4.  **Iniciar el servidor de desarrollo**:
    ```bash
    npm run dev
    ```

5.  **Ver en el navegador**:
    Abre [http://localhost:3000](http://localhost:3000) para ver la aplicación.

## 📚 Documentación

Para ver documentación detallada sobre seguridad, configuración avanzada (Upstash, Auto-Updates) y reportes QA, por favor consulta la carpeta `docs/`:

- `/docs/SECURITY_SUMMARY.md`
- `/docs/FUNCTIONALITY_VERIFICATION.md`
- `/docs/AUTO_UPDATES.md`
- `/docs/extension/` (Guías de Extensión Chrome)

## 🤝 Contribución

Este es un proyecto privado desarrollado por **INsitu AI**. Las contribuciones externas no están abiertas en este momento.

## 📄 Licencia

Derechos reservados © 2026 INsitu AI.
Desarrollado con ❤️ y ☕ por Franklin Sanchez y el equipo de Antigravity.
