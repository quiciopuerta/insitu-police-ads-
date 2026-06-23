/**
 * Security utilities for INsitu AI
 */

/**
 * Validates if a URL is safe to use in <a> tags or images.
 * Blocks dangerous protocols like javascript:, data: (for links), etc.
 * @param url The URL string to validate
 * @returns boolean true if the URL is safe (http, https, or relative)
 */
export const isValidURL = (url: string | undefined | null): boolean => {
  if (!url) return false;
  
  // Trim spaces
  const trimmedUrl = url.trim();
  
  // Allow empty or falsy
  if (!trimmedUrl) return false;

  // Relative URLs starting with / (but not // which is protocol-relative)
  if (trimmedUrl.startsWith('/') && !trimmedUrl.startsWith('//')) {
    return true;
  }

  // Safe protocols: http, https, mailto, tel
  const safeProtocols = /^(https?|mailto|tel):/i;
  return safeProtocols.test(trimmedUrl);
};

/**
 * Sanitizes a URL, returning a safe fallback if the input is dangerous.
 * @param url The URL string to sanitize
 * @param fallback The fallback URL (defaults to #)
 */
export const sanitizeURL = (url: string | undefined | null, fallback: string = '#'): string => {
  if (isValidURL(url)) return url!.trim();
  return fallback;
};
