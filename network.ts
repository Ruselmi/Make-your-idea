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
    "https://cors-anywhere.herokuapp.com/" // Added as backup
];

export async function secureFetch(url: string, options?: RequestInit): Promise<Response> {
    const finalOptions = {
        ...options,
        headers: {
            ...options?.headers,
            // 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            // Note: Browsers override User-Agent, but some proxies forward this.
        }
    };

    // 1. Try Direct Fetch first (fastest) - mostly for same-origin or CORS-enabled
    try {
        const response = await fetch(url, finalOptions);
        if (response.ok) return response;
    } catch (e) {
        // Fallthrough
    }

    // 2. Randomize Proxies to distribute load (Security/Stability)
    const shuffled = [...CORS_PROXIES].sort(() => 0.5 - Math.random());

    for (const proxy of shuffled) {
        try {
            const targetUrl = `${proxy}${encodeURIComponent(url)}`;
            const response = await fetch(targetUrl, finalOptions);
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
                // Clean up memory eventually, but for this app flow we keep it until render done
                resolve(img);
            };
            img.onerror = () => {
                URL.revokeObjectURL(objectUrl);
                reject(new Error(`Failed to decode image blob: ${url}`));
            };
            img.src = objectUrl;
        });
    } catch (e) {
        console.error("Image Load Failed:", e);
        // Return a fallback placeholder image instead of crashing
        return new Promise((resolve) => {
            const img = new Image();
            // 1x1 Transparent Pixel
            img.src = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=";
            img.onload = () => resolve(img);
        });
    }
};