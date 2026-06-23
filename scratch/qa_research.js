const http = require('http');

const data = JSON.stringify({
  type: 'RESEARCH',
  payload: { query: 'marketing 2026', language: 'es' }
});

const req = http.request({
  hostname: 'localhost',
  port: 3001,
  path: '/api/media-generation',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Response:', body.substring(0, 500)));
});
req.write(data);
req.end();
