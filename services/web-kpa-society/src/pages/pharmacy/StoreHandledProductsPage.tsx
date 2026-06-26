/**
 * StoreHandledProductsPage — 매장 취급제품 (통합 조회, 읽기 전용)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1
 * 선행: IR-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-DESIGN-V1
 *
 * O4O 기반 제품(organization_product_listings) + 매장 경영활용 제품(store_local_products)을
 * 한 화면에서 조회한다. 직접 CRUD 하지 않고 원본 관리 화면(/my-products, /commerce/local-products)으로 이동.
 * 매장 경영활용 제품의 온라인몰 노출은 미지원(Display Domain). 라벨 정책: WO-...-TERM-CLARIFICATION-V1.
 */

import { useEffect, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, RefreshCw, Search, ExternalLink, Boxes, Plus, ShoppingBag } from 'lucide-react';
import { Pagination } from '@o4o/operator-ux-core';
import { fetchHandledProducts, type HandledProduct } from '../../api/handledProducts';
import { colors } from '../../styles/theme';

type SourceFilter = 'all' | 'listing' | 'local';
const PAGE_LIMIT = 20;
const SEARCH_DEBOUNCE_MS = 300;

const SOURCE_TABS: { key: SourceFilter; label: string }[] = [
  { key: 'all', label: '전체' },
  { key: 'listing', label: 'O4O 기반 제품' },
  { key: 'local', label: '매장 경영활용 제품' },
];

/** 구분 라벨 — 정책 용어(WO-...-TERM-CLARIFICATION-V1). 백엔드 originLabel 대신 sourceType 기준 프론트 도출(KPA 단독). */
function originLabel(sourceType: HandledProduct['sourceType']): string {
  return sourceType === 'listing' ? 'O4O 기반 제품' : '매장 경영활용 제품';
}

function Badge({ text, tone }: { text: string; tone: 'green' | 'gray' | 'amber' | 'blue' | 'muted' }) {
  const palette: Record<string, CSSProperties> = {
    green: { background: '#DCFCE7', color: '#16A34A' },
    blue: { background: '#DBEAFE', color: '#1D4ED8' },
    amber: { background: '#FEF3C7', color: '#D97706' },
    gray: { background: colors.neutral100, color: colors.neutral600 },
    muted: { background: '#F1F5F9', color: '#94A3B8' },
  };
  return <span style={{ ...styles.badge, ...palette[tone] }}>{text}</span>;
}

function formatPrice(p: number | null): string {
  if (p == null) return '—';
  return `${p.toLocaleString('ko-KR')}원`;
}
function formatDate(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

const EMPTY_BY_SOURCE: Record<SourceFilter, string> = {
  all: '아직 등록된 매장 취급제품이 없습니다. 상단 버튼에서 O4O 제품 취급 신청 또는 매장 경영활용 제품 등록을 진행하세요.',
  listing: '아직 취급 중인 O4O 제품이 없습니다. ‘O4O 제품 신청’에서 취급 신청을 진행할 수 있습니다.',
  local: '아직 등록된 매장 경영활용 제품이 없습니다. ‘매장 경영활용 제품 등록’에서 추가할 수 있습니다.',
};

function isSourceFilter(v: string | null): v is SourceFilter {
  return v === 'all' || v === 'listing' || v === 'local';
}

export default function StoreHandledProductsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  const initialSource: SourceFilter = isSourceFilter(searchParams.get('source'))
    ? (searchParams.get('source') as SourceFilter)
    : 'all';
  const [source, setSource] = useState<SourceFilter>(initialSource);
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [items, setItems] = useState<HandledProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  useEffect(() => {
    const handle = setTimeout(() => {
      setSearchQuery(searchInput.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchHandledProducts({ page, limit: PAGE_LIMIT, search: searchQuery || undefined, source })
      .then((d) => {
        if (cancelled) return;
        setItems(d.items);
        setTotal(d.pagination.total);
      })
      .catch((e: any) => {
        if (!cancelled) setError(e?.message || '목록을 불러오지 못했습니다');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, searchQuery, source, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  const selectSource = useCallback(
    (next: SourceFilter) => {
      setSource(next);
      setPage(1);
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          if (next === 'all') params.delete('source');
          else params.set('source', next);
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>약국 상품·거래</span>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral700 }}>매장 취급제품</span>
          </div>
          <h1 style={styles.title}>
            <Boxes size={20} style={{ color: colors.primary }} />
            매장 취급제품
          </h1>
          <p style={styles.subtitle}>
            약국이 취급하는 전체 제품(<strong>O4O 기반 제품</strong> + <strong>매장 경영활용 제품</strong>)을 한 화면에서 확인합니다.
            등록·수정은 각 원본 관리 화면에서 합니다.
          </p>
        </div>
        <div style={styles.headerActions}>
          <button onClick={() => navigate('/store/commerce/products')} style={styles.secondaryBtn}>
            <ShoppingBag size={14} />
            O4O 제품 신청
          </button>
          <button onClick={() => navigate('/store/commerce/local-products')} style={styles.primaryBtn}>
            <Plus size={14} />
            매장 경영활용 제품 등록
          </button>
          <button onClick={reload} style={styles.refreshBtn}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={styles.tabs}>
          {SOURCE_TABS.map((t) => {
            const active = source === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => selectSource(t.key)}
                style={{ ...styles.tab, ...(active ? styles.tabActive : styles.tabInactive) }}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div style={styles.searchWrap}>
          <Search size={14} style={styles.searchIcon} />
          <input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="제품명 검색"
            style={styles.searchInput}
          />
        </div>
      </div>

      <div style={styles.countRow}>
        <span style={styles.countBadge}>{total}건</span>
      </div>

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, textAlign: 'left' }}>제품</th>
              <th style={styles.th}>구분</th>
              <th style={styles.th}>매장 표시 가격</th>
              <th style={styles.th}>상태</th>
              <th style={styles.th}>최근 수정일</th>
              <th style={styles.th}>관리</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} style={styles.empty}>불러오는 중…</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan={6} style={{ ...styles.empty, color: '#DC2626' }}>{error}</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan={6} style={styles.empty}>{searchQuery ? '검색 결과가 없습니다' : EMPTY_BY_SOURCE[source]}</td>
              </tr>
            ) : (
              items.map((it) => (
                <tr key={`${it.sourceType}:${it.sourceId}`} style={styles.row}>
                  <td style={styles.tdProduct}>
                    <div style={styles.productCell}>
                      {it.imageUrl ? (
                        <img src={it.imageUrl} alt="" style={styles.thumb} />
                      ) : (
                        <div style={styles.thumbPlaceholder}>
                          <Package size={16} style={{ color: colors.neutral400 }} />
                        </div>
                      )}
                      <span style={styles.productName} title={it.name}>{it.name}</span>
                    </div>
                  </td>
                  <td style={styles.td}>
                    <Badge text={originLabel(it.sourceType)} tone={it.sourceType === 'listing' ? 'blue' : 'amber'} />
                  </td>
                  <td style={styles.td}>{formatPrice(it.price)}</td>
                  <td style={styles.td}>
                    <Badge text={it.statusLabel} tone={it.isActive ? 'green' : 'gray'} />
                  </td>
                  <td style={styles.td}>{formatDate(it.updatedAt)}</td>
                  <td style={styles.td}>
                    <button
                      type="button"
                      onClick={() => navigate(it.managePath)}
                      style={styles.manageBtn}
                      aria-label="원본 관리 화면으로 이동"
                    >
                      관리
                      <ExternalLink size={12} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} total={total} />

      <p style={styles.footnote}>
        ※ <strong>매장 취급제품</strong>은 진열·콘텐츠·온라인 노출에 활용할 제품 풀입니다. 타블렛 진열·온라인 판매 등 채널별 설정은 각 채널 메뉴에서 관리합니다.
        {/* WO-O4O-KPA-STORE-HANDLED-PRODUCTS-DISPLAY-POOL-SIMPLIFY-V1: 온라인몰 미지원 = 컬럼 대신 보조 안내 */}
        {' '}매장 경영활용 제품은 온라인 판매(온라인몰) 노출을 지원하지 않습니다.
        온라인 주문 이후의 조달·재고·배송·발송·응대는 매장 경영자가 자체적으로 처리합니다.
      </p>
    </div>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────

const styles: Record<string, CSSProperties> = {
  container: { padding: '24px', maxWidth: '1180px', margin: '0 auto' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', marginBottom: '18px', flexWrap: 'wrap' },
  breadcrumb: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: colors.neutral400, marginBottom: '6px' },
  title: { display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '20px', fontWeight: 600, color: colors.neutral800, margin: 0 },
  subtitle: { fontSize: '13px', color: colors.neutral500, margin: '6px 0 0', maxWidth: '720px', lineHeight: 1.6 },
  headerActions: { display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' },
  refreshBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: colors.white, border: `1px solid ${colors.neutral300}`, borderRadius: '6px', fontSize: '13px', color: colors.neutral700, cursor: 'pointer' },
  secondaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: colors.white, border: `1px solid ${colors.primary}`, borderRadius: '6px', fontSize: '13px', color: colors.primary, cursor: 'pointer' },
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '6px', fontSize: '13px', color: colors.white, cursor: 'pointer' },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' },
  tabs: { display: 'flex', gap: '4px', background: colors.neutral100, border: `1px solid ${colors.neutral200}`, borderRadius: '8px', padding: '3px' },
  tab: { padding: '6px 14px', fontSize: '13px', fontWeight: 500, border: 'none', borderRadius: '6px', cursor: 'pointer' },
  tabActive: { background: colors.white, color: colors.primary, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' },
  tabInactive: { background: 'transparent', color: colors.neutral500 },
  searchWrap: { position: 'relative', minWidth: '220px' },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.neutral400, pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '8px 12px 8px 30px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', fontSize: '13px', outline: 'none', background: colors.white, boxSizing: 'border-box' },
  countRow: { marginBottom: '10px' },
  countBadge: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: '12px', fontWeight: 500, color: colors.neutral600, background: colors.neutral100, borderRadius: '999px' },
  tableWrap: { overflowX: 'auto', border: `1px solid ${colors.neutral200}`, borderRadius: '8px', background: colors.white },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: colors.neutral500, background: '#F8FAFC', borderBottom: `1px solid ${colors.neutral200}`, whiteSpace: 'nowrap' },
  row: { borderBottom: `1px solid ${colors.neutral100}` },
  td: { padding: '10px 12px', textAlign: 'center', color: colors.neutral700, whiteSpace: 'nowrap' },
  tdProduct: { padding: '10px 12px', textAlign: 'left', minWidth: '240px' },
  productCell: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  thumb: { width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${colors.neutral200}`, flexShrink: 0 },
  thumbPlaceholder: { width: '36px', height: '36px', borderRadius: '6px', background: colors.neutral100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  productName: { fontSize: '14px', fontWeight: 500, color: colors.neutral800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: '11px', fontWeight: 500, borderRadius: '999px', whiteSpace: 'nowrap' },
  manageBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', background: colors.white, border: `1px solid ${colors.neutral300}`, borderRadius: '6px', fontSize: '12px', color: colors.neutral700, cursor: 'pointer' },
  empty: { padding: '40px 12px', textAlign: 'center', color: colors.neutral400, fontSize: '13px' },
  footnote: { marginTop: '14px', fontSize: '12px', color: colors.neutral500, lineHeight: 1.7, padding: '10px 12px', background: colors.neutral100, borderRadius: '6px' },
};
