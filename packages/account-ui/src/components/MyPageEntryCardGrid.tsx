/**
 * MyPageEntryCardGrid — My Page 진입 카드 그리드 (공통)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1 §7
 *
 * 4 서비스 허브가 각자 `grid grid-cols-1 sm:grid-cols-2 gap-3` 을 손으로 반복하고
 * 있어 열 수·간격·모바일 붕괴 지점이 서비스마다 달랐다. 진입 카드의 **배치**만
 * 공통화한다. 카드 자체는 기존 `MyPageHubCard` 를 그대로 쓴다.
 *
 * 이 컴포넌트는 어떤 항목을 보일지 판정하지 않는다 (WO §11).
 * 서비스가 자신의 role/capability helper 로 계산한 결과를 `visible` 로 넣는다.
 */

import type { ReactNode } from 'react';
import { MyPageHubCard } from './MyPageHubCard.js';
import type { MyPageHubCardProps } from './MyPageHubCard.js';

export interface MyPageEntryCardItem extends MyPageHubCardProps {
  /** 카드 식별자. 미지정 시 title 을 key 로 쓴다. */
  key?: string;
  /** false 면 렌더하지 않는다. 기본 true. */
  visible?: boolean;
}

export interface MyPageEntryCardGridProps {
  /** 그리드 위에 표시할 섹션 제목 (선택). */
  title?: string;
  /** 제목 우측 슬롯 (전체보기 링크 등). */
  action?: ReactNode;
  items: MyPageEntryCardItem[];
  /** 넓은 폭에서의 열 수. 기본 2. 모바일은 항상 1열이다. */
  columns?: 1 | 2 | 3;
  /** items 가 모두 숨겨졌을 때 렌더할 내용. 기본은 아무것도 렌더하지 않는다. */
  emptyState?: ReactNode;
  className?: string;
}

const COLUMN_CLS: Record<1 | 2 | 3, string> = {
  1: 'grid-cols-1',
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
};

export function MyPageEntryCardGrid({
  title,
  action,
  items,
  columns = 2,
  emptyState,
  className,
}: MyPageEntryCardGridProps) {
  const visibleItems = items.filter((item) => item.visible !== false);

  if (visibleItems.length === 0) {
    return emptyState ? <>{emptyState}</> : null;
  }

  return (
    <section className={['mb-6', className].filter(Boolean).join(' ')}>
      {(title || action) && (
        <div className="flex items-center justify-between mb-3">
          {title && <h2 className="text-base font-semibold text-gray-900">{title}</h2>}
          {action}
        </div>
      )}
      <div className={`grid ${COLUMN_CLS[columns]} gap-3`}>
        {visibleItems.map(({ key, visible: _visible, ...card }) => (
          <MyPageHubCard key={key ?? card.title} {...card} />
        ))}
      </div>
    </section>
  );
}
