/**
 * RoleBadge / RoleBadgeGroup
 *
 * WO-O4O-MYPAGE-PHASE1-NAV-ROLEBADGE-CANONICALIZATION-V1
 * 근거: IR-O4O-MYPAGE-PROFILE-UI-CANONICAL-COMMONIZATION-V1
 *
 * 4 서비스 (KPA / GlycoPharm / K-Cosmetics / Neture) MyPage Hub 의
 * inline role badge 표시를 공통화한 표시 컴포넌트.
 *
 * - 단일 badge: <RoleBadge label="약사" tone="emerald" />
 * - 복수 badge: <RoleBadgeGroup badges={[{ key: 'a', label: '공급자' }, ...]} />
 * - tone / size / variant 옵션 지원
 * - role label 결정 로직은 각 서비스가 보유 (본 컴포넌트는 표시만 담당)
 */

import type { ReactNode } from 'react';

export type RoleBadgeTone =
  | 'primary'
  | 'slate'
  | 'blue'
  | 'emerald'
  | 'pink'
  | 'amber'
  | 'purple'
  | 'rose'
  | 'white-overlay';

export type RoleBadgeSize = 'sm' | 'md';
export type RoleBadgeVariant = 'solid' | 'soft' | 'outline';

export interface RoleBadgeProps {
  label: string;
  tone?: RoleBadgeTone;
  size?: RoleBadgeSize;
  variant?: RoleBadgeVariant;
  className?: string;
  icon?: ReactNode;
}

const TONE_CLS: Record<RoleBadgeTone, Record<RoleBadgeVariant, string>> = {
  primary: {
    solid:   'bg-primary-600 text-white',
    soft:    'bg-primary-50 text-primary-700',
    outline: 'border border-primary-600 text-primary-700',
  },
  slate: {
    solid:   'bg-slate-600 text-white',
    soft:    'bg-slate-100 text-slate-700',
    outline: 'border border-slate-300 text-slate-700',
  },
  blue: {
    solid:   'bg-blue-600 text-white',
    soft:    'bg-blue-50 text-blue-700',
    outline: 'border border-blue-300 text-blue-700',
  },
  emerald: {
    solid:   'bg-emerald-600 text-white',
    soft:    'bg-emerald-50 text-emerald-700',
    outline: 'border border-emerald-300 text-emerald-700',
  },
  pink: {
    solid:   'bg-pink-600 text-white',
    soft:    'bg-pink-50 text-pink-700',
    outline: 'border border-pink-300 text-pink-700',
  },
  amber: {
    solid:   'bg-amber-500 text-white',
    soft:    'bg-amber-50 text-amber-700',
    outline: 'border border-amber-300 text-amber-700',
  },
  purple: {
    solid:   'bg-purple-600 text-white',
    soft:    'bg-purple-50 text-purple-700',
    outline: 'border border-purple-300 text-purple-700',
  },
  rose: {
    solid:   'bg-rose-600 text-white',
    soft:    'bg-rose-50 text-rose-700',
    outline: 'border border-rose-300 text-rose-700',
  },
  // 'white-overlay' tone: gradient hero 위에 얹는 반투명 화이트 (KPA / Glyco / K-Cos hub 공통 패턴)
  'white-overlay': {
    solid:   'bg-white/20 text-white',
    soft:    'bg-white/10 text-white',
    outline: 'border border-white/40 text-white',
  },
};

const SIZE_CLS: Record<RoleBadgeSize, string> = {
  sm: 'px-2 py-0.5 text-xs',
  md: 'px-2.5 py-1 text-xs',
};

const BASE = 'inline-flex items-center gap-1 rounded-full font-medium whitespace-nowrap';

export function RoleBadge({
  label,
  tone = 'primary',
  size = 'md',
  variant = 'solid',
  className,
  icon,
}: RoleBadgeProps) {
  const toneCls = TONE_CLS[tone][variant];
  const sizeCls = SIZE_CLS[size];
  const cls = [BASE, sizeCls, toneCls, className].filter(Boolean).join(' ');

  return (
    <span className={cls}>
      {icon}
      {label}
    </span>
  );
}

export interface RoleBadgeGroupItem {
  key: string;
  label: string;
  tone?: RoleBadgeTone;
  variant?: RoleBadgeVariant;
  icon?: ReactNode;
}

export interface RoleBadgeGroupProps {
  badges: RoleBadgeGroupItem[];
  size?: RoleBadgeSize;
  className?: string;
}

export function RoleBadgeGroup({
  badges,
  size = 'md',
  className,
}: RoleBadgeGroupProps) {
  if (!badges.length) return null;
  const wrapCls = ['flex items-center gap-2 flex-wrap', className].filter(Boolean).join(' ');

  return (
    <div className={wrapCls}>
      {badges.map((b) => (
        <RoleBadge
          key={b.key}
          label={b.label}
          tone={b.tone}
          variant={b.variant}
          size={size}
          icon={b.icon}
        />
      ))}
    </div>
  );
}
