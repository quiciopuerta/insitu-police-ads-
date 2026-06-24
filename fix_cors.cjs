const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(function(file) {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(walk(file));
        } else if (file.endsWith('.ts')) {
            results.push(file);
        }
    });
    return results;
}

const files = walk('./netlify/functions');
let changed = 0;
files.forEach(file => {
    const content = fs.readFileSync(file, 'utf8');
    const newContent = content.replace(/getCorsHeaders\(event\.headers\.origin \|\| event\.headers\.Origin\)/g, "getCorsHeaders(typeof event !== 'undefined' && (event as any).headers ? (event as any).headers.origin || (event as any).headers.Origin : undefined)");
    if (content !== newContent) {
        fs.writeFileSync(file, newContent, 'utf8');
        changed++;
        console.log(`Updated ${file}`);
    }
});
console.log(`Changed ${changed} files.`);
