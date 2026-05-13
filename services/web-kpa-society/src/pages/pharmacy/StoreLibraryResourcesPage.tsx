/**
 * StoreLibraryResourcesPage — 내 자료함 / 자료
 *
 * WO-O4O-STORE-LIBRARY-RESOURCE-SCREEN-CORRECTION-V1:
 *   - "제작" 개념 제거. 본 화면은 콘텐츠를 만들 때 참고할 원소스 자료 보관/관리 전용.
 *   - 콘텐츠 생성 / AI 생성 / 편집기 진입 / POP·QR·블로그·상품 상세설명 제작 진입점 없음.
 *
 * WO-O4O-STORE-LIBRARY-RESOURCE-DETAIL-DRAWER-V1:
 *   - 자료 제목 클릭 시 우측 Drawer 로 원소스 자료 상세를 조회 (편집/AI/제작 진입 없음).
 *
 * 매장이 보유한 자료(직접 업로드 + 커뮤니티 자료실 가져옴) 통합 목록.
 *   - 직접 업로드: store_execution_assets (GET /store/assets)
 *   - 커뮤니티 가져옴: o4o_asset_snapshots WHERE asset_type='resource' (GET /assets?type=resource)
 *
 * 삭제 정책:
 *   - 직접 업로드 항목: hard delete (DELETE /store/assets/:id)
 *   - 가져온 snapshot 항목: hard delete (DELETE /assets/:id) — 원본 자료 영향 없음
 */

import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { Library, ExternalLink, Trash2, RefreshCw, FileDown, Link as LinkIcon, FileText, Download, X, Plus } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  getStoreExecutionAssets,
  deleteStoreExecutionAsset,
  type StoreExecutionAsset,
  type AssetType,
} from '../../api/storeExecutionAssets';
import { assetSnapshotApi, type AssetSnapshotItem } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';
import { stripHtml, blocksToText } from '../../utils/ai-clipboard';
import { RegisterStoreResourceModal } from './RegisterStoreResourceModal';

const PAGE_LIMIT = 50;

const ASSET_TYPE_LABEL: Record<AssetType, { label: string; bg: string; color: string; Icon: typeof FileText }> = {
  file:            { label: '파일',     bg: '#EFF6FF', color: '#2563EB', Icon: FileDown },
  content:         { label: '콘텐츠',   bg: '#DCFCE7', color: '#16A34A', Icon: FileText },
  'external-link': { label: '외부 링크', bg: '#FEF3C7', color: '#D97706', Icon: LinkIcon },
};

// WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: 두 source(library / snapshot) 통합 표시용
type SourceKind = 'library' | 'snapshot';

interface UnifiedResourceRow {
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

function libraryToUnified(it: StoreExecutionAsset): UnifiedResourceRow {
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

function snapshotToUnified(snap: AssetSnapshotItem): UnifiedResourceRow {
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

// 자료 유형(PDF / 파일 / URL / 이미지 / 기타) 도출
function deriveResourceKindLabel(row: UnifiedResourceRow): string {
  const fileName = row.sourceFileName?.toLowerCase() ?? '';
  const mime = row.mimeType?.toLowerCase() ?? '';

  if (row.assetType === 'external-link') return 'URL';

  const isPdf = mime === 'application/pdf' || fileName.endsWith('.pdf');
  if (isPdf) return 'PDF';

  const isImage =
    mime.startsWith('image/') ||
    /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(fileName);
  if (isImage) return '이미지';

  if (row.assetType === 'file') return '파일';
  if (row.assetType === 'content') return '콘텐츠';
  return '기타';
}

function formatFileSize(bytes: number | null): string | null {
  if (bytes == null || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

function isImageResource(row: UnifiedResourceRow): boolean {
  const mime = row.mimeType?.toLowerCase() ?? '';
  const fileName = row.sourceFileName?.toLowerCase() ?? '';
  return mime.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg|bmp)$/.test(fileName);
}

export default function StoreLibraryResourcesPage() {
  const [items, setItems] = useState<UnifiedResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // 두 source 병렬 조회. 한쪽 실패해도 가능한 항목은 표시 (graceful degradation).
      const [libRes, snapRes] = await Promise.allSettled([
        getStoreExecutionAssets({ page: 1, limit: PAGE_LIMIT }),
        assetSnapshotApi.list({ type: 'resource', page: 1, limit: PAGE_LIMIT }),
      ]);

      const libraryRows = libRes.status === 'fulfilled'
        ? (libRes.value.data?.items ?? []).map(libraryToUnified)
        : [];
      const snapshotRows = snapRes.status === 'fulfilled'
        ? (snapRes.value.data?.items ?? []).map(snapshotToUnified)
        : [];

      // updatedAt 기준 내림차순 merge
      const merged = [...libraryRows, ...snapshotRows].sort((a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );
      setItems(merged);
      setSelected(new Set());

      if (libRes.status === 'rejected' && snapRes.status === 'rejected') {
        toast.error('불러오는 데 실패했습니다');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  // 직접 업로드(library) 항목만 삭제 가능. snapshot 삭제는 후속 WO 후보.
  const handleDelete = async (row: UnifiedResourceRow) => {
    const confirmMsg = row.kind === 'snapshot'
      ? `"${row.title}" 자료를 내 자료함에서 제거하시겠습니까?\n원본 커뮤니티 자료는 삭제되지 않습니다.`
      : `"${row.title}" 자료를 삭제하시겠습니까?`;
    if (!confirm(confirmMsg)) return;
    setDeletingId(row.id);
    try {
      if (row.kind === 'snapshot') {
        await assetSnapshotApi.remove(row.rawId);
      } else {
        await deleteStoreExecutionAsset(row.rawId);
      }
      setItems((prev) => prev.filter((it) => it.id !== row.id));
      setSelected((prev) => {
        const next = new Set(prev);
        next.delete(row.id);
        return next;
      });
      toast.success('삭제되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const allSelected = items.length > 0 && items.every((it) => selected.has(it.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((it) => it.id)));
  };

  // library + snapshot 항목 모두 일괄 삭제 가능.
  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    const selectedRows = items.filter((it) => selected.has(it.id));
    if (selectedRows.length === 0) return;
    const libraryCount = selectedRows.filter((it) => it.kind === 'library').length;
    const snapshotCount = selectedRows.filter((it) => it.kind === 'snapshot').length;
    const parts: string[] = [];
    if (libraryCount > 0) parts.push(`직접 업로드 ${libraryCount}개`);
    if (snapshotCount > 0) parts.push(`가져온 자료 ${snapshotCount}개`);
    const confirmMsg = snapshotCount > 0
      ? `${parts.join(', ')}를 삭제합니다.\n가져온 자료는 내 자료함에서만 제거되며 원본은 유지됩니다.`
      : `선택한 ${libraryCount}개 자료를 삭제하시겠습니까?`;
    if (!confirm(confirmMsg)) return;
    try {
      await Promise.all(selectedRows.map((it) =>
        it.kind === 'snapshot'
          ? assetSnapshotApi.remove(it.rawId)
          : deleteStoreExecutionAsset(it.rawId),
      ));
      const removedIds = new Set(selectedRows.map((it) => it.id));
      setItems((prev) => prev.filter((it) => !removedIds.has(it.id)));
      setSelected((prev) => {
        const next = new Set(prev);
        for (const id of removedIds) next.delete(id);
        return next;
      });
      toast.success(`${selectedRows.length}개 삭제되었습니다`);
    } catch (e: any) {
      toast.error(e?.message || '일괄 삭제에 실패했습니다');
    }
  };

  const visibleItems = useMemo(() => items, [items]);
  const detailRow = useMemo(
    () => (detailId ? items.find((it) => it.id === detailId) ?? null : null),
    [items, detailId],
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>내 자료함</span>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral700 }}>자료</span>
          </div>
          <h1 style={styles.title}>
            <Library size={20} style={{ color: colors.primary }} />
            자료
          </h1>
          <p style={styles.subtitle}>
            콘텐츠를 만들 때 참고할 원소스 자료를 보관합니다.
          </p>
          <p style={styles.subtitle}>
            커뮤니티 자료를 가져오거나 직접 자료를 등록할 수 있습니다.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={() => setRegisterOpen(true)}
            style={styles.registerBtn}
          >
            <Plus size={14} />
            자료 등록
          </button>
          <button onClick={fetchItems} style={styles.refreshBtn} disabled={loading}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* Batch toolbar */}
      {visibleItems.length > 0 && (
        <div style={styles.toolbar}>
          <label style={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              style={styles.checkbox}
            />
            전체 선택 ({selected.size}/{visibleItems.length})
          </label>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={handleBulkDelete}
            disabled={selected.size === 0}
            style={{ ...styles.bulkDeleteBtn, opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            <Trash2 size={14} />
            선택 삭제
          </button>
        </div>
      )}

      {loading ? (
        <div style={styles.empty}>불러오는 중...</div>
      ) : visibleItems.length === 0 ? (
        <div style={styles.empty}>
          <Library size={32} style={{ color: colors.neutral300, marginBottom: 12 }} />
          <p style={{ margin: 0, color: colors.neutral500, fontSize: 14 }}>
            보관된 자료가 없습니다.
          </p>
          <p style={{ margin: '6px 0 0', color: colors.neutral400, fontSize: 12 }}>
            커뮤니티 자료실 또는 공급자 라이브러리에서 자료를 가져와 매장에 보관할 수 있습니다.
          </p>
        </div>
      ) : (
        <ul style={styles.list}>
          {visibleItems.map((item) => {
            const meta = ASSET_TYPE_LABEL[item.assetType] ?? ASSET_TYPE_LABEL.file;
            const isSnapshot = item.kind === 'snapshot';
            return (
              <li key={item.id} style={styles.listItem}>
                <input
                  type="checkbox"
                  checked={selected.has(item.id)}
                  onChange={() => toggleOne(item.id)}
                  style={styles.checkbox}
                  aria-label={`${item.title} 선택`}
                />
                <div style={styles.itemMain}>
                  <meta.Icon size={16} style={{ color: meta.color, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={() => setDetailId(item.id)}
                      style={styles.itemTitleBtn}
                      title="자료 상세 보기"
                    >
                      {item.title}
                    </button>
                    {item.description && (
                      <span style={styles.itemDesc}>{item.description}</span>
                    )}
                  </div>
                  <span style={{ ...styles.badge, background: meta.bg, color: meta.color }}>{meta.label}</span>
                  {/* WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: source 구분 badge */}
                  <span
                    style={{
                      ...styles.badge,
                      background: isSnapshot ? '#EEF2FF' : '#F5F3FF',
                      color: isSnapshot ? '#4338CA' : '#6D28D9',
                    }}
                    title={isSnapshot ? '커뮤니티 자료실에서 가져온 자료' : '직접 업로드한 자료'}
                  >
                    {isSnapshot ? <Download size={11} style={{ marginRight: 3 }} /> : null}
                    {isSnapshot ? '커뮤니티 가져옴' : '직접 등록'}
                  </span>
                  {item.category && (
                    <span style={{ ...styles.badge, background: colors.neutral100, color: colors.neutral600 }}>
                      {item.category}
                    </span>
                  )}
                </div>
                <div style={styles.itemMeta}>
                  <span style={styles.metaText}>
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : ''}
                  </span>
                  {item.href && (
                    <a
                      href={item.href}
                      target="_blank"
                      rel="noreferrer"
                      style={styles.openLink}
                      title="원본 열기"
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                  <button
                    onClick={() => handleDelete(item)}
                    disabled={deletingId === item.id}
                    style={styles.deleteBtn}
                    title={item.kind === 'snapshot' ? '내 자료함에서 제거' : '삭제'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {detailRow && (
        <ResourceDetailDrawer row={detailRow} onClose={() => setDetailId(null)} />
      )}

      <RegisterStoreResourceModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={fetchItems}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────
// Drawer — 원소스 자료 상세 (조회 전용)
// ─────────────────────────────────────────────────────

function ResourceDetailDrawer({ row, onClose }: { row: UnifiedResourceRow; onClose: () => void }) {
  const kindLabel = deriveResourceKindLabel(row);
  const originLabel = row.kind === 'snapshot' ? '커뮤니티 가져옴' : '직접 등록';
  const sizeLabel = formatFileSize(row.fileSize);
  const showImagePreview = isImageResource(row) && !!row.href;

  return (
    <>
      <div style={drawerStyles.backdrop} onClick={onClose} aria-hidden="true" />
      <aside style={drawerStyles.panel} role="dialog" aria-label="자료 상세">
        <header style={drawerStyles.header}>
          <h2 style={drawerStyles.headerTitle}>자료 상세</h2>
          <button type="button" onClick={onClose} style={drawerStyles.closeBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <div style={drawerStyles.body}>
          <h3 style={drawerStyles.title}>{row.title}</h3>

          <dl style={drawerStyles.metaList}>
            <DetailField label="자료 유형" value={kindLabel} />
            <DetailField label="출처" value={originLabel} />
            {row.category && <DetailField label="분류" value={row.category} />}
            {row.authorName && <DetailField label="작성자" value={row.authorName} />}
            <DetailField
              label="등록일"
              value={row.createdAt ? new Date(row.createdAt).toLocaleString('ko-KR') : '—'}
            />
          </dl>

          {row.description && (
            <section style={drawerStyles.section}>
              <h4 style={drawerStyles.sectionLabel}>설명 / 메모</h4>
              <p style={drawerStyles.descriptionText}>{row.description}</p>
            </section>
          )}

          {row.bodyText && (
            <section style={drawerStyles.section}>
              <h4 style={drawerStyles.sectionLabel}>본문</h4>
              <p style={drawerStyles.descriptionText}>{row.bodyText}</p>
            </section>
          )}

          {showImagePreview && row.href && (
            <section style={drawerStyles.section}>
              <h4 style={drawerStyles.sectionLabel}>미리보기</h4>
              <img src={row.href} alt={row.title} style={drawerStyles.imagePreview} />
            </section>
          )}

          {(row.sourceFileName || sizeLabel) && (
            <section style={drawerStyles.section}>
              <h4 style={drawerStyles.sectionLabel}>파일 정보</h4>
              <dl style={drawerStyles.metaList}>
                {row.sourceFileName && <DetailField label="파일명" value={row.sourceFileName} />}
                {sizeLabel && <DetailField label="파일 크기" value={sizeLabel} />}
                {row.mimeType && <DetailField label="형식" value={row.mimeType} />}
              </dl>
            </section>
          )}

          {row.href && (
            <section style={drawerStyles.section}>
              <h4 style={drawerStyles.sectionLabel}>
                {row.assetType === 'external-link' ? '원본 URL' : '파일 링크'}
              </h4>
              <a
                href={row.href}
                target="_blank"
                rel="noreferrer"
                style={drawerStyles.linkBox}
                title={row.href}
              >
                <ExternalLink size={14} style={{ flexShrink: 0 }} />
                <span style={drawerStyles.linkText}>{row.href}</span>
              </a>
            </section>
          )}
        </div>
      </aside>
    </>
  );
}

function DetailField({ label, value }: { label: string; value: string }) {
  return (
    <div style={drawerStyles.metaRow}>
      <dt style={drawerStyles.metaLabel}>{label}</dt>
      <dd style={drawerStyles.metaValue}>{value}</dd>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: '16px',
    marginBottom: '24px',
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: colors.neutral400,
    marginBottom: '6px',
  },
  title: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '20px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  subtitle: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: '6px 0 0',
  },
  headerActions: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  registerBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.primary,
    border: `1px solid ${colors.primary}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
  refreshBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    marginBottom: '12px',
  },
  selectAllLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  bulkDeleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  list: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: '10px',
    padding: '12px 14px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
  },
  itemMain: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flex: 1,
    minWidth: 0,
  },
  itemTitleBtn: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
    background: 'transparent',
    border: 'none',
    padding: 0,
    margin: 0,
    textAlign: 'left',
    cursor: 'pointer',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  itemDesc: {
    fontSize: '12px',
    color: colors.neutral500,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  badge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 6px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '4px',
    flexShrink: 0,
  },
  itemMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  metaText: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  openLink: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    color: colors.neutral500,
    borderRadius: '4px',
    textDecoration: 'none',
  },
  deleteBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    background: 'transparent',
    border: 'none',
    color: colors.neutral400,
    cursor: 'pointer',
    borderRadius: '4px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '64px 24px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    textAlign: 'center',
  },
};

const drawerStyles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.32)',
    zIndex: 90,
  },
  panel: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    width: 'min(460px, 100%)',
    background: colors.white,
    boxShadow: '-8px 0 24px rgba(15, 23, 42, 0.12)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 100,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    borderBottom: `1px solid ${colors.neutral200}`,
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
  },
  closeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: 'transparent',
    border: 'none',
    color: colors.neutral500,
    cursor: 'pointer',
    borderRadius: '6px',
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '18px 18px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  title: {
    fontSize: '17px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: 0,
    wordBreak: 'break-word',
  },
  metaList: {
    margin: 0,
    padding: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  metaRow: {
    display: 'grid',
    gridTemplateColumns: '88px 1fr',
    alignItems: 'baseline',
    gap: '10px',
    margin: 0,
  },
  metaLabel: {
    fontSize: '12px',
    color: colors.neutral500,
    margin: 0,
  },
  metaValue: {
    fontSize: '13px',
    color: colors.neutral800,
    margin: 0,
    wordBreak: 'break-word',
  },
  section: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  sectionLabel: {
    fontSize: '12px',
    fontWeight: 600,
    color: colors.neutral600,
    margin: 0,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
  },
  descriptionText: {
    fontSize: '13px',
    color: colors.neutral700,
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    lineHeight: 1.55,
  },
  imagePreview: {
    width: '100%',
    maxHeight: '320px',
    objectFit: 'contain',
    borderRadius: '6px',
    border: `1px solid ${colors.neutral200}`,
    background: colors.neutral50,
  },
  linkBox: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
    color: colors.primary,
    fontSize: '12px',
    textDecoration: 'none',
    wordBreak: 'break-all',
  },
  linkText: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
};
