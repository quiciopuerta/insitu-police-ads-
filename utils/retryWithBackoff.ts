/**
 * Exponential Backoff Retry Utility
 * ==================================
 * Handles transient failures (429 rate limit, 503 service unavailable, 504 timeout)
 * with intelligent backoff strategy
 */

interface RetryOptions {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  backoffMultiplier?: number;
  jitterFactor?: number; // 0-1, adds randomness to prevent thundering herd
  shouldRetry?: (error: any, attempt: number) => boolean;
}

const DEFAULT_OPTIONS: RetryOptions = {
  maxAttempts: 5,
  initialDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterFactor: 0.1,
  shouldRetry: (error: any, attempt: number) => {
    if (attempt >= 5) return false; // Never retry after 5 attempts

    // Retry on rate limit (429)
    if (error?.status === 429) return true;

    // Retry on server errors (5xx)
    if (error?.status >= 500 && error?.status < 600) return true;

    // Retry on network timeout/abort
    if (error?.message?.includes('timeout') || error?.message?.includes('ERR_INTERNET')) return true;

    // Retry on fetch failures
    if (error instanceof TypeError && error.message === 'Failed to fetch') return true;

    return false;
  },
};

/**
 * Calculates delay with exponential backoff + jitter
 */
function calculateDelay(
  attempt: number,
  initialDelayMs: number,
  maxDelayMs: number,
  backoffMultiplier: number,
  jitterFactor: number
): number {
  // Base exponential delay
  const exponentialDelay = initialDelayMs * Math.pow(backoffMultiplier, attempt - 1);
  const cappedDelay = Math.min(exponentialDelay, maxDelayMs);

  // Add jitter: ±(jitterFactor * delay)
  const jitter = cappedDelay * jitterFactor * (Math.random() * 2 - 1);
  const finalDelay = Math.max(0, cappedDelay + jitter);

  return Math.round(finalDelay);
}

/**
 * Generic retry handler with exponential backoff
 * @param fn Function that returns a promise
 * @param options Retry configuration
 * @returns Promise with result or final error
 *
 * @example
 * const result = await retryWithBackoff(
 *   () => fetch('/api/data'),
 *   { maxAttempts: 3 }
 * );
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options?: RetryOptions
): Promise<T> {
  const config = { ...DEFAULT_OPTIONS, ...options };
  let lastError: any;

  for (let attempt = 1; attempt <= config.maxAttempts!; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Check if we should retry
      if (!config.shouldRetry!(error, attempt)) {
        throw error;
      }

      // Don't delay after last attempt
      if (attempt === config.maxAttempts) {
        throw error;
      }

      // Calculate and apply delay
      const delayMs = calculateDelay(
        attempt,
        config.initialDelayMs!,
        config.maxDelayMs!,
        config.backoffMultiplier!,
        config.jitterFactor!
      );

      console.log(
        `[Retry] Attempt ${attempt}/${config.maxAttempts} failed. Waiting ${delayMs}ms before retry...`,
        error.message || error.status
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
}

/**
 * Fetch wrapper with automatic retry on rate limit/network errors
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit & { retryOptions?: RetryOptions }
): Promise<Response> {
  const { retryOptions, ...fetchOptions } = options || {};

  return retryWithBackoff(
    () => fetch(url, fetchOptions),
    {
      ...DEFAULT_OPTIONS,
      ...retryOptions,
    }
  );
}

/**
 * Research-specific retry handler with user feedback
 */
export async function retryResearchWithBackoff<T>(
  fn: () => Promise<T>,
  onRetry?: (attempt: number, delayMs: number, error: string) => void
): Promise<T> {
  return retryWithBackoff(fn, {
    maxAttempts: 5,
    initialDelayMs: 2000,
    maxDelayMs: 60000,
    backoffMultiplier: 2,
    jitterFactor: 0.2,
    shouldRetry: (error, attempt) => {
      const should429 = error?.status === 429 && attempt < 5;
      const should5xx = error?.status >= 500 && error?.status < 600 && attempt < 4;
      const shouldNetwork = error instanceof TypeError && attempt < 3;

      const should = should429 || should5xx || shouldNetwork;

      if (should && onRetry && attempt < 5) {
        const delayMs = calculateDelay(attempt, 2000, 60000, 2, 0.2);
        const errorMsg = error?.message || `Status ${error?.status}`;
        onRetry(attempt, delayMs, errorMsg);
      }

      return should;
    },
  });
}
