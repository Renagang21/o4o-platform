import type { StoreExecutionAsset, AssetType } from "../../../api/storeExecutionAssets";
import type { AssetSnapshotItem } from "../../../api/assetSnapshot";
import { stripHtml, blocksToText } from "../../../utils/ai-clipboard";

// WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: 두 source(library / snapshot) 통합 표시용
export type SourceKind = 'library' | 'snapshot';

export interface UnifiedResourceRow extends Pick<StoreExecutionAsset,
  'title' | 'description' | 'assetType' | 'category' | 'createdAt' | 'updatedAt' | 'fileSize' | 'mimeType'> {
  id: string;
  rawId: string;
  kind: SourceKind;
  bodyText: string | null;
  href: string | null;
  sourceFileName: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
}

type ResourceDetails = Partial<Omit<UnifiedResourceRow, 'id' | 'rawId' | 'kind' | 'title' | 'createdAt'>>;
/** A resource keeps its source identity; nullable display metadata has one default contract. */
function resourceRow(kind: SourceKind, rawId: string, title: string, createdAt: string, details: ResourceDetails): UnifiedResourceRow {
  return { description: null, bodyText: null, assetType: 'content', category: null,
    href: null, sourceFileName: null, fileSize: null, mimeType: null, thumbnailUrl: null, authorName: null,
    updatedAt: createdAt, ...details, id: `${kind === 'library' ? 'lib' : 'snap'}:${rawId}`, rawId, kind, title, createdAt };
}

// WO-O4O-STORE-LIBRARY-RESOURCE-SNAPSHOT-CONTENT-COPY-FIX-V1
// snapshot.contentJson 또는 library.htmlContent 에서 본문 plain text 추출.
// 우선순위: contentJson.body(HTML) → contentJson.content(HTML) → contentJson.blocks(배열) → null
// 본문은 가져가기 시점의 snapshot 값이며 원본 자료와 독립적이다.
function deriveBodyText(source: Record<string, unknown> | null | undefined): string | null {
  if (!source) return null;
  for (const candidate of [source.body, source.content]) {
    if (typeof candidate !== 'string' || !candidate.trim()) continue;
    const text = stripHtml(candidate);
    if (text) return text;
  }
  const blocks = source.blocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    const t = blocksToText(blocks).trim();
    if (t) return t;
  }
  return null;
}

export function libraryToUnified(asset: StoreExecutionAsset): UnifiedResourceRow {
  let href: string | null = null;
  if (asset.assetType === 'file') href = asset.fileUrl;
  if (asset.assetType === 'external-link') href = asset.url;
  return resourceRow('library', asset.id, asset.title, asset.createdAt, {
    description: asset.description, bodyText: asset.htmlContent ? stripHtml(asset.htmlContent) || null : null,
    assetType: asset.assetType, category: asset.category, updatedAt: asset.updatedAt, href,
    sourceFileName: asset.fileName, fileSize: asset.fileSize, mimeType: asset.mimeType,
  });
}

export function snapshotToUnified(snapshot: AssetSnapshotItem): UnifiedResourceRow {
  // Only display strings from the copied snapshot; malformed metadata cannot become a URL or label.
  const content = snapshot.contentJson as Record<string, unknown> | undefined;
  const text = (key: string): string | null => typeof content?.[key] === 'string' ? content[key] as string : null;
  const sourceType = text('sourceType');
  const resourceTypes = new Map<string, AssetType>([['external', 'external-link'], ['upload', 'file']]);
  return resourceRow('snapshot', snapshot.id, snapshot.title, snapshot.createdAt, {
    description: text('summary') ?? text('description'), bodyText: deriveBodyText(content),
    assetType: resourceTypes.get(sourceType ?? '') ?? 'content', category: text('category'),
    href: text('sourceUrl'), sourceFileName: text('sourceFileName'),
    thumbnailUrl: text('thumbnailUrl'), authorName: text('authorName'),
  });
}
