declare global {
  interface Window {
    /*
      (제거됨) Window.wp 선언 — WO-O4O-WINDOW-WP-POLYFILL-RETIREMENT-V1
      WordPress 전역 polyfill 축 은퇴에 따라 타입 선언도 함께 제거한다.
      선행 census: docs/checks/WO-O4O-WINDOW-WP-POLYFILL-RUNTIME-CENSUS-V1-CHECK.md
    */
    grecaptcha?: {
      ready?: (callback: () => void) => void;
      execute?: (siteKey: string, options?: { action: string }) => Promise<string>;
      [key: string]: unknown;
    };
    ethereum?: {
      isMetaMask?: boolean;
      request?: (params: { method: string; params?: unknown[] }) => Promise<unknown>;
      [key: string]: unknown;
    };
    React?: unknown;
    ReactDOM?: {
      render?: (element: unknown, container: unknown) => void;
      [key: string]: unknown;
    };
  }
}

export {};