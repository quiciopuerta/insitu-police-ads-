import express from 'express';
import { generateBlogImage } from '../services/gemini.js';

const router = express.Router();

/**
 * NanoBanana (Gemini Image) Generation proxy endpoint.
 * This endpoint protects the Google Cloud / AI Studio keys from the frontend.
 */
router.post('/nanobanana-image', async (req, res) => {
    const { prompt, referenceImageUrl } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        console.log(`[NanoBanana API] Request received. Prompt: "${prompt.substring(0, 50)}...", Ref: ${referenceImageUrl}`);
        
        const imageUrl = await generateBlogImage(prompt, referenceImageUrl);

        res.json({ 
            success: true, 
            imageUrl,
            message: 'Image generated successfully.'
        });
    } catch (error) {
        console.error('[NanoBanana API Error]:', error);
        res.status(500).json({ error: 'Failed to generate image', details: error.message });
    }
});

/**
 * Unified Media Generation
 */
router.post(['/', '/media/generate'], async (req, res) => {
    const { type, payload } = req.body;
    try {
        const { generateMedia } = await import('../services/gemini.js');
        const result = await generateMedia(type, payload);
        res.json(result);
    } catch (error) {
        console.error('[MediaGen Express Error]:', error);
        res.status(500).json({ error: 'Media generation failed', details: error.message });
    }
});

export default router;
