export interface RetryOptions {
    maxRetries: number;
    backoffBaseMs: number;
    backoffMaxMs: number;
    backoffJitter: number;
}

export class RetryManager {
    private options: RetryOptions;
    
    constructor(options: RetryOptions) {
        this.options = options;
    }
    
    public updateOptions(options: RetryOptions): void {
        this.options = options;
    }
    
    public async executeWithRetry<T>(
        operation: () => Promise<T>,
        onRetry?: (attempt: number, error: Error) => void
    ): Promise<T> {
        let lastError: Error | undefined;
        
        for (let attempt = 0; attempt <= this.options.maxRetries; attempt++) {
            try {
                return await operation();
            } catch (error) {
                lastError = error as Error;
                
                // Check if error is transient and retryable
                if (!this.isTransientError(error) || attempt >= this.options.maxRetries) {
                    throw error;
                }
                
                // Notify retry callback
                if (onRetry) {
                    onRetry(attempt, lastError);
                }
                
                // Calculate backoff delay
                const delay = this.calculateBackoff(attempt);
                await this.sleep(delay);
            }
        }
        
        throw lastError || new Error('Retry failed');
    }
    
    private isTransientError(error: any): boolean {
        if (!error) {
            return false;
        }
        
        const errorMessage = error.message?.toLowerCase() || '';
        const errorCode = error.code?.toUpperCase() || '';
        
        // Check for specific transient error patterns
        const transientPatterns = [
            'rate limit',
            'overloaded',
            'timeout',
            'timed out',
            'econnreset',
            'etimedout',
            'eai_again',
            'enotfound',
            'econnrefused',
            'service unavailable',
            '503',
            '429',
            '502',
            '504'
        ];
        
        const transientCodes = [
            'ECONNRESET',
            'ETIMEDOUT',
            'EAI_AGAIN',
            'ENOTFOUND',
            'ECONNREFUSED'
        ];
        
        return transientPatterns.some(pattern => errorMessage.includes(pattern)) ||
               transientCodes.includes(errorCode);
    }
    
    private calculateBackoff(attempt: number): number {
        // Exponential backoff: baseMs * 2^attempt
        const exponentialDelay = this.options.backoffBaseMs * Math.pow(2, attempt);
        
        // Cap at max delay
        const cappedDelay = Math.min(exponentialDelay, this.options.backoffMaxMs);
        
        // Add jitter: delay * (1 ± jitter)
        const jitterRange = cappedDelay * this.options.backoffJitter;
        const jitter = (Math.random() * 2 - 1) * jitterRange;
        
        return Math.max(0, cappedDelay + jitter);
    }
    
    private sleep(ms: number): Promise<void> {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}
