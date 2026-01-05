/**
 * EmptyState - 데이터가 없을 때 표시하는 공통 컴포넌트
 */

import { type LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export default function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="text-center py-12 px-4">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
        <Icon className="w-8 h-8 text-slate-400" />
      </div>
      <h3 className="text-lg font-medium text-slate-800 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-500 mb-4 max-w-sm mx-auto">{description}</p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          className="px-4 py-2 bg-primary-600 text-white rounded-xl font-medium hover:bg-primary-700 transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
