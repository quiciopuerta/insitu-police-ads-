import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dir = path.join(__dirname, 'netlify/functions');
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

let updatedFiles = 0;

for (const file of files) {
    if (file === 'api-auth.ts' || file === 'corsHelper.ts' || file === 'authMiddleware.ts') continue;

    const fullPath = path.join(dir, file);
    let content = fs.readFileSync(fullPath, 'utf8');
    let changed = false;

    // Remove old CORS definition
    if (content.includes('"Access-Control-Allow-Origin": "*"') || content.includes("'Access-Control-Allow-Origin': '*'")) {
        content = content.replace(/const\s+CORS\s*=\s*{[^}]*"Access-Control-Allow-Origin"\s*:\s*"\*"[^}]*};\s*/g, '');
        content = content.replace(/const\s+CORS\s*=\s*{[^}]*'Access-Control-Allow-Origin'\s*:\s*'*'[^}]*};\s*/g, '');
        changed = true;
    }

    // Replace header usage
    if (changed && content.includes('headers: CORS')) {
        content = content.replace(/headers:\s*CORS/g, 'headers: getCorsHeaders(event.headers.origin || event.headers.Origin)');
        changed = true;
    }

    // Replace destructuring CORS usage
    if (content.includes('...CORS')) {
        content = content.replace(/\.\.\.CORS/g, '...getCorsHeaders(event.headers.origin || event.headers.Origin)');
        changed = true;
    }

    // Add getCorsHeaders import
    if (changed && !content.includes('getCorsHeaders')) {
        content = `import { getCorsHeaders } from "./_lib/corsHelper";\n` + content;
    }

    // Auth extraction fixing
    const lines = content.split('\n');
    for (let i = 0; i < lines.length; i++) {
        let line = lines[i];
        if (line.includes('x-user-id') || line.includes('X-User-Id')) {
            if (line.includes('const callerUserId =') || line.includes('const userId =') || line.includes('const xUserId =')) {
                // Determine the variable name
                const match = line.match(/const\s+(callerUserId|userId|xUserId)\s*=/);
                if (match) {
                    const varName = match[1];
                    lines[i] = line.replace(/const\s+(callerUserId|userId|xUserId)\s*=.*?;/, `const ${varName} = getUserIdFromHeaders(event.headers);`);
                    changed = true;
                }
            }
        }
    }
    content = lines.join('\n');

    if (changed && content.includes('getUserIdFromHeaders') && !content.includes('getUserIdFromHeaders from')) {
        // Find existing authMiddleware import or create one
        if (content.includes('from "./_lib/authMiddleware"')) {
            content = content.replace(/import\s+{([^}]*)}\s+from\s+"(?:.\/)?_lib\/authMiddleware";/, (match, p1) => {
                if (!p1.includes('getUserIdFromHeaders')) {
                    return `import { ${p1.trim()}, getUserIdFromHeaders } from "./_lib/authMiddleware";`;
                }
                return match;
            });
        } else {
            content = `import { getUserIdFromHeaders } from "./_lib/authMiddleware";\n` + content;
        }
    }

    if (changed) {
        fs.writeFileSync(fullPath, content);
        updatedFiles++;
        console.log(`Fixed ${file}`);
    }
}

console.log(`Updated ${updatedFiles} files.`);
