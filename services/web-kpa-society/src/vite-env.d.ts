/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_BASE_URL: string;
  /** WO-O4O-UNIFIED-STORE-WORKSPACE-FOUNDATION-V1 §8-4: 매장 진입 → store.neture.co.kr handoff ('true' | '1' 만 ON) */
  readonly VITE_UNIFIED_STORE_HANDOFF?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
