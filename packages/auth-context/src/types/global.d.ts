// Global type definitions
declare global {
  interface Window {
    import?: {
      meta?: {
        env?: {
          VITE_API_BASE_URL?: string;
          [key: string]: string | undefined;
        };
      };
    };
  }
}

export {};