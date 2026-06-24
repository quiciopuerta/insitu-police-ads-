import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'netlify/functions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

let updatedFiles = 0;

for (const file of files) {
    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');

    if (content.includes('getCorsHeaders') && !content.includes('import { getCorsHeaders')) {
        content = `import { getCorsHeaders } from "./_lib/corsHelper";\n` + content;
        fs.writeFileSync(fullPath, content);
        updatedFiles++;
        console.log(`Fixed missing import in ${file}`);
    }
}

console.log(`Updated ${updatedFiles} files.`);
