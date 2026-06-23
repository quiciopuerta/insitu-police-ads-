
import fetch from 'node-fetch';
import { GoogleAuth } from 'google-auth-library';
import dotenv from 'dotenv';

dotenv.config();

const vertexProjectId = process.env.GCP_PROJECT_ID || 'web-growth-1735232719663';
const vertexLocation = 'us-central1';

async function getVertexToken() {
    const auth = new GoogleAuth({
        scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return typeof tokenResponse === 'string' ? tokenResponse : tokenResponse?.token;
}

async function testImageGen() {
    console.log("--- Testing Image Gen (Imagen 4) ---");
    try {
        const token = await getVertexToken();
        const endpoint = `https://${vertexLocation}-aiplatform.googleapis.com/v1/projects/${vertexProjectId}/locations/${vertexLocation}/publishers/google/models/imagen-4.0-generate-001:predict`;
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt: "A small red apple on a white table" }],
                parameters: { sampleCount: 1 }
            })
        });
        
        const data = await res.json();
        if (!res.ok) {
            console.error("❌ Image Gen Failed:", JSON.stringify(data, null, 2));
        } else {
            console.log("✅ Image Gen Success! Result length:", data?.predictions?.[0]?.bytesBase64Encoded?.length);
        }
    } catch (e) {
        console.error("❌ Image Gen Exception:", e.message);
    }
}

async function testVideoGen() {
    console.log("\n--- Testing Video Gen (Veo 2.0) ---");
    try {
        const token = await getVertexToken();
        const endpoint = `https://${vertexLocation}-aiplatform.googleapis.com/v1beta1/projects/${vertexProjectId}/locations/${vertexLocation}/publishers/google/models/veo-2.0-generate-001:predictLongRunning`;
        
        const res = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
                instances: [{ prompt: "A cat playing with a laser" }],
                parameters: { durationSeconds: 5 }
            })
        });
        
        const data = await res.json();
        if (!res.ok) {
            console.error("❌ Video Gen Initiation Failed:", JSON.stringify(data, null, 2));
            return;
        }
        
        const opName = data.name;
        console.log("✅ Video Gen Initiated. Operation Name:", opName);
        
        console.log("--- Testing Polling ---");
        const pollEndpoint = `https://${vertexLocation}-aiplatform.googleapis.com/v1beta1/${opName}`;
        console.log("Polling URL:", pollEndpoint);
        
        const pollRes = await fetch(pollEndpoint, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        const pollData = await pollRes.json();
        if (!pollRes.ok) {
            console.error("❌ Polling Failed (404/others):", JSON.stringify(pollData, null, 2));
        } else {
            console.log("✅ Polling Success! Status:", pollData.done ? "Done" : "In Progress");
        }
    } catch (e) {
        console.error("❌ Video Gen Exception:", e.message);
    }
}

async function run() {
    await testImageGen();
    await testVideoGen();
}

run();
