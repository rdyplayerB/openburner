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
  private readonly delayMs = 3000; // 3 seconds between requests (conservative for API rate limits)
  private lastRequestTime = 0;
  private dailyCallCount = 0;
  private lastResetDate = new Date().toDateString();

  async fetch(url: string, options?: RequestInit): Promise<Response> {
    // Check daily limit (conservative: 5000 calls per day vs 10,000 limit)
    this.resetDailyCountIfNeeded();
    if (this.dailyCallCount >= 5000) {
      return Promise.reject(new Error('Daily API limit reached. Please try again tomorrow.'));
    }

    return new Promise((resolve, reject) => {
      this.queue.push({ url, options, resolve, reject });
      this.processQueue();
    });
  }

  private resetDailyCountIfNeeded() {
    const today = new Date().toDateString();
    if (this.lastResetDate !== today) {
      this.dailyCallCount = 0;
      this.lastResetDate = today;
    }
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
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }

      const request = this.queue.shift();
      if (!request) break;

      try {
        this.lastRequestTime = Date.now();
        this.dailyCallCount++;
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

  getDailyCallCount(): number {
    this.resetDailyCountIfNeeded();
    return this.dailyCallCount;
  }

  getRemainingCalls(): number {
    return Math.max(0, 5000 - this.getDailyCallCount());
  }
}

// Global rate limiter instance - shared across all CoinGecko API calls
export const coinGeckoLimiter = new CoinGeckoRateLimiter();

