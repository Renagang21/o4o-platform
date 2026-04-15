/**
 * PageHeader — GlycoPharm 공통 페이지 헤더
 *
 * WO-GLYCOPHARM-UI-COMMON-COMPONENTS-V1
 * 운영자 페이지 공통 헤더 패턴 통합.
 */

import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, icon, actions }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className={`text-2xl font-bold text-slate-800${icon ? ' flex items-center gap-2' : ''}`}>
          {icon}
          {title}
        </h1>
        {description && (
          <p className="text-slate-500 text-sm mt-1">{description}</p>
        )}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}
