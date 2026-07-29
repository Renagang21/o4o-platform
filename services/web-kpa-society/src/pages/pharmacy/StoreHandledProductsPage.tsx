/**
 * StoreHandledProductsPage — 매장 경영활용 제품 (O4O 기반 제품, 읽기 조회 + 경영활용 정리)
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-UNIFIED-VIEW-V1 (선행)
 * WO-O4O-KPA-STORE-HANDLED-PRODUCTS-STANDARD-TABLE-V1: 표준 목록 UX(Toolbar+DataTable+Pagination)
 * WO-O4O-KPA-STORE-HANDLED-PRODUCT-DESCRIPTION-USAGE-POLICY-FIX-V1:
 *   O4O 상품 정보를 매장으로 복사하지 않고, 매장용(STORE) 상세설명서를 읽기 전용 직접 조회.
 *
 * WO-O4O-KPA-STORE-HANDLED-PRODUCT-REMOVE-AND-STATUS-AUDIT-V1:
 *   - '매장 경영활용에서 제거' 액션 추가(1건/다건). 상품 정보 삭제가 아니라 매장↔제품 경영활용 연결 해제.
 *   - 이 화면에서의 '매장 직접 등록' 진입 폐기 → 등록 버튼·로컬 탭 제거. 이 화면 목록은 O4O 기반 제품만.
 *   - '승인 대기'(opl.status DEFAULT 'pending') = 유통 승인(Neture Distribution) 잔재. 이 화면엔 승인 절차
 *     없음(등록 즉시 is_active=true) → 상태 컬럼/승인 대기 표시 제거.
 *
 * WO-O4O-KPA-STORE-LOCAL-PRODUCTS-ENTRY-ALIGNMENT-V1 (정책 주석 정정):
 *   위 '정책 폐기' 표현은 이 화면의 진입 정리를 뜻하며, store_local_products 자체의 폐기가 아니다.
 *   해당 데이터 축은 유효하다 — 상품 설명(StoreProductDescriptionsPage 100% 의존) / 태블릿
 *   진열(product_type='local') / QR / 다국어(targetKind='local') / handled-products UNION 소스.
 *   등록·수정 canonical 진입점 = 사이드바 '약국 상품·거래 > 매장 자체 상품'(/store/commerce/local-products).
 *   IR: docs/investigations/IR-O4O-KPA-STORE-HIDDEN-MANAGEMENT-ENTRY-POLICY-AUDIT-V1.md
 */

import { useEffect, useMemo, useState, useCallback, type CSSProperties } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, RefreshCw, Search, Boxes, X, Trash2, FileText, Loader2, QrCode, PlusCircle, ClipboardList, Languages } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { Pagination } from '@o4o/operator-ux-core';
import { fetchHandledProducts, removeHandledProducts, type HandledProduct } from '../../api/handledProducts';
import { colors } from '../../styles/theme';
// WO-...-DESCRIPTION-USAGE-POLICY-FIX-V1: 매장용(STORE) 상세설명서 읽기 전용 조회
import { StoreDescriptionViewModal, type StoreDescriptionProduct } from './StoreDescriptionViewModal';
// WO-...-ACTIONS-AND-MULTILINGUAL-DESCRIPTION-V1: 이미 등록된 상품별 QR 출력(읽기 전용)
import { StoreProductQrModal, type StoreProductQrTarget } from './StoreProductQrModal';
// WO-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1: O4O 표준 상품 검색·선택·등록 모달
import { AddO4oStandardProductModal } from './AddO4oStandardProductModal';
// WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P1): 신규 상품 등록 요청(제출·상태)
import { StoreNewProductRequestModal } from './StoreNewProductRequestModal';
import { StoreProductRequestsListModal } from './StoreProductRequestsListModal';
import type { StoreProductRequest } from '../../api/storeProductRequests';

// WO-...-STANDARD-TABLE-V1: 페이지당 건수(20/50/100), 기본 20
const PAGE_SIZE_OPTIONS = [20, 50, 100] as const;
const DEFAULT_PAGE_SIZE = 20;
const SEARCH_DEBOUNCE_MS = 300;

const EMPTY_MESSAGE =
  '아직 취급 중인 O4O 제품이 없습니다. ‘O4O 표준 상품에서 추가’로 제품을 선택해 매장 경영활용 제품으로 등록할 수 있습니다.';

/** 선택 식별 키 — sourceType + sourceId 조합(교차 소스 유일). */
function rowKey(it: Pick<HandledProduct, 'sourceType' | 'sourceId'>): string {
  return `${it.sourceType}:${it.sourceId}`;
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

function parsePageSize(v: string | null): number {
  const n = Number(v);
  return PAGE_SIZE_OPTIONS.includes(n as (typeof PAGE_SIZE_OPTIONS)[number]) ? n : DEFAULT_PAGE_SIZE;
}

function parsePage(v: string | null): number {
  const n = Number(v);
  return Number.isInteger(n) && n >= 1 ? n : 1;
}

export default function StoreHandledProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // ─── URL Query ↔ 상태 동기화(검색어 / 페이지 / 페이지당 건수) ────────────
  const initialSearch = searchParams.get('q') ?? '';

  const [searchInput, setSearchInput] = useState(initialSearch);
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [page, setPage] = useState(() => parsePage(searchParams.get('page')));
  const [limit, setLimit] = useState(() => parsePageSize(searchParams.get('limit')));
  const [items, setItems] = useState<HandledProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  // WO-...-STANDARD-TABLE-V1: 행 선택(현재 페이지 기준). key = rowKey(it).
  const [selected, setSelected] = useState<Set<string>>(new Set());
  // WO-...-REMOVE-AND-STATUS-AUDIT-V1: 제거 진행 중 플래그
  const [removing, setRemoving] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  // URL Query 부분 갱신 헬퍼(기본값이면 파라미터 제거해 URL 을 깔끔히 유지).
  const patchParams = useCallback(
    (patch: Record<string, string | null>) => {
      setSearchParams(
        (prev) => {
          const params = new URLSearchParams(prev);
          for (const [k, v] of Object.entries(patch)) {
            if (v == null || v === '') params.delete(k);
            else params.set(k, v);
          }
          return params;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  // 검색어 디바운스 → 확정 시(값이 바뀐 경우만) 페이지 1 초기화 + URL 반영.
  useEffect(() => {
    const handle = setTimeout(() => {
      const next = searchInput.trim();
      if (next === searchQuery) return;
      setSearchQuery(next);
      setPage(1);
      patchParams({ q: next || null, page: null });
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [searchInput, searchQuery, patchParams]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    // 목록이 바뀌면 선택 초기화(서버 페이지네이션 — 선택은 현재 페이지 기준).
    setSelected(new Set());
    // WO-...-REMOVE-AND-STATUS-AUDIT-V1: 로컬(매장 직접 등록) 폐기 → O4O 기반 제품(listing)만 조회.
    fetchHandledProducts({ page, limit, search: searchQuery || undefined, source: 'listing' })
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
  }, [page, limit, searchQuery, reloadKey]);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  // WO-...-DESCRIPTION-USAGE-POLICY-FIX-V1: 매장용 상세설명서 보기(읽기 전용, listing 전용)
  const [descProduct, setDescProduct] = useState<StoreDescriptionProduct | null>(null);
  // WO-...-ACTIONS-AND-MULTILINGUAL-DESCRIPTION-V1: 이미 등록된 상품별 QR 출력(읽기 전용)
  const [qrTarget, setQrTarget] = useState<StoreProductQrTarget | null>(null);
  // WO-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1: O4O 표준 상품 검색·선택·등록 모달
  const [showAddO4oModal, setShowAddO4oModal] = useState(false);
  // WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P1): 신규 상품 등록 요청 상태
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [editRequest, setEditRequest] = useState<StoreProductRequest | null>(null);
  const [showRequestsListModal, setShowRequestsListModal] = useState(false);
  const [requestsRefreshKey, setRequestsRefreshKey] = useState(0);

  // 신규 요청 모달 열기(신규 작성)
  const openNewRequest = useCallback(() => { setEditRequest(null); setShowNewRequestModal(true); }, []);
  // 목록에서 보완 요청 건 편집 → 편집 모달 오픈(목록은 닫음)
  const openEditRequest = useCallback((req: StoreProductRequest) => {
    setShowRequestsListModal(false);
    setEditRequest(req);
    setShowNewRequestModal(true);
  }, []);
  // 요청 제출/재제출/기존추가 성공 후 — 요청 목록 + 매장 경영활용 목록 갱신
  const handleRequestSubmitted = useCallback(() => {
    setRequestsRefreshKey((k) => k + 1);
    reload();
  }, [reload]);

  // WO-O4O-KPA-STORE-PRODUCT-QR-ALWAYS-AVAILABLE-V1: 상품 QR 출력 — 다국어 무관 상품 기준 고정 QR.
  //   모달이 sourceType/sourceId 로 master 기준 QR + 제공 언어를 조회한다(항상 사용 가능).
  const openProductQr = useCallback((it: HandledProduct) => {
    setQrTarget({ name: it.name, sourceType: it.sourceType, sourceId: it.sourceId });
  }, []);

  const changePageSize = useCallback(
    (next: number) => {
      setLimit(next);
      setPage(1);
      patchParams({ limit: next === DEFAULT_PAGE_SIZE ? null : String(next), page: null });
    },
    [patchParams],
  );

  const changePage = useCallback(
    (next: number) => {
      setPage(next);
      patchParams({ page: next === 1 ? null : String(next) });
    },
    [patchParams],
  );

  // ─── 선택 ─────────────────────────────────────────────────────────────────
  const allSelected = items.length > 0 && items.every((it) => selected.has(rowKey(it)));
  const toggleAll = useCallback(() => {
    setSelected((prev) => (prev.size >= items.length && items.length > 0 ? new Set() : new Set(items.map(rowKey))));
  }, [items]);
  const toggleOne = useCallback((key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);
  const clearSelection = useCallback(() => setSelected(new Set()), []);

  const selectedItems = useMemo(() => items.filter((it) => selected.has(rowKey(it))), [items, selected]);
  const singleSelected = selectedItems.length === 1 ? selectedItems[0] : null;

  // WO-...-REMOVE-AND-STATUS-AUDIT-V1: 매장 경영활용에서 제거(연결 해제) — 1건/다건.
  const handleRemove = useCallback(async () => {
    if (selectedItems.length === 0 || removing) return;
    // WO-...-CATEGORY-COLUMN-V1: '연결 콘텐츠' 개념 제거 → 연결 콘텐츠 경고 문구 삭제(연결 해제 시 자료함/QR 미삭제는 유지).
    const msg =
      '선택한 제품을 매장 경영활용 제품 목록에서 제거하시겠습니까?\nO4O 표준 상품 정보와 상세설명서·자료함 콘텐츠·QR은 삭제되지 않습니다.';
    if (!window.confirm(msg)) return;
    setRemoving(true);
    try {
      const res = await removeHandledProducts(
        selectedItems.map((it) => ({ sourceType: it.sourceType, sourceId: it.sourceId })),
      );
      if (res.removed > 0) toast.success(`${res.removed}개 제품을 매장 경영활용에서 제거했습니다.`);
      if (res.failed.length > 0) toast.error(`${res.failed.length}개 제품 제거에 실패했습니다.`);
      clearSelection();
      reload();
    } catch (e: any) {
      toast.error(e?.message || '제거에 실패했습니다');
    } finally {
      setRemoving(false);
    }
  }, [selectedItems, removing, clearSelection, reload]);

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <div>
          <div style={styles.breadcrumb}>
            <span>약국 상품·거래</span>
            <span style={{ color: colors.neutral300 }}>/</span>
            <span style={{ color: colors.neutral700 }}>매장 경영활용 제품</span>
          </div>
          <h1 style={styles.title}>
            <Boxes size={20} style={{ color: colors.primary }} />
            매장 경영활용 제품
          </h1>
          <p style={styles.subtitle}>
            약국 경영에 활용할 O4O 제품을 확인·정리합니다.
            실제 작업(매장용 상세설명 보기 / 콘텐츠 만들기 / 다국어 QR)은 제품을 선택한 뒤 수행합니다.
          </p>
        </div>
        <div style={styles.headerActions}>
          {/* WO-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1:
              O4O 표준 상품 DB(ProductMaster)를 검색·선택하여 매장 경영활용 제품으로 등록. */}
          <button onClick={() => setShowAddO4oModal(true)} style={styles.primaryBtn}>
            <Boxes size={14} />
            O4O 표준 상품에서 추가
          </button>
          {/* WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P1):
              O4O DB 에 없는 신규 상품의 등록 요청(제출·상태). 기존 상품은 위 '표준 상품에서 추가'로. */}
          <button onClick={openNewRequest} style={styles.requestBtn}>
            <PlusCircle size={14} />
            신규 상품 등록 요청
          </button>
          <button onClick={() => setShowRequestsListModal(true)} style={styles.refreshBtn}>
            <ClipboardList size={14} />
            내 등록 요청
          </button>
          {/* WO-...-REMOVE-AND-STATUS-AUDIT-V1: 이 화면의 '매장 직접 등록' 버튼 제거(진입 정리).
              WO-O4O-KPA-STORE-LOCAL-PRODUCTS-ENTRY-ALIGNMENT-V1: store_local_products 는 유효한 데이터 축이며
              등록·수정은 '약국 상품·거래 > 매장 자체 상품' 메뉴에서 수행한다(이 화면에 버튼 재추가 금지). */}
          <button onClick={reload} style={styles.refreshBtn}>
            <RefreshCw size={14} />
            새로고침
          </button>
        </div>
      </div>

      <div style={styles.toolbar}>
        <div style={{ flex: 1 }} />
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
        <div style={{ flex: 1 }} />
        <label style={styles.pageSizeLabel}>
          페이지당
          <select
            value={limit}
            onChange={(e) => changePageSize(Number(e.target.value))}
            style={styles.pageSizeSelect}
            aria-label="페이지당 건수"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}건
              </option>
            ))}
          </select>
        </label>
      </div>

      {/* WO-...-STANDARD-TABLE-V1 / REMOVE-AND-STATUS-AUDIT-V1: Selection ActionBar.
          1건 선택 시 컨텍스트 작업 + 제거, 여러 건 선택 시 제거 + 선택 해제. */}
      {selected.size > 0 && (
        <div style={styles.selectionBar}>
          <span style={styles.selectionCount}>{selected.size}개 선택됨</span>
          <div style={{ flex: 1 }} />
          {singleSelected && (
            <>
              {/* WO-...-DESCRIPTION-USAGE-POLICY-FIX-V1: 복사 아님 — 매장용(STORE) 상세설명서 다국어 조회(읽기 전용). */}
              <button
                type="button"
                onClick={() => setDescProduct({ listingId: singleSelected.sourceId, name: singleSelected.name })}
                style={styles.importBtn}
              >
                <FileText size={13} />
                매장용 상세설명서 보기
              </button>
              {/* WO-O4O-KPA-STORE-MULTILINGUAL-PRODUCT-CONTENT-ENTRY-LINK-V1: 기존 다국어 상품콘텐츠 저작 화면 진입점 연결.
                  handledProducts sourceType('local'|'listing')·sourceId 를 route param(targetKind·targetId)에 그대로 전달. */}
              <button
                type="button"
                onClick={() =>
                  navigate(
                    `/store/products/multilingual/${singleSelected.sourceType}/${singleSelected.sourceId}?name=${encodeURIComponent(singleSelected.name)}`,
                  )
                }
                style={styles.langBtn}
              >
                <Languages size={13} />
                다국어 콘텐츠
              </button>
              {/* WO-O4O-KPA-STORE-PRODUCT-QR-ALWAYS-AVAILABLE-V1: 상품 기준 고정 QR 출력(다국어 무관 항상 사용). */}
              <button type="button" onClick={() => openProductQr(singleSelected)} style={styles.mlcBtn}>
                <QrCode size={13} />
                상품 QR 출력
              </button>
            </>
          )}
          {/* WO-...-REMOVE-AND-STATUS-AUDIT-V1: 매장 경영활용에서 제거(연결 해제, 원본 무접촉). 1건/다건 공통. */}
          <button type="button" onClick={handleRemove} disabled={removing} style={styles.removeBtn}>
            {removing ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
            매장 경영활용에서 제거
          </button>
          <button type="button" onClick={clearSelection} style={styles.clearBtn}>
            <X size={13} />
            선택 해제
          </button>
        </div>
      )}

      <div style={styles.tableWrap}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: 40 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleAll}
                  style={styles.checkbox}
                  aria-label="전체 선택"
                  disabled={items.length === 0}
                />
              </th>
              <th style={{ ...styles.th, textAlign: 'left' }}>제품</th>
              <th style={styles.th}>구분</th>
              {/* WO-O4O-KPA-STORE-HANDLED-PRODUCT-CATEGORY-COLUMN-V1: '연결 콘텐츠' 제거 → O4O 표준 '분류' */}
              <th style={styles.th}>분류</th>
              <th style={styles.th}>매장 표시 가격</th>
              <th style={styles.th}>최근 수정일</th>
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
                <td colSpan={6} style={styles.empty}>{searchQuery ? '검색 결과가 없습니다' : EMPTY_MESSAGE}</td>
              </tr>
            ) : (
              items.map((it) => {
                const key = rowKey(it);
                const isSelected = selected.has(key);
                return (
                  <tr key={key} style={{ ...styles.row, ...(isSelected ? styles.rowSelected : null) }}>
                    <td style={styles.tdCheckbox}>
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleOne(key)}
                        style={styles.checkbox}
                        aria-label={`${it.name} 선택`}
                      />
                    </td>
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
                      <Badge text="O4O 기반 제품" tone="blue" />
                    </td>
                    {/* WO-O4O-KPA-STORE-HANDLED-PRODUCT-CATEGORY-COLUMN-V1: O4O 표준 분류(미분류 안전 표시) */}
                    <td style={styles.td}>
                      {it.classificationCode && it.classificationCode !== 'unknown' ? (
                        <Badge text={it.classificationLabel} tone="gray" />
                      ) : (
                        <span style={{ color: colors.neutral400 }}>미분류</span>
                      )}
                    </td>
                    <td style={styles.td}>{formatPrice(it.price)}</td>
                    <td style={styles.td}>{formatDate(it.updatedAt)}</td>
                    {/* WO-...-REMOVE-AND-STATUS-AUDIT-V1: '상태'(승인 대기) 컬럼 제거 — 이 화면엔 승인 절차 없음. */}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={changePage} total={total} />

      {/* WO-O4O-STORE-HANDLED-PRODUCTS-PRODUCTMASTER-LIST-LINK-V1: O4O 표준 상품 검색·선택·등록 모달 */}
      <AddO4oStandardProductModal
        open={showAddO4oModal}
        onClose={() => setShowAddO4oModal(false)}
        onRegistered={reload}
      />

      {/* WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-AND-ADMIN-APPROVAL-V1 (P1): 신규 상품 등록 요청 제출/재제출 */}
      <StoreNewProductRequestModal
        open={showNewRequestModal}
        editRequest={editRequest}
        onClose={() => { setShowNewRequestModal(false); setEditRequest(null); }}
        onSubmitted={handleRequestSubmitted}
        onAddExisting={() => setShowAddO4oModal(true)}
      />

      {/* 내 신규 상품 등록 요청 목록·상태 */}
      <StoreProductRequestsListModal
        open={showRequestsListModal}
        onClose={() => setShowRequestsListModal(false)}
        onEdit={openEditRequest}
        refreshKey={requestsRefreshKey}
      />

      {/* WO-...-DESCRIPTION-USAGE-POLICY-FIX-V1 / ACTIONS-AND-MULTILINGUAL-V1: 매장용 상세설명서 다국어 조회(읽기 전용) */}
      <StoreDescriptionViewModal
        open={!!descProduct}
        product={descProduct}
        onClose={() => setDescProduct(null)}
      />

      {/* WO-...-ACTIONS-AND-MULTILINGUAL-DESCRIPTION-V1: 이미 등록된 상품별 QR 출력(미리보기·다운로드·인쇄, 읽기 전용) */}
      <StoreProductQrModal
        open={!!qrTarget}
        target={qrTarget}
        onClose={() => setQrTarget(null)}
      />

      <p style={styles.footnote}>
        ※ 이 목록은 진열·콘텐츠·온라인 노출에 활용할 O4O 제품 풀입니다. 타블렛 진열·온라인 판매 등 채널별 설정은 각 채널 메뉴에서 관리합니다.
        {' '}‘매장 경영활용에서 제거’는 매장과 제품의 경영활용 연결만 해제하며, O4O 표준 상품 정보·상세설명서·자료함 콘텐츠·QR은 삭제되지 않습니다.
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
  primaryBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: colors.primary, border: `1px solid ${colors.primary}`, borderRadius: '6px', fontSize: '13px', color: colors.white, cursor: 'pointer' },
  // WO-O4O-KPA-STORE-NEW-PRODUCT-REQUEST-V1: 신규 요청 버튼(보조 강조 톤)
  requestBtn: { display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', background: '#EFF6FF', border: `1px solid ${colors.primary}`, borderRadius: '6px', fontSize: '13px', color: colors.primary, cursor: 'pointer', fontWeight: 500 },
  toolbar: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '12px', flexWrap: 'wrap' },
  searchWrap: { position: 'relative', minWidth: '220px' },
  searchIcon: { position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: colors.neutral400, pointerEvents: 'none' },
  searchInput: { width: '100%', padding: '8px 12px 8px 30px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', fontSize: '13px', outline: 'none', background: colors.white, boxSizing: 'border-box' },
  countRow: { display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' },
  countBadge: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: '12px', fontWeight: 500, color: colors.neutral600, background: colors.neutral100, borderRadius: '999px' },
  pageSizeLabel: { display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: colors.neutral500 },
  pageSizeSelect: { padding: '5px 8px', border: `1px solid ${colors.neutral300}`, borderRadius: '6px', fontSize: '12px', color: colors.neutral700, background: colors.white, cursor: 'pointer' },
  // WO-...-STANDARD-TABLE-V1: Selection ActionBar
  selectionBar: { display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', marginBottom: '10px', background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: '8px', flexWrap: 'wrap' },
  selectionCount: { fontSize: '13px', fontWeight: 600, color: '#1D4ED8' },
  clearBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: colors.white, border: `1px solid ${colors.neutral300}`, borderRadius: '6px', fontSize: '12px', color: colors.neutral700, cursor: 'pointer' },
  // WO-...-REMOVE-AND-STATUS-AUDIT-V1: 제거 버튼(위험 액션 톤)
  removeBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: '#FEF2F2', border: '1px solid #FCA5A5', borderRadius: '6px', fontSize: '12px', color: '#DC2626', cursor: 'pointer', whiteSpace: 'nowrap' },
  tableWrap: { overflowX: 'auto', border: `1px solid ${colors.neutral200}`, borderRadius: '8px', background: colors.white },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: '13px' },
  th: { padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600, color: colors.neutral500, background: '#F8FAFC', borderBottom: `1px solid ${colors.neutral200}`, whiteSpace: 'nowrap' },
  row: { borderBottom: `1px solid ${colors.neutral100}` },
  rowSelected: { background: '#EFF6FF' },
  td: { padding: '10px 12px', textAlign: 'center', color: colors.neutral700, whiteSpace: 'nowrap' },
  tdCheckbox: { padding: '10px 12px', textAlign: 'center', width: 40 },
  tdProduct: { padding: '10px 12px', textAlign: 'left', minWidth: '240px' },
  productCell: { display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 },
  thumb: { width: '36px', height: '36px', borderRadius: '6px', objectFit: 'cover', border: `1px solid ${colors.neutral200}`, flexShrink: 0 },
  thumbPlaceholder: { width: '36px', height: '36px', borderRadius: '6px', background: colors.neutral100, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 },
  productName: { fontSize: '14px', fontWeight: 500, color: colors.neutral800, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  badge: { display: 'inline-flex', alignItems: 'center', padding: '2px 8px', fontSize: '11px', fontWeight: 500, borderRadius: '999px', whiteSpace: 'nowrap' },
  checkbox: { width: 15, height: 15, cursor: 'pointer', accentColor: colors.primary },
  // WO-...-STANDARD-TABLE-V1: Selection ActionBar 액션 버튼
  importBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: '#F0FDF4', border: '1px solid #86EFAC', borderRadius: '6px', fontSize: '12px', color: '#15803D', cursor: 'pointer', whiteSpace: 'nowrap' },
  mlcBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: '#F5F3FF', border: '1px solid #C4B5FD', borderRadius: '6px', fontSize: '12px', color: '#6D28D9', cursor: 'pointer', whiteSpace: 'nowrap' },
  langBtn: { display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '5px 12px', background: '#EEF2FF', border: '1px solid #A5B4FC', borderRadius: '6px', fontSize: '12px', color: '#4338CA', cursor: 'pointer', whiteSpace: 'nowrap' },
  empty: { padding: '40px 12px', textAlign: 'center', color: colors.neutral400, fontSize: '13px' },
  footnote: { marginTop: '14px', fontSize: '12px', color: colors.neutral500, lineHeight: 1.7, padding: '10px 12px', background: colors.neutral100, borderRadius: '6px' },
};
