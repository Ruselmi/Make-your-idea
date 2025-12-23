/**
 * SYSTEM GUARD
 * Monitors application stability and handles "Crash Loops".
 * If the app crashes > 3 times in a row without a successful load, it redirects to Safe Mode.
 */

const CRASH_KEY = 'myc_crash_count';
const LAST_LOAD_KEY = 'myc_last_load';
const CRASH_THRESHOLD = 3;

export const SystemGuard = {
    init: () => {
        console.log("[SystemGuard] Watchdog initialized in background.");
        // We can perform proactive checks here if needed.
    },

    reportCrash: () => {
        const count = parseInt(localStorage.getItem(CRASH_KEY) || '0');
        localStorage.setItem(CRASH_KEY, (count + 1).toString());
        console.error(`[SystemGuard] Crash reported. Count: ${count + 1}`);
    },

    reportSuccess: () => {
        // Only reset if we've been running for at least 5 seconds?
        // Or just reset on clean unmount?
        // For simplicity, we assume if this is called, the app rendered.
        // But to avoid "crash on render" loops, we should maybe set a timeout.

        // Actually, best practice: Reset crash count after X seconds of stability.
        setTimeout(() => {
            localStorage.setItem(CRASH_KEY, '0');
            localStorage.setItem(LAST_LOAD_KEY, Date.now().toString());
            console.log("[SystemGuard] Stability confirmed.");
        }, 5000);
    },

    checkStability: () => {
        const count = parseInt(localStorage.getItem(CRASH_KEY) || '0');
        if (count >= CRASH_THRESHOLD) {
            console.warn("[SystemGuard] Critical instability detected. Redirecting to Safe Mode.");
            window.location.href = '/SafeMode.html';
            return false;
        }
        return true;
    }
};
