// Local WordPress type definitions to avoid vulnerable dependencies
/// <reference types="react" />

declare module '@wordpress/block-editor' {
  export interface BlockEditorKeyboardShortcuts {
    register: () => void;
    unregister: () => void;
  }
  
  export function useBlockProps(props?: any): any;
  export const InspectorControls: any;
  export const BlockControls: any;
  export const useInnerBlocksProps: any;
  export const InnerBlocks: any;
  export const MediaUpload: any;
  export const MediaUploadCheck: any;
  export const ColorPalette: any;
  export const RichText: any;
  export const PlainText: any;
  export const URLInput: any;
  export const AlignmentToolbar: any;
  export const BlockAlignmentToolbar: any;
  export const store: any;
}

declare module '@wordpress/blocks' {
  export interface Block {
    name: string;
    attributes: Record<string, any>;
    innerBlocks: Block[];
  }
  
  export function registerBlockType(name: string, settings: any): void;
  export function unregisterBlockType(name: string): void;
  export function getBlockType(name: string): any;
  export function getBlockTypes(): any[];
  export function hasBlockSupport(blockName: string, feature: string): boolean;
  export function createBlock(name: string, attributes?: any, innerBlocks?: Block[]): Block;
  export function cloneBlock(block: Block, attributes?: any, innerBlocks?: Block[]): Block;
  export const store: any;
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
  export const CheckboxControl: any;
  export const RadioControl: any;
  export const TextareaControl: any;
  export const Notice: any;
  export const Spinner: any;
  export const Placeholder: any;
  export const Toolbar: any;
  export const ToolbarGroup: any;
  export const ToolbarButton: any;
  export const ToolbarItem: any;
  export const Dropdown: any;
  export const MenuGroup: any;
  export const MenuItem: any;
  export const Modal: any;
  export const Popover: any;
  export const Card: any;
  export const CardBody: any;
  export const CardHeader: any;
  export const CardFooter: any;
  export const Icon: any;
  export const Flex: any;
  export const FlexItem: any;
  export const FlexBlock: any;
  export const __experimentalSpacer: any;
  export const __experimentalHStack: any;
  export const __experimentalVStack: any;
  export const ColorPicker: any;
  export const DateTimePicker: any;
  export const TimePicker: any;
  export const DatePicker: any;
  export const FocalPointPicker: any;
  export const FontSizePicker: any;
  export const FormFileUpload: any;
  export const BaseControl: any;
  export const Dashicon: any;
  export const ExternalLink: any;
  export const KeyboardShortcuts: any;
  export const ResponsiveWrapper: any;
  export const SandBox: any;
  export const SearchControl: any;
  export const SlotFillProvider: any;
  export const Slot: any;
  export const Fill: any;
  export const Tooltip: any;
  export const TreeSelect: any;
  export const VisuallyHidden: any;
}

declare module '@wordpress/element' {
  export const createElement: any;
  export const Fragment: any;
  export const Component: any;
  export const PureComponent: any;
  export const Children: any;
  export const cloneElement: any;
  export const createContext: any;
  export const createRef: any;
  export const forwardRef: any;
  export const isValidElement: any;
  export const memo: any;
  export const StrictMode: any;
  export const Suspense: any;
  export const lazy: any;
  export const startTransition: any;
  export const useDeferredValue: any;
  export const useId: any;
  export const useTransition: any;
  
  // React hooks with generic typing
  export function useCallback<T>(callback: T, deps: any[]): T;
  export function useContext<T>(context: any): T;
  export function useDebugValue<T>(value: T, format?: (value: T) => any): void;
  export function useEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useImperativeHandle<T>(ref: any, init: () => T, deps?: any[]): void;
  export function useLayoutEffect(effect: () => void | (() => void), deps?: any[]): void;
  export function useMemo<T>(factory: () => T, deps: any[]): T;
  export function useReducer<S, A>(reducer: (state: S, action: A) => S, initialState: S): [S, (action: A) => void];
  export function useRef<T>(initialValue?: T): { current: T };
  export function useState(initialState: S | (() => S)): [S, (value: S | ((prevState: S) => S)) => void];
  export function useSyncExternalStore<T>(subscribe: (onStoreChange: () => void) => () => void, getSnapshot: () => T, getServerSnapshot?: () => T): T;
  
  export const version: string;
  export const render: any;
  export const hydrate: any;
  export const unmountComponentAtNode: any;
  export const createPortal: any;
  export const findDOMNode: any;
  export const concatChildren: any;
  export const switchChildrenNodeName: any;
  export const Platform: any;
}

declare module '@wordpress/i18n' {
  export function __(text: string, domain?: string): string;
  export function _x(text: string, context: string, domain?: string): string;
  export function _n(single: string, plural: string, number: number, domain?: string): string;
}

declare module '@wordpress/url' {
  export function addQueryArgs(url: string, args: Record<string, any>): string;
  export function getQueryArg(url: string, arg: string): string | undefined;
  export function removeQueryArgs(url: string, ...args: string[]): string;
  export function hasQueryArg(url: string, arg: string): boolean;
  export function getQueryArgs(url: string): Record<string, any>;
  export function buildQueryString(data: Record<string, any>): string;
  export function getPath(url: string): string;
  export function getFragment(url: string): string | undefined;
  export function isURL(url: string): boolean;
  export function isEmail(email: string): boolean;
  export function getProtocol(url: string): string | undefined;
  export function isValidProtocol(protocol: string): boolean;
  export function getAuthority(url: string): string | undefined;
  export function isValidAuthority(authority: string): boolean;
  export function getPathAndQueryString(url: string): string;
}

declare module '@wordpress/icons' {
  export const Icon: any;
  export const check: any;
  export const starEmpty: any;
  export const starHalf: any;
  export const starFull: any;
  export const starFilled: any;
  export const list: any;
  export const grid: any;
  export const listView: any;
  export const update: any;
  export const chevronLeft: any;
  export const chevronRight: any;
  export const chevronUp: any;
  export const chevronDown: any;
  export const dragHandle: any;
  export const seen: any;
  export const unseen: any;
  export const cog: any;
  export const calendar: any;
  export const search: any;
  export const plus: any;
  export const trash: any;
  export const settings: any;
  export const filter: any;
  export const edit: any;
  export const close: any;
  export const closeSmall: any;
  export const external: any;
  export const link: any;
  export const linkOff: any;
  export const image: any;
  export const media: any;
  export const video: any;
  export const audio: any;
  export const file: any;
  export const download: any;
  export const upload: any;
  export const help: any;
  export const info: any;
  export const warning: any;
  export const error: any;
  export const success: any;
  export const archive: any;
  export const backup: any;
  export const restore: any;
  export const copy: any;
  export const move: any;
  export const duplicate: any;
  export const remove: any;
  export const publish: any;
  export const draft: any;
  export const pending: any;
  export const private: any;
  export const trash2: any;
  export const undo: any;
  export const redo: any;
  export const save: any;
  export const menu: any;
  export const moreVertical: any;
  export const moreHorizontal: any;
  export const wordpress: any;
  export const plugins: any;
  export const admin: any;
  export const users: any;
  export const comments: any;
  export const pages: any;
  export const posts: any;
  export const dashboard: any;
  export const appearance: any;
  export const tools: any;
  export const settingsIcon: any;
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
  
  interface APIFetch {
    (options: APIFetchOptions): Promise<any>;
    use: (middleware: any) => void;
    createRootURLMiddleware: (rootURL: string) => any;
    createNonceMiddleware: (nonce: string) => any;
    createPreloadingMiddleware: (preloadedData: any) => any;
    createThrottleRateLimitMiddleware: (options: any) => any;
    mediaUploadMiddleware: any;
    fetchAllMiddleware: any;
  }
  
  const apiFetch: APIFetch;
  export default apiFetch;
}