/**
 * StoreHomeActivityPanel — 내 매장 홈 "최근 활동/요약 패널" 공통 chrome (canonical)
 *
 * WO-O4O-MY-STORE-HOME-CROSSSERVICE-COMMONIZATION-V1
 * 선행: IR-O4O-STORE-HOME-CROSSSERVICE-AUDIT-V1 §4 "RecentActivityPanel(항목 어댑터)"
 *
 * 공통화 대상(chrome + 상태):
 *  - 제목 · 우측 "전체 보기" 링크
 *  - loading / empty / 목록 3 상태 분기
 *
 * 공통화 대상이 아닌 것: 행(row) 표현. 서비스가 children 으로 직접 렌더한다.
 * (QR 스캔·주문·상품 등 항목 의미가 서비스마다 달라 행을 공통화하면 의미가 뭉개진다.)
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@o4o/ui';

export interface StoreHomeActivityPanelProps {
  title: string;
  /** 우측 링크 (예: 전체 보기 / 상세 분석) */
  moreLabel?: string;
  moreTo?: string;
  moreIcon?: ReactNode;
  loading?: boolean;
  loadingText?: string;
  /** true 면 children 대신 empty 문구 표시 */
  isEmpty?: boolean;
  emptyContent?: ReactNode;
  /** false 면 본문 패딩 제거 (full-bleed 목록) */
  padded?: boolean;
  className?: string;
  children?: ReactNode;
}

export function StoreHomeActivityPanel({
  title,
  moreLabel,
  moreTo,
  moreIcon,
  loading = false,
  loadingText = '불러오는 중…',
  isEmpty = false,
  emptyContent,
  padded = true,
  className,
  children,
}: StoreHomeActivityPanelProps) {
  return (
    <Card className={`${padded ? 'p-5' : ''} ${className ?? ''}`}>
      <div
        className={`flex justify-between items-center ${
          padded ? 'mb-4' : 'border-b border-slate-100 px-5 py-3'
        }`}
      >
        <h2 className="text-[15px] font-semibold text-slate-800 m-0">{title}</h2>
        {moreTo && moreLabel ? (
          <Link to={moreTo} className="flex items-center gap-1 text-xs text-primary no-underline">
            {moreLabel}
            {moreIcon}
          </Link>
        ) : null}
      </div>

      {loading ? (
        <p className={`text-[13px] text-slate-500 m-0 ${padded ? 'py-5 text-center' : 'px-5 py-6'}`}>
          {loadingText}
        </p>
      ) : isEmpty ? (
        <div className={`text-[13px] text-slate-400 ${padded ? 'text-center py-5' : 'px-5 py-8 text-center'}`}>
          {emptyContent ?? '표시할 항목이 없습니다'}
        </div>
      ) : (
        children
      )}
    </Card>
  );
}
