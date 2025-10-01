declare global {
  interface Window {
    wp: {
      blocks?: {
        registerBlockType?: (name: string, settings: unknown) => void;
        getCategories?: () => unknown[];
        getBlockTypes?: () => unknown[];
        subscribe?: (callback: () => void) => () => void;
        [key: string]: unknown;
      };
      data?: {
        subscribe?: (callback: () => void) => () => void;
        select?: (store: string) => unknown;
        dispatch?: (store: string) => unknown;
        [key: string]: unknown;
      };
      element?: {
        createElement?: (type: unknown, props?: unknown, ...children: unknown[]) => unknown;
        Fragment?: unknown;
        [key: string]: unknown;
      };
      editor?: {
        RichText?: unknown;
        InspectorControls?: unknown;
        BlockControls?: unknown;
        [key: string]: unknown;
      };
      components?: {
        PanelBody?: unknown;
        PanelRow?: unknown;
        TextControl?: unknown;
        ToggleControl?: unknown;
        Button?: unknown;
        [key: string]: unknown;
      };
      hooks?: {
        addFilter?: (hookName: string, namespace: string, callback: (...args: unknown[]) => unknown) => void;
        addAction?: (hookName: string, namespace: string, callback: (...args: unknown[]) => void) => void;
        [key: string]: unknown;
      };
      [key: string]: unknown;
    };
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
    renderShortcode?: (name: string, attributes: unknown, content: string) => void;
  }
}

export {};