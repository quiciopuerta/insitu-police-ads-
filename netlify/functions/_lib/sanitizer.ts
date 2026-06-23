/**
 * sanitizer.ts — Input sanitization utilities
 *
 * Two independent layers:
 *  1. sanitizeXSS    — escapes HTML special chars (prevents XSS in HTML contexts)
 *  2. containsSQLi   — detects SQL injection keyword patterns (logs + optional block)
 *
 * Note: SQL injection is primarily prevented by parameterized queries (postgres template literals).
 * This is a defence-in-depth detector for logging / early rejection at the API boundary.
 */

// ── XSS Sanitization ─────────────────────────────────────────────────────────
export const sanitizeXSS = (input: string): string => {
  if (typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
};

// ── Deep object XSS sanitization ─────────────────────────────────────────────
export const sanitizeObject = (obj: any): any => {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: any = {};
  for (const key in obj) {
    if (typeof obj[key] === "string") {
      sanitized[key] = sanitizeXSS(obj[key]);
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      sanitized[key] = sanitizeObject(obj[key]);
    } else {
      sanitized[key] = obj[key];
    }
  }
  return sanitized;
};

// ── SQL Injection Detection ───────────────────────────────────────────────────
// These patterns cover the most common SQL injection techniques.
// Primary protection is always parameterized queries; this is an additional detector.
const SQL_INJECTION_PATTERNS = [
  /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|TRUNCATE|EXEC|EXECUTE)\b)/gi,
  /(\bUNION\b[\s\S]*?\bSELECT\b)/gi,
  /(CAST\s*\(|CONVERT\s*\(|DECLARE\s+@)/gi,
  /(WAITFOR\s+DELAY|SLEEP\s*\(|BENCHMARK\s*\()/gi,
  /(INFORMATION_SCHEMA|SYS\.TABLES|SYS\.COLUMNS)/gi,
  /('[\s]*;[\s]*--)/, // Classic string termination + comment
  /(--\s*$)/m,        // SQL comment at end of line
  /(\/\*[\s\S]*?\*\/)/, // Block comments
  /(\bOR\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/gi, // OR 1=1
  /(\bAND\b\s+['"]?\d+['"]?\s*=\s*['"]?\d+['"]?)/gi, // AND 1=1
];

/**
 * Detects if a string contains SQL injection patterns.
 * Returns true if suspicious content is found.
 */
export const containsSQLi = (input: string): boolean => {
  if (typeof input !== "string") return false;
  return SQL_INJECTION_PATTERNS.some((pattern) => {
    // Reset lastIndex for global regex
    pattern.lastIndex = 0;
    return pattern.test(input);
  });
};

/**
 * Sanitizes a string for safe storage:
 * 1. Strips leading/trailing whitespace
 * 2. Checks for SQL injection patterns (logs warning)
 * 3. Escapes XSS characters
 * Returns null if the string is empty after trimming.
 */
export const sanitizeInput = (
  input: unknown,
  fieldName = "input"
): string | null => {
  if (input === null || input === undefined) return null;
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (!trimmed) return null;

  if (containsSQLi(trimmed)) {
    console.warn(`[SECURITY] Possible SQL injection detected in field: ${fieldName}`);
  }

  return sanitizeXSS(trimmed);
};
