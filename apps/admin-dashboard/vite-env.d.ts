/// <reference types="vite/client" />
/// <reference lib="dom" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_APP_NAME: string
  readonly VITE_APP_VERSION: string
  readonly VITE_DEV_PORT: string
  readonly VITE_API_BASE_URL: string
  readonly VITE_SSO_CLIENT_ID: string
  readonly VITE_SSO_CLIENT_SECRET: string
  readonly VITE_AUTH_REDIRECT_URI: string
  readonly VITE_SESSION_TIMEOUT: string
  readonly VITE_REFRESH_TOKEN_INTERVAL: string
  readonly VITE_WEBSOCKET_URL: string
  readonly VITE_UPLOAD_MAX_SIZE: string
  readonly VITE_SUPPORTED_FILE_TYPES: string
  readonly VITE_ANALYTICS_ID: string
  readonly VITE_ERROR_REPORTING_URL: string
  readonly VITE_FEATURE_FLAGS: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}