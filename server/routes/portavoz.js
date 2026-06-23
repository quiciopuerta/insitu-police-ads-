
import express from 'express';
import fetch from 'node-fetch';

const router = express.Router();

/**
 * Handle portavoz tasks locally for Express-based dev
 */
router.post(['/', ''], async (req, res) => {
    const { type, payload } = req.body;

    if (!type || !payload) {
        return res.status(400).json({ error: "Missing type or payload" });
    }

    try {
        switch (type) {
            case 'GENERATE_SPEECH': {
                const {
                    text,
                    prebuiltVoice = 'Kore',
                    languageCode = 'es-ES',
                    wpm
                } = payload;

                if (!text) throw new Error("Missing 'text' in payload");

                // Use Google Cloud Text-to-Speech API
                // For security, only use dedicated TTS key or encoded GK_ENC key here, no raw GOOGLE_GENAI keys.
                let ttsKey = process.env.GOOGLE_CLOUD_TTS_API_KEY;
                if (!ttsKey && process.env.GK_ENC) {
                    try {
                        const decoded = Buffer.from(process.env.GK_ENC, 'base64').toString('utf-8');
                        ttsKey = decoded.split(',')[0].trim();
                    } catch (e) {
                        console.error("[Portavoz Local] Failed to parse GK_ENC", e);
                    }
                }
                
                // FALLBACK MOCK AUDIO (1 second of silence) if key is missing or for testing
                const MOCK_AUDIO_BASE64 = "UklGRiS9AgBXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YSy9AgAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

                if (!ttsKey) {
                    console.warn("[Portavoz Local] No API key found, returning mock audio.");
                    return res.json({ audioBase64: MOCK_AUDIO_BASE64, audioMimeType: 'audio/wav', audioUrl: "" });
                }

                const voiceMap = {
                    'Kore': { name: 'es-ES-Neural2-A', ssmlGender: 'FEMALE' },
                    'Diego': { name: 'es-ES-Neural2-B', ssmlGender: 'MALE' },
                    'Elena': { name: 'es-ES-Neural2-C', ssmlGender: 'FEMALE' },
                    'Fernando': { name: 'es-ES-Neural2-D', ssmlGender: 'MALE' }
                };

                const selectedVoice = voiceMap[prebuiltVoice] || voiceMap['Kore'];

                const ttsRequestBody = JSON.stringify({
                    input: { text },
                    voice: {
                        languageCode,
                        name: selectedVoice.name,
                        ssmlGender: selectedVoice.ssmlGender
                    },
                    audioConfig: {
                        audioEncoding: 'MP3',
                        pitch: 0,
                        speakingRate: wpm ? Math.max(0.5, Math.min(2.0, 140 / wpm)) : 1.0
                    }
                });

                console.log(`[Portavoz Local] Generating speech via Google Cloud TTS (${prebuiltVoice})`);

                try {
                    const ttsResponse = await fetch('https://texttospeech.googleapis.com/v1/text:synthesize?key=' + ttsKey, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: ttsRequestBody
                    });

                    if (ttsResponse.ok) {
                        const ttsResult = await ttsResponse.json();
                        return res.json({
                            audioBase64: ttsResult.audioContent,
                            audioMimeType: 'audio/mpeg',
                            audioUrl: ""
                        });
                    } else {
                        const errText = await ttsResponse.text();
                        console.error("[Portavoz Local] TTS API Error:", errText);
                        // Fallback to mock audio on API error (e.g. 403) to allow video testing
                        console.warn("[Portavoz Local] API error, falling back to mock audio to avoid blocking the workflow.");
                        return res.json({ audioBase64: MOCK_AUDIO_BASE64, audioMimeType: 'audio/wav', audioUrl: "" });
                    }
                } catch (fetchErr) {
                    console.error("[Portavoz Local] Fetch failed:", fetchErr);
                    return res.json({ audioBase64: MOCK_AUDIO_BASE64, audioMimeType: 'audio/wav', audioUrl: "" });
                }
            }

            case 'UPLOAD_AUDIO': {
                const { audioBase64, filename = "audio.wav", mimeType = "audio/wav" } = payload;
                console.log(`[Portavoz Local] UPLOAD_AUDIO received for ${filename}`);
                // Mock URL for local testing
                return res.json({ audioUrl: "https://storage.googleapis.com/portavoz-mock/audio.wav" });
            }

            default:
                return res.status(400).json({ error: "Invalid task type" });
        }
    } catch (error) {
        console.error(`[Portavoz Express API Error]:`, error);
        res.status(500).json({ error: "Operation failed", details: error.message });
    }
});

export default router;
