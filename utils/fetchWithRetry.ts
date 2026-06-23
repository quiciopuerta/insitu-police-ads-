/**
 * Generic fetchWithRetry utility with exponential backoff.
 * Use for non-AI API calls (PageSpeed, etc.).
 * AI calls already use keyRotationService.fetchWithRetry.
 */

export interface RetryOptions {
    maxRetries?: number;
    initialDelay?: number;
    backoffMultiplier?: number;
    retryableStatusCodes?: number[];
}

const DEFAULT_OPTIONS: Required<RetryOptions> = {
    maxRetries: 3,
    initialDelay: 1000,
    backoffMultiplier: 1.5,
    retryableStatusCodes: [408, 429, 500, 502, 503, 504],
};

/**
 * Execute an async function with automatic retry and exponential backoff.
 * @param fn - The async function to execute.
 * @param options - Retry configuration.
 * @returns The result of the async function.
 */
export async function fetchWithRetry<T>(
    fn: () => Promise<T>,
    options?: RetryOptions
): Promise<T> {
    const opts = { ...DEFAULT_OPTIONS, ...options };
    let lastError: Error | unknown;
    let delay = opts.initialDelay;

    for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
        try {
            return await fn();
        } catch (error: any) {
            lastError = error;

            // Check if the error has an HTTP status code that is retryable
            const statusCode = error?.status || error?.response?.status;
            const isRetryable =
                !statusCode || opts.retryableStatusCodes.includes(statusCode);

            if (attempt >= opts.maxRetries || !isRetryable) {
                break;
            }

            console.warn(
                `[fetchWithRetry] Attempt ${attempt + 1}/${opts.maxRetries} failed. Retrying in ${delay}ms...`,
                error?.message || error
            );

            await new Promise((resolve) => setTimeout(resolve, delay));
            delay = Math.round(delay * opts.backoffMultiplier);
        }
    }

    throw lastError;
}
