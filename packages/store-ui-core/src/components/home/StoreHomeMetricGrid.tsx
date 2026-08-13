/**
 * StoreHomeMetricGrid — 내 매장 홈 KPI/요약 지표 그리드 (canonical)
 *
 * WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1
 * 선행: IR-O4O-STORE-HOME-CROSSSERVICE-AUDIT-V1 §4 "SummaryMetricCards 공통 추출"
 *
 * 공통화 대상은 지표 카드의 **구조·동작**이다:
 *  - 반응형 grid (모바일 2열 / 데스크톱 4열 기본)
 *  - loading 스켈레톤
 *  - 값 미정의 시 placeholder('–') — 0 과 구분한다 (조회 실패를 0 으로 삼키지 않는다)
 *  - `to` 지정 시 카드 전체를 Link 로 감싼다
 *
 * 공통화 대상이 아닌 것(서비스가 결정):
 *  - 지표 항목·라벨·아이콘·단위·색 (items)
 *  - 카드 표현 variant (아래 3종) — 서비스 화면을 강제로 동일하게 만들지 않는다
 *  - 데이터 fetch (본 컴포넌트는 API 를 알지 않는다)
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@o4o/ui';

/**
 * icon-centered : 아이콘 위 · 숫자 · 라벨 중앙정렬 (KPA 내 약국 홈)
 * icon-inline   : 아이콘+라벨 한 줄 → 숫자 → 보조문구 (K-Cosmetics cockpit)
 * label-top     : 라벨 → 숫자(+단위) → 힌트 (Pharmacy-Hub 매장 경영 홈)
 */
export type StoreHomeMetricVariant = 'icon-centered' | 'icon-inline' | 'label-top';

export interface StoreHomeMetricItem {
  key: string;
  label: string;
  /** 미정의(undefined/null)면 placeholder 표시. 0 은 0 으로 표시한다. */
  value?: ReactNode;
  unit?: string;
  /** 숫자 아래 보조 문구 */
  hint?: ReactNode;
  icon?: ReactNode;
  /** 지정 시 카드 전체가 이 경로로 이동 */
  to?: string;
  /** 숫자 색 override (Tailwind class) */
  valueClassName?: string;
  /** value/unit/hint 대신 카드 본문을 통째로 대체 (예: 채널 비율 목록) */
  content?: ReactNode;
}

export interface StoreHomeMetricGridProps {
  items: StoreHomeMetricItem[];
  variant?: StoreHomeMetricVariant;
  /** true 면 스켈레톤만 렌더 */
  loading?: boolean;
  /** grid column class override (기본: 모바일 2열 / lg 4열) */
  columnsClassName?: string;
  /** 값 미정의 시 표시 문자 (기본 '–') */
  placeholder?: string;
  className?: string;
}

const DEFAULT_COLUMNS = 'grid-cols-2 lg:grid-cols-4';

function MetricBody({
  item,
  variant,
  placeholder,
}: {
  item: StoreHomeMetricItem;
  variant: StoreHomeMetricVariant;
  placeholder: string;
}) {
  const hasValue = item.value !== undefined && item.value !== null;
  const valueNode = hasValue ? item.value : placeholder;
  const valueClass = item.valueClassName ?? 'text-primary';

  if (variant === 'label-top') {
    return (
      <>
        <p className="text-sm text-slate-500 m-0">{item.label}</p>
        {item.content ?? (
          <p className={`mt-1 text-2xl font-bold m-0 ${valueClass}`}>
            {valueNode}
            {item.unit ? (
              <span className="ml-1 text-sm font-medium text-slate-500">{item.unit}</span>
            ) : null}
          </p>
        )}
        {item.hint ? <p className="mt-1 text-xs text-slate-500 m-0">{item.hint}</p> : null}
      </>
    );
  }

  if (variant === 'icon-inline') {
    return (
      <>
        <div className="flex items-center gap-3 mb-3">
          {item.icon}
          <p className="text-sm text-slate-500 m-0">{item.label}</p>
        </div>
        {item.content ?? (
          <p className={`text-2xl font-bold m-0 ${valueClass}`}>
            {valueNode}
            {item.unit ? (
              <span className="text-sm font-normal text-slate-400 ml-1">{item.unit}</span>
            ) : null}
          </p>
        )}
        {item.hint ? <p className="text-xs text-slate-400 mt-1 m-0">{item.hint}</p> : null}
      </>
    );
  }

  // icon-centered (기본)
  return (
    <>
      {item.icon}
      {item.content ?? (
        <p className={`text-xl sm:text-2xl font-bold m-0 mt-1.5 sm:mt-2 ${valueClass}`}>
          {valueNode}
          {item.unit ? <span className="text-sm font-normal text-slate-400 ml-1">{item.unit}</span> : null}
        </p>
      )}
      <p className="text-[11px] sm:text-xs text-slate-500 mt-1 m-0">{item.label}</p>
      {item.hint ? <p className="text-[11px] text-slate-400 mt-0.5 m-0">{item.hint}</p> : null}
    </>
  );
}

export function StoreHomeMetricGrid({
  items,
  variant = 'icon-centered',
  loading = false,
  columnsClassName,
  placeholder = '–',
  className,
}: StoreHomeMetricGridProps) {
  if (items.length === 0 && !loading) return null;

  const gridClass = [
    'grid',
    columnsClassName ?? DEFAULT_COLUMNS,
    variant === 'icon-centered' ? 'gap-2.5 sm:gap-3' : 'gap-4',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (loading) {
    const count = items.length || 4;
    return (
      <div className={gridClass}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl border border-slate-200 bg-slate-50"
            aria-hidden="true"
          />
        ))}
      </div>
    );
  }

  const cardPadding = variant === 'icon-centered' ? 'p-3 sm:p-5 text-center h-full' : 'p-5 h-full';

  return (
    <div className={gridClass}>
      {items.map((item) => {
        const card = (
          <Card className={`${cardPadding}${item.to ? ' transition-colors hover:border-primary' : ''}`}>
            <MetricBody item={item} variant={variant} placeholder={placeholder} />
          </Card>
        );
        return item.to ? (
          <Link key={item.key} to={item.to} className="no-underline">
            {card}
          </Link>
        ) : (
          <div key={item.key}>{card}</div>
        );
      })}
    </div>
  );
}
