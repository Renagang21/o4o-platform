/** Shared store client implementation; service transports remain in the app adapters. */

export type StoreMlcLocale = "ko" | "en" | "zh" | "ja" | "vi" | "th" | "id";

export type StoreMlcTargetKind = "local" | "listing";

export type StoreMlcStatus = "draft" | "published" | "archived";

export type StoreMlcContentFormat =
  | "blocks"
  | "html"
  | "image_sequence"
  | "json";

export interface StoreMlcHubItem {
  id: string;
  serviceKey: string;
  contentKey: string;
  title: string;
  description?: string | null;
  defaultLocale: StoreMlcLocale;
  publishedAt?: string | null;
  updatedAt: string;
  locales: StoreMlcLocale[];
  localeCount: number;
}

export interface StoreMlcHubResponse {
  data: StoreMlcHubItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface StoreMlcPage {
  id: string;
  groupId: string;
  locale: StoreMlcLocale;
  title: string;
  summary?: string | null;
  contentFormat: string;
  status: StoreMlcStatus;
  isDefault: boolean;
  sortOrder: number;
  updatedAt: string;
}

export interface StoreMlcGroup {
  id: string;
  organizationId: string;
  serviceKey?: string | null;
  targetKind: StoreMlcTargetKind;
  targetId: string;
  contentKey: string;
  title: string;
  defaultLocale: StoreMlcLocale;
  sourceType: string;
  sourceRefId?: string | null;
  status: StoreMlcStatus;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  pages: StoreMlcPage[];
}

export interface StoreMlcImportInput {
  sourceGroupId: string;
  targetKind: StoreMlcTargetKind;
  targetId: string;
  contentKey?: string;
}

export interface StoreMlcSummaryItem {
  groupId: string;
  targetKind: StoreMlcTargetKind;
  targetId: string;
  title: string;
  status: StoreMlcStatus;
  sourceType: string;
  defaultLocale: StoreMlcLocale;
  updatedAt: string;
  locales: StoreMlcLocale[];
  localeCount: number;
  publishedLocaleCount: number;
}

export interface StoreMlcPageDetail extends StoreMlcPage {
  content: Record<string, unknown>;
  assets: Array<Record<string, unknown>>;
  buttons: Array<Record<string, unknown>>;
  metadata?: Record<string, unknown>;
}

export interface StoreMlcGroupDetail extends Omit<StoreMlcGroup, "pages"> {
  pages: StoreMlcPageDetail[];
}

export interface StoreMlcCreateGroupInput {
  targetKind: StoreMlcTargetKind;
  targetId: string;
  title: string;
  defaultLocale?: StoreMlcLocale;
  contentKey?: string;
}

export interface StoreMlcPageInput {
  title: string;
  summary?: string;
  contentFormat?: StoreMlcContentFormat;
  content?: Record<string, unknown>;
  status?: StoreMlcStatus;
  isDefault?: boolean;
  sortOrder?: number;
}

export interface PublicMlcPage {
  locale: StoreMlcLocale;
  title: string;
  summary?: string | null;
  contentFormat: string;
  content: Record<string, unknown>;
  assets: Array<Record<string, unknown>>;
  buttons: Array<Record<string, unknown>>;
  updatedAt: string;
}

export interface PublicMlcResolve {
  title: string;
  targetKind: StoreMlcTargetKind;
  contentKey: string;
  defaultLocale: StoreMlcLocale;
  requestedLocale: StoreMlcLocale | null;
  resolvedLocale: StoreMlcLocale | null;
  fallbackUsed: boolean;
  availableLocales: StoreMlcLocale[];
  page: PublicMlcPage | null;
}

export const STORE_MLC_LOCALES: StoreMlcLocale[] = [
  "ko",
  "en",
  "zh",
  "ja",
  "vi",
  "th",
  "id",
];

export const STORE_MLC_LOCALE_LABELS: Record<StoreMlcLocale, string> = {
  ko: "한국어",
  en: "English",
  zh: "中文",
  ja: "日本語",
  vi: "Tiếng Việt",
  th: "ภาษาไทย",
  id: "Bahasa",
};

export function createStoreMlcClient({
  getApiBase,
  authFetch,
}: {
  getApiBase: () => string;
  authFetch: (url: string, options?: RequestInit) => Promise<any>;
}) {
  async function importMlcFromHub(
    input: StoreMlcImportInput,
  ): Promise<StoreMlcGroup> {
    const json = await authFetch(`${getApiBase()}/import`, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return json.data;
  }

  async function getMlcSummaryMap(
    targetKind: StoreMlcTargetKind,
  ): Promise<Map<string, StoreMlcSummaryItem>> {
    const json = await authFetch(
      `${getApiBase()}/summary?targetKind=${encodeURIComponent(targetKind)}`,
    );
    const items: StoreMlcSummaryItem[] = json.data ?? [];
    const map = new Map<string, StoreMlcSummaryItem>();
    for (const item of items) {
      if (item?.targetId) map.set(item.targetId, item);
    }
    return map;
  }

  async function getStoreMlcGroup(
    groupId: string,
  ): Promise<StoreMlcGroupDetail> {
    const json = await authFetch(
      `${getApiBase()}/${encodeURIComponent(groupId)}`,
    );
    return json.data;
  }

  async function createStoreMlcGroup(
    input: StoreMlcCreateGroupInput,
  ): Promise<StoreMlcGroupDetail> {
    const json = await authFetch(`${getApiBase()}`, {
      method: "POST",
      body: JSON.stringify({ sourceType: "store_created", ...input }),
    });
    return json.data;
  }

  async function upsertStoreMlcPage(
    groupId: string,
    locale: StoreMlcLocale,
    input: StoreMlcPageInput,
  ): Promise<StoreMlcGroupDetail> {
    const json = await authFetch(
      `${getApiBase()}/${encodeURIComponent(groupId)}/pages/${encodeURIComponent(locale)}`,
      { method: "PUT", body: JSON.stringify(input) },
    );
    return json.data;
  }

  async function setStoreMlcPageStatus(
    groupId: string,
    locale: StoreMlcLocale,
    status: StoreMlcStatus,
  ): Promise<StoreMlcGroupDetail> {
    const json = await authFetch(
      `${getApiBase()}/${encodeURIComponent(groupId)}/pages/${encodeURIComponent(locale)}/status`,
      { method: "PATCH", body: JSON.stringify({ status }) },
    );
    return json.data;
  }

  async function ensureMlcPublicKey(
    groupId: string,
  ): Promise<{ publicKey: string; url: string }> {
    const json = await authFetch(
      `${getApiBase()}/${encodeURIComponent(groupId)}/public-key`,
      { method: "POST" },
    );
    return json.data;
  }

  async function getMlcQr(
    groupId: string,
  ): Promise<{ publicKey: string; url: string; svg: string }> {
    const json = await authFetch(
      `${getApiBase()}/${encodeURIComponent(groupId)}/qr`,
    );
    return json.data;
  }

  return {
    importMlcFromHub,
    getMlcSummaryMap,
    getStoreMlcGroup,
    createStoreMlcGroup,
    upsertStoreMlcPage,
    setStoreMlcPageStatus,
    ensureMlcPublicKey,
    getMlcQr,
  };
}
