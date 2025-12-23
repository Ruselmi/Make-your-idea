/**
 * NETWORK MANAGER
 * Handles robust fetching with CORS Proxy fallback.
 * Acts as a client-side "server" middleware to ensure assets load
 * for the Canvas renderer without "Tainted Canvas" errors.
 */

const CORS_PROXIES = [
    "https://corsproxy.io/?",
    "https://api.allorigins.win/raw?url=",
    "https://thingproxy.freeboard.io/fetch/",
    "https://api.codetabs.com/v1/proxy?quest=",
    "https://cors-anywhere.herokuapp.com/" // Backup, might require demo opt-in but good to have in list
];

async function fetchWithBackoff(url: string, options?: RequestInit, retries = 2, delay = 1000): Promise<Response> {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch(url, options);
            if (res.ok) return res;
            
            // If 429 (Too Many Requests) or 5xx (Server Error), wait and retry
            if (res.status === 429 || res.status >= 500) {
                 const waitTime = delay * Math.pow(1.5, i); // Exponential backoff
                 await new Promise(r => setTimeout(r, waitTime));
                 continue;
            }
            
            // For 4xx (client error), fail immediately (except 429)
            if (res.status >= 400 && res.status < 500) {
                 throw new Error(`Client Error: ${res.status} ${res.statusText}`);
            }
        } catch (e) {
            if (i === retries - 1) throw e;
            const waitTime = delay * Math.pow(1.5, i);
            await new Promise(r => setTimeout(r, waitTime));
        }
    }
    throw new Error('Max retries exceeded');
}

export async function secureFetch(url: string, options?: RequestInit): Promise<Response> {
    // 1. Try Direct Fetch first (fastest)
    try {
        const response = await fetchWithBackoff(url, options);
        if (response.ok) return response;
    } catch (e) {
        // Fallthrough to proxies
    }

    // 2. Try Proxies (Round Robin or Sequential)
    // Randomize start index to load balance
    const startIdx = Math.floor(Math.random() * CORS_PROXIES.length);
    const proxyOrder = [...CORS_PROXIES.slice(startIdx), ...CORS_PROXIES.slice(0, startIdx)];

    for (const proxy of proxyOrder) {
        try {
            // Encode URL for proxy
            const targetUrl = `${proxy}${encodeURIComponent(url)}`;
            const response = await fetchWithBackoff(targetUrl, options, 1); // 1 retry per proxy
            if (response.ok) return response;
        } catch (e) {
            continue;
        }
    }

    throw new Error(`All network layers failed for: ${url}`);
}

/**
 * Loads an image SAFE for Canvas (prevents Tainting).
 * It fetches the image as a Blob first, then creates a local ObjectURL.
 * This effectively sanitizes the origin for the Canvas.
 */
export const loadCorsImage = async (url: string): Promise<HTMLImageElement> => {
    try {
        // 1. Fetch as Blob (Proxied if needed)
        const response = await secureFetch(url);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);

        // 2. Load the ObjectURL into an Image
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error(`Failed to decode image blob: ${url}`));
            };
            img.src = objectUrl;
        });
    } catch (e) {
        console.warn(`Primary image load failed for ${url}. Attempting fallback.`);
        
        // Fallback Strategy: Picsum Photos
        // Attempt to extract seed from original URL to keep consistency, else random
        let seed = Math.floor(Math.random() * 1000);
        const match = url.match(/seed=(\d+)/);
        if (match) seed = parseInt(match[1]);

        const fallbackUrl = `https://picsum.photos/seed/${seed}/720/1280`;

        try {
            const fbRes = await fetch(fallbackUrl);
            const fbBlob = await fbRes.blob();
            const fbObj = URL.createObjectURL(fbBlob);
            return new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve(img);
                img.onerror = () => {
                     // If even fallback fails, return transparent pixel
                     const blank = new Image();
                     blank.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                     blank.onload = () => resolve(blank);
                };
                img.src = fbObj;
            });
        } catch (fbErr) {
             // Ultimate Fallback
             return new Promise((resolve) => {
                const img = new Image();
                img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
                img.onload = () => resolve(img);
            });
        }
    }
};