export interface QueueTask {
    execute: () => Promise<void>;
    resolve: () => void;
    reject: (error: Error) => void;
}

export class RequestQueue {
    private queue: QueueTask[] = [];
    private activeCount: number = 0;
    private maxConcurrent: number;
    private maxQueue: number;
    
    constructor(maxConcurrent: number, maxQueue: number) {
        this.maxConcurrent = maxConcurrent;
        this.maxQueue = maxQueue;
    }
    
    public updateLimits(maxConcurrent: number, maxQueue: number): void {
        this.maxConcurrent = maxConcurrent;
        this.maxQueue = maxQueue;
    }
    
    public async enqueue(task: () => Promise<void>): Promise<void> {
        // Check if queue is full
        if (this.queue.length >= this.maxQueue) {
            throw new Error('QUEUE_OVERFLOW');
        }
        
        return new Promise((resolve, reject) => {
            const wrappedTask = async () => {
                try {
                    await task();
                    resolve();
                } catch (error) {
                    reject(error);
                } finally {
                    this.activeCount--;
                    this.processNext();
                }
            };
            
            this.queue.push({
                execute: wrappedTask,
                resolve,
                reject
            });
            
            this.processNext();
        });
    }
    
    private processNext(): void {
        if (this.activeCount >= this.maxConcurrent || this.queue.length === 0) {
            return;
        }
        
        const task = this.queue.shift();
        if (task) {
            this.activeCount++;
            task.execute();
        }
    }
    
    public getQueueSize(): number {
        return this.queue.length;
    }
    
    public getActiveCount(): number {
        return this.activeCount;
    }
}
