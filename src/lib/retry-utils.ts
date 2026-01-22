/**
 * Retry utility for handling failed operations with exponential backoff
 */

export interface RetryConfig {
  maxAttempts: number;
  initialDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  initialDelayMs: 1000,
  maxDelayMs: 10000,
  backoffMultiplier: 2,
};

/**
 * Sleep for a specified number of milliseconds
 */
const sleep = (ms: number): Promise<void> => 
  new Promise(resolve => setTimeout(resolve, ms));

/**
 * Calculate delay for retry attempt using exponential backoff
 */
const calculateDelay = (
  attempt: number, 
  config: RetryConfig
): number => {
  const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt - 1);
  return Math.min(delay, config.maxDelayMs);
};

/**
 * Retry a function with exponential backoff
 * @param fn - The async function to retry
 * @param config - Retry configuration
 * @param onRetry - Optional callback when retry is attempted
 * @returns The result of the function
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  onRetry?: (attempt: number, error: Error) => void
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // If this was the last attempt, throw the error
      if (attempt === config.maxAttempts) {
        throw lastError;
      }

      // Calculate delay and notify about retry
      const delay = calculateDelay(attempt, config);
      
      if (onRetry) {
        onRetry(attempt, lastError);
      }

      console.log(`Retry attempt ${attempt}/${config.maxAttempts} after ${delay}ms delay. Error: ${lastError.message}`);
      
      // Wait before retrying
      await sleep(delay);
    }
  }

  // This should never be reached, but TypeScript needs it
  throw lastError!;
}

/**
 * Check if an error is retryable (network errors, timeouts, 5xx errors)
 */
export function isRetryableError(error: any): boolean {
  // Network errors
  if (error.message?.includes('fetch') || error.message?.includes('network')) {
    return true;
  }

  // Timeout errors
  if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
    return true;
  }

  // HTTP status codes that should be retried
  if (error.response?.status) {
    const status = error.response.status;
    // Retry on 5xx server errors and 429 (too many requests)
    return status >= 500 || status === 429;
  }

  return false;
}
