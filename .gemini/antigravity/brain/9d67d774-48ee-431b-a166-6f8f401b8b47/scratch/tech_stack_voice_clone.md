# Repositorios y Paquetes Core (Avatar & Voice Cloning)

Este documento es una referencia rápida para la implementación de la actualización HeyGen-Clone en el Creative Lab de INsitu AI.

## Paquetes YA INSTALADOS en INsitu AI
¡Excelentes noticias! Revisando el `package.json` del repo, ya tenemos gran parte del trabajo pesado cubierto:

1.  **`@ffmpeg/ffmpeg` y `@ffmpeg/util`**: 
    - Actualmente lo usamos para la exportación de *VideoAuditView*, pero nos servirá **perfectamente** para cortar, normalizar y comprimir el audio `.wav` del usuario *dentro del navegador* antes de enviarlo a clonar (ahorrándonos un servidor de procesamiento previo).
2.  **`framer-motion`**: 
    - Lo usaremos para armar el UI del **Teleprompter** (deslizado suave de texto) y la animación de ondas estilo Siri o Karaoke sin tener que recurrir a librerías de terceros (podemos hacer un componente personalizado súper limpio).
3.  **`@google-cloud/vertexai`**: 
    - Activo para la inferencia de Imagen y Generación de Copys publicitarios.

## Paquetes a Instalar (Vía `npm install` en Fase 3)
1.  **`wavesurfer.js`**: 
    - *Solo si* consideramos que el visualizador de onda a través del micrófono nativo con `Web Audio API` se vuelve complejo y queremos usar esta librería hiper probada.

## Herramientas Backend / Inferencia (APIs u Open-Source)
- **ElevenLabs API** (Clonación y TTS de Voz) - *Recomendado (Alternativa Híbrida).*
- **SyncLabs API** (Sincronización Labial Dinámica) - *Recomendado (Alternativa Híbrida).*
- **XTTSv2 de Coqui** (Alternativa Open Source de Voz).
- **MuseTalk / SadTalker** (Alternativa Open Source de Sincronización Labial para correr en RunPod Serverless o Vertex Custom).
