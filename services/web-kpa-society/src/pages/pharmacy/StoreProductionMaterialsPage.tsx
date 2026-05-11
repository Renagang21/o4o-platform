/**
 * StoreProductionMaterialsPage — 내 자료함 / 매장 제작 자료
 *
 * WO-O4O-KPA-STORE-PRODUCTION-MATERIALS-LIBRARY-TAB-V1
 *
 * 매장에서 POP·QR·블로그·상품 상세설명 등 결과물을 만들기 위해
 * 편집하거나 AI로 정리한 원본/중간 제작 자료를 관리하는 페이지.
 *
 * 데이터 소스:
 *   directContentApi.list() — kpa_store_contents (physical) / Store Production Material (logical)
 *   contentJson 안의 purpose / stage / createdFrom 필드가 있는 항목을 우선 표시.
 *   list API에서 contentJson이 반환되지 않으므로 현재 단계에서는 default 값 표시.
 *   각 도구(POP/QR/블로그/상품 상세설명)가 contentJson에 metadata를 저장하면 자동 반영.
 *
 * DB/migration 금지: 기존 API 재사용만으로 구현.
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { Layers, Trash2, RefreshCw, Sparkles, FileEdit } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { directContentApi } from '../../api/assetSnapshot';
import { colors } from '../../styles/theme';
import { StartProductionModal, type ProductionSource } from './StartProductionModal';

// ─── 타입 ─────────────────────────────────────────────────────────────────────

interface ProductionMaterialItem {
  id: string;
  title: string;
  updatedAt: string;
  /** contentJson에서 추출 — list API 미지원으로 현재 단계에서는 undefined */
  purpose?: string;
  stage?: string;
  createdFrom?: string;
}

// ─── 메타 레이블 헬퍼 ────────────────────────────────────────────────────────

const PURPOSE_LABELS: Record<string, string> = {
  pop: 'POP',
  qr: 'QR 코드',
  blog: '블로그',
  product_description: '상품 상세설명',
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

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export default function StoreProductionMaterialsPage() {
  const [items, setItems]           = useState<ProductionMaterialItem[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selected, setSelected]     = useState<Set<string>>(new Set());
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [modalOpen, setModalOpen]   = useState(false);
  const [modalSource, setModalSource] = useState<ProductionSource | null>(null);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await directContentApi.list();
      // source_type='direct' 항목만 사용.
      // 향후 purpose/stage/createdFrom 이 list에 노출되면 여기서 추출.
      const raw = (res.data || []).filter((it: any) => it.sourceType === 'direct');
      setItems(
        raw.map((it: any): ProductionMaterialItem => ({
          id: it.id,
          title: it.title,
          updatedAt: it.updatedAt,
          // contentJson은 list API 미지원 — get(id) 호출 없이 현재 단계에서는 미노출.
          purpose: it.purpose ?? it.contentJson?.purpose,
          stage: it.stage ?? it.contentJson?.stage,
          createdFrom: it.createdFrom ?? it.contentJson?.createdFrom,
        })),
      );
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

  const handleDeleteOne = async (id: string) => {
    if (!confirm('이 제작 자료를 삭제하시겠습니까?')) return;
    setDeletingId(id);
    try {
      await directContentApi.remove(id);
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
    const ids = [...selected];
    try {
      await Promise.all(ids.map((id) => directContentApi.remove(id)));
      setItems((prev) => prev.filter((it) => !ids.includes(it.id)));
      setSelected(new Set());
      toast.success(`${ids.length}개 삭제되었습니다`);
    } catch (e: any) {
      toast.error(e?.message || '일괄 삭제에 실패했습니다');
    }
  };

  // ─── 제작 시작 ────────────────────────────────────────────────────────────

  const handleStartProduction = () => {
    if (selected.size === 0) return;
    const sourceItems: ProductionSource['items'] = items
      .filter((it) => selected.has(it.id))
      .map((it) => ({ id: it.id, title: it.title, origin: 'direct' as const }));
    setModalSource({ fromLibrary: 'contents', items: sourceItems });
    setModalOpen(true);
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
            POP·QR 코드·블로그·상품 상세설명 제작 과정에서 저장한 원본/편집 자료를 관리합니다.
          </p>
        </div>
        <button onClick={fetchAll} style={styles.refreshBtn} disabled={loading}>
          <RefreshCw size={14} />
          새로고침
        </button>
      </div>

      {/* Batch toolbar */}
      {!loading && !error && items.length > 0 && (
        <div style={styles.toolbar}>
          <label style={styles.selectAllLabel}>
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleAll}
              style={styles.checkbox}
            />
            전체 선택 ({selected.size}/{items.length})
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
            매장 제작 자료가 없습니다.
          </p>
          <p style={{ margin: '8px 0 0', color: colors.neutral400, fontSize: 13, lineHeight: 1.6 }}>
            POP, QR 코드, 블로그, 상품 상세설명 제작 과정에서 저장한 자료가 이곳에 표시됩니다.
          </p>
        </div>
      ) : (
        <div style={styles.tableWrap}>
          {/* 테이블 헤더 */}
          <div style={styles.tableHead}>
            <div style={{ ...styles.col, width: 28 }} />
            <div style={{ ...styles.col, flex: 3 }}>제목</div>
            <div style={{ ...styles.col, width: 110 }}>용도</div>
            <div style={{ ...styles.col, width: 80 }}>상태</div>
            <div style={{ ...styles.col, width: 100 }}>생성 출처</div>
            <div style={{ ...styles.col, width: 100 }}>최근 수정일</div>
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
                <div style={{ ...styles.col, width: 44 }}>
                  <button
                    onClick={() => handleDeleteOne(item.id)}
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

      <StartProductionModal
        open={modalOpen}
        source={modalSource}
        onClose={() => setModalOpen(false)}
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
