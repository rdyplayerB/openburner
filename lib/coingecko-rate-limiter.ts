/**
 * CoinGecko API Rate Limiter
 * Prevents rate limiting by queuing requests with delays
 */

interface QueuedRequest {
  url: string;
  options?: RequestInit;
  resolve: (value: Response) => void;
  reject: (error: any) => void;
}

class CoinGeckoRateLimiter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private readonly delayMs = 1500; // 1.5 seconds between requests (conservative)
  private lastRequestTime = 0;

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    return new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject });
      this.processQueue();
    });
  }

  private async processQueue() {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Wait if we need to respect rate limit
      if (timeSinceLastRequest < this.delayMs) {
        const waitTime = this.delayMs - timeSinceLastRequest;
        console.log(`⏳ [Rate Limiter] Waiting ${waitTime}ms before next CoinGecko request...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const request = this.queue.shift();
      if (!request) break;

      try {
        console.log(`🌐 [Rate Limiter] Fetching: ${request.url}`);
        this.lastRequestTime = Date.now();
        const response = await fetch(request.url, request.options);
        request.resolve(response);
      } catch (error) {
        request.reject(error);
      }
    }

    this.processing = false;
  }

  getQueueLength(): number {
    return this.queue.length;
  }
}

// Global rate limiter instance - shared across all CoinGecko API calls
export const coinGeckoLimiter = new CoinGeckoRateLimiter();

