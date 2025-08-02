// Local WordPress type definitions to avoid vulnerable dependencies

declare module '@wordpress/block-editor' {
  export interface BlockEditorKeyboardShortcuts {
    register: () => void;
    unregister: () => void;
  }
}

declare module '@wordpress/blocks' {
  export interface Block {
    name: string;
    attributes: Record<string, any>;
    innerBlocks: Block[];
  }
  
  export function registerBlockType(name: string, settings: any): void;
  export function unregisterBlockType(name: string): void;
}

declare module '@wordpress/components' {
  export const Button: any;
  export const Panel: any;
  export const PanelBody: any;
  export const PanelRow: any;
  export const TextControl: any;
  export const SelectControl: any;
  export const ToggleControl: any;
  export const RangeControl: any;
}

declare module '@wordpress/element' {
  export const createElement: any;
  export const Fragment: any;
}

declare module '@wordpress/i18n' {
  export function __(text: string, domain?: string): string;
  export function _x(text: string, context: string, domain?: string): string;
  export function _n(single: string, plural: string, number: number, domain?: string): string;
}

declare module '@wordpress/url' {
  export function addQueryArgs(url: string, args: Record<string, any>): string;
  export function getQueryArg(url: string, arg: string): string | undefined;
}

declare module '@wordpress/api-fetch' {
  // Simplified API fetch options that work in both browser and Node environments
  interface APIFetchOptions {
    // Basic fetch options
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
    headers?: Record<string, string> | [string, string][];
    body?: string | FormData | URLSearchParams | globalThis.ReadableStream<Uint8Array> | null;
    mode?: 'cors' | 'no-cors' | 'same-origin';
    credentials?: 'omit' | 'same-origin' | 'include';
    cache?: 'default' | 'no-store' | 'reload' | 'no-cache' | 'force-cache' | 'only-if-cached';
    redirect?: 'follow' | 'error' | 'manual';
    referrer?: string;
    referrerPolicy?: 'no-referrer' | 'no-referrer-when-downgrade' | 'origin' | 'origin-when-cross-origin' | 'same-origin' | 'strict-origin' | 'strict-origin-when-cross-origin' | 'unsafe-url';
    integrity?: string;
    keepalive?: boolean;
    signal?: any; // AbortSignal
    
    // WordPress specific properties
    path?: string;
    url?: string;
    parse?: boolean;
  }
  
  function apiFetch(options: APIFetchOptions): Promise<any>;
  export default apiFetch;
}