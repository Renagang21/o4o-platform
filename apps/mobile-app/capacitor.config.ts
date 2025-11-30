import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.o4o.mobile',
  appName: 'O4O Mobile',
  webDir: 'www',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
    iosScheme: 'https',
    allowNavigation: [
      'neture.co.kr',
      'www.neture.co.kr',
      'admin.neture.co.kr',
      'api.neture.co.kr',
      'localhost'
    ]
  }
};

export default config;
