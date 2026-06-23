const fetch = require('node-fetch');
require('dotenv').config();

async function run() {
  const apiKey = process.env.VITE_GOOGLE_GENAI_API_KEY_PRIMARY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: "Hello" }] }]
    })
  });
  console.log(res.status);
  console.log(await res.text());
}
run();
