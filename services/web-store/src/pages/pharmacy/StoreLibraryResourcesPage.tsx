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
 *
 * WO-O4O-MY-STORE-REMAINING-FEATURE-VIEW-COMMONIZATION-V1 §5-A:
 *   손으로 짜던 breadcrumb·제목·부제·헤더 액션(자료 등록/새로고침)을 공통 StorePageShell 로 이관.
 *   본문(ActionBar + DataTable + Drawer)·삭제 정책·조회 경로는 무변경.
 */

import { STORE_RESOURCES_HEADING } from '../../config/storeLibraryLabels';
import { useState, useMemo, type CSSProperties } from 'react';
import { Library, ExternalLink, Trash2, FileDown, Link as LinkIcon, FileText, Download, X, Plus } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import type { AssetType } from '../../api/storeExecutionAssets';
import { LibraryDialog } from './library/LibraryDialog';
import { useLibraryScope } from './library/useLibraryScope';
import { useLibraryResources } from './library/useLibraryResources';
import type { UnifiedResourceRow } from './library/libraryResources';
import { StorePageShell } from '@o4o/store-ui-core';
import { colors } from '../../styles/theme';
import { StoreLibraryNavigation } from '../../components/StoreLibraryNavigation';
import { RegisterStoreResourceModal } from './RegisterStoreResourceModal';
// WO-O4O-KPA-STORE-LIBRARY-RESOURCES-STANDARD-TABLE-V1: list 영역 표준 테이블
import { DataTable, type Column, ActionBar } from '@o4o/ui';


const ASSET_TYPE_LABEL: Record<AssetType, { label: string; bg: string; color: string; Icon: typeof FileText }> = {
  file:            { label: '파일',     bg: '#EFF6FF', color: '#2563EB', Icon: FileDown },
  content:         { label: '콘텐츠',   bg: '#DCFCE7', color: '#16A34A', Icon: FileText },
  'external-link': { label: '외부 링크', bg: '#FEF3C7', color: '#D97706', Icon: LinkIcon },
};

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
  const { scope } = useLibraryScope();
  return <LibraryResources key={scope} />;
}

function LibraryResources() {
  const { items, loading, deleting, errors, hasMore, reload, loadMore, retryFailed, remove } = useLibraryResources();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [detailId, setDetailId] = useState<string | null>(null);
  const [registerOpen, setRegisterOpen] = useState(false);
  const fetchItems = () => {
    if (deleting) return;
    setSelected(new Set()); setDetailId(null);
    void reload();
  };
  const selectedKeys = new Set(items.filter(row => selected.has(row.id)).map(row => row.id));
  const deleteRows = async (rows: UnifiedResourceRow[]) => {
    const result = await remove(rows);
    if (!result) return;
    setSelected(prev => new Set([...prev].filter(id => !result.removed.has(id))));
    if (result.failed) toast.error(`${result.removed.size}개 삭제, ${result.failed}개 실패했습니다. 실패한 자료를 다시 시도해 주세요.`);
    else toast.success(`${result.removed.size}개 삭제되었습니다`);
  };
  const handleDelete = async (row: UnifiedResourceRow) => {
    if (loading || deleting) return;
    const message = row.kind === 'snapshot'
      ? `"${row.title}" 자료를 내 자료함에서 제거하시겠습니까?\n원본 커뮤니티 자료는 삭제되지 않습니다.`
      : `"${row.title}" 자료를 삭제하시겠습니까?`;
    if (confirm(message)) await deleteRows([row]);
  };
  const handleBulkDelete = async () => {
    if (loading || deleting) return;
    const rows = items.filter(row => selectedKeys.has(row.id));
    if (!rows.length) return;
    if (confirm(`선택한 ${rows.length}개 자료를 삭제하시겠습니까?\n가져온 자료는 내 자료함에서만 제거되며 원본은 유지됩니다.`)) await deleteRows(rows);
  };

  const visibleItems = useMemo(() => items, [items]);
  const detailRow = useMemo(
    () => (detailId ? items.find((it) => it.id === detailId) ?? null : null),
    [items, detailId],
  );

  return (
    <StorePageShell
      labels={{
        ...STORE_RESOURCES_HEADING,
        subtitle: (
          <>
            콘텐츠를 만들 때 참고할 원소스 자료를 보관합니다.
            <br />
            커뮤니티 자료를 가져오거나 직접 자료를 등록할 수 있습니다.
          </>
        ),
      }}
      Icon={Library}
      iconColor={colors.primary}
      maxWidth={1100}
      onReload={fetchItems}
      headerActions={
        <button type="button" onClick={() => setRegisterOpen(true)} style={styles.registerBtn}>
          <Plus size={14} />
          자료 등록
        </button>
      }
    >
      {/* WO-O4O-KPA-STORE-LIBRARY-RESOURCES-STANDARD-TABLE-V1: ActionBar — 선택 일괄 삭제 */}
      <div style={{ marginBottom: '12px' }}>
        <ActionBar
          selectedCount={selectedKeys.size}
          onClearSelection={() => setSelected(new Set())}
          actions={[
            {
              key: 'bulk-delete',
              label: `선택 삭제 (${selectedKeys.size})`,
              onClick: handleBulkDelete,
              variant: 'danger' as const,
              icon: <Trash2 className="w-3.5 h-3.5" />,
              group: 'actions',
              visible: selectedKeys.size > 0,
              disabled: loading || deleting,
              tooltip: '선택한 자료를 일괄 삭제합니다 (가져온 자료는 내 자료함에서만 제거)',
            },
          ]}
        />
      </div>

      {/* WO-O4O-KPA-STORE-LIBRARY-RESOURCES-STANDARD-TABLE-V1: 카드 list → @o4o/ui DataTable */}
      <StoreLibraryNavigation section="mine" />
      {errors.length > 0 && <div role="alert" className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm">
        <p>{errors.join(' ')} 현재 불러온 자료만 표시합니다.</p>
        <button type="button" disabled={loading || deleting} onClick={() => void retryFailed()}>실패한 조회 다시 시도</button>
      </div>}
      <DataTable<UnifiedResourceRow>
        rowSelection={{
          selectedRowKeys: Array.from(selectedKeys),
          onChange: (keys) => setSelected(new Set(keys)),
        }}
        columns={[
          {
            key: 'title',
            title: '자료명',
            render: (_v, item) => {
              const meta = ASSET_TYPE_LABEL[item.assetType] ?? ASSET_TYPE_LABEL.file;
              return (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                  <meta.Icon size={16} style={{ color: meta.color, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0, flex: 1 }}>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDetailId(item.id); }}
                      style={styles.itemTitleBtn}
                      title="자료 상세 보기"
                    >
                      {item.title}
                    </button>
                    {item.description && (
                      <span style={styles.itemDesc}>{item.description}</span>
                    )}
                  </div>
                </div>
              );
            },
          },
          {
            key: 'assetType',
            title: '유형',
            align: 'center',
            render: (_v, item) => {
              const meta = ASSET_TYPE_LABEL[item.assetType] ?? ASSET_TYPE_LABEL.file;
              return (
                <span style={{ ...styles.badge, background: meta.bg, color: meta.color }}>
                  {meta.label}
                </span>
              );
            },
          },
          {
            key: 'kind',
            title: '출처',
            align: 'center',
            render: (_v, item) => {
              const isSnapshot = item.kind === 'snapshot';
              return (
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
              );
            },
          },
          {
            key: 'category',
            title: '카테고리',
            render: (_v, item) => (
              item.category ? (
                <span style={{ ...styles.badge, background: colors.neutral100, color: colors.neutral600 }}>
                  {item.category}
                </span>
              ) : (
                <span style={styles.metaText}>-</span>
              )
            ),
          },
          {
            key: 'updatedAt',
            title: '수정일',
            render: (_v, item) => (
              <span style={styles.metaText}>
                {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : ''}
              </span>
            ),
          },
          {
            key: 'actions',
            title: '액션',
            align: 'right',
            render: (_v, item) => (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '6px' }}>
                {item.href && (
                  <a
                    href={item.href}
                    target="_blank"
                    rel="noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    style={styles.openLink}
                    title="원본 열기" aria-label={`${item.title} 원본 열기`}
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); handleDelete(item); }}
                  disabled={loading || deleting}
                  style={styles.deleteBtn}
                  title={item.kind === 'snapshot' ? '내 자료함에서 제거' : '삭제'} aria-label={`${item.title} 삭제`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            ),
          },
        ] as Column<UnifiedResourceRow>[]}
        dataSource={visibleItems}
        rowKey="id"
        loading={loading}
        emptyText={errors.length ? "조회에 실패한 자료가 있습니다. 다시 시도해 주세요." : "보관된 자료가 없습니다. 커뮤니티 자료실 또는 공급자 라이브러리에서 자료를 가져와 매장에 보관할 수 있습니다."}
        onRow={(row) => ({
          onClick: () => setDetailId(row.id),
          style: { cursor: 'pointer' },
        })}
      />


      {hasMore && <button type="button" disabled={loading || deleting} onClick={() => void loadMore()} className="mt-4 rounded border px-4 py-2 text-sm">
        {loading ? '불러오는 중…' : '자료 더 불러오기'}
      </button>}
      {!loading && <output className="mt-3 text-sm text-slate-500">{items.length}개 자료 표시</output>}

      {detailRow && (
        <ResourceDetailDrawer row={detailRow} onClose={() => setDetailId(null)} />
      )}

      <RegisterStoreResourceModal
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onRegistered={fetchItems}
      />
    </StorePageShell>
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
    <LibraryDialog label="자료 상세" onClose={onClose} style={{ margin: '0 0 0 auto', width: 'min(460px, 100%)', maxHeight: '100vh', height: '100vh', borderRadius: 0 }}>
      <div style={{ ...drawerStyles.panel, position: 'static', height: '100%' }}>
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
      </div>
    </LibraryDialog>
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
