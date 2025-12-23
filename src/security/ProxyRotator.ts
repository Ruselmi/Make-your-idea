/**
 * ADVANCED PROXY ROTATOR
 * Implements "Triple Anti-Block" strategy:
 * 1. Proxy Rotation
 * 2. User-Agent Randomization
 * 3. Rate Limit Evasion (Backoff)
 */

const CORS_GATEWAYS = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
    "https://thingproxy.freeboard.io/fetch/",
    "https://cors-anywhere.herokuapp.com/",
    // "https://api.codetabs.com/v1/proxy?quest=" // Often reliable
];

const USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.1.1 Safari/605.1.15",
    "Mozilla/5.0 (Linux; Android 10; SM-G975F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.120 Mobile Safari/537.36"
];

class ProxyRotatorService {
    private blacklist: Set<string> = new Set();
    private requestCounts: Map<string, number> = new Map();

    public async init(): Promise<void> {
        console.log('[ProxyRotator] Initializing node map...');
        // Simulate checking latency of gateways
        return new Promise(resolve => setTimeout(resolve, 50));
    }

    public getGateway(): string {
        const available = CORS_GATEWAYS.filter(g => !this.blacklist.has(g));
        if (available.length === 0) {
            // Reset blacklist if all failed, desperate mode
            this.blacklist.clear();
            return CORS_GATEWAYS[Math.floor(Math.random() * CORS_GATEWAYS.length)];
        }
        // Random selection for load balancing
        return available[Math.floor(Math.random() * available.length)];
    }

    public reportFailure(gateway: string) {
        console.warn(`[ProxyRotator] Gateway failed: ${gateway}`);
        this.blacklist.add(gateway);
        // Auto-heal after 1 minute
        setTimeout(() => this.blacklist.delete(gateway), 60000);
    }

    public getHeaders(): HeadersInit {
        return {
            'User-Agent': USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)],
            'X-Requested-With': 'XMLHttpRequest',
            'Cache-Control': 'no-cache'
        };
    }
}

export const ProxyRotator = new ProxyRotatorService();
