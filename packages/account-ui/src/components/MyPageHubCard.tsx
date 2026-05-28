/**
 * MyPageHubCard
 *
 * WO-O4O-MYPAGE-HUB-CARD-CANONICAL-ALIGNMENT-V1
 * 근거: IR-O4O-MYPAGE-PROFILE-UI-CANONICAL-COMMONIZATION-V1
 *
 * GlycoPharm / K-Cosmetics / Neture MyPage Hub 의 바로가기 카드를
 * 공통 시각 톤으로 정렬하는 표시 컴포넌트.
 *
 * 시각 패턴 (Pattern A — KPA-Society canonical 정렬):
 *   <container flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm>
 *     <icon /> <title (+description)> <badge?> <chevron?>
 *   </container>
 *
 * - href 지정 시 react-router Link 로 렌더, 미지정 시 button.
 * - icon tone 으로 서비스별 강조 색 조정 가능 (기본 primary).
 * - badge slot 으로 count / RoleBadge 등 자유 표시.
 * - 기본 chevron 노출 (href 또는 onClick 시).
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

export type MyPageHubCardIconTone =
  | 'primary'
  | 'slate'
  | 'blue'
  | 'emerald'
  | 'pink'
  | 'amber'
  | 'purple'
  | 'rose';

export interface MyPageHubCardProps {
  title: string;
  description?: string;
  href?: string;
  onClick?: () => void;
  icon?: ReactNode;
  iconTone?: MyPageHubCardIconTone;
  /** 우측에 표시할 슬롯 — count, RoleBadge, 또는 임의 ReactNode */
  badge?: ReactNode;
  /** 우측 chevron 표시 여부. 기본 true. */
  showChevron?: boolean;
  disabled?: boolean;
  className?: string;
}

const ICON_TONE_CLS: Record<MyPageHubCardIconTone, string> = {
  primary: 'text-primary-500',
  slate:   'text-slate-500',
  blue:    'text-blue-500',
  emerald: 'text-emerald-500',
  pink:    'text-pink-500',
  amber:   'text-amber-500',
  purple:  'text-purple-500',
  rose:    'text-rose-500',
};

const CONTAINER_BASE =
  'flex items-center gap-3 p-4 bg-white rounded-2xl shadow-sm transition-colors no-underline';

const INTERACTIVE_CLS = 'hover:bg-gray-50 cursor-pointer';
const DISABLED_CLS = 'opacity-50 cursor-not-allowed';

export function MyPageHubCard({
  title,
  description,
  href,
  onClick,
  icon,
  iconTone = 'primary',
  badge,
  showChevron,
  disabled = false,
  className,
}: MyPageHubCardProps) {
  const interactive = !disabled && (Boolean(href) || Boolean(onClick));
  const chevronVisible = showChevron ?? interactive;

  const containerCls = [
    CONTAINER_BASE,
    interactive ? INTERACTIVE_CLS : '',
    disabled ? DISABLED_CLS : '',
    'text-gray-700',
    className,
  ].filter(Boolean).join(' ');

  const inner = (
    <>
      {icon && (
        <span className={`shrink-0 ${ICON_TONE_CLS[iconTone]}`}>{icon}</span>
      )}
      <div className="flex-1 min-w-0">
        <span className="block text-sm font-medium text-gray-700 truncate">
          {title}
        </span>
        {description && (
          <p className="mt-0.5 text-xs text-gray-500 truncate">{description}</p>
        )}
      </div>
      {badge && <span className="shrink-0">{badge}</span>}
      {chevronVisible && (
        <ChevronRight className="w-4 h-4 text-gray-300 shrink-0" />
      )}
    </>
  );

  if (href && !disabled) {
    return (
      <Link to={href} className={containerCls}>
        {inner}
      </Link>
    );
  }

  if (onClick && !disabled) {
    return (
      <button type="button" onClick={onClick} className={`${containerCls} text-left w-full`}>
        {inner}
      </button>
    );
  }

  return <div className={containerCls}>{inner}</div>;
}
