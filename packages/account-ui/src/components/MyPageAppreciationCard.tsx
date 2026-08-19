/**
 * MyPageAppreciationCard — My Page Home 의 "감사 활동" 카드 (공통)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-HOME-HUB-COMMONIZATION-V1 §8
 *
 * KPA-Society / GlycoPharm / K-Cosmetics 3 서비스 Home 에 같은 의미의 카드가
 * 3 벌(GP·KCos 는 Tailwind, KPA 는 inline style) 복제돼 있었다. 표시 구조만
 * 하나로 수렴한다.
 *
 * 이 컴포넌트는 데이터를 조회하지 않는다. 서비스마다 appreciation API 응답
 * 형태가 다르므로(배열 직접 / `data.items`) 합계·목록 계산은 호출부가 하고
 * 여기에는 **표시용 값만** 넘긴다 (WO §12 — 개별 기능 내부 불변).
 *
 * 서비스 분기(serviceKey / 서비스명 if)는 넣지 않는다. 차이는 props 로만 받는다:
 *   - 빈 상태를 카드째 감출지  → `hideWhenEmpty`
 *   - 보낸 감사 목록 노출 여부 → `sentItems` 전달 여부
 */

import type { ReactNode } from 'react';
import { Gift } from 'lucide-react';

export interface MyPageAppreciationEntry {
  key?: string;
  /** 대상 구분 라벨 (예: 포럼 / 강의). 없으면 표시하지 않는다. */
  targetLabel?: string | null;
  message?: string | null;
  amount: number;
}

export interface MyPageAppreciationCardProps {
  /** 카드 제목. 기본 '감사 활동'. */
  title?: string;
  receivedTotal: number;
  sentTotal: number;
  /** 합계 타일 아래 보조 표기 (건수). 미지정 시 표시하지 않는다. */
  receivedCount?: number;
  sentCount?: number;
  /** 최근 받은 감사 목록. 메시지가 있는 항목만 렌더한다. */
  receivedItems?: MyPageAppreciationEntry[];
  /** 최근 보낸 감사 목록. 미지정이면 섹션 자체를 렌더하지 않는다. */
  sentItems?: MyPageAppreciationEntry[];
  /** 목록에 최대 몇 건까지 표시할지. 기본 3. */
  maxListItems?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  /** true 면 합계·목록이 모두 비었을 때 카드 자체를 렌더하지 않는다. */
  hideWhenEmpty?: boolean;
  /** 제목 우측 슬롯. */
  action?: ReactNode;
  className?: string;
}

function hasContent(items?: MyPageAppreciationEntry[]): boolean {
  return Array.isArray(items) && items.length > 0;
}

export function MyPageAppreciationCard({
  title = '감사 활동',
  receivedTotal,
  sentTotal,
  receivedCount,
  sentCount,
  receivedItems,
  sentItems,
  maxListItems = 3,
  emptyTitle = '아직 받은 감사가 없습니다.',
  emptyDescription = '좋은 글과 자료를 공유하면 감사 포인트를 받을 수 있습니다.',
  hideWhenEmpty = false,
  action,
  className,
}: MyPageAppreciationCardProps) {
  const isEmpty =
    receivedTotal === 0 &&
    sentTotal === 0 &&
    !hasContent(receivedItems) &&
    !hasContent(sentItems);

  if (isEmpty && hideWhenEmpty) return null;

  const received = (receivedItems ?? []).filter((r) => r.message).slice(0, maxListItems);
  const sent = (sentItems ?? []).filter((r) => r.message).slice(0, maxListItems);

  return (
    <section
      className={[
        'bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <div className="flex items-center justify-between gap-2 px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <Gift className="w-4 h-4 text-amber-500 shrink-0" />
          <h3 className="text-sm font-semibold text-gray-800 m-0 truncate">{title}</h3>
        </div>
        {action}
      </div>

      {isEmpty ? (
        <div className="px-5 py-6 text-center">
          <p className="text-sm text-gray-400 mb-1">{emptyTitle}</p>
          <p className="text-xs text-gray-400/80">{emptyDescription}</p>
        </div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-amber-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-amber-600 mb-1">받은 감사</p>
              <p className="text-xl font-bold text-amber-800">
                {receivedTotal.toLocaleString()}P
              </p>
              {receivedCount !== undefined && (
                <p className="text-xs text-amber-500 mt-0.5">{receivedCount}건</p>
              )}
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 text-center">
              <p className="text-xs text-gray-500 mb-1">보낸 감사</p>
              <p className="text-xl font-bold text-gray-700">{sentTotal.toLocaleString()}P</p>
              {sentCount !== undefined && (
                <p className="text-xs text-gray-400 mt-0.5">{sentCount}건</p>
              )}
            </div>
          </div>

          <AppreciationList label="최근 받은 감사" items={received} sign="+" />
          <AppreciationList label="최근 보낸 감사" items={sent} sign="-" />
        </div>
      )}
    </section>
  );
}

function AppreciationList({
  label,
  items,
  sign,
}: {
  label: string;
  items: MyPageAppreciationEntry[];
  sign: '+' | '-';
}) {
  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">{label}</p>
      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={item.key ?? String(index)}
            className="flex items-center gap-2 text-xs bg-amber-50 rounded-lg px-3 py-2"
          >
            {item.targetLabel && (
              <span className="shrink-0 rounded bg-white/70 px-1.5 py-0.5 text-gray-500">
                {item.targetLabel}
              </span>
            )}
            <span className="italic text-amber-700 flex-1 min-w-0 truncate">
              &quot;{item.message}&quot;
            </span>
            <span className="font-semibold text-amber-600 whitespace-nowrap shrink-0">
              {sign}
              {item.amount}P
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
