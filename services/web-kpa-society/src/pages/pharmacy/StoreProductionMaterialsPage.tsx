/**
 * StoreProductionMaterialsPage — 내 자료함 / 매장 제작 자료 (결과 저장소)
 *
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-LIBRARY-TAB-V1
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-LIST-SOURCE-ALIGN-V1:
 *   리스트 소스를 AI 저장 위치(store_execution_assets)와 정렬.
 *   fetchAll() 을 병렬 페치로 교체:
 *     - directContentApi.list() → sourceType='direct' 필터 (kpa_store_contents)
 *     - getStoreExecutionAssets(limit=100) → sourceType='generated' 필터 (store_execution_assets)
 *   두 결과를 updatedAt DESC 로 merge. 백엔드 통합 엔드포인트 없음 (클라이언트 머지).
 *   삭제 API: sourceKind에 따라 directContentApi.remove / deleteStoreExecutionAsset 분기.
 * WO-O4O-STORE-PRODUCTION-MATERIALS-FLOW-REALIGN-V1:
 *   본 페이지는 결과 저장소 역할 유지. 제작 시작 흐름은 canonical:
 *     콘텐츠/강의 선택 → StartProductionModal → AI 액션 → AiContentModal → 편집기 → 저장.
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1:
 *   "새 제작 자료 만들기" CTA 는 페이지 이동 대신 SelectContentsForProductionModal 을 연다.
 *   선택 완료 → StartProductionModal → AI 카드 → AiContentModal → ProductionMaterialEditorPage.
 *   selector / production flow / AI modal 모두 canonical 컴포넌트 재사용 — 중복 구현 없음.
 *
 * 데이터 소스 (통합):
 *   directContentApi.list() — kpa_store_contents (sourceType='direct')
 *   getStoreExecutionAssets() — store_execution_assets (sourceType='generated')
 *
 * DB/migration 금지: 기존 API 재사용만으로 구현.
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layers, Trash2, RefreshCw, FileEdit, Plus, Megaphone, QrCode, PenLine, MonitorPlay, ChevronDown, ExternalLink } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { AiContentModal } from '@o4o/content-editor';
import { directContentApi } from '../../api/assetSnapshot';
import {
  getStoreExecutionAssets,
  deleteStoreExecutionAsset,
} from '../../api/storeExecutionAssets';
import { getAccessToken } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';
import { SelectContentsForProductionModal } from './SelectContentsForProductionModal';
import { StartProductionModal, type ProductionSource, type ProductionSourceItem } from './StartProductionModal';
import { composeSourceTextFromItems } from './productionTargets';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface ProductionMaterialItem {
  id: string;
  title: string;
  updatedAt: string;
  purpose?: string;
  stage?: string;
  createdFrom?: string;
  /** WO-KPA-POP-RESULT-PERSIST-AND-CONTENT-PDF-PATH-V1: 파일형 결과(저장된 POP PDF 등) 재출력용 URL */
  fileUrl?: string | null;
  /** 삭제 API 분기용: kpa_store_contents | store_execution_assets */
  sourceKind: 'direct-content' | 'execution-asset';
}

// ─── 메타 레이블 헬퍼 ────────────────────────────────────────────────────────

const PURPOSE_LABELS: Record<string, string> = {
  pop: 'POP',
  qr: 'QR 코드',
  blog: '블로그',
  product_description: '상품 상세설명',
  store_qr: 'QR 코드',
  product_detail: '상품 상세설명',
  summary: '요약',
  title_suggest: '제목 추천',
};

const STAGE_LABELS: Record<string, { label: string; bg: string; fg: string }> = {
  draft:     { label: '초안',  bg: '#F3F4F6', fg: '#6B7280' },
  finalized: { label: '완성',  bg: '#DCFCE7', fg: '#16A34A' },
  archived:  { label: '보관',  bg: '#FEF3C7', fg: '#D97706' },
};

const FROM_LABELS: Record<string, string> = {
  contents:           '콘텐츠',
  resources:          '자료',
  direct:             '직접 작성',
  ai:                 'AI 생성',
  production_material:'제작 자료',
};

function purposeLabel(p?: string) {
  return p ? (PURPOSE_LABELS[p] ?? '기타') : '미지정';
}

function stageInfo(s?: string) {
  return s ? (STAGE_LABELS[s] ?? STAGE_LABELS.draft) : STAGE_LABELS.draft;
}

function fromLabel(f?: string) {
  return f ? (FROM_LABELS[f] ?? '직접 작성') : '직접 작성';
}

// ─── WO-KPA-STORE-CONTENT-LIBRARY-CROSS-CREATE-CTA-V1 ─────────────────────────
// 제작 자료를 기반으로 POP·QR·블로그·사이니지 제작 화면으로 바로 이동(교차 진입).
// 기존 제작 화면(route)만 재사용 — 신규 API/DB 없음. (IR Phase 1)
const CROSS_CREATE: { key: string; label: string; icon: typeof Megaphone; to: string }[] = [
  { key: 'pop',     label: 'POP 만들기',      icon: Megaphone,   to: '/store/marketing/pop' },
  { key: 'qr',      label: 'QR-code 만들기',  icon: QrCode,      to: '/store/marketing/qr' },
  { key: 'blog',    label: '블로그 글쓰기',    icon: PenLine,     to: '/store/content/blog' },
  { key: 'signage', label: '사이니지에 추가',  icon: MonitorPlay, to: '/store/marketing/signage/playlist' },
];

function RowUseMenu({ onPick }: { onPick: (to: string) => void }) {
  const [open, setOpen] = useState(false);
  return (
    <div style={{ position: 'relative' }}>
      <button type="button" onClick={() => setOpen((v) => !v)} style={styles.useBtn}>
        활용하기 <ChevronDown size={13} />
      </button>
      {open && (
        <>
          <div style={styles.menuBackdrop} onClick={() => setOpen(false)} />
          <div style={styles.menu}>
            {CROSS_CREATE.map((c) => {
              const Icon = c.icon;
              return (
                <button
                  key={c.key}
                  type="button"
                  style={styles.menuItem}
                  onClick={() => { setOpen(false); onPick(c.to); }}
                >
                  <Icon size={14} /> {c.label}
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function StoreProductionMaterialsPage() {
  const navigate = useNavigate();
  const [items, setItems]           = useState<ProductionMaterialItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1:
  // 콘텐츠/강의 선택 → StartProductionModal → AiContentModal → editor 의 canonical 흐름.
  const [selectModalOpen, setSelectModalOpen] = useState(false);
  const [productionModalOpen, setProductionModalOpen] = useState(false);
  const [productionSource, setProductionSource] = useState<ProductionSource | null>(null);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiInitialText, setAiInitialText] = useState('');
  const [aiSourceMetadata, setAiSourceMetadata] = useState<
    { sourceContentId?: string; sourceTitle?: string; sourceOrigin?: string } | null
  >(null);

  const openSelectModal = useCallback(() => setSelectModalOpen(true), []);

  // WO-KPA-STORE-CONTENT-LIBRARY-CROSS-CREATE-CTA-V1:
  // 제작 자료를 source 로 전달하며 제작 화면으로 이동. 대상 화면이 state 를 읽지 않아도 안전(무시됨).
  const goCreate = useCallback(
    (to: string, item: ProductionMaterialItem) => {
      navigate(to, {
        state: { source: { kind: 'production-material', itemId: item.id, title: item.title, purpose: item.purpose } },
      });
    },
    [navigate],
  );

  const handleSelectConfirm = useCallback((selectedItems: ProductionSourceItem[]) => {
    if (selectedItems.length === 0) return;
    setSelectModalOpen(false);
    setProductionSource({ fromLibrary: 'contents', items: selectedItems });
    setProductionModalOpen(true);
  }, []);

  const handleAiAction = useCallback((source: ProductionSource) => {
    const text = composeSourceTextFromItems(source.items);
    const first = source.items[0];
    setAiInitialText(text);
    setAiSourceMetadata(
      first
        ? { sourceContentId: first.id, sourceTitle: first.title, sourceOrigin: first.origin }
        : null,
    );
    setProductionModalOpen(false);
    setAiOpen(true);
  }, []);

  const handleAiInsert = useCallback(
    (data: { html: string; title: string }) => {
      setAiOpen(false);
      navigate('/store/library/production-materials/new', {
        state: {
          generatedHtml: data.html,
          title: data.title || undefined,
          sourceMetadata: aiSourceMetadata ?? undefined,
        },
      });
    },
    [navigate, aiSourceMetadata],
  );

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-LIST-SOURCE-ALIGN-V1
      // 두 소스 병렬 페치. 한쪽 실패해도 다른 쪽은 표시.
      const [directRes, assetsRes] = await Promise.all([
        directContentApi.list().catch(() => null),
        getStoreExecutionAssets({ limit: 100 }).catch(() => null),
      ]);

      const directItems: ProductionMaterialItem[] = ((directRes?.data ?? []) as any[])
        .filter((it: any) => it.sourceType === 'direct')
        .map((it: any): ProductionMaterialItem => ({
          id: it.id,
          title: it.title,
          updatedAt: it.updatedAt,
          purpose: it.purpose ?? it.contentJson?.purpose,
          stage: it.stage ?? it.contentJson?.stage,
          createdFrom: it.createdFrom ?? it.contentJson?.createdFrom,
          sourceKind: 'direct-content',
        }));

      const executionItems: ProductionMaterialItem[] = ((assetsRes?.data?.items ?? []) as any[])
        .filter((it: any) => it.sourceType === 'generated')
        .map((it: any): ProductionMaterialItem => ({
          id: it.id,
          title: it.title,
          updatedAt: it.updatedAt,
          purpose: it.category ?? undefined,
          stage: 'finalized',
          createdFrom: 'ai',
          fileUrl: it.fileUrl ?? undefined,
          sourceKind: 'execution-asset',
        }));

      const merged = [...directItems, ...executionItems].sort(
        (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
      );

      setItems(merged);
      setSelected(new Set());
    } catch (e: any) {
      setError(e?.message || '불러오는 데 실패했습니다');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ─── 선택 ─────────────────────────────────────────────────────────────────

  const allSelected = items.length > 0 && items.every((it) => selected.has(it.id));

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(items.map((it) => it.id)));
  };

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // ─── 삭제 ─────────────────────────────────────────────────────────────────

  const handleDeleteOne = async (id: string, sourceKind: ProductionMaterialItem['sourceKind']) => {
    if (!confirm('이 제작 자료를 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      if (sourceKind === 'direct-content') {
        await directContentApi.remove(id);
      } else {
        await deleteStoreExecutionAsset(id);
      }
      setItems((prev) => prev.filter((it) => it.id !== id));
      setSelected((prev) => { const n = new Set(prev); n.delete(id); return n; });
      toast.success('삭제되었습니다');
    } catch (e: any) {
      toast.error(e?.message || '삭제에 실패했습니다');
    } finally {
      setDeletingId(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selected.size === 0) return;
    if (!confirm(`선택한 ${selected.size}개 제작 자료를 삭제하시겠습니까?`)) return;
    const selectedItems = items.filter((it) => selected.has(it.id));
    try {
      await Promise.all(
        selectedItems.map((it) =>
          it.sourceKind === 'direct-content'
            ? directContentApi.remove(it.id)
            : deleteStoreExecutionAsset(it.id),
        ),
      );
      const ids = selectedItems.map((it) => it.id);
      setItems((prev) => prev.filter((it) => !ids.includes(it.id)));
      setSelected(new Set());
      toast.success(`${selectedItems.length}개 삭제되었습니다`);
    } catch (e: any) {
      toast.error(e?.message || '일괄 삭제에 실패했습니다');
    }
  };

  // ─── 렌더 ─────────────────────────────────────────────────────────────────

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>내 자료함</span>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral700 }}>매장 제작 자료</span>
          </div>
          <h1 style={styles.title}>
            <FileEdit size={20} style={{ color: colors.primary }} />
            매장 제작 자료
          </h1>
          <p style={styles.subtitle}>
            AI로 생성하거나 편집한 POP·QR·블로그·상품 상세설명 제작 결과물을 관리합니다.
            새 제작 자료를 만들려면 <strong>내 자료함 → 콘텐츠</strong>에서 콘텐츠 또는 강의를 선택한 뒤 제작 작업을 시작합니다.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            type="button"
            onClick={openSelectModal}
            style={styles.newBtn}
          >
            <Plus size={14} />
            새 제작 자료 만들기
          </button>
          <button onClick={fetchAll} style={styles.refreshBtn} disabled={loading}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      {/* WO-KPA-STORE-CONTENT-LIBRARY-CROSS-CREATE-CTA-V1: 재사용 안내 */}
      <div style={styles.infoBox}>
        저장된 제작 자료는 보관용이 아니라 <strong>POP · QR-code · 블로그 · 사이니지</strong> 제작에 다시 활용할 수 있는 원본입니다.
        각 항목의 <strong>활용하기</strong>에서 바로 시작하세요.
      </div>

      {/* Batch toolbar */}
      {!loading && !error && items.length > 0 && selected.size > 0 && (
        <div style={styles.toolbar}>
          <span style={{ fontSize: 13, color: colors.neutral700 }}>{selected.size}개 선택됨</span>
          <div style={{ flex: 1 }} />
          <button
            type="button"
            onClick={handleBulkDelete}
            style={styles.bulkDeleteBtn}
          >
            <Trash2 size={14} />
            선택 삭제
          </button>
          <button type="button" onClick={() => setSelected(new Set())} style={styles.clearBtn}>
            선택 해제
          </button>
        </div>
      )}

      {/* 본문 */}
      {loading ? (
        <div style={styles.empty}>불러오는 중...</div>
      ) : error ? (
        <div style={styles.empty}>
          <p style={{ margin: 0, color: '#DC2626', fontSize: 14 }}>{error}</p>
          <button onClick={fetchAll} style={{ ...styles.refreshBtn, marginTop: 12 }}>
            다시 시도
          </button>
        </div>
      ) : items.length === 0 ? (
        <div style={styles.empty}>
          <Layers size={36} style={{ color: colors.neutral300, marginBottom: 14 }} />
          <p style={{ margin: 0, color: colors.neutral600, fontSize: 15, fontWeight: 500 }}>
            저장된 제작 자료가 없습니다.
          </p>
          <p style={{ margin: '8px 0 0 0', color: colors.neutral400, fontSize: 13, lineHeight: 1.6 }}>
            내 자료함 → 콘텐츠에서 콘텐츠 또는 강의를 선택한 뒤 "AI 제작 자료 초안 만들기"를 실행하세요.
          </p>
          <button
            type="button"
            onClick={openSelectModal}
            style={{ ...styles.newBtn, marginTop: 16 }}
          >
            <Plus size={14} />
            새 제작 자료 만들기
          </button>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          {/* 테이블 헤더 */}
          <div style={styles.tableHead}>
            <div style={{ ...styles.col, width: 28 }}>
              <input
                type="checkbox"
                checked={allSelected}
                onChange={toggleAll}
                style={styles.checkbox}
                aria-label="전체 선택"
              />
            </div>
            <div style={{ ...styles.col, flex: 3 }}>제목</div>
            <div style={{ ...styles.col, width: 110 }}>용도</div>
            <div style={{ ...styles.col, width: 80 }}>상태</div>
            <div style={{ ...styles.col, width: 100 }}>생성 출처</div>
            <div style={{ ...styles.col, width: 100 }}>최근 수정일</div>
            <div style={{ ...styles.col, width: 70 }}>출력</div>
            <div style={{ ...styles.col, width: 116 }}>활용</div>
            <div style={{ ...styles.col, width: 44 }} />
          </div>

          {/* 테이블 행 */}
          {items.map((item) => {
            const isSelected = selected.has(item.id);
            const stage = stageInfo(item.stage);
            return (
              <div
                key={item.id}
                style={{
                  ...styles.tableRow,
                  background: isSelected ? '#F5F3FF' : colors.white,
                  borderLeft: isSelected ? `3px solid ${colors.primary}` : '3px solid transparent',
                }}
              >
                <div style={{ ...styles.col, width: 28 }}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleOne(item.id)}
                    style={styles.checkbox}
                    aria-label={`${item.title} 선택`}
                  />
                </div>
                <div style={{ ...styles.col, flex: 3, minWidth: 0 }}>
                  <span style={styles.titleCell}>{item.title}</span>
                </div>
                <div style={{ ...styles.col, width: 110 }}>
                  <span style={styles.metaText}>{purposeLabel(item.purpose)}</span>
                </div>
                <div style={{ ...styles.col, width: 80 }}>
                  <span style={{ ...styles.stageBadge, background: stage.bg, color: stage.fg }}>
                    {stage.label}
                  </span>
                </div>
                <div style={{ ...styles.col, width: 100 }}>
                  <span style={styles.metaText}>{fromLabel(item.createdFrom)}</span>
                </div>
                <div style={{ ...styles.col, width: 100 }}>
                  <span style={styles.metaText}>
                    {item.updatedAt ? new Date(item.updatedAt).toLocaleDateString('ko-KR') : '-'}
                  </span>
                </div>
                <div style={{ ...styles.col, width: 70 }}>
                  {item.fileUrl ? (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.openBtn}
                      title="PDF 열기"
                    >
                      <ExternalLink size={13} />
                      출력
                    </a>
                  ) : (
                    <span style={{ ...styles.metaText, color: colors.neutral300 }}>-</span>
                  )}
                </div>
                <div style={{ ...styles.col, width: 116 }}>
                  <RowUseMenu onPick={(to) => goCreate(to, item)} />
                </div>
                <div style={{ ...styles.col, width: 44 }}>
                  <button
                    onClick={() => handleDeleteOne(item.id, item.sourceKind)}
                    disabled={deletingId === item.id}
                    style={styles.deleteBtn}
                    title="삭제"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1:
          페이지 이동 없이 모달 안에서 콘텐츠/강의 선택 → canonical 제작 흐름 */}
      <SelectContentsForProductionModal
        open={selectModalOpen}
        onClose={() => setSelectModalOpen(false)}
        onConfirm={handleSelectConfirm}
      />

      <StartProductionModal
        open={productionModalOpen}
        source={productionSource}
        onClose={() => setProductionModalOpen(false)}
        onAiAction={handleAiAction}
      />

      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        initialText={aiInitialText}
        headerLabel="AI 매장 제작 자료 초안"
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
      />
    </div>
  );
}

// ─── 스타일 ───────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: {
    padding: '24px',
    maxWidth: '960px',
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
    lineHeight: 1.6,
  },
  headerActions: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '8px',
    flexShrink: 0,
  },
  newBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 14px',
    background: colors.primary,
    border: 'none',
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
  infoBox: {
    padding: '10px 14px',
    background: '#EFF6FF',
    border: '1px solid #DBEAFE',
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral600,
    lineHeight: 1.6,
    marginBottom: '12px',
  },
  useBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 10px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: 500,
    color: colors.neutral700,
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  openBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '5px 8px',
    fontSize: '12px',
    fontWeight: 500,
    color: colors.primary,
    textDecoration: 'none',
    whiteSpace: 'nowrap',
  },
  menuBackdrop: {
    position: 'fixed',
    inset: 0,
    zIndex: 40,
  },
  menu: {
    position: 'absolute',
    top: 'calc(100% + 4px)',
    right: 0,
    zIndex: 41,
    minWidth: '168px',
    padding: '4px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    boxShadow: '0 8px 24px -8px rgba(15,23,42,0.18)',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    width: '100%',
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral700,
    cursor: 'pointer',
    textAlign: 'left',
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '10px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    marginBottom: '12px',
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
  clearBtn: {
    padding: '8px 10px',
    background: 'transparent',
    border: 'none',
    fontSize: '13px',
    color: colors.neutral500,
    cursor: 'pointer',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    cursor: 'pointer',
    flexShrink: 0,
  },
  tableWrap: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  tableHead: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '10px 14px',
    background: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral200}`,
    fontSize: '12px',
    fontWeight: 600,
    color: colors.neutral500,
  },
  tableRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 14px',
    borderBottom: `1px solid ${colors.neutral100}`,
    transition: 'background 0.1s',
  },
  col: {
    display: 'flex',
    alignItems: 'center',
    flexShrink: 0,
  },
  titleCell: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  metaText: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  stageBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '2px 8px',
    fontSize: '11px',
    fontWeight: 500,
    borderRadius: '4px',
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
