export class RequestQueue {
    private queue: Array<() => Promise<void>> = [];
    private activeCount: number = 0;

    constructor(private maxConcurrent: number) {}

    public async enqueue(task: () => Promise<void>): Promise<void> {
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

            this.queue.push(wrappedTask);
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
            task();
        }
    }

    public getQueueSize(): number {
        return this.queue.length;
    }

    public getActiveCount(): number {
        return this.activeCount;
    }
}
