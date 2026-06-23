import { callGeminiApi } from './netlify/functions/_lib/gemini.ts';

async function test() {
  try {
    console.log("Starting test...");
    const start = Date.now();
    await callGeminiApi({
      model: "gemini-3.5-flash",
      contents: [{ role: "user", parts: [{ text: "Hello" }] }]
    });
    console.log("Success in", Date.now() - start, "ms");
  } catch (err: any) {
    console.error("Failed:", err.message);
  }
}

test();
