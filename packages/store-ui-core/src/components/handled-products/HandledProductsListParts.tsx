/**
 * 매장 경영활용 제품 목록 — 교차 서비스 canonical UI 파트
 *
 * WO-O4O-MY-STORE-HANDLED-PRODUCTS-VIEW-COMMONIZATION-V1
 * 선행: WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1 (홈 공통화),
 *       store-ui-core/types/handledProducts.ts (교차 서비스 데이터 계약)
 *
 * 공통화 범위 (구조·표시 규칙만):
 *   화면 header/설명 · 검색 · 총 건수 · loading/error/empty · 목록 table 기본 구조 ·
 *   제품명/분류/가격/수정일 표시 · pagination · row key
 *
 * 공통화하지 않는 것 (서비스 소유):
 *   API endpoint · 권한 · route · 등록/제거 정책 · 서비스별 액션
 *   (KPA: 표준상품 추가 · 신규상품 요청 · 상세설명서 · 다국어 · QR · 다중선택 /
 *    PharmacyHub: 매장 연결 상태 · 공급상품 추가 · 활성/비활성)
 *   → 전부 slot(ReactNode) 또는 columns.render 로 주입한다.
 *
 * 이 파일은 데이터 fetch 를 하지 않으며 서비스 API 를 알지 않는다.
 * K-Cosmetics StoreLocalProduct 는 다른 데이터 축이므로 대상이 아니다.
 */

import type { ReactNode } from 'react';
import { Package, Search } from 'lucide-react';
import { Pagination } from '@o4o/operator-ux-core';
import { handledProductKey, type HandledProductRef } from '../../types/handledProducts';

// ─── 표시 규칙 (서비스가 각자 만들던 포맷터를 하나로) ─────────────────────────

/** 매장 표시 가격 — 값이 없으면 em dash. 0 은 0원으로 표시한다. */
export function formatHandledProductPrice(price: number | null | undefined): string {
  return typeof price === 'number' ? `${price.toLocaleString('ko-KR')}원` : '—';
}

/** 최근 수정일 — 파싱 불가 값은 '-'. 시간은 표시하지 않는다. */
export function formatHandledProductDate(iso: string | null | undefined): string {
  if (!iso) return '-';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '-' : d.toLocaleDateString('ko-KR');
}

/** 분류 표시 — 코드가 없거나 'unknown' 이면 '미분류'. */
export function handledProductClassificationLabel(item: {
  classificationCode?: string | null;
  classificationLabel?: string | null;
}): string {
  const code = item.classificationCode;
  if (!code || code === 'unknown') return '미분류';
  return item.classificationLabel || '미분류';
}

export type HandledProductBadgeTone = 'blue' | 'green' | 'amber' | 'gray' | 'muted' | 'red';

const BADGE_TONE: Record<HandledProductBadgeTone, string> = {
  blue: 'bg-blue-50 text-blue-700',
  green: 'bg-green-50 text-green-700',
  amber: 'bg-amber-50 text-amber-700',
  gray: 'bg-slate-100 text-slate-600',
  muted: 'bg-slate-50 text-slate-400',
  red: 'bg-red-50 text-red-600',
};

export function HandledProductBadge({
  text,
  tone = 'gray',
}: {
  text: string;
  tone?: HandledProductBadgeTone;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${BADGE_TONE[tone]}`}
    >
      {text}
    </span>
  );
}

/** 제품 셀 — 썸네일(없으면 placeholder) + 제품명 + 보조 라벨(서비스 선택). */
export function HandledProductNameCell({
  name,
  imageUrl,
  secondaryLabel,
}: {
  name: string;
  imageUrl?: string | null;
  secondaryLabel?: string | null;
}) {
  return (
    <div className="flex min-w-0 items-center gap-2.5">
      {imageUrl ? (
        <img
          src={imageUrl}
          alt=""
          className="h-9 w-9 shrink-0 rounded-md border border-slate-200 object-cover"
        />
      ) : (
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-slate-100">
          <Package className="h-4 w-4 text-slate-400" />
        </div>
      )}
      <div className="min-w-0">
        <span className="block truncate text-sm font-medium text-slate-800" title={name}>
          {name}
        </span>
        {secondaryLabel ? (
          <span className="block truncate text-xs text-slate-400">{secondaryLabel}</span>
        ) : null}
      </div>
    </div>
  );
}

// ─── header / toolbar / count ────────────────────────────────────────────────

export interface HandledProductsPageHeaderProps {
  /** 서비스별 breadcrumb (미주입 시 생략) */
  breadcrumb?: ReactNode;
  /** 제목 왼쪽 아이콘 */
  icon?: ReactNode;
  title: string;
  /** 화면 설명 문구 — 서비스 문구가 SSOT */
  description?: ReactNode;
  /** 우측 액션 영역 (서비스별 등록/요청/새로고침 버튼) */
  actions?: ReactNode;
}

export function HandledProductsPageHeader({
  breadcrumb,
  icon,
  title,
  description,
  actions,
}: HandledProductsPageHeaderProps) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
      <div className="min-w-0">
        {breadcrumb ? (
          <div className="mb-1.5 flex items-center gap-1.5 text-[13px] text-slate-400">
            {breadcrumb}
          </div>
        ) : null}
        <h1 className="m-0 inline-flex items-center gap-2 text-xl font-semibold text-slate-800">
          {icon}
          {title}
        </h1>
        {description ? (
          <p className="mt-1.5 mb-0 max-w-[720px] text-[13px] leading-relaxed text-slate-500">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export interface HandledProductsToolbarProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  searchPlaceholder?: string;
  /**
   * 주입 시 검색이 form 제출 방식이 된다 (PharmacyHub).
   * 미주입 시 입력 즉시 반영 — 디바운스는 서비스가 소유한다 (KPA).
   */
  onSearchSubmit?: () => void;
  /** 검색 왼쪽 (예: 소스 탭) */
  leadingSlot?: ReactNode;
  /** 검색 오른쪽 (예: 등록 버튼) */
  trailingSlot?: ReactNode;
}

export function HandledProductsToolbar({
  searchValue,
  onSearchChange,
  searchPlaceholder = '제품명 검색',
  onSearchSubmit,
  leadingSlot,
  trailingSlot,
}: HandledProductsToolbarProps) {
  const searchField = (
    <div className="relative min-w-[220px]">
      <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
      <input
        type="search"
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder={searchPlaceholder}
        aria-label={searchPlaceholder}
        className="w-full rounded-md border border-slate-300 bg-white py-2 pl-8 pr-3 text-[13px] text-slate-700 outline-none"
      />
    </div>
  );

  return (
    <div className="mb-3 flex flex-wrap items-center gap-3">
      {leadingSlot}
      {onSearchSubmit ? (
        <form
          className="ml-auto flex items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            onSearchSubmit();
          }}
        >
          {searchField}
          <button
            type="submit"
            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-[13px] text-slate-700"
          >
            검색
          </button>
          {trailingSlot}
        </form>
      ) : (
        <div className="ml-auto flex items-center gap-2">
          {searchField}
          {trailingSlot}
        </div>
      )}
    </div>
  );
}

/** 총 건수 행 — 좌측 건수 배지, 우측 서비스 슬롯(예: 페이지당 건수). */
export function HandledProductsCountRow({
  total,
  rightSlot,
}: {
  total: number;
  rightSlot?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-center gap-2.5">
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
        {total}건
      </span>
      <div className="flex-1" />
      {rightSlot}
    </div>
  );
}

// ─── table ───────────────────────────────────────────────────────────────────

export interface HandledProductsColumn<T> {
  key: string;
  header: ReactNode;
  align?: 'left' | 'center' | 'right';
  /** th/td 공통 클래스 (폭 등) */
  className?: string;
  render: (item: T) => ReactNode;
}

export interface HandledProductsSelection {
  /** 선택된 row key 집합 (handledProductKey 결과) */
  selectedKeys: Set<string>;
  onToggle: (key: string) => void;
  onToggleAll: () => void;
}

export interface HandledProductsTableProps<T extends HandledProductRef> {
  items: T[];
  columns: Array<HandledProductsColumn<T>>;
  loading?: boolean;
  /** 조회 실패 — 정상 0건과 구분해서 표시한다 (실패를 빈 목록으로 삼키지 않는다). */
  error?: string | null;
  /** 정상 0건 안내 — 서비스 문구 */
  emptyContent?: ReactNode;
  loadingContent?: ReactNode;
  /** 다중 선택 (KPA). 미주입 시 체크박스 컬럼 없음 (PharmacyHub). */
  selection?: HandledProductsSelection;
  /** 행 추가 클래스 (선택 강조 외 서비스 표현) */
  rowClassName?: (item: T, selected: boolean) => string | undefined;
}

const ALIGN: Record<'left' | 'center' | 'right', string> = {
  left: 'text-left',
  center: 'text-center',
  right: 'text-right',
};

export function HandledProductsTable<T extends HandledProductRef>({
  items,
  columns,
  loading = false,
  error = null,
  emptyContent = '표시할 제품이 없습니다.',
  loadingContent = '불러오는 중…',
  selection,
  rowClassName,
}: HandledProductsTableProps<T>) {
  const colSpan = columns.length + (selection ? 1 : 0);
  const allSelected =
    !!selection &&
    items.length > 0 &&
    items.every((it) => selection.selectedKeys.has(handledProductKey(it)));

  const stateRow = (content: ReactNode, tone?: string) => (
    <tr>
      <td
        colSpan={colSpan}
        className={`px-3 py-10 text-center text-[13px] ${tone ?? 'text-slate-400'}`}
      >
        {content}
      </td>
    </tr>
  );

  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr>
            {selection && (
              <th className="w-10 whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-center text-xs font-semibold text-slate-500">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={selection.onToggleAll}
                  disabled={items.length === 0}
                  aria-label="전체 선택"
                  className="h-[15px] w-[15px] cursor-pointer"
                />
              </th>
            )}
            {columns.map((col) => (
              <th
                key={col.key}
                className={`whitespace-nowrap border-b border-slate-200 bg-slate-50 px-3 py-2.5 text-xs font-semibold text-slate-500 ${
                  ALIGN[col.align ?? 'center']
                } ${col.className ?? ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading
            ? stateRow(loadingContent)
            : error
              ? stateRow(error, 'text-red-600')
              : items.length === 0
                ? stateRow(emptyContent)
                : items.map((item) => {
                    const key = handledProductKey(item);
                    const selected = !!selection?.selectedKeys.has(key);
                    return (
                      <tr
                        key={key}
                        className={`border-b border-slate-100 ${selected ? 'bg-blue-50' : ''} ${
                          rowClassName?.(item, selected) ?? ''
                        }`}
                      >
                        {selection && (
                          <td className="w-10 px-3 py-2.5 text-center">
                            <input
                              type="checkbox"
                              checked={selected}
                              onChange={() => selection.onToggle(key)}
                              aria-label={`${key} 선택`}
                              className="h-[15px] w-[15px] cursor-pointer"
                            />
                          </td>
                        )}
                        {columns.map((col) => (
                          <td
                            key={col.key}
                            className={`px-3 py-2.5 text-slate-700 ${ALIGN[col.align ?? 'center']} ${
                              col.align === 'left' ? '' : 'whitespace-nowrap'
                            } ${col.className ?? ''}`}
                          >
                            {col.render(item)}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * 목록 pagination — @o4o/operator-ux-core Pagination 표준을 두 서비스가 공유한다.
 * totalPages <= 1 이면 렌더하지 않는다 (Pagination 계약).
 */
export function HandledProductsPagination({
  page,
  totalPages,
  total,
  onPageChange,
}: {
  page: number;
  totalPages: number;
  total?: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <Pagination page={page} totalPages={totalPages} total={total} onPageChange={onPageChange} />
  );
}
