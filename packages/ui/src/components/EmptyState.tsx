/**
 * EmptyState - 공통 Empty State 컴포넌트
 *
 * 데이터가 0건인 상태를 일관되게 표시하기 위한 표준 컴포넌트
 *
 * @see docs/data/seed-data-policy.md
 */

import { HTMLAttributes, forwardRef, ReactNode } from 'react';

function cn(...classes: (string | undefined | false)[]) {
  return classes.filter(Boolean).join(' ');
}

export interface EmptyStateProps extends HTMLAttributes<HTMLDivElement> {
  /**
   * 표시할 아이콘 (이모지 또는 컴포넌트)
   * @default '📭'
   */
  icon?: ReactNode;
  /**
   * 제목 텍스트
   * @default '데이터 없음'
   */
  title?: string;
  /**
   * 설명 텍스트
   * @default '아직 표시할 데이터가 없습니다.'
   */
  description?: string;
  /**
   * 추가 액션 (버튼 등)
   */
  action?: ReactNode;
  /**
   * 컴팩트 모드 (패딩 축소)
   */
  compact?: boolean;
}

/**
 * 표준 Empty State 컴포넌트
 *
 * 사용 예시:
 * ```tsx
 * {items.length === 0 ? (
 *   <EmptyState
 *     icon="📦"
 *     title="등록된 상품이 없습니다"
 *     description="상품을 추가하면 여기에 표시됩니다."
 *   />
 * ) : (
 *   <ItemList items={items} />
 * )}
 * ```
 */
const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(
  (
    {
      icon = '📭',
      title = '데이터 없음',
      description = '아직 표시할 데이터가 없습니다.',
      action,
      compact = false,
      className,
      ...props
    },
    ref
  ) => (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center text-center',
        compact ? 'py-8 px-4' : 'py-16 px-6',
        className
      )}
      {...props}
    >
      {icon && (
        <div
          className={cn(
            'mb-4 opacity-50',
            compact ? 'text-3xl' : 'text-5xl'
          )}
        >
          {icon}
        </div>
      )}
      <h3
        className={cn(
          'font-semibold text-gray-900',
          compact ? 'text-sm mb-1' : 'text-base mb-2'
        )}
      >
        {title}
      </h3>
      <p
        className={cn(
          'text-gray-500',
          compact ? 'text-xs' : 'text-sm',
          'max-w-sm'
        )}
      >
        {description}
      </p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
);
EmptyState.displayName = 'EmptyState';

/**
 * Inline 스타일 버전 (CSS 클래스 없이 사용)
 *
 * Tailwind가 설정되지 않은 환경에서 사용
 */
export function EmptyStateInline({
  icon = '📭',
  title = '데이터 없음',
  description = '아직 표시할 데이터가 없습니다.',
  action,
  compact = false,
  style,
  ...props
}: EmptyStateProps) {
  const baseStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
    padding: compact ? '32px 16px' : '64px 24px',
    ...style,
  };

  const iconStyle: React.CSSProperties = {
    fontSize: compact ? '2rem' : '3rem',
    opacity: 0.5,
    marginBottom: '16px',
  };

  const titleStyle: React.CSSProperties = {
    fontSize: compact ? '0.875rem' : '1rem',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: compact ? '0 0 4px 0' : '0 0 8px 0',
  };

  const descStyle: React.CSSProperties = {
    fontSize: compact ? '0.75rem' : '0.875rem',
    color: '#64748b',
    maxWidth: '320px',
    margin: 0,
  };

  const actionStyle: React.CSSProperties = {
    marginTop: '16px',
  };

  return (
    <div style={baseStyle} {...props}>
      {icon && <div style={iconStyle}>{icon}</div>}
      <h3 style={titleStyle}>{title}</h3>
      <p style={descStyle}>{description}</p>
      {action && <div style={actionStyle}>{action}</div>}
    </div>
  );
}

export { EmptyState };
