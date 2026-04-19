/**
 * Action Policy Engine — Row-level action availability rules
 *
 * WO-O4O-TABLE-STANDARD-V4 Phase 5
 *
 * 도메인별 행 액션 가용성을 정책으로 정의하고, RowActionMenu와 호환되는
 * 액션 배열을 생성하는 헬퍼 제공.
 *
 * 사용:
 *   const policy = defineActionPolicy<User>('kpa:users', { ... });
 *   const actions = buildRowActions(policy, row, handlers, { icons });
 *   <RowActionMenu actions={actions} inlineMax={policy.inlineMax} />
 */

import type { ReactNode } from 'react';

// ─── Types ───

export interface ActionConfirmConfig {
  title: string;
  message: string;
  confirmText?: string;
  variant?: 'default' | 'danger' | 'warning';
  requireReason?: boolean;
  showReason?: boolean;
  reasonPlaceholder?: string;
}

export interface ActionRule<T = any> {
  key: string;
  label: string;
  variant?: 'default' | 'danger' | 'warning' | 'primary';
  /** Return false to hide the action for this row */
  visible?: (row: T) => boolean;
  /** Return true to show the action but disable it */
  disabled?: (row: T) => boolean;
  /** Static config or per-row dynamic config */
  confirm?: ActionConfirmConfig | ((row: T) => ActionConfirmConfig);
  /** Show divider before this action in menu */
  divider?: boolean;
}

export interface ActionPolicy<T = any> {
  domain: string;
  /** Number of actions to render inline (rest go to kebab menu) */
  inlineMax?: number;
  rules: ActionRule<T>[];
}

/** Shape produced by buildRowActions — structurally compatible with RowActionItem */
export interface BuiltAction {
  key: string;
  label: string;
  icon?: ReactNode;
  onClick: (reason?: string) => void | Promise<void>;
  variant?: 'default' | 'danger' | 'warning' | 'primary';
  disabled?: boolean;
  hidden?: boolean;
  loading?: boolean;
  divider?: boolean;
  confirm?: ActionConfirmConfig;
}

// ─── Helpers ───

/**
 * Define an action policy for a domain.
 * Type-safe wrapper — ensures rule visibility/disabled callbacks match row type.
 */
export function defineActionPolicy<T>(
  domain: string,
  config: { inlineMax?: number; rules: ActionRule<T>[] },
): ActionPolicy<T> {
  return { domain, ...config };
}

/**
 * Build RowActionMenu-compatible actions from a policy + row + handlers.
 *
 * @param policy  - The action policy definition
 * @param row     - Current row data
 * @param handlers - Map of action key → handler function
 * @param options  - Optional icons and loading states
 */
export function buildRowActions<T>(
  policy: ActionPolicy<T>,
  row: T,
  handlers: Record<string, (reason?: string) => void | Promise<void>>,
  options?: {
    loading?: Record<string, boolean>;
    icons?: Record<string, ReactNode>;
  },
): BuiltAction[] {
  return policy.rules.map((rule) => ({
    key: rule.key,
    label: rule.label,
    variant: rule.variant,
    icon: options?.icons?.[rule.key],
    onClick: handlers[rule.key] || (() => {}),
    hidden: rule.visible ? !rule.visible(row) : false,
    disabled: rule.disabled ? rule.disabled(row) : false,
    loading: options?.loading?.[rule.key] || false,
    divider: rule.divider,
    confirm: rule.confirm
      ? typeof rule.confirm === 'function'
        ? rule.confirm(row)
        : rule.confirm
      : undefined,
  }));
}
