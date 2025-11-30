import { MobileBridge } from './bridge/mobileBridge';
import type { MobileBridgeType } from './bridge/mobileBridge';

declare global {
  interface Window {
    O4O: {
      mobile: MobileBridgeType;
      version: string;
      buildDate: string;
    };
  }
}

async function initMobileApp() {
  // Initialize O4O global object
  (window as any).O4O = { mobile: MobileBridge, version: '1.0.0', buildDate: new Date().toISOString() };

  // Platform detection
  const platform = MobileBridge.platform.getPlatform();
  const isNative = MobileBridge.platform.isNative();

  // Get app info for native platforms
  if (isNative) {
    const appInfo = await MobileBridge.utils.getAppInfo();
    // App info loaded successfully
  }

  // Mobile app initialized
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileApp);
} else {
  initMobileApp();
}
