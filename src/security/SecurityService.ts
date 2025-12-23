import { SystemGuard } from './SystemGuard';
import { KeyVault } from './KeyVault';
import { ProxyRotator } from './ProxyRotator';

class SecurityService {
  private static instance: SecurityService;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): SecurityService {
    if (!SecurityService.instance) {
      SecurityService.instance = new SecurityService();
    }
    return SecurityService.instance;
  }

  public async init() {
    if (this.isInitialized) return;

    console.log('[Security] Initializing background services...');

    // Run initializations in parallel without blocking main thread
    // We use setTimeout to push this to the end of the event loop
    setTimeout(async () => {
      try {
        // 1. Initialize Watchdog (SystemGuard)
        SystemGuard.init();

        // 2. Initialize KeyVault (obfuscation)
        // KeyVault.init() might not need explicit async init, but we can log or verify
        console.log('[Security] KeyVault active');

        // 3. Initialize Proxy Rotator
        await ProxyRotator.init();

        this.isInitialized = true;
        console.log('[Security] All systems operational in background.');
      } catch (e) {
        console.error('[Security] Background initialization failed', e);
      }
    }, 100);
  }
}

export const securityService = SecurityService.getInstance();
