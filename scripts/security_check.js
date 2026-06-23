import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Las carpetas que queremos escanear
const directoriesToScan = [
    path.join(rootDir, 'components'),
    path.join(rootDir, 'services'),
    path.join(rootDir, 'netlify'),
    path.join(rootDir, 'server')
];

// Las palabras clave prohibidas que NUNCA deben aparecer en el código de forma literal
const forbiddenPatterns = [
    'VITE_GOOGLE_GENAI_API_KEY',
    'VITE_GK_ENC',
    'VITE_OPENROUTER_API_KEY',
    'VITE_ADMIN_PASSWORD',
    'AIzaSy' // Prefijo típico de las claves de Google
];

// Extensiones de archivo a revisar
const validExtensions = ['.ts', '.tsx', '.js', '.jsx'];

let leakFound = false;

function scanDirectory(dir) {
    if (!fs.existsSync(dir)) return;
    
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            scanDirectory(fullPath);
        } else {
            const ext = path.extname(file);
            if (validExtensions.includes(ext)) {
                checkFileForLeaks(fullPath);
            }
        }
    }
}

function checkFileForLeaks(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Ignorar comentarios
        if (line.trim().startsWith('//')) continue;
        
        for (const pattern of forbiddenPatterns) {
            // Si encontramos la palabra prohibida y no es un comentario de precaución
            if (line.includes(pattern) && !line.includes('NOT VITE') && !line.includes('NO VITE') && !line.includes('SECURITY')) {
                console.error(`\n🚨 ALERTA DE SEGURIDAD CRÍTICA 🚨`);
                console.error(`Fuga de credenciales detectada antes del Build.`);
                console.error(`Patrón prohibido: "${pattern}"`);
                console.error(`Archivo: ${filePath}`);
                console.error(`Línea ${i + 1}: ${line.trim()}\n`);
                leakFound = true;
            }
        }
    }
}

console.log("🔒 Ejecutando Security Gatekeeper...");

directoriesToScan.forEach(scanDirectory);

if (leakFound) {
    console.error("❌ El Build ha sido BLOQUEADO porque se detectaron claves secretas o variables VITE_ prohibidas en el código fuente.");
    console.error("Por favor, mueve tus secretos al backend (Netlify Functions) y no uses el prefijo VITE_ para claves de facturación.");
    process.exit(1); // Falla el proceso, bloqueando el build
} else {
    console.log("✅ Security Gatekeeper: Ninguna fuga detectada. Continuando con el Build...");
    process.exit(0);
}
