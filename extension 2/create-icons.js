#!/usr/bin/env node

/**
 * create-icons.js
 * Genera los iconos PNG necesarios para la extensión
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Crear iconos simples en base64 (PNGs pre-generados)
// Estos son PNGs de 16x16, 48x48 y 128x128 con fondo magenta (#ff477b) y letra "i" blanca

const icons = {
  '16': 'iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAKklEQVR42mP8z8DAwMhEwsgEjAAjI6P///8ZGRkZGSH4////fwYGBgYGAEhgDW2K3bFVAAAAAElFTkSuQmCC',
  '48': 'iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAAZUlEQVR42u3WsQoAIAxDUXz/s+2iY3UQBMEhGO4L4YYww1gyM5MkSZIkSZIkSZL+//sPAAAAAAAAAAAAAAAAAAAAAAAAgD8AD4CMkj5Gqmb1eQEWQIH/YsAAFkCB/2LAABZAgf9iwAAWQIH/YsAAFkCB/2LAABZAgf9iwAAWQIH/YsAAFkCB/4L/AgACQAr38EK8+gEAAAAASUVORK5CYII=',
  '128': 'iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADTAomsAAAA+klEQVR42u3XsQ6AIBBEQQHb2d7e3t7e3sH29vb2FrSxs7e3t7e3t7e3t+9vgIcnw+Hw8/PzcXn9+/0+Hs/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8/n8/l8Pp/P5/P5fL6Tz+fz+Xw+n8/n8/l8Pp/P5/P5fD6fz+fz+Xw+n8+XP/8BqHxW5Q==',
};

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir);
}

Object.entries(icons).forEach(([size, base64]) => {
  const filePath = path.join(iconsDir, `icon-${size}.png`);
  const buffer = Buffer.from(base64, 'base64');
  fs.writeFileSync(filePath, buffer);
  console.log(`✓ Created icon-${size}.png`);
});

console.log('\n✓ All extension icons created successfully');
