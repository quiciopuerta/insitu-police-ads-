/**
 * Sanitization & Privacy Utilities
 * ===============================
 * Focused on PII masking and XSS prevention for AI interactions.
 */

/**
 * Masks PII (Emails, Phone Numbers) from a string to protect user privacy before sending to AI.
 */
export const maskPII = (text: string): string => {
  if (!text) return text;

  // Email Regex
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  // Phone Number Regex (generic enough for many formats)
  const phoneRegex = /(\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{4,6}/g;

  return text
    .replace(emailRegex, "[EMAIL_MASKED]")
    .replace(phoneRegex, "[PHONE_MASKED]");
};

/**
 * Basic sanitization for AI-generated text to prevent XSS.
 * Since we render text in many places, ensuring no malicious scripts are injected.
 */
export const sanitizeText = (text: string): string => {
  if (!text) return text;
  
  // Basic removal of <script> and suspicious tags if any
  return text
    .replace(/<script\b[^>]*>([\s\S]*?)<\/script>/gmi, "")
    .replace(/on\w+="[^"]*"/gmi, "")
    .replace(/javascript:[^"]*/gmi, "");
};

/**
 * Sanitizes user input before interpolating into AI prompts.
 * Removes common prompt-injection vectors: newline injections, role-override attempts,
 * system-delimiter sequences, and excessive length.
 */
export const sanitizePromptInput = (input: string, maxLength = 500): string => {
  if (!input) return '';
  return input
    // Remove null bytes and control characters (except \t)
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Collapse multiple newlines — prevents "IGNORE PREVIOUS INSTRUCTIONS\n\n"
    .replace(/(\r?\n){2,}/g, '\n')
    // Remove common jailbreak prefixes (case-insensitive)
    .replace(/ignore\s+(all\s+)?(previous|prior|above)\s+instructions?/gi, '[FILTERED]')
    .replace(/system\s*:/gi, '[FILTERED]')
    .replace(/assistant\s*:/gi, '[FILTERED]')
    .replace(/human\s*:/gi, '[FILTERED]')
    .replace(/<\s*(system|user|assistant)\s*>/gi, '[FILTERED]')
    // Truncate to max length
    .slice(0, maxLength)
    .trim();
};

/**
 * Validates and cleans JSON strings from AI response.
 */
export const cleanAIData = (rawJson: string): string => {
  if (!rawJson) return "{}";
  // Remove markdown blocks if AI accidentally included them
  return rawJson
    .replace(/^```json\n?/, "")
    .replace(/\n?```$/, "")
    .trim();
};
