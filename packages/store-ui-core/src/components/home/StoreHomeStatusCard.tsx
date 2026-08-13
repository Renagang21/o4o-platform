/**
 * StoreHomeStatusCard — 내 매장 홈 매장 상태 카드 (canonical)
 *
 * WO-O4O-MY-STORE-HOME-STORE-STATUS-CARD-CROSSSERVICE-COMMONIZATION-V1
 * 선행: WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1 (StoreHomeShell.statusSlot)
 *
 * 공통화 대상은 상태 카드의 **구성 계약**이다:
 *  - 아이콘 / 매장명 / 보조문구 / 상태 배지 / 메타(역할·코드·멤버수·승인일시 등) /
 *    경고·안내 / 보조 액션 의 배치 순서와 조건부 렌더
 *
 * 공통화 대상이 **아닌** 것 — 서비스가 소유한다:
 *  - 상태 값의 의미와 판정 (가입/연결 상태 vs 매장 운영 승인 상태는 서로 다른 축이다)
 *  - membership/role 판정, 상태→라벨·tone 매핑, 경고 노출 조건
 *  - 데이터 fetch (본 컴포넌트는 API 를 알지 않는다)
 *  → 배지·경고·액션은 slot 으로 받고, 이 컴포넌트는 배치만 담당한다.
 */

import type { ReactElement, ReactNode } from 'react';

/**
 * stacked : 아이콘+매장명 한 줄 → 보조문구 → (우측 배지) → 경고 → 메타 dl → 하단 액션
 *           (Pharmacy-Hub 매장 경영 홈 — 가입/연결 상태)
 * inline  : 아이콘 옆에 [매장명 + 배지] → 메타 한 줄, 우측에 액션
 *           (K-Cosmetics 매장 코크핏 — 매장 운영 승인 상태)
 */
export type StoreHomeStatusVariant = 'stacked' | 'inline';

export interface StoreHomeStatusMetaItem {
  key: string;
  /** stacked 는 dt 로, inline 은 값 앞 접두 문구로 사용 */
  label?: string;
  value: ReactNode;
}

export interface StoreHomeStatusCardProps {
  variant?: StoreHomeStatusVariant;
  icon?: ReactNode;
  /** 아이콘 박스 class (서비스 accent) */
  iconWrapClassName?: string;
  /** 매장명 등 제목 — 로딩/오류 문구도 서비스가 결정해 넘긴다 */
  title: ReactNode;
  titleClassName?: string;
  /** 제목 아래 보조 문구 (stacked) */
  subtitle?: ReactNode;
  /** 상태 배지 — 라벨·tone·로딩/오류 표현은 서비스 소유 */
  badgeSlot?: ReactNode;
  /** 메타 항목. 미노출 조건(예: 오류 시 숨김)은 서비스가 결정한다 */
  meta?: StoreHomeStatusMetaItem[];
  /** 경고·안내 (노출 조건은 서비스가 결정) */
  notices?: ReactNode;
  /** 우측 보조 액션 (inline) */
  actionsSlot?: ReactNode;
  /** 하단 보조 액션/링크 (stacked) */
  footerSlot?: ReactNode;
  /** 헤더 행 class override */
  headerClassName?: string;
  /** 기본 컨테이너(section) 대신 서비스 Card 등으로 감싼다 */
  wrapper?: (content: ReactNode) => ReactElement;
  className?: string;
}

const DEFAULT_CONTAINER = 'rounded-xl border border-slate-200 bg-white p-5';
const STACKED_HEADER = 'flex flex-wrap items-start justify-between gap-3';
const INLINE_HEADER = 'flex flex-col md:flex-row md:items-center md:justify-between gap-4';

export function StoreHomeStatusCard({
  variant = 'stacked',
  icon,
  iconWrapClassName,
  title,
  titleClassName,
  subtitle,
  badgeSlot,
  meta,
  notices,
  actionsSlot,
  footerSlot,
  headerClassName,
  wrapper,
  className,
}: StoreHomeStatusCardProps) {
  const inline = variant === 'inline';

  const body = inline ? (
    <>
      <div className={headerClassName ?? INLINE_HEADER}>
        <div className="flex items-center gap-4">
          {icon && <div className={iconWrapClassName}>{icon}</div>}
          <div>
            <div className="flex items-center gap-3">
              <h1 className={titleClassName ?? 'text-xl font-bold text-slate-800'}>{title}</h1>
              {badgeSlot}
            </div>
            {meta && meta.length > 0 && (
              <div className="flex items-center gap-4 mt-1 text-sm text-slate-500">
                {meta.map((item) => (
                  <span key={item.key}>
                    {item.label ? `${item.label}: ` : ''}
                    {item.value}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
        {actionsSlot}
      </div>
      {notices}
      {footerSlot}
    </>
  ) : (
    <>
      <div className={headerClassName ?? STACKED_HEADER}>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {icon && <span className={iconWrapClassName}>{icon}</span>}
            <p className={titleClassName ?? 'truncate text-base font-semibold text-slate-900'}>
              {title}
            </p>
          </div>
          {subtitle !== undefined && (
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          )}
        </div>
        {badgeSlot}
      </div>

      {notices}

      {meta && meta.length > 0 && (
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          {meta.map((item) => (
            <div key={item.key} className="flex gap-2">
              {item.label && <dt className="w-20 shrink-0 text-slate-500">{item.label}</dt>}
              <dd className="text-slate-800">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}

      {actionsSlot}
      {footerSlot}
    </>
  );

  if (wrapper) return wrapper(body);
  return <section className={className ?? DEFAULT_CONTAINER}>{body}</section>;
}
