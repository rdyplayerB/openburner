/**
 * RPC Rate Limiter
 * 
 * Implements intelligent rate limiting for RPC calls to prevent hitting
 * rate limits on public endpoints like mainnet.base.org
 */

interface RateLimitConfig {
  maxRequestsPerMinute: number;
  maxRequestsPerHour: number;
  maxRequestsPerDay: number;
  burstLimit: number; // Max concurrent requests
  retryDelayMs: number;
  backoffMultiplier: number;
  maxRetries: number;
}

interface RequestQueue {
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  retryCount: number;
}

class RPCRateLimiter {
  private config: RateLimitConfig;
  private requestQueue: RequestQueue[] = [];
  private requestCounts = {
    minute: 0,
    hour: 0,
    day: 0,
    lastMinuteReset: Date.now(),
    lastHourReset: Date.now(),
    lastDayReset: Date.now(),
  };
  private activeRequests = 0;
  private isProcessing = false;

  constructor(config?: Partial<RateLimitConfig>) {
    this.config = {
      maxRequestsPerMinute: 30,    // Conservative limit
      maxRequestsPerHour: 1000,    // Reasonable hourly limit
      maxRequestsPerDay: 10000,    // Daily limit
      burstLimit: 5,               // Max concurrent requests
      retryDelayMs: 2000,          // 2 second base delay
      backoffMultiplier: 1.5,      // Exponential backoff
      maxRetries: 3,
      ...config,
    };
  }

  private resetCountersIfNeeded() {
    const now = Date.now();
    
    // Reset minute counter
    if (now - this.requestCounts.lastMinuteReset >= 60000) {
      this.requestCounts.minute = 0;
      this.requestCounts.lastMinuteReset = now;
    }
    
    // Reset hour counter
    if (now - this.requestCounts.lastHourReset >= 3600000) {
      this.requestCounts.hour = 0;
      this.requestCounts.lastHourReset = now;
    }
    
    // Reset day counter
    if (now - this.requestCounts.lastDayReset >= 86400000) {
      this.requestCounts.day = 0;
      this.requestCounts.lastDayReset = now;
    }
  }

  private canMakeRequest(): boolean {
    this.resetCountersIfNeeded();
    
    return (
      this.requestCounts.minute < this.config.maxRequestsPerMinute &&
      this.requestCounts.hour < this.config.maxRequestsPerHour &&
      this.requestCounts.day < this.config.maxRequestsPerDay &&
      this.activeRequests < this.config.burstLimit
    );
  }

  private incrementCounters() {
    this.requestCounts.minute++;
    this.requestCounts.hour++;
    this.requestCounts.day++;
    this.activeRequests++;
  }

  private decrementActiveRequests() {
    this.activeRequests = Math.max(0, this.activeRequests - 1);
  }

  private calculateRetryDelay(retryCount: number): number {
    return this.config.retryDelayMs * Math.pow(this.config.backoffMultiplier, retryCount);
  }

  private async processQueue() {
    if (this.isProcessing || this.requestQueue.length === 0) {
      return;
    }

    this.isProcessing = true;

    while (this.requestQueue.length > 0) {
      if (!this.canMakeRequest()) {
        // Wait for next available slot
        const waitTime = Math.min(
          60000 - (Date.now() - this.requestCounts.lastMinuteReset), // Wait for minute reset
          200 // Minimum 200ms wait (much faster)
        );
        
        console.log(`⏳ [RPC Rate Limiter] Waiting ${waitTime}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
        continue;
      }

      const request = this.requestQueue.shift();
      if (!request) continue;

      try {
        this.incrementCounters();
        console.log(`🚀 [RPC Rate Limiter] Processing request (${this.activeRequests}/${this.config.burstLimit} active)`);
        
        // Simulate the actual RPC call here
        // The actual implementation would call the RPC endpoint
        request.resolve(await this.executeRPCRequest());
        
      } catch (error) {
        if (request.retryCount < this.config.maxRetries) {
          // Retry with exponential backoff
          request.retryCount++;
          const retryDelay = this.calculateRetryDelay(request.retryCount);
          
          console.log(`🔄 [RPC Rate Limiter] Retrying request in ${retryDelay}ms (attempt ${request.retryCount}/${this.config.maxRetries})`);
          
          setTimeout(() => {
            this.requestQueue.unshift(request);
            this.processQueue();
          }, retryDelay);
        } else {
          console.error(`❌ [RPC Rate Limiter] Request failed after ${this.config.maxRetries} retries:`, error);
          request.reject(error);
        }
      } finally {
        this.decrementActiveRequests();
      }
    }

    this.isProcessing = false;
  }

  private async executeRPCRequest(): Promise<any> {
    // This is a placeholder - the actual RPC call would be made here
    // For now, we'll just simulate a successful response
    return { success: true, timestamp: Date.now() };
  }

  async makeRequest<T>(rpcCall: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      const request: RequestQueue = {
        resolve: (value) => {
          // Execute the actual RPC call
          rpcCall()
            .then(resolve)
            .catch(reject);
        },
        reject,
        timestamp: Date.now(),
        retryCount: 0,
      };

      this.requestQueue.push(request);
      
      // Process immediately if we can make a request, otherwise queue it
      if (this.canMakeRequest() && !this.isProcessing) {
        this.processQueue();
      } else if (!this.isProcessing) {
        // Start processing after a short delay to allow batching
        setTimeout(() => this.processQueue(), 50);
      }
    });
  }

  getStats() {
    this.resetCountersIfNeeded();
    return {
      queueLength: this.requestQueue.length,
      activeRequests: this.activeRequests,
      requestCounts: { ...this.requestCounts },
      limits: {
        minute: `${this.requestCounts.minute}/${this.config.maxRequestsPerMinute}`,
        hour: `${this.requestCounts.hour}/${this.config.maxRequestsPerHour}`,
        day: `${this.requestCounts.day}/${this.config.maxRequestsPerDay}`,
      },
    };
  }

  // Method to clear the queue (useful for testing or emergency situations)
  clearQueue() {
    this.requestQueue.forEach(request => {
      request.reject(new Error('Queue cleared'));
    });
    this.requestQueue = [];
  }

  // Debug method to log current state
  logStats() {
    const stats = this.getStats();
    console.log('📊 [RPC Rate Limiter] Current Stats:', {
      queueLength: stats.queueLength,
      activeRequests: stats.activeRequests,
      limits: stats.limits,
      requestCounts: stats.requestCounts,
      performance: {
        avgWaitTime: this.calculateAverageWaitTime(),
        throughput: this.calculateThroughput(),
      }
    });
  }

  private calculateAverageWaitTime(): number {
    // Simple calculation - in a real implementation you'd track this
    return this.requestQueue.length * 200; // Estimated wait time
  }

  private calculateThroughput(): string {
    const requestsPerMinute = this.requestCounts.minute;
    const maxPerMinute = this.config.maxRequestsPerMinute;
    return `${requestsPerMinute}/${maxPerMinute} req/min`;
  }
}

// Create a singleton instance
export const rpcRateLimiter = new RPCRateLimiter({
  maxRequestsPerMinute: 60,  // Increased from 20 to 60 (1 per second)
  maxRequestsPerHour: 2000,  // Increased from 500 to 2000
  maxRequestsPerDay: 10000,  // Keep daily limit the same
  burstLimit: 5,             // Increased from 3 to 5
  retryDelayMs: 1000,        // Reduced from 3000 to 1000ms
  backoffMultiplier: 1.5,    // Reduced from 2 to 1.5
  maxRetries: 2,             // Keep retries the same
});

// Expose rate limiter stats to global scope for debugging
if (typeof window !== 'undefined') {
  (window as any).rpcRateLimiter = {
    getStats: () => rpcRateLimiter.getStats(),
    logStats: () => rpcRateLimiter.logStats(),
    clearQueue: () => rpcRateLimiter.clearQueue(),
  };
}

export default RPCRateLimiter;
