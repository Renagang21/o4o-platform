import { sanitizeRichHtml } from '@o4o/content-editor';
import { readProductConsultation, type ProductConsultationDraft } from '../../../components/product-description/productConsultationDraft';
import { apiClient } from "../../../api/client";
import {
  directContentApi,
  handledProductContentApi,
  storeContentApi,
  type DirectContentItem,
  type StoreContentData,
} from "../../../api/assetSnapshot";
import {
  createStoreExecutionAsset,
  getStoreExecutionAsset,
  updateStoreExecutionAsset,
  type StoreExecutionAsset,
} from "../../../api/storeExecutionAssets";
import {
  DEFAULT_USAGE,
  directContentJsonToHtml,
  parseSnapshotContentJson,
  snapshotContentJsonToHtml,
  type UsageSettings,
} from "./contentAuthoringModels";
import {
  PRODUCTION_TARGET_CATALOG,
  type ProductionTarget,
} from "../productionTargets";

export type VerifiedDirectContent = DirectContentItem & { verification?: boolean; conflict?: boolean };
export interface TextContentDraft {
  clientContentId?: string;
  confirmedRevision?: string;
  consultation?: ProductConsultationDraft;
  title: string;
  html: string;
  tags: string[];
}
export interface SnapshotDraft {
  title: string;
  html: string;
  usage: UsageSettings;
}
export interface MaterialDraft {
  title: string;
  html: string;
  category: ProductionTarget | null;
  description?: string;
}
export interface CreatedContent extends Partial<DirectContentItem> {
  verification?: boolean;
  conflict?: boolean;
  id: string;
  contentJson: Record<string, unknown>;
}
export interface ContentProductReference {
  sourceType: "listing" | "local";
  sourceId: string;
}

export const emptyTextDraft: TextContentDraft = {
  title: "",
  html: "",
  tags: [],
};
export const emptySnapshotDraft: SnapshotDraft = {
  title: "",
  html: "",
  usage: DEFAULT_USAGE,
};
export const textDraftFromRecord = (
  record: DirectContentItem,
): TextContentDraft => ({
  title: record.title,
  html: directContentJsonToHtml(record.contentJson),
  tags: Array.isArray(record.tags) ? record.tags : [],
  consultation: readProductConsultation(record.contentJson.productConsultation),
});
export const snapshotDraftFromRecord = (
  record: StoreContentData,
): SnapshotDraft => ({
  title: record.title,
  html: snapshotContentJsonToHtml(record.contentJson),
  usage: parseSnapshotContentJson(record.contentJson).usage,
});
export const materialDraftFromRecord = (
  record: StoreExecutionAsset,
): MaterialDraft => ({
  title: record.title,
  html: record.htmlContent ?? "",
  category:
    PRODUCTION_TARGET_CATALOG.find((item) => item.key === record.category)
      ?.key ?? null,
});
export function validateNewContent(draft: {
  title: string;
  html: string;
}): string | null {
  if (!draft.title.trim()) return "제목을 입력해 주세요.";
  if (!draft.html.trim() || draft.html.trim() === "<p></p>")
    return "본문을 직접 작성하거나 붙여넣어 주세요.";
  return null;
}

export async function loadSnapshot(
  id: string,
  organizationId: string,
): Promise<StoreContentData> {
  const response = await storeContentApi.get(id);
  if (
    response.success !== true ||
    !response.data ||
    response.data.organizationId !== organizationId ||
    response.data.snapshotId !== id
  )
    throw new Error("Unconfirmed snapshot");
  return response.data;
}
export async function saveSnapshot(
  id: string,
  draft: SnapshotDraft,
  record: StoreContentData | null,
): Promise<StoreContentData> {
  if (!record) throw new Error("Snapshot not loaded");
  const contentJson = {
    ...record.contentJson,
    body: draft.html,
    blocks: [],
    usage: draft.usage,
  };
  const response = await storeContentApi.save(id, {
    title: draft.title,
    contentJson,
  });
  if (
    response.success !== true ||
    !response.data ||
    response.data.snapshotId !== id ||
    response.data.organizationId !== record.organizationId
  )
    throw new Error("Snapshot not saved");
  return response.data;
}
export async function loadDirect(id: string): Promise<VerifiedDirectContent> {
  const response = await directContentApi.get(id);
  if (response.success !== true || !response.data || response.data.id !== id)
    throw new Error("Unconfirmed direct content");
  return response.data;
}
export async function saveDirect(
  id: string,
  draft: TextContentDraft,
  record: DirectContentItem | null,
): Promise<VerifiedDirectContent> {
  if (!record) throw new Error("Content not loaded");
  if (draft.consultation) return persistConsultation(draft, record);
  const contentJson: Record<string, unknown> = {
    ...record.contentJson,
    html: draft.html,
    ...(draft.consultation ? { productConsultation: draft.consultation } : {}),
  };
  delete contentJson.blocks;
  const response = await directContentApi.update(id, {
    title: draft.title,
    contentJson,
    tags: draft.tags,
  });
  if (response.success !== true || !response.data || response.data.id !== id)
    throw new Error("Content not saved");
  return response.data;
}
export async function removeDirect(record: DirectContentItem): Promise<void> {
  const response = await directContentApi.remove(record.id);
  if (
    response.success !== true ||
    response.data?.deleted !== true ||
    response.data.id !== record.id
  )
    throw new Error("Content not deleted");
}
export async function loadMaterial(
  id: string,
  organizationId: string,
): Promise<StoreExecutionAsset> {
  const response = await getStoreExecutionAsset(id);
  if (
    response.success !== true ||
    !response.data ||
    response.data.id !== id ||
    response.data.assetType !== "content" ||
    response.data.organizationId !== organizationId
  )
    throw new Error("Unconfirmed content asset");
  return response.data;
}
export async function saveMaterial(
  draft: MaterialDraft,
  record: StoreExecutionAsset | null,
  organizationId: string,
): Promise<StoreExecutionAsset> {
  const payload = {
    title: draft.title.trim(),
    htmlContent: draft.html,
    ...(draft.category ? { category: draft.category } : {}),
  };
  const response = record
    ? await updateStoreExecutionAsset(record.id, {
        ...payload,
        // Retired blog materials still support clearing their known category; unrelated legacy values stay untouched.
        ...(draft.category === null && (record.category === "blog" || PRODUCTION_TARGET_CATALOG.some(item => item.key === record.category))
          ? { category: null } : {}),
      })
    : await createStoreExecutionAsset({
        ...payload,
        assetType: "content",
        sourceType: "generated",
        description: draft.description,
      });
  if (
    response.success !== true ||
    !response.data?.id ||
    response.data.assetType !== "content" ||
    response.data.organizationId !== organizationId ||
    (record && response.data.id !== record.id)
  )
    throw new Error("Asset not saved");
  return response.data;
}
export async function createOrUpdateDirect(
  draft: TextContentDraft,
  record: CreatedContent | null,
  product?: ContentProductReference | null,
): Promise<CreatedContent> {
  if (draft.consultation) return persistConsultation({ ...draft, html: draft.html.trim() }, record);
  const contentJson = {
    ...(record?.contentJson ?? {
      sourceResources: [],
      generatedBy: "manual-direct",
    }),
    html: draft.html.trim(),
    ...(draft.consultation ? { productConsultation: draft.consultation } : {}),
  };
  if (record) {
    const response = await directContentApi.update(record.id, {
      title: draft.title.trim(),
      tags: draft.tags,
      contentJson,
    });
    if (
      response.success !== true ||
      !response.data ||
      response.data.id !== record.id
    )
      throw new Error("Content not saved");
    return { id: response.data.id, contentJson: response.data.contentJson,
       };
  }
  const response = await apiClient.post<{
    success: boolean;
    data: { id: string; contentJson?: Record<string, unknown> };
  }>("/store-contents", {
    title: draft.title.trim(),
    tags: draft.tags,
    contentJson,
    ...(product
      ? {
          productRef: {
            sourceType: product.sourceType,
            sourceId: product.sourceId,
          },
        }
      : {}),
  });
  if (response.success !== true || !response.data?.id)
    throw new Error("Content not created");
  return { id: response.data.id, contentJson: response.data.contentJson ?? contentJson,
     };
}

const normalizeConsultationHtml = (html: string) => sanitizeRichHtml(html).trim();

/** The client id survives a lost POST response; the server commits body/link atomically. */
async function persistConsultation(draft: TextContentDraft, record: CreatedContent | null): Promise<VerifiedDirectContent> {
  const id = record?.id ?? draft.clientContentId;
  if (!id) throw new Error('Missing stable draft id');
  if (record?.conflict && (!record.revision || draft.confirmedRevision !== record.revision)) return {
    ...record, id, title: record.title ?? draft.title, sourceType: 'direct', updatedAt: record.updatedAt ?? '',
    updatedBy: record.updatedBy ?? null, conflict: true, verification: false,
  };
  const result = await sendConsultation(draft, record, id);
  if (result.conflict) return result;
  return verifySavedConsultation(draft, id, result);
}

async function sendConsultation(draft: TextContentDraft, record: CreatedContent | null, id: string): Promise<VerifiedDirectContent> {
  const context = draft.consultation!;
  const contentJson = { ...(record?.contentJson ?? { sourceResources: [], generatedBy: 'manual-direct' }),
    html: normalizeConsultationHtml(draft.html), productConsultation: context };
  delete (contentJson as Record<string, unknown>).blocks;
  try {
    const response = record
      ? await directContentApi.update(id, { title: draft.title.trim(), tags: draft.tags, contentJson,
        expectedRevision: record.conflict ? draft.confirmedRevision : record.revision })
      : await apiClient.post<{ success: boolean; data: DirectContentItem }>('/store-contents', {
        title: draft.title.trim(), tags: draft.tags, contentJson, clientContentId: id,
        productRef: { sourceType: context.product.sourceType, sourceId: context.product.sourceId },
      });
    if (response.success !== true || response.data?.id !== id) throw new Error('Unconfirmed write');
    return response.data;
  } catch (error) {
    // A conflict or lost response may have a readable saved row. Never retry under a new id.
    const { status, code } = error as { status?: number; code?: string };
    if (code === 'PRODUCT_LINK_CHANGED') throw error;
    if (status && status < 500 && ![408, 409].includes(status)) throw error;
    let result: VerifiedDirectContent;
    try { result = await loadDirect(id); } catch { throw error; }
    return { ...result, conflict: status === 409, verification: false };
  }
}

async function verifySavedConsultation(draft: TextContentDraft, id: string, result: VerifiedDirectContent): Promise<VerifiedDirectContent> {
  const context = draft.consultation!;
  try {
    const [saved, linked] = await Promise.all([loadDirect(id), handledProductContentApi.byProduct(context.product.sourceType, context.product.sourceId)]);
    const same = saved.title === draft.title.trim() && JSON.stringify(saved.tags ?? []) === JSON.stringify(draft.tags) && typeof saved.contentJson.html === 'string' && normalizeConsultationHtml(saved.contentJson.html) === normalizeConsultationHtml(draft.html) &&
      JSON.stringify(readProductConsultation(saved.contentJson.productConsultation)) === JSON.stringify(context);
    const connected = linked.success === true && Array.isArray(linked.data?.items) && linked.data.items.some(item => item.contentId === id);
    return { ...saved, verification: same && connected, conflict: !same };
  } catch { return { ...result, verification: false }; }
}

export function consultationSaveError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    PRODUCT_LINK_CHANGED: '상품 연결이 변경됐습니다. 입력을 보관한 뒤 상품 목록에서 자료를 다시 열어 주세요.',
    INVALID_PRODUCT_REF: '현재 매장의 상품을 확인할 수 없습니다. 상품의 사용 상태와 매장 선택을 확인해 주세요.',
    INVALID_CONSULTATION: '상품·목적·언어·근거 입력을 확인해 주세요. 작성 내용은 유지했습니다.',
    EMPTY_CONSULTATION: '저장할 본문을 입력해 주세요.',
    NOT_FOUND: '자료를 찾을 수 없습니다. 입력을 보관한 뒤 자료함에서 다시 확인해 주세요.',
    CONTENT_CONFLICT: '다른 저장본이 있습니다. 최신 자료를 불러오지 못했으므로 입력을 유지했습니다. 다시 시도해 주세요.',
  };
  const status = (error as { status?: number })?.status;
  if (!code && (status === 401 || status === 403)) return '로그인과 현재 매장 접근 권한을 다시 확인해 주세요. 입력은 유지했습니다.';
  return (code && messages[code]) || '저장하지 못했습니다. 입력 내용을 유지한 채 다시 시도해 주세요.';
}
