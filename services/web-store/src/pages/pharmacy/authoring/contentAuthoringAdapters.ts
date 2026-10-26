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

export type VerifiedDirectContent = DirectContentItem & { verification?: boolean };
export interface TextContentDraft {
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
export interface CreatedContent {
  verification?: boolean;
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
  return { ...response.data, ...(draft.consultation ? { verification: await verifyConsultation(response.data.id, draft) } : {}) };
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
        // Unknown legacy categories remain untouched; a cleared known chip is explicit.
        ...(draft.category === null && PRODUCTION_TARGET_CATALOG.some(item => item.key === record.category)
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
      ...(draft.consultation ? { verification: await verifyConsultation(response.data.id, { ...draft, html: draft.html.trim() }) } : {}) };
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
    ...(draft.consultation ? { verification: await verifyConsultation(response.data.id, { ...draft, html: draft.html.trim() }) } : {}) };
}

/** Keep the saved id even if readback fails: retry updates that row rather than creating another. */
async function verifyConsultation(id: string, draft: TextContentDraft): Promise<boolean> {
  const context = draft.consultation;
  if (!context) return false;
  try {
    const [saved, linked] = await Promise.all([
      loadDirect(id), handledProductContentApi.byProduct(context.product.sourceType, context.product.sourceId),
    ]);
    return saved.title === draft.title.trim() && saved.contentJson.html === draft.html &&
      JSON.stringify(readProductConsultation(saved.contentJson.productConsultation)) === JSON.stringify(context) &&
      linked.success === true && Array.isArray(linked.data?.items) && linked.data.items.some(item => item.contentId === id);
  } catch { return false; }
}
