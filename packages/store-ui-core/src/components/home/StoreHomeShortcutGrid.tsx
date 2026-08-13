/**
 * StoreHomeShortcutGrid — 내 매장 홈 바로가기(quick action) 영역 (canonical)
 *
 * WO-O4O-MY-STORE-HOME-SHORTCUT-GRID-CROSSSERVICE-COMMONIZATION-V1
 * 선행: WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1 (StoreHomeShell + home parts)
 *
 * 공통화 대상은 바로가기 항목의 **구조·동작**이다:
 *  - 아이콘 / 제목 / 설명 / 이동 경로(또는 onClick)
 *  - hidden(미노출) · disabled(비활성 + 사유 tooltip) 조건 처리
 *  - 반응형 wrapping (card = grid, chip = flex-wrap)
 *
 * 공통화 대상이 아닌 것(서비스가 결정):
 *  - 바로가기 항목·문구·경로·개수 (items) — 서비스별 개수를 동일화하지 않는다
 *  - 노출 조건(권한/연결 상태 등)의 판단 — 서비스가 hidden/disabled 로 계산해 넘긴다
 *  - 항목을 감싸는 상위 구조(단계 헤딩, 섹션 제목 등)
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * card : 아이콘 박스 + 제목 + 설명 카드 그리드 (Pharmacy-Hub 매장 경영 홈)
 * chip : 아이콘 + 라벨 한 줄 칩, flex-wrap (KPA 내 약국 홈 '실행 흐름' 단계별 진입점)
 */
export type StoreHomeShortcutVariant = 'card' | 'chip';

export interface StoreHomeShortcutItem {
  /** 미지정 시 to ?? label 을 key 로 사용 */
  key?: string;
  label: string;
  /** card variant 에서만 렌더 */
  description?: string;
  icon?: ReactNode;
  /** 이동 경로. onClick 과 함께 쓰지 않는다. 미구현 route 를 넣지 않는다. */
  to?: string;
  onClick?: () => void;
  /** true 면 렌더하지 않는다 (dead link 대신 숨김) */
  hidden?: boolean;
  /** true 면 이동 불가 상태로 렌더 */
  disabled?: boolean;
  /** disabled 사유 — title 로 노출 */
  disabledReason?: string;
}

export interface StoreHomeShortcutGridProps {
  items: StoreHomeShortcutItem[];
  variant?: StoreHomeShortcutVariant;
  /** 컨테이너 class override (card 기본: sm 2열 / lg 3열 grid, chip 기본: flex-wrap) */
  className?: string;
  /** 항목 class override — 서비스 accent 색을 바꿀 때 사용 */
  itemClassName?: string;
  /** card variant 아이콘 박스 class override */
  iconWrapClassName?: string;
  /** card variant 제목 class override */
  labelClassName?: string;
  'aria-label'?: string;
}

const CARD_CONTAINER = 'grid gap-4 sm:grid-cols-2 lg:grid-cols-3';
const CARD_ITEM =
  'group rounded-xl border border-slate-200 bg-white p-5 transition-colors hover:border-teal-300 hover:bg-teal-50/40';
const CARD_ICON_WRAP =
  'inline-flex h-10 w-10 items-center justify-center rounded-lg bg-teal-50 text-teal-700';
const CARD_LABEL = 'mt-3 font-semibold text-slate-900 group-hover:text-teal-800';

const CHIP_CONTAINER = 'flex flex-wrap gap-2';
const CHIP_ITEM =
  'inline-flex items-center gap-1.5 px-3.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 no-underline text-[13px] font-medium text-slate-700 transition-colors hover:border-primary';

const DISABLED = 'opacity-50 pointer-events-none';

export function StoreHomeShortcutGrid({
  items,
  variant = 'card',
  className,
  itemClassName,
  iconWrapClassName,
  labelClassName,
  'aria-label': ariaLabel,
}: StoreHomeShortcutGridProps) {
  const visible = items.filter((item) => !item.hidden);
  if (visible.length === 0) return null;

  const isCard = variant === 'card';
  const containerClass =
    className ?? (isCard ? CARD_CONTAINER : CHIP_CONTAINER);
  const baseItemClass = itemClassName ?? (isCard ? CARD_ITEM : CHIP_ITEM);

  return (
    <section className={containerClass} aria-label={ariaLabel}>
      {visible.map((item) => {
        const key = item.key ?? item.to ?? item.label;
        const content = isCard ? (
          <>
            {item.icon && (
              <span className={iconWrapClassName ?? CARD_ICON_WRAP}>{item.icon}</span>
            )}
            <p className={labelClassName ?? CARD_LABEL}>{item.label}</p>
            {item.description && (
              <p className="mt-1 text-sm text-slate-600">{item.description}</p>
            )}
          </>
        ) : (
          <>
            {item.icon}
            <span>{item.label}</span>
          </>
        );

        const itemClass = item.disabled ? `${baseItemClass} ${DISABLED}` : baseItemClass;
        const title = item.disabled ? item.disabledReason : undefined;

        if (item.disabled) {
          return (
            <span key={key} className={itemClass} title={title} aria-disabled="true">
              {content}
            </span>
          );
        }

        if (item.onClick) {
          return (
            <button key={key} type="button" onClick={item.onClick} className={itemClass}>
              {content}
            </button>
          );
        }

        return (
          <Link key={key} to={item.to ?? '#'} className={itemClass}>
            {content}
          </Link>
        );
      })}
    </section>
  );
}
