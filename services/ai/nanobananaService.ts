/**
 * Service to handle AI Image Generation via NanoBanana (Gemini Flash Image / Gemini Pro Image).
 */

import { API_URL } from '../../utils/apiConfig';
import { logger } from '../../utils/logger';


export const nanobananaService = {
    /**
     * Generates a blog image using Gemini Image and a reference image.
     *
     * @param prompt The context or description for the image to generate.
     * @param referenceImageUrl The URL of the image to use as a reference (e.g., face swap).
     * @returns The URL of the generated image.
     */
    generateBlogImage: async (prompt: string, referenceImageUrl: string): Promise<string> => {
        try {
            const response = await fetch(`${API_URL}/ai/nanobanana-image`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ prompt, referenceImageUrl }),
            });

            if (!response.ok) {
                let errorMsg = `Error: ${response.status}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.error || errorMsg;
                } catch (e) {
                    logger.warn('[NanoBanana] Unparseable error response:', await response.text().catch(() => 'No text content'));
                }
                throw new Error(errorMsg);
            }

            const text = await response.text();
            try {
                const data = JSON.parse(text);
                return data.imageUrl;
            } catch (e) {
                logger.error('[NanoBanana] Unexpected response format:', text);
                throw new Error('La respuesta del servidor de imágenes no es válida.');
            }
        } catch (error) {
            logger.error('Failed to generate image with NanoBanana:', error);
            throw error;
        }
    },
};
