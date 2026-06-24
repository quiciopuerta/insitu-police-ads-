const fs = require('fs');
const content = fs.readFileSync('extension/popup.js', 'utf8');
const newContent = content.replace(
/      \} else \{\n        authError\.textContent = result\.error \|\| 'Credenciales inválidas';/g,
`      } else {
        if (response.ok && !result.token) {
          authError.textContent = 'Error: Servidor no retornó token JWT.';
        } else {
          authError.textContent = result.error || 'Credenciales inválidas (' + response.status + ')';
        }`
);
fs.writeFileSync('extension/popup.js', newContent);
