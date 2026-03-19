/**
 * OperatorStatusBadge — 엔티티 상태 뱃지
 *
 * WO-O4O-OPERATOR-ACTION-STANDARDIZATION-V1
 *
 * AGTag 기반 — OperatorEntityStatus 값에 따라 자동 색상/라벨 매핑.
 */

import React from 'react';
import type { OperatorEntityStatus } from '@o4o/types';
import { OPERATOR_STATUS_COLORS, OPERATOR_STATUS_LABELS } from '@o4o/types';
import type { AGTagColor, AGTagSize } from '../ag-components/AGTag';
import { AGTag } from '../ag-components/AGTag';

export interface OperatorStatusBadgeProps {
  /** 상태 값 */
  status: OperatorEntityStatus;
  /** 라벨 오버라이드 (기본: 한국어 라벨) */
  label?: string;
  /** 크기 */
  size?: AGTagSize;
  /** dot 표시 여부 (default: true) */
  dot?: boolean;
  className?: string;
}

export function OperatorStatusBadge({
  status,
  label: labelOverride,
  size = 'sm',
  dot = true,
  className,
}: OperatorStatusBadgeProps) {
  const color = (OPERATOR_STATUS_COLORS[status] ?? 'gray') as AGTagColor;
  const label = labelOverride ?? OPERATOR_STATUS_LABELS[status] ?? status;

  return (
    <AGTag color={color} size={size} variant="subtle" dot={dot} className={className}>
      {label}
    </AGTag>
  );
}
