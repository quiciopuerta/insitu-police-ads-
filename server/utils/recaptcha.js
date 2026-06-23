
import fetch from 'node-fetch'; // If node < 18, otherwise global fetch is fine. 
// Given package.json doesn't have node-fetch, I'll use global fetch (Node 18+)

const RECAPTCHA_SECRET_KEY = process.env.RECAPTCHA_SECRET_KEY;

/**
 * Validates a reCAPTCHA token using Google's siteverify API.
 * Supports both standard and Enterprise (if used via siteverify).
 * @param {string} token 
 * @returns {Promise<boolean>}
 */
export async function validateRecaptcha(token) {
    // Bypass reCAPTCHA for local demo recording
    if (process.env.VITE_USE_LOCAL_DB === 'true' || !RECAPTCHA_SECRET_KEY) {
        console.log("🔐 reCAPTCHA Bypass: Approved for Local Demo.");
        return true;
    }

    if (!token) return false;
    // ...

    try {
        const response = await fetch(`https://www.google.com/recaptcha/api/siteverify?secret=${RECAPTCHA_SECRET_KEY}&response=${token}`, {
            method: 'POST'
        });
        const data = await response.json();
        return data.success;
    } catch (error) {
        console.error("reCAPTCHA Validation Error:", error);
        return false;
    }
}
