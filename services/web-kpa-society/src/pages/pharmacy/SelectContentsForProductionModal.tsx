/**
 * SelectContentsForProductionModal — production-materials 페이지의 콘텐츠 선택 모달
 *
 * WO-O4O-STORE-PRODUCTION-MATERIALS-CONTENT-SELECTOR-MODAL-V1
 *
 * `/store/library/production-materials` 의 "새 제작 자료 만들기" CTA 클릭 시 페이지 이동 대신
 * 본 모달을 연다. 모달 안에서 `/store/library/contents` 와 동일한 canonical selector 를
 * 그대로 사용 (StoreContentsSelector mode='modal').
 *
 * 선택 완료 → onConfirm(items) → 호출 측이 StartProductionModal 로 전달.
 *
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1:
 *   기존 콘텐츠 선택은 유지하되, 모달 상단에 "처음부터 만들기" 액션을 추가한다.
 *   원본 콘텐츠가 0건이어도 매장 경영자가 빈 제작 자료를 바로 작성할 수 있도록 onCreateBlank 를 노출.
 *
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-SOURCE-LOAD-FIX-V1:
 *   "기존 자료를 불러와 제작자료로 만들기" 흐름 정비. 소스 탭을 추가한다.
 *     - 콘텐츠 : 기존 StoreContentsSelector (내 자료함 snapshot/direct → AI 제작 흐름)
 *     - 운영자 콘텐츠 : kpa_contents(status='ready') 본문을 편집기에 직접 prefill (가져오기=복사, 사본 저장)
 *     - 내 제작자료   : store_execution_assets(generated) 복제 → 편집기에 직접 prefill
 *   운영자 콘텐츠/내 제작자료는 AI 단계 없이 본문을 바로 편집기로 넘겨 새 store-owned 사본으로 저장한다.
 *   원본은 변경하지 않는다(편집 대상은 항상 사본).
 */

import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { X, PenLine, FileText, Search, Copy } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { colors } from '../../styles/theme';
import { StoreContentsSelector } from './StoreContentsSelector';
import type { ProductionSourceItem } from './productionTargets';
import { listContentHubItems, getContentHubItem, type ContentHubItem } from '../../api/contentHub';
import { getStoreExecutionAssets, type StoreExecutionAsset } from '../../api/storeExecutionAssets';

/** 기존 자료에서 본문을 추출해 편집기로 prefill 하기 위한 페이로드 */
export interface ProductionSourcePrefill {
  html: string;
  title: string;
  sourceTitle: string;
  /** 'content-hub' | 'production-copy' — 편집기 출처 표시용 */
  sourceOrigin: string;
  sourceContentId?: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  /** 선택 완료 → 부모가 StartProductionModal 로 전달 (콘텐츠 → AI 흐름) */
  onConfirm: (items: ProductionSourceItem[]) => void;
  /**
   * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1:
   * "빈 제작 자료 만들기" 클릭 → 부모가 제작 자료 편집기(빈 상태)로 이동.
   */
  onCreateBlank: () => void;
  /**
   * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-SOURCE-LOAD-FIX-V1:
   * 기존 자료(운영자 콘텐츠/내 제작자료) 본문을 편집기에 prefill 하여 새 사본 작성.
   */
  onCreateFromSource: (prefill: ProductionSourcePrefill) => void;
}

type SourceTab = 'library' | 'content-hub' | 'production-copy';

const SOURCE_TABS: { key: SourceTab; label: string }[] = [
  // WO-O4O-KPA-STORE-LIBRARY-CONTENT-ONLY-SELECTOR-V1: 강의 제거 — 콘텐츠 전용 selector.
  { key: 'library', label: '콘텐츠' },
  { key: 'content-hub', label: '운영자 콘텐츠' },
  { key: 'production-copy', label: '내 제작자료' },
];

export function SelectContentsForProductionModal({ open, onClose, onConfirm, onCreateBlank, onCreateFromSource }: Props) {
  const [tab, setTab] = useState<SourceTab>('library');

  // 모달 열릴 때 탭 초기화
  useEffect(() => {
    if (open) setTab('library');
  }, [open]);

  if (!open) return null;

  const handleStartProduction = (items: ProductionSourceItem[]) => {
    if (items.length === 0) return;
    onConfirm(items);
  };

  return (
    <div style={styles.backdrop} role="presentation" onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <header style={styles.header}>
          <div>
            <h2 style={styles.title}>새 제작 자료 만들기</h2>
            <p style={styles.subtitle}>
              처음부터 직접 작성하거나, 운영자 콘텐츠·내 자료·기존 제작자료를 불러와 제작을 시작할 수 있습니다.
            </p>
          </div>
          <button type="button" onClick={onClose} style={styles.closeBtn} aria-label="닫기">
            <X size={18} />
          </button>
        </header>

        <div style={styles.body}>
          {/* WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1: 처음부터 만들기 */}
          <div style={styles.blankCard}>
            <div style={{ minWidth: 0 }}>
              <div style={styles.blankTitle}>처음부터 만들기</div>
              <div style={styles.blankDesc}>빈 POP · QR · 블로그 제작 자료를 직접 작성합니다.</div>
            </div>
            <button type="button" onClick={onCreateBlank} style={styles.blankBtn}>
              <PenLine size={14} />
              빈 제작 자료 만들기
            </button>
          </div>

          {/* WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-SOURCE-LOAD-FIX-V1: 소스 탭 */}
          <div style={styles.sourceTabs}>
            {SOURCE_TABS.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                style={{ ...styles.sourceTab, ...(tab === t.key ? styles.sourceTabActive : {}) }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === 'library' && (
            <StoreContentsSelector
              mode="modal"
              onStartProduction={handleStartProduction}
              startButtonLabel="선택 완료"
            />
          )}

          {tab === 'content-hub' && <ContentHubSourcePanel onPick={onCreateFromSource} />}

          {tab === 'production-copy' && <ProductionCopySourcePanel onPick={onCreateFromSource} />}
        </div>
      </div>
    </div>
  );
}

// ─── 운영자 콘텐츠(kpa_contents ready) 패널 ───────────────────────────────────────

function ContentHubSourcePanel({ onPick }: { onPick: (p: ProductionSourcePrefill) => void }) {
  const [items, setItems] = useState<ContentHubItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const [picking, setPicking] = useState<string | null>(null);
  const reqRef = useRef(0);

  useEffect(() => {
    const my = ++reqRef.current;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await listContentHubItems({ status: 'ready', search: search.trim() || undefined, limit: 30 });
        if (my !== reqRef.current) return;
        setItems(res.items);
      } catch {
        if (my !== reqRef.current) return;
        setError(true);
      } finally {
        if (my === reqRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const handlePick = async (item: ContentHubItem) => {
    if (picking) return;
    setPicking(item.id);
    try {
      const detail = await getContentHubItem(item.id);
      onPick({
        html: detail.body || '',
        title: item.title,
        sourceTitle: item.title,
        sourceOrigin: 'content-hub',
        sourceContentId: item.id,
      });
    } catch {
      toast.error('콘텐츠 본문을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.');
      setPicking(null);
    }
  };

  return (
    <SourceList
      hint="운영자가 '완료' 상태로 저장한 콘텐츠입니다. 선택하면 본문을 불러와 내 매장 제작자료(사본)로 편집합니다."
      search={search}
      onSearch={setSearch}
      loading={loading}
      error={error}
      empty={items.length === 0}
      emptyText="불러올 운영자 콘텐츠가 없습니다. 처음부터 새 제작자료를 만들거나, 운영자 콘텐츠가 등록되면 여기에서 불러올 수 있습니다."
    >
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => handlePick(item)} style={styles.row} disabled={!!picking}>
          <FileText size={16} style={{ color: '#8b5cf6', flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={styles.rowTitle}>{item.title}</p>
            {item.summary && <p style={styles.rowDesc}>{item.summary}</p>}
          </div>
          <span style={styles.rowAction}>{picking === item.id ? '불러오는 중…' : '불러오기'}</span>
        </button>
      ))}
    </SourceList>
  );
}

// ─── 내 제작자료(store_execution_assets generated) 복제 패널 ──────────────────────

function ProductionCopySourcePanel({ onPick }: { onPick: (p: ProductionSourcePrefill) => void }) {
  const [items, setItems] = useState<StoreExecutionAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [search, setSearch] = useState('');
  const reqRef = useRef(0);

  useEffect(() => {
    const my = ++reqRef.current;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await getStoreExecutionAssets({ limit: 50, search: search.trim() || undefined });
        if (my !== reqRef.current) return;
        // store-owned 제작자료만 = sourceType='generated' & assetType='content'
        const list = (res.data?.items ?? []).filter(
          (a) => a.sourceType === 'generated' && a.assetType === 'content',
        );
        setItems(list);
      } catch {
        if (my !== reqRef.current) return;
        setError(true);
      } finally {
        if (my === reqRef.current) setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [search]);

  const handlePick = (asset: StoreExecutionAsset) => {
    onPick({
      html: asset.htmlContent || '',
      title: `${asset.title} (복제)`,
      sourceTitle: asset.title,
      sourceOrigin: 'production-copy',
      sourceContentId: asset.id,
    });
  };

  return (
    <SourceList
      hint="내가 만든 제작자료를 복제해 새 자료로 편집합니다. 원본 제작자료는 변경되지 않습니다."
      search={search}
      onSearch={setSearch}
      loading={loading}
      error={error}
      empty={items.length === 0}
      emptyText="복제할 제작자료가 없습니다. 처음부터 새 제작자료를 만들거나, 운영자 콘텐츠를 불러와 먼저 제작자료를 만들 수 있습니다."
    >
      {items.map((asset) => (
        <button key={asset.id} type="button" onClick={() => handlePick(asset)} style={styles.row}>
          <Copy size={16} style={{ color: colors.primary, flexShrink: 0 }} />
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={styles.rowTitle}>{asset.title}</p>
            {asset.category && <p style={styles.rowDesc}>{asset.category}</p>}
          </div>
          <span style={styles.rowAction}>복제</span>
        </button>
      ))}
    </SourceList>
  );
}

// ─── 공통 리스트 셸 (검색 + 로딩/에러/빈 상태) ─────────────────────────────────────

function SourceList({
  hint,
  search,
  onSearch,
  loading,
  error,
  empty,
  emptyText,
  children,
}: {
  hint: string;
  search: string;
  onSearch: (v: string) => void;
  loading: boolean;
  error: boolean;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <section style={styles.panel}>
      <p style={styles.panelHint}>{hint}</p>
      <div style={styles.searchWrap}>
        <Search size={14} style={styles.searchIcon} />
        <input
          type="search"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder="제목 검색"
          style={styles.searchInput}
        />
      </div>
      {loading ? (
        <div style={styles.stateBox}>불러오는 중...</div>
      ) : error ? (
        <div style={styles.stateBox}>자료를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.</div>
      ) : empty ? (
        <div style={styles.stateBox}>{emptyText}</div>
      ) : (
        <div style={styles.rowList}>{children}</div>
      )}
    </section>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: 16,
  },
  modal: {
    width: '100%',
    maxWidth: 960,
    maxHeight: '90vh',
    background: colors.white,
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    boxShadow: '0 20px 50px rgba(15, 23, 42, 0.2)',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  title: {
    margin: 0,
    fontSize: 16,
    fontWeight: 600,
    color: colors.neutral800,
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 12,
    color: colors.neutral500,
  },
  closeBtn: {
    background: 'transparent',
    border: 'none',
    color: colors.neutral500,
    cursor: 'pointer',
    padding: 4,
    flexShrink: 0,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px 24px',
  },
  // WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-DIRECT-CREATE-V1
  blankCard: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '14px 16px',
    background: '#EFF6FF',
    border: `1px solid #DBEAFE`,
    borderRadius: 10,
  },
  blankTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.neutral800,
  },
  blankDesc: {
    margin: '2px 0 0',
    fontSize: 12,
    color: colors.neutral500,
  },
  blankBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    padding: '8px 14px',
    background: colors.primary,
    border: 'none',
    borderRadius: 8,
    fontSize: 13,
    fontWeight: 500,
    color: colors.white,
    cursor: 'pointer',
  },
  // WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-SOURCE-LOAD-FIX-V1
  sourceTabs: {
    display: 'flex',
    gap: 4,
    margin: '18px 0 4px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  sourceTab: {
    padding: '8px 16px',
    border: 'none',
    borderBottom: '2px solid transparent',
    background: 'transparent',
    fontSize: 14,
    fontWeight: 500,
    color: colors.neutral500,
    cursor: 'pointer',
    marginBottom: -1,
  },
  sourceTabActive: {
    color: colors.primary,
    borderBottomColor: colors.primary,
  },
  panel: {
    marginTop: 14,
  },
  panelHint: {
    margin: '0 0 12px',
    fontSize: 12,
    color: colors.neutral500,
    lineHeight: 1.5,
  },
  searchWrap: {
    position: 'relative',
    marginBottom: 12,
  },
  searchIcon: {
    position: 'absolute',
    left: 10,
    top: '50%',
    transform: 'translateY(-50%)',
    color: colors.neutral400,
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 30px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: 6,
    fontSize: 13,
    outline: 'none',
    background: colors.white,
    boxSizing: 'border-box',
  },
  stateBox: {
    padding: '40px 16px',
    textAlign: 'center',
    fontSize: 13,
    color: colors.neutral400,
    lineHeight: 1.6,
    background: colors.neutral50,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: 8,
  },
  rowList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    maxHeight: 360,
    overflowY: 'auto',
  },
  row: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    width: '100%',
    padding: '10px 12px',
    background: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: 8,
    cursor: 'pointer',
    textAlign: 'left',
  },
  rowTitle: {
    margin: 0,
    fontSize: 14,
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowDesc: {
    margin: '2px 0 0',
    fontSize: 12,
    color: colors.neutral400,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  rowAction: {
    flexShrink: 0,
    fontSize: 12,
    fontWeight: 600,
    color: colors.primary,
  },
};
