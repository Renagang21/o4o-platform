/**
 * InfoRow — Read-only label/value 한 줄 표시
 *
 * WO-O4O-FORM-PRIMITIVES-EXTRACTION-V1
 *
 * O4O Form Standard v1.0 §6 — view 모드 전용.
 * 좌측 label / 우측 value (text-right).
 */

import type { ReactNode } from 'react';

export interface InfoRowProps {
  label: string;
  children: ReactNode;
  className?: string;
}

export function InfoRow({ label, children, className = '' }: InfoRowProps) {
  return (
    <div className={`flex items-start justify-between gap-4 ${className}`}>
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 text-right">{children}</span>
    </div>
  );
}
