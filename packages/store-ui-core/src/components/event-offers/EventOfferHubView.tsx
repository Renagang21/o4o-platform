/**
 * EventOfferHubView — Store HUB 이벤트 오퍼 목록 공통 View
 *
 * WO-O4O-STORE-HUB-COMMON-VIEW-AND-SHELL-UNIFICATION-V1
 *
 * GP/KCos 의 단순 목록(EventOffersHubList)과 KPA 의 선택·묶음 담기 화면이 같은 테이블
 * (상품명 / 공급업체 / 가격 / 날짜 / 상태 / 작업)을 각각 그리고 있었다. 그 테이블을 여기로 모은다.
 *
 * 서비스 차이는 **config + slot** 으로만 표현한다 (서비스명 조건문 금지).
 *   - selection      : 선택 컬럼 사용 여부 (KPA 공급업체 묶음 담기)
 *   - dateColumn     : '승인일'(GP/KCos) vs '기간'(KPA)
 *   - showDiscount   : 이벤트가/정가/할인율 표기 (KPA)
 *   - renderName     : 상세 링크 여부
 *   - renderAction   : 행 액션 셀 (담기 버튼 / 곧 시작 / 매진 / 종료됨 …)
 *   - header / beforeTable / afterTable / empty : 화면별 고유 영역 slot
 *
 * 업무 경계: 이벤트 참여(장바구니 담기) ≠ 주문. 이 View 는 담기까지만 다루고 주문 확정은
 * /store-hub/cart → checkout-confirm 이 소유한다.
 */

import type { ReactNode } from 'react';
import { Loader2, Tag } from 'lucide-react';
import { resolveEventOfferStatusLabel } from './eventOfferStatus';

/** 배지 스타일만 View 가 소유하고, 라벨은 공통 매핑(EVENT_OFFER_STATUS_LABEL)을 쓴다. */
const STATUS_BADGE_CLASS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  approved: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  upcoming: 'bg-blue-100 text-blue-700',
  sold_out: 'bg-slate-100 text-slate-500',
  ended: 'bg-slate-100 text-slate-500',
  canceled: 'bg-red-100 text-red-500',
};

/** Tailwind 정적 class — 선택 컬럼 유무에 따른 grid 두 종류를 미리 나열한다. */
const GRID_WITH_SELECTION = 'grid grid-cols-[44px_2fr_1.2fr_1fr_1fr_1fr_140px] gap-4';
const GRID_PLAIN = 'grid grid-cols-[2fr_1.2fr_1fr_1fr_1fr_140px] gap-4';

export interface EventOfferHubRow {
  id: string;
  productName: string;
  supplierName: string;
  status: string;
  /** 표시 가격 — unitPrice 우선, 없으면 price */
  unitPrice?: number | null;
  price?: number | null;
  /** 비교 표시용 정가 (showDiscount 일 때만 사용) */
  generalPrice?: number | null;
  totalQuantity?: number | null;
  perOrderLimit?: number | null;
}

export interface EventOfferHubSelection<T> {
  /** 선택 가능한 항목 (진행 중 등) */
  selectableIds: Set<string>;
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  /** 행이 선택 가능한지 — 불가하면 빈 칸 */
  isSelectable: (item: T) => boolean;
}

export interface EventOfferHubViewProps<T extends EventOfferHubRow> {
  items: T[];
  loading: boolean;
  /** 조회 실패 표시 — 실패를 빈 목록으로 위장하지 않는다. */
  errorSlot?: ReactNode;
  spinnerClassName?: string;

  /** 화면 상단 (제목 · 안내 · 장바구니 링크). 화면마다 달라 통째로 주입한다. */
  header?: ReactNode;
  /** 테이블 위 영역 (탭 · 툴바 · 통계 · 선택 액션바) */
  beforeTable?: ReactNode;
  /** 테이블 아래 영역 (pagination · 묶음 담기 패널) */
  afterTable?: ReactNode;
  /** 목록이 비었을 때 */
  empty?: ReactNode;

  nameHeader?: string;
  dateHeader: string;
  formatDate: (item: T) => string;
  renderName?: (item: T) => ReactNode;
  renderAction: (item: T) => ReactNode;

  selection?: EventOfferHubSelection<T>;
  showDiscount?: boolean;
  /** 행 비활성 표시(진행 중이 아닌 항목) */
  isDimmed?: (item: T) => boolean;
}

function formatPrice(value: number | null | undefined): string {
  if (value == null) return '-';
  return '₩' + value.toLocaleString('ko-KR');
}

function discountOf(item: EventOfferHubRow): { amount: number; rate: number } | null {
  const ep = Number(item.unitPrice ?? item.price);
  const gp = Number(item.generalPrice);
  if (!Number.isFinite(ep) || !Number.isFinite(gp) || gp <= 0 || ep >= gp) return null;
  const amount = gp - ep;
  return { amount, rate: Math.round((amount / gp) * 100) };
}

export function EventOfferHubView<T extends EventOfferHubRow>({
  items,
  loading,
  errorSlot,
  spinnerClassName = 'text-slate-500',
  header,
  beforeTable,
  afterTable,
  empty,
  nameHeader = '상품명',
  dateHeader,
  formatDate,
  renderName,
  renderAction,
  selection,
  showDiscount = false,
  isDimmed,
}: EventOfferHubViewProps<T>) {
  const grid = selection ? GRID_WITH_SELECTION : GRID_PLAIN;
  const allSelected =
    !!selection &&
    selection.selectableIds.size > 0 &&
    selection.selectedIds.size === selection.selectableIds.size;

  return (
    <div className="space-y-6">
      {header}
      {errorSlot}
      {beforeTable}

      <div className="bg-white rounded-xl border border-slate-100 overflow-hidden">
        {loading ? (
          <div className="flex justify-center items-center py-16">
            <Loader2 size={28} className={`animate-spin ${spinnerClassName}`} />
          </div>
        ) : items.length === 0 ? (
          empty ?? (
            <div className="text-center py-16 text-slate-500">
              <Tag size={36} className="mx-auto mb-3 text-slate-300" />
              <p className="font-medium text-sm">진행 중인 이벤트 오퍼가 없습니다.</p>
              <p className="text-xs mt-1 text-slate-400">
                운영자가 승인한 이벤트가 여기에 표시됩니다.
              </p>
            </div>
          )
        ) : (
          <div>
            {/* Table Header */}
            <div
              className={`${grid} px-5 py-3 bg-slate-50 border-b border-slate-100 text-xs font-semibold text-slate-500 uppercase tracking-wide items-center`}
            >
              {selection && (
                <span className="text-center">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={selection.onToggleAll}
                    aria-label="전체 선택"
                  />
                </span>
              )}
              <span>{nameHeader}</span>
              <span>공급사</span>
              <span>가격</span>
              <span>{dateHeader}</span>
              <span>상태</span>
              <span className="text-right">작업</span>
            </div>

            {items.map((item) => {
              const badgeCls = STATUS_BADGE_CLASS[item.status] ?? STATUS_BADGE_CLASS.approved;
              const badgeLabel = resolveEventOfferStatusLabel(item.status);
              const displayPrice = item.unitPrice ?? item.price ?? null;
              const discount = showDiscount ? discountOf(item) : null;
              const dimmed = isDimmed?.(item) ?? false;
              return (
                <div
                  key={item.id}
                  className={`${grid} px-5 py-4 border-b border-slate-100 last:border-0 items-center transition-colors ${
                    dimmed ? 'bg-slate-50/70 opacity-70' : 'hover:bg-slate-50/60'
                  }`}
                >
                  {selection && (
                    <span className="text-center">
                      {selection.isSelectable(item) ? (
                        <input
                          type="checkbox"
                          checked={selection.selectedIds.has(item.id)}
                          onChange={() => selection.onToggle(item.id)}
                          aria-label={`${item.productName} 선택`}
                        />
                      ) : (
                        <span className="inline-block w-4 h-4" />
                      )}
                    </span>
                  )}

                  <div className="min-w-0">
                    {renderName ? (
                      renderName(item)
                    ) : (
                      <p className="text-sm font-medium text-slate-800 truncate">
                        {item.productName}
                      </p>
                    )}
                    {item.totalQuantity != null && (
                      <p className="text-xs text-slate-400 mt-0.5">
                        잔여 {item.totalQuantity.toLocaleString()}개
                        {item.perOrderLimit != null ? ` · 1회 최대 ${item.perOrderLimit}개` : ''}
                      </p>
                    )}
                  </div>

                  <span className="text-sm text-slate-600 truncate">{item.supplierName}</span>

                  <div>
                    <span
                      className={`text-sm font-semibold ${discount ? 'text-red-600' : 'text-slate-700'}`}
                    >
                      {formatPrice(displayPrice)}
                    </span>
                    {discount && (
                      <>
                        <div className="text-[11px] text-slate-400 line-through">
                          {formatPrice(item.generalPrice)}
                        </div>
                        <div className="text-[11px] font-semibold text-red-600">
                          -{discount.rate}%
                        </div>
                      </>
                    )}
                  </div>

                  <span className="text-xs text-slate-500">{formatDate(item)}</span>

                  <span
                    className={`text-xs px-2.5 py-1 rounded-full font-medium inline-block w-fit ${badgeCls}`}
                  >
                    {badgeLabel}
                  </span>

                  <div className="flex justify-end">{renderAction(item)}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {afterTable}
    </div>
  );
}
