/**
 * Section — Form/Detail Drawer 섹션 구분자
 *
 * WO-O4O-FORM-PRIMITIVES-EXTRACTION-V1
 *
 * O4O Form Standard v1.0 §6 — view/edit 공통 사용.
 * 제목(uppercase tracking) + 내부 spacing 표준.
 */

import type { ReactNode } from 'react';

export interface SectionProps {
  title: string;
  children: ReactNode;
  className?: string;
}

export function Section({ title, children, className = '' }: SectionProps) {
  return (
    <div
      className={`border-b border-slate-100 pb-4 mb-4 last:border-0 last:mb-0 last:pb-0 ${className}`}
    >
      <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
        {title}
      </h4>
      <div className="space-y-2">{children}</div>
    </div>
  );
}
