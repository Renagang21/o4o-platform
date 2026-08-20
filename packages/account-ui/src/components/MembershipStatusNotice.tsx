/**
 * MembershipStatusNotice — 서비스 가입/승인 상태 안내 화면 (공통 View)
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-MEMBERSHIP-ROLE-STATUS-COMMONIZATION-V1 §10 / §12
 *
 * 5 서비스의 `MembershipGate` 상태 안내 화면이 각자 같은 마크업을 갖고 있던 것을
 * 하나로 모은 표시 전용 컴포넌트다.
 *
 * ⚠️ 이 컴포넌트는 **상태를 판정하지 않는다.**
 *    - status 문자열 분기·serviceKey·서비스명·역할 문자열을 여기에 두지 않는다 (§12).
 *    - 문구/아이콘/행동은 전부 props 로 주입한다.
 *      (기본 문구표는 `adapters/membershipNormalizers.ts` 소관)
 */

import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { RoleBadge } from './RoleBadge.js';
import type { RoleBadgeTone } from './RoleBadge.js';

export interface MembershipStatusNoticeAction {
  key: string;
  label: string;
  /** 내부 route. 주어지면 `onClick` 보다 우선한다. */
  href?: string;
  onClick?: () => void;
  variant?: 'primary' | 'secondary';
}

export interface MembershipStatusNoticeProps {
  title: string;
  message: string;
  /** emoji 문자열 또는 ReactNode */
  icon?: ReactNode;
  /** 상태 배지 (선택). 라벨/톤은 호출자가 adapter 로 해석해 넘긴다. */
  statusLabel?: string;
  statusTone?: RoleBadgeTone;
  actions?: MembershipStatusNoticeAction[];
  /**
   * `screen` — 라우트 전체를 차지하는 중앙 카드 (gate 용, 기본값)
   * `inline` — 이미 셸/레이아웃 안에 있을 때의 카드만
   */
  layout?: 'screen' | 'inline';
  /** 카드 본문 아래 추가 영역 (반려 사유·메타데이터 등 서비스 고유 내용). */
  children?: ReactNode;
  className?: string;
}

const ACTION_CLS: Record<'primary' | 'secondary', string> = {
  primary:
    'inline-flex items-center justify-center rounded-lg bg-primary-600 px-5 py-2.5 text-sm font-medium text-white no-underline hover:bg-primary-700 transition-colors',
  secondary:
    'inline-flex items-center justify-center rounded-lg bg-slate-100 px-5 py-2.5 text-sm font-medium text-slate-700 no-underline hover:bg-slate-200 transition-colors',
};

function ActionButton({ action }: { action: MembershipStatusNoticeAction }) {
  const cls = ACTION_CLS[action.variant ?? 'secondary'];
  if (action.href) {
    return (
      <Link to={action.href} className={cls}>
        {action.label}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={action.onClick}>
      {action.label}
    </button>
  );
}

export function MembershipStatusNotice({
  title,
  message,
  icon,
  statusLabel,
  statusTone = 'slate',
  actions = [],
  layout = 'screen',
  children,
  className,
}: MembershipStatusNoticeProps) {
  const card = (
    <div
      className={[
        'w-full max-w-md rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm',
        layout === 'inline' ? className : undefined,
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {icon && (
        <div className="mb-4 text-4xl">
          {typeof icon === 'string' ? <span>{icon}</span> : icon}
        </div>
      )}

      <div className="mb-2.5 flex flex-wrap items-center justify-center gap-2">
        <h2 className="m-0 text-lg font-semibold text-slate-900">{title}</h2>
        {statusLabel && <RoleBadge label={statusLabel} tone={statusTone} variant="soft" size="sm" />}
      </div>

      <p className="m-0 text-sm leading-relaxed text-slate-600">{message}</p>

      {children && <div className="mt-4 text-left">{children}</div>}

      {actions.length > 0 && (
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {actions.map((action) => (
            <ActionButton key={action.key} action={action} />
          ))}
        </div>
      )}
    </div>
  );

  if (layout === 'inline') return card;

  return (
    <div
      className={['flex min-h-[60vh] items-center justify-center p-5', className]
        .filter(Boolean)
        .join(' ')}
    >
      {card}
    </div>
  );
}
