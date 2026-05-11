/**
 * StoreLibraryResourcesPage — 내 자료함 / 자료
 *
 * WO-O4O-KPA-STORE-MATERIALS-AND-PRODUCTIONS-CANONICAL-ALIGN-V1
 * WO-O4O-KPA-STORE-PRODUCTION-ENTRY-CANONICAL-CORRECTION-V1: checkbox + 제작 시작 진입
 * WO-O4O-RESOURCES-LIBRARY-IMPORT-FLOW-V1: 커뮤니티 자료실에서 가져온 snapshot 도 함께 표시
 * WO-O4O-RESOURCES-LIBRARY-SNAPSHOT-DELETE-V1: snapshot 항목 삭제 지원 (DELETE /assets/:id)
 *
 * 매장이 보유한 자료(직접 업로드 + 커뮤니티 자료실 가져옴) 통합 목록.
 *   - 직접 업로드: store_library_items (GET /pharmacy/library)
 *   - 커뮤니티 가져옴: o4o_asset_snapshots WHERE asset_type='resource' (GET /assets?type=resource)
 *
 * 본 페이지는 제작 시작 단일 진입점:
 *   자료 선택 → "제작 시작" → modal → 편집기 route 이동
 *
 * 삭제 정책:
 *   - 직접 업로드 항목: hard delete (DELETE /pharmacy/library/:id)
 *   - 가져온 snapshot 항목: hard delete (DELETE /assets/:id) — 원본 자료 영향 없음
 */

import { useEffect, useState, useCallback, useMemo, type CSSProperties } from 'react';
import { Library, ExternalLink, Trash2, RefreshCw, FileDown, Link as LinkIcon, FileText, Sparkles, Download } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import {
  getStoreLibraryItems,
  deleteStoreLibraryItem,
  type StoreLibraryItem,
  type AssetType,
} from '../../api/storeLibrary';
import { assetSnapshotApi, type AssetSnapshotItem } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';
import { StartProductionModal, type ProductionSource } from './StartProductionModal';

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
  rawId: string;                       // 원본 id (삭제/제작 시 사용)
  kind: SourceKind;
  title: string;
  description: string | null;
  assetType: AssetType;                // 표시용 (snapshot 도 file/content/external-link 로 매핑)
  category: string | null;
  updatedAt: string;
  href: string | null;
  sourceFileName: string | null;
  // 제작 modal 진입 시 origin 분기용
  modalOrigin: 'library' | 'snapshot';
}

function libraryToUnified(it: StoreLibraryItem): UnifiedResourceRow {
  return {
    id: `lib:${it.id}`,
    rawId: it.id,
    kind: 'library',
    title: it.title,
    description: it.description,
    assetType: it.assetType,
    category: it.category,
    updatedAt: it.updatedAt,
    href: it.assetType === 'file' ? it.fileUrl : it.assetType === 'external-link' ? it.url : null,
    sourceFileName: it.fileName,
    modalOrigin: 'library',
  };
}

function snapshotToUnified(snap: AssetSnapshotItem): UnifiedResourceRow {
  // contentJson 은 KpaAssetResolver.resolveResource() 가 채운 형태
  const cj = snap.contentJson as Record<string, unknown> | undefined;
  const sourceUrl = (cj?.sourceUrl as string | null | undefined) ?? null;
  const sourceFileName = (cj?.sourceFileName as string | null | undefined) ?? null;
  const summary = (cj?.summary as string | null | undefined) ?? null;
  const category = (cj?.category as string | null | undefined) ?? null;
  const sourceType = (cj?.sourceType as string | null | undefined) ?? null;

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
    description: summary,
    assetType,
    category,
    updatedAt: snap.createdAt,
    href: sourceUrl,
    sourceFileName,
    modalOrigin: 'snapshot',
  };
}

export default function StoreLibraryResourcesPage() {
  const [items, setItems] = useState<UnifiedResourceRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [modalOpen, setModalOpen] = useState(false);
  const [modalSource, setModalSource] = useState<ProductionSource | null>(null);

  const fetchItems = useCallback(async () => {
    setLoading(true);
    try {
      // 두 source 병렬 조회. 한쪽 실패해도 가능한 항목은 표시 (graceful degradation).
      const [libRes, snapRes] = await Promise.allSettled([
        getStoreLibraryItems({ page: 1, limit: PAGE_LIMIT }),
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
        await deleteStoreLibraryItem(row.rawId);
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

  const handleStartProduction = () => {
    if (selected.size === 0) return;
    const sourceItems: ProductionSource['items'] = items
      .filter((it) => selected.has(it.id))
      .map((it) => ({
        id: it.rawId,
        title: it.title,
        description: it.description,
        origin: it.modalOrigin,
      }));
    setModalSource({ fromLibrary: 'resources', items: sourceItems });
    setModalOpen(true);
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
          : deleteStoreLibraryItem(it.rawId),
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
            보유한 자료를 선택하여 POP / QR / 블로그 / 상품 상세설명 제작을 시작합니다.
          </p>
        </div>
        <button onClick={fetchItems} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
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
            onClick={handleStartProduction}
            disabled={selected.size === 0}
            style={{ ...styles.startBtn, opacity: selected.size === 0 ? 0.5 : 1 }}
          >
            <Sparkles size={14} />
            제작 시작
          </button>
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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                    <span style={styles.itemTitle}>{item.title}</span>
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
                    {isSnapshot ? '커뮤니티 가져옴' : '직접 추가'}
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

      <StartProductionModal
        open={modalOpen}
        source={modalSource}
        onClose={() => setModalOpen(false)}
      />
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
  startBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
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
  itemTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
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
