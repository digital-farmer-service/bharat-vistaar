/**
 * Retry Configuration
 * 
 * This file contains the default retry configuration for API calls.
 * You can adjust these values to change retry behavior across the application.
 */

import type { RetryConfig } from '@/lib/retry-utils';

/**
 * Default retry configuration for API calls
 * 
 * maxAttempts: Maximum number of retry attempts (including the initial attempt)
 * initialDelayMs: Initial delay in milliseconds before first retry
 * maxDelayMs: Maximum delay in milliseconds between retries
 * backoffMultiplier: Multiplier for exponential backoff (delay doubles each retry by default)
 */
export const API_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,           // Try up to 3 times total (1 initial + 2 retries)
  initialDelayMs: 1000,     // Start with 1 second delay
  maxDelayMs: 10000,        // Cap delay at 10 seconds
  backoffMultiplier: 2,     // Double the delay each time
};

/**
 * Example retry sequence with default config:
 * - Attempt 1: Immediate
 * - Attempt 2: After 1s delay
 * - Attempt 3: After 2s delay
 * Total time before final failure: ~3 seconds
 * 
 * To change retry behavior, modify the values above.
 * For example, to be more aggressive:
 * - maxAttempts: 5
 * - initialDelayMs: 500
 * - backoffMultiplier: 1.5
 */
