import type { StoreExecutionAsset, AssetType } from "../../../api/storeExecutionAssets";
import type { AssetSnapshotItem } from "../../../api/assetSnapshot";
import { stripHtml, blocksToText } from "../../../utils/ai-clipboard";

// WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: 두 source(library / snapshot) 통합 표시용
export type SourceKind = 'library' | 'snapshot';

export interface UnifiedResourceRow {
  id: string;                          // library: 'lib:<id>', snapshot: 'snap:<id>'
  rawId: string;                       // 원본 id (삭제 시 사용)
  kind: SourceKind;
  title: string;
  description: string | null;          // 짧은 요약/메모 (summary)
  bodyText: string | null;             // 본문 plain text — snapshot.contentJson.body|content|blocks 또는 library.htmlContent 에서 도출
  assetType: AssetType;                // 표시용 (snapshot 도 file/content/external-link 로 매핑)
  category: string | null;
  createdAt: string;
  updatedAt: string;
  href: string | null;
  sourceFileName: string | null;
  fileSize: number | null;
  mimeType: string | null;
  thumbnailUrl: string | null;
  authorName: string | null;
}

// WO-O4O-STORE-LIBRARY-RESOURCE-SNAPSHOT-CONTENT-COPY-FIX-V1
// snapshot.contentJson 또는 library.htmlContent 에서 본문 plain text 추출.
// 우선순위: contentJson.body(HTML) → contentJson.content(HTML) → contentJson.blocks(배열) → null
// 본문은 가져가기 시점의 snapshot 값이며 원본 자료와 독립적이다.
function deriveBodyText(source: Record<string, unknown> | null | undefined): string | null {
  if (!source) return null;
  const body = source.body;
  if (typeof body === 'string' && body.trim()) {
    const t = stripHtml(body);
    if (t) return t;
  }
  const content = source.content;
  if (typeof content === 'string' && content.trim()) {
    const t = stripHtml(content);
    if (t) return t;
  }
  const blocks = source.blocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    const t = blocksToText(blocks).trim();
    if (t) return t;
  }
  return null;
}

export function libraryToUnified(it: StoreExecutionAsset): UnifiedResourceRow {
  return {
    id: `lib:${it.id}`,
    rawId: it.id,
    kind: 'library',
    title: it.title,
    description: it.description,
    bodyText: it.htmlContent ? stripHtml(it.htmlContent) || null : null,
    assetType: it.assetType,
    category: it.category,
    createdAt: it.createdAt,
    updatedAt: it.updatedAt,
    href: it.assetType === 'file' ? it.fileUrl : it.assetType === 'external-link' ? it.url : null,
    sourceFileName: it.fileName,
    fileSize: it.fileSize,
    mimeType: it.mimeType,
    thumbnailUrl: null,
    authorName: null,
  };
}

export function snapshotToUnified(snap: AssetSnapshotItem): UnifiedResourceRow {
  // contentJson 은 KpaAssetResolver.resolveResource() 가 채운 snapshot (가져가기 시점 복사).
  // 원본 자료가 이후 수정/삭제되어도 snapshot 은 유지된다.
  const cj = snap.contentJson as Record<string, unknown> | undefined;
  const sourceUrl = (cj?.sourceUrl as string | null | undefined) ?? null;
  const sourceFileName = (cj?.sourceFileName as string | null | undefined) ?? null;
  const summary = (cj?.summary as string | null | undefined) ?? null;
  const description = (cj?.description as string | null | undefined) ?? null;
  const category = (cj?.category as string | null | undefined) ?? null;
  const sourceType = (cj?.sourceType as string | null | undefined) ?? null;
  const thumbnailUrl = (cj?.thumbnailUrl as string | null | undefined) ?? null;
  const authorName = (cj?.authorName as string | null | undefined) ?? null;

  // resource 의 source_type(upload/external/manual) → assetType(file/external-link/content) 매핑
  const assetType: AssetType =
    sourceType === 'external' ? 'external-link'
    : sourceType === 'upload' ? 'file'
    : 'content';

  return {
    id: `snap:${snap.id}`,
    rawId: snap.id,
    kind: 'snapshot',
    title: snap.title,
    // 메모: summary 우선, 없으면 description fallback
    description: summary ?? description ?? null,
    bodyText: deriveBodyText(cj),
    assetType,
    category,
    createdAt: snap.createdAt,
    updatedAt: snap.createdAt,
    href: sourceUrl,
    sourceFileName,
    fileSize: null,
    mimeType: null,
    thumbnailUrl,
    authorName,
  };
}
