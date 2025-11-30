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
  console.log('O4O Mobile App Initializing...');
  (window as any).O4O = { mobile: MobileBridge, version: '1.0.0', buildDate: new Date().toISOString() };
  console.log('Platform:', MobileBridge.platform.getPlatform());
  console.log('Is Native:', MobileBridge.platform.isNative());
  if (MobileBridge.platform.isNative()) {
    const appInfo = await MobileBridge.utils.getAppInfo();
    if (appInfo) {
      console.log('App Version:', appInfo.version);
      console.log('Build:', appInfo.build);
    }
  }
  console.log('O4O Mobile App Ready');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initMobileApp);
} else {
  initMobileApp();
}
