import type {
  PublicMlcResolve,
  StoreMlcGroup,
  StoreMlcGroupDetail,
  StoreMlcHubResponse,
  StoreMlcLocale,
  StoreMlcPageDetail,
  StoreMlcSummaryItem,
  StoreMlcTargetKind,
} from "@o4o/store-ui-core/api/multilingualProductContentStore";
import {
  STORE_MLC_LOCALES,
  createStoreMlcClient,
} from "@o4o/store-ui-core/api/multilingualProductContentStore";
export {
  STORE_MLC_LOCALES,
  STORE_MLC_LOCALE_LABELS,
} from "@o4o/store-ui-core/api/multilingualProductContentStore";
export type {
  PublicMlcPage,
  PublicMlcResolve,
  StoreMlcContentFormat,
  StoreMlcCreateGroupInput,
  StoreMlcGroup,
  StoreMlcGroupDetail,
  StoreMlcHubItem,
  StoreMlcHubResponse,
  StoreMlcImportInput,
  StoreMlcLocale,
  StoreMlcPage,
  StoreMlcPageDetail,
  StoreMlcPageInput,
  StoreMlcStatus,
  StoreMlcSummaryItem,
  StoreMlcTargetKind,
} from "@o4o/store-ui-core/api/multilingualProductContentStore";

/**
 * Store Multilingual Product Content API Client — KPA store-owner
 *
 * WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-WEB-PILOT-V1
 *
 * 매장 경영자(store-owner)가 사용하는 다국어 상품 콘텐츠 API client.
 * - HUB 탐색: published 운영자 원본 목록
 * - 가져오기(=복사): 운영자 원본 → store-scoped copy (target 바인딩)
 * - 내 매장 콘텐츠 목록 / resolve(언어 fallback)
 *
 * Backend: WO-O4O-MULTILINGUAL-PRODUCT-CONTENT-API-V1 +
 *          WO-O4O-KPA-MULTILINGUAL-PRODUCT-CONTENT-HUB-FLOW-PILOT-V1 (Phase 1)
 *   /api/v1/kpa/pharmacy/multilingual-product-contents (+ /hub, /import, /:groupId/resolve)
 *
 * 권한 (backend 검증): kpa:store_owner
 */

import { getActiveServicePrefix } from "../lib/serviceContext";
import { storeScopedFetch } from "./storeScopedFetch";

function getApiBase(): string {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  return `${base}/api/v1/${getActiveServicePrefix()}/pharmacy/multilingual-product-contents`;
}

/**
 * Public landing serves only `published` pages of a non-archived group (NO_PUBLISHED_PAGE otherwise).
 * Issuing the public key (POST .../public-key) promotes saved `draft` pages to `published`, so a group is
 * publishable when it is not archived and has at least one non-archived saved page.
 */
export function hasPublishableMlcPage(
  group: Pick<StoreMlcGroup, "status" | "pages"> | null | undefined,
): boolean {
  return (
    !!group &&
    group.status !== "archived" &&
    group.pages.some((p) => p.status === "draft" || p.status === "published")
  );
}

/** Summary rows already exclude archived groups; `locales` lists only non-archived pages. */
export function hasPublishableMlcSummary(
  summary: Pick<StoreMlcSummaryItem, "status" | "locales"> | null | undefined,
): boolean {
  return (
    !!summary &&
    summary.status !== "archived" &&
    Array.isArray(summary.locales) &&
    summary.locales.length > 0
  );
}

async function authFetch(url: string, options: RequestInit = {}): Promise<any> {
  const res = await storeScopedFetch(url, options, "application/json");
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.success !== true || json.data == null) {
    const error = new Error(
      "다국어 콘텐츠 요청을 완료하지 못했습니다. 다시 시도해 주세요.",
    ) as Error & { code?: string; status: number };
    error.status = res.status;
    error.code = json?.error?.code || json?.code;
    throw error;
  }
  return json;
}

/** HUB: published 운영자 원본 탐색 */
export async function listMlcHub(params?: {
  page?: number;
  limit?: number;
  search?: string;
}): Promise<StoreMlcHubResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set("page", String(params.page));
  if (params?.limit) query.set("limit", String(params.limit));
  if (params?.search) query.set("search", params.search);
  const qs = query.toString();
  const json = await authFetch(`${getApiBase()}/hub${qs ? `?${qs}` : ""}`);
  if (
    !Array.isArray(json.data) ||
    !Number.isSafeInteger(json.meta?.total) ||
    json.meta.total < 0
  )
    throw new Error(
      "제공 자료 목록을 확인하지 못했습니다. 다시 시도해 주세요.",
    );
  return { data: json.data, meta: json.meta };
}

/** 내 매장 다국어 콘텐츠 목록 */
export async function listMyMlcGroups(params?: {
  targetKind?: StoreMlcTargetKind;
  targetId?: string;
  includeArchived?: boolean;
}): Promise<StoreMlcGroup[]> {
  const query = new URLSearchParams();
  if (params?.targetKind) query.set("targetKind", params.targetKind);
  if (params?.targetId) query.set("targetId", params.targetId);
  if (params?.includeArchived) query.set("includeArchived", "true");
  const qs = query.toString();
  const json = await authFetch(`${getApiBase()}${qs ? `?${qs}` : ""}`);
  if (
    !Array.isArray(json.data) ||
    json.data.some(
      (g: StoreMlcGroup) =>
        !g?.id ||
        typeof g.title !== "string" ||
        !g.targetId ||
        !["local", "listing"].includes(g.targetKind) ||
        !STORE_MLC_LOCALES.includes(g.defaultLocale) ||
        !Array.isArray(g.pages),
    )
  )
    throw new Error("내 매장 콘텐츠 목록을 확인하지 못했습니다.");
  return json.data;
}

/** 언어 fallback resolve (검증용) */
export async function resolveMlc(
  groupId: string,
  locale: StoreMlcLocale,
): Promise<{
  group: StoreMlcGroup;
  page: StoreMlcPageDetail & {
    resolvedLocale: StoreMlcLocale;
    fallbackReason: string | null;
  };
  requestedLocale: StoreMlcLocale | null;
}> {
  const json = await authFetch(
    `${getApiBase()}/${encodeURIComponent(groupId)}/resolve?locale=${encodeURIComponent(locale)}`,
  );
  return json.data;
}

/** 기존 그룹은 PATCH로 갱신해 출처·상태·metadata를 보존한다. */
export async function updateStoreMlcGroup(
  groupId: string,
  input: { title: string; defaultLocale: StoreMlcLocale },
): Promise<StoreMlcGroupDetail> {
  const json = await authFetch(
    `${getApiBase()}/${encodeURIComponent(groupId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    },
  );
  return json.data;
}

/** 비인증 public landing resolve (고객용) — 토큰 없이 호출 */
export async function resolvePublicMlc(
  publicKey: string,
  locale?: StoreMlcLocale,
): Promise<PublicMlcResolve> {
  const base = import.meta.env.VITE_API_BASE_URL || "";
  const qs = locale ? `?locale=${encodeURIComponent(locale)}` : "";
  const res = await fetch(
    `${base}/api/v1/${getActiveServicePrefix()}/public/multilingual-product-contents/${encodeURIComponent(publicKey)}${qs}`,
  );
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) {
    const err: any = new Error(json.error || `Request failed (${res.status})`);
    err.status = res.status;
    err.code = json.code;
    err.data = json.data;
    throw err;
  }
  return json.data;
}

export const {
  importMlcFromHub,
  getMlcSummaryMap,
  getStoreMlcGroup,
  createStoreMlcGroup,
  upsertStoreMlcPage,
  setStoreMlcPageStatus,
  ensureMlcPublicKey,
  getMlcQr,
} = createStoreMlcClient({ getApiBase, authFetch });
