/**
 * MyPageUserSummary — My Page 사용자 요약 카드 (공통)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1
 *
 * KPA / GlycoPharm / K-Cosmetics / Neture 4 서비스 허브에 같은 마크업이 4 벌
 * 복제돼 있던 "아바타 + 이름 + 이메일 + 역할 배지 + 프로필 수정 버튼 + 정보 행"
 * 카드의 단일 구현이다.
 *
 * 서비스 차이는 슬롯으로만 받는다:
 *   - 역할/상태 배지 → `badges` (RoleBadge / RoleBadgeGroup 등 자유 ReactNode)
 *   - 정보 행 구성   → `infoRows` (서비스마다 3~4개로 다름)
 *   - 액션           → `actionHref` + `actionLabel`, 또는 `action` 슬롯
 * 이 파일은 역할을 판정하지 않는다 (WO §11).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export interface MyPageUserSummaryInfoRow {
  /** 행 식별자. 미지정 시 label 을 key 로 쓴다. */
  key?: string;
  icon?: ReactNode;
  label: string;
  value: ReactNode;
}

export interface MyPageUserSummaryProps {
  /** 아바타에 표시할 글자. 미지정 시 name 의 첫 글자. */
  initial?: string;
  name: string;
  email?: string;
  /** 역할/상태 배지 슬롯. */
  badges?: ReactNode;
  /** 우측 액션 링크 (예: 프로필 수정). `action` 이 있으면 무시된다. */
  actionHref?: string;
  actionLabel?: string;
  /** 우측 액션을 직접 렌더할 때. */
  action?: ReactNode;
  /** 하단 정보 행. 빈 배열이거나 미지정이면 구분선째 렌더하지 않는다. */
  infoRows?: MyPageUserSummaryInfoRow[];
  className?: string;
}

export function MyPageUserSummary({
  initial,
  name,
  email,
  badges,
  actionHref,
  actionLabel = '프로필 수정',
  action,
  infoRows,
  className,
}: MyPageUserSummaryProps) {
  // 코드포인트 단위로 자른다 — 이모지 아바타(예: 👤)가 서로게이트 반쪽으로 깨지지 않게.
  const avatarChar = (Array.from(initial ?? name ?? '')[0] ?? '?').toUpperCase();
  const rows = infoRows ?? [];

  const actionNode =
    action ??
    (actionHref ? (
      <Link
        to={actionHref}
        className="flex-shrink-0 px-4 py-2 rounded-lg bg-gray-100 text-gray-700 text-sm font-medium hover:bg-gray-200 transition-colors no-underline"
      >
        {actionLabel}
      </Link>
    ) : null);

  return (
    <div
      className={[
        'bg-white rounded-2xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6',
        className,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {/* 좁은 폭에서는 액션이 아래로 내려가 이름/이메일을 밀지 않는다 (WO §12) */}
      <div className="flex items-center gap-4 sm:gap-5">
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl sm:text-3xl font-bold text-gray-400">{avatarChar}</span>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{name}</h2>
          {email && <p className="text-sm text-gray-500 truncate mt-0.5">{email}</p>}
          {badges && <div className="mt-2">{badges}</div>}
        </div>
        {actionNode && <div className="hidden sm:block flex-shrink-0">{actionNode}</div>}
      </div>

      {actionNode && <div className="mt-4 sm:hidden">{actionNode}</div>}

      {rows.length > 0 && (
        <div className="mt-5 pt-5 border-t border-gray-100 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1">
          {rows.map((row) => (
            <div
              key={row.key ?? row.label}
              className="flex items-center gap-2 py-2 text-sm min-w-0"
            >
              {row.icon}
              <span className="text-gray-500 shrink-0">{row.label}</span>
              <span className="text-gray-900 truncate ml-auto text-right">{row.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
