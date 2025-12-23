/**
 * HEAVY TASK ENGINE
 * Manages parallel processing threads for Turbo/Instant modes.
 * Ensures the UI remains responsive while processing heavy batch operations.
 */

export type ConcurrencyMode = 'linear' | 'balanced' | 'turbo' | 'instant';

export class ParallelEngine<T, R> {
    private queue: T[];
    private results: Map<number, R>;
    private activeWorkers: number;
    private maxConcurrency: number;
    private processingFn: (item: T, index: number) => Promise<R>;
    private onProgress: (completed: number, total: number) => void;
    private isStopped: boolean;

    constructor(
        items: T[],
        mode: ConcurrencyMode,
        fn: (item: T, index: number) => Promise<R>,
        onProgress: (c: number, t: number) => void
    ) {
        this.queue = [...items]; // Clone array
        this.results = new Map();
        this.activeWorkers = 0;
        this.processingFn = fn;
        this.onProgress = onProgress;
        this.isStopped = false;

        // Set Thread Count based on Mode
        switch (mode) {
            case 'linear': this.maxConcurrency = 1; break;
            case 'balanced': this.maxConcurrency = 4; break;
            case 'turbo': this.maxConcurrency = 8; break;
            case 'instant': this.maxConcurrency = 12; break; // Reduced from 32 to 12 to prevent browser network stall
            default: this.maxConcurrency = 4;
        }
    }

    public start(): Promise<R[]> {
        return new Promise((resolve, reject) => {
            const total = this.queue.length;
            let completed = 0;
            let nextIndex = 0;

            const next = () => {
                if (this.isStopped) return;

                // Check if done
                if (completed === total) {
                    // Sort results by original index to ensure order
                    const sorted = Array.from(this.results.entries())
                        .sort((a, b) => a[0] - b[0])
                        .map(entry => entry[1]);
                    resolve(sorted);
                    return;
                }

                // Spawn workers up to limit
                while (this.activeWorkers < this.maxConcurrency && nextIndex < total) {
                    const currentIndex = nextIndex++;
                    const item = this.queue[currentIndex];
                    
                    this.activeWorkers++;
                    
                    this.processingFn(item, currentIndex)
                        .then(result => {
                            this.results.set(currentIndex, result);
                        })
                        .catch(err => {
                            console.error(`Worker error at index ${currentIndex}:`, err);
                            // We don't reject the whole promise, we just store null/error result handled by caller
                            // or allow the caller's fn to handle the try/catch
                        })
                        .finally(() => {
                            this.activeWorkers--;
                            completed++;
                            this.onProgress(completed, total);
                            next(); // Trigger next item
                        });
                }
            };

            next();
        });
    }

    public stop() {
        this.isStopped = true;
    }
}