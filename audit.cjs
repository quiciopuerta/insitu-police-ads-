const fetch = require('node-fetch');

async function testEndpoint(type, payload) {
  console.log(`\n--- Testing ${type} ---`);
  try {
    const start = Date.now();
    const res = await fetch('http://localhost:3001/ai/media/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, payload })
    });
    const time = Date.now() - start;
    if (res.ok) {
      console.log(`✅ SUCCESS (${time}ms) - Status: ${res.status}`);
      const data = await res.json();
      console.log(`   Response length: ${JSON.stringify(data).length} chars`);
    } else {
      console.error(`❌ FAILED (${time}ms) - Status: ${res.status}`);
      const text = await res.text();
      console.error(`   Error: ${text}`);
    }
  } catch (err) {
    console.error(`❌ NETWORK ERROR: ${err.message}`);
  }
}

async function run() {
  await testEndpoint('RESEARCH', { prompt: 'tendencias de mercado inmobiliario 2026', language: 'es' });
  await testEndpoint('THINKING', { prompt: 'cómo mejorar el ROI en campaña de casas de lujo', language: 'es' });
}

run();
