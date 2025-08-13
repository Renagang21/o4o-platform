/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_TITLE: string
  readonly VITE_APP_VERSION: string
  readonly VITE_ENABLE_MSW: string
  readonly VITE_NODE_ENV: string
  readonly VITE_PUBLIC_URL: string
  readonly VITE_DEPLOYMENT_URL: string
  readonly MODE: string
  readonly DEV: boolean
  readonly PROD: boolean
  readonly SSR: boolean
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}

declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: 'development' | 'production' | 'test'
      VITE_API_URL?: string
      VITE_APP_TITLE?: string
      VITE_APP_VERSION?: string
    }
  }
  
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION__?: any
    __REACT_DEVTOOLS_GLOBAL_HOOK__?: any
    React?: any;
    wp?: {
      [key: string]: any;
      element?: any;
      blocks?: any;
      blockEditor?: any;
      components?: any;
      i18n?: any;
      hooks?: any;
      data?: any;
      compose?: any;
      keycodes?: any;
      domReady?: ((callback: () => void) => void) | undefined;
      richText?: any;
      formatLibrary?: any;
      editor?: any;
    };
  }
}

// Vite HMR
declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FC<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.jpeg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

declare module '*.webp' {
  const content: string;
  export default content;
}

declare module '*.ico' {
  const content: string;
  export default content;
}

declare module '*.module.css' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

declare module '*.module.sass' {
  const classes: { readonly [key: string]: string };
  export default classes;
}

// JSON modules
declare module '*.json' {
  const value: any;
  export default value;
}