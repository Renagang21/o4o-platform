/**
 * MyPageActivityFeed — My Page Home 의 "최근 활동" 카드 (공통)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1 §8
 *
 * KPA-Society(MyDashboardPage) 와 Neture(MyPageHub) 가 각각
 * "카드 + 섹션 제목 + 목록/빈 상태" 를 손으로 만들고 있었다. 두 화면의
 * **표현 구조**만 공통화한다.
 *
 * 이 컴포넌트는 활동 데이터를 조회하지 않고 모델도 재정의하지 않는다
 * (WO §12 — Activity data model 불변). 서비스가 자신의 API 응답을
 * 표시용 item 으로 변환해 넣는다.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { MyPageEmptyState } from './MyPageEmptyState.js';

export interface MyPageActivityItem {
  /** 목록 key. 미지정 시 index 를 쓴다. */
  key?: string;
  /** 좌측 아이콘 (emoji 문자열 또는 ReactNode). */
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** 우측 보조 정보 (날짜 등). */
  meta?: ReactNode;
  /** 지정 시 행 전체가 링크가 된다. */
  href?: string;
}

export interface MyPageActivityFeedProps {
  /** 섹션 제목. 기본 '최근 활동'. */
  title?: string;
  /** 제목 우측 슬롯 (전체보기 링크 등). */
  action?: ReactNode;
  items: MyPageActivityItem[];
  /** 항목이 없을 때 문구. */
  emptyDescription?: string;
  /** 항목이 없을 때 아이콘. */
  emptyIcon?: ReactNode;
  className?: string;
}

export function MyPageActivityFeed({
  title = '최근 활동',
  action,
  items,
  emptyDescription = '최근 활동이 없습니다.',
  emptyIcon,
  className,
}: MyPageActivityFeedProps) {
  return (
    <section
      className={[
        'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-gray-900 m-0">{title}</h3>
        {action}
      </div>

      {items.length === 0 ? (
        <MyPageEmptyState icon={emptyIcon} description={emptyDescription} />
      ) : (
        <ul className="list-none m-0 p-0">
          {items.map((item, index) => {
            const row = (
              /* 좁은 폭에서 meta 가 제목을 밀지 않도록 세로로 떨어뜨린다 (mobile 390px). */
              <div className="flex items-start gap-3 py-3 border-b border-gray-100 last:border-b-0">
                {item.icon && (
                  <span className="w-8 shrink-0 text-center text-lg leading-6">{item.icon}</span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 m-0 break-words">{item.title}</p>
                  {item.description && (
                    <p className="text-xs text-gray-500 mt-0.5 m-0 break-words">
                      {item.description}
                    </p>
                  )}
                </div>
                {item.meta && (
                  <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">
                    {item.meta}
                  </span>
                )}
              </div>
            );

            return (
              <li key={item.key ?? String(index)}>
                {item.href ? (
                  <Link to={item.href} className="block no-underline text-inherit hover:bg-gray-50">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
