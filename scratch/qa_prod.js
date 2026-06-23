const https = require('https');

const data = JSON.stringify({
  type: 'RESEARCH',
  payload: { query: 'pruebas QA 2026', language: 'es' }
});

const req = https.request({
  hostname: 'insitu.company',
  port: 443,
  path: '/api/media-generation',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
}, res => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => {
    console.log(`Status Code: ${res.statusCode}`);
    try {
      const json = JSON.parse(body);
      console.log('Veracity Score:', json.data?.veracity);
      console.log('Sources Count:', json.data?.sources?.length);
      console.log('First 100 chars:', json.data?.text?.substring(0, 100));
    } catch(e) {
      console.log('Raw Response:', body.substring(0, 300));
    }
  });
});

req.on('error', e => console.error('Error:', e));
req.write(data);
req.end();
