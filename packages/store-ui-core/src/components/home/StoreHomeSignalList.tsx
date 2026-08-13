/**
 * StoreHomeSignalList — 내 매장 홈 "처리 필요 신호" 목록 (canonical)
 *
 * WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1
 * 원형: KPA 내 약국 홈 Live Signals (WO-O4O-KPA-STORE-HOME-LIVE-SIGNALS-V1).
 *
 * 공통화 대상:
 *  - 미처리 업무를 KPI 위에 한 줄씩 쌓아 해당 화면으로 보내는 구조·동작
 *  - tone(색) 어휘와 링크 행 마크업
 *
 * 공통화 대상이 아닌 것: 신호의 종류·집계·문구·목적지 (서비스가 items 로 주입).
 * 값이 0 인 신호는 서비스가 items 에서 제외한다 — 본 컴포넌트는 집계를 알지 않는다.
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight } from 'lucide-react';

export type StoreHomeSignalTone = 'amber' | 'blue' | 'violet' | 'emerald' | 'red';

export interface StoreHomeSignalItem {
  key: string;
  /** 한 줄 요약 (예: '신규 주문 3건 대기') */
  message: ReactNode;
  /** 보조 설명 (예: '결제를 완료해야 공급자에게 전달됩니다') */
  description?: ReactNode;
  tone?: StoreHomeSignalTone;
  /** 좌측 아이콘 override (기본 AlertCircle) */
  icon?: ReactNode;
  /** 행 전체 링크 대상 */
  to?: string;
}

export interface StoreHomeSignalListProps {
  items: StoreHomeSignalItem[];
  className?: string;
}

const TONE: Record<StoreHomeSignalTone, { row: string; icon: string; desc: string }> = {
  amber: { row: 'border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100', icon: 'text-amber-500', desc: 'text-amber-700' },
  blue: { row: 'border-blue-200 bg-blue-50 text-blue-800 hover:bg-blue-100', icon: 'text-blue-500', desc: 'text-blue-700' },
  violet: { row: 'border-violet-200 bg-violet-50 text-violet-800 hover:bg-violet-100', icon: 'text-violet-500', desc: 'text-violet-700' },
  emerald: { row: 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100', icon: 'text-emerald-500', desc: 'text-emerald-700' },
  red: { row: 'border-red-200 bg-red-50 text-red-800 hover:bg-red-100', icon: 'text-red-500', desc: 'text-red-700' },
};

export function StoreHomeSignalList({ items, className }: StoreHomeSignalListProps) {
  if (items.length === 0) return null;

  return (
    <div className={`mb-4 flex flex-col gap-2 ${className ?? ''}`}>
      {items.map((item) => {
        const tone = TONE[item.tone ?? 'amber'];
        const body = (
          <>
            <span className="flex-shrink-0">
              {item.icon ?? <AlertCircle size={15} className={tone.icon} />}
            </span>
            <span className="flex-1 min-w-0">
              <span className="block text-[13px] font-medium">{item.message}</span>
              {item.description ? (
                <span className={`block mt-0.5 text-[12px] font-normal ${tone.desc}`}>
                  {item.description}
                </span>
              ) : null}
            </span>
            {item.to ? <ArrowRight size={13} className="flex-shrink-0" /> : null}
          </>
        );
        const rowClass = `flex items-center gap-2 rounded-lg border px-4 py-2.5 no-underline ${tone.row}`;

        return item.to ? (
          <Link key={item.key} to={item.to} className={rowClass}>
            {body}
          </Link>
        ) : (
          <div key={item.key} className={rowClass} role="status">
            {body}
          </div>
        );
      })}
    </div>
  );
}
