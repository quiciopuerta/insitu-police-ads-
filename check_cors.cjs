const fs = require('fs');
const path = require('path');

const dir = 'netlify/functions';
const files = fs.readdirSync(dir).filter(f => f.endsWith('.ts'));

for (const file of files) {
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    // Check if it uses CORS or CORS_HEADERS but doesn't define it
    if (content.includes('CORS') && !content.includes('const CORS =') && !content.includes('let CORS =') && !content.includes('var CORS =')) {
        // If it uses CORS but doesn't define it, it's a bug. Wait, it might be importing it.
        if (!content.includes('import { CORS') && !content.includes('import CORS')) {
            console.log(file, "MISSING CORS DEFINITION");
            
            // Auto-fix
            let newContent = content;
            if (newContent.includes('getCorsHeaders')) {
                // If getCorsHeaders is imported, replace CORS with getCorsHeaders()
                // But only if it's an exact word match to avoid CORS_HEADERS
                newContent = newContent.replace(/\bCORS\b/g, 'getCorsHeaders()');
            } else {
                // If not even imported, add import and definition
                newContent = `import { getCorsHeaders } from "./_lib/corsHelper";\nconst CORS = getCorsHeaders();\n` + newContent;
            }
            fs.writeFileSync(path.join(dir, file), newContent);
            console.log("-> FIXED", file);
        }
    }
}
