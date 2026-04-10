import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { LayoutDashboard, LogOut } from 'lucide-react';

interface QuickActionsSectionProps {
  dashboardPath?: string;
  dashboardLabel?: string;
  showDashboard?: boolean;
  onLogout?: () => void;
  children?: ReactNode;
}

export function QuickActionsSection({
  dashboardPath,
  dashboardLabel = '내 대시보드',
  showDashboard = true,
  onLogout,
  children,
}: QuickActionsSectionProps) {
  const showDashboardLink = showDashboard && dashboardPath;

  if (!showDashboardLink && !onLogout && !children) return null;

  return (
    <div className="bg-white rounded-2xl shadow-sm p-6">
      <h3 className="text-sm font-semibold text-gray-900 mb-4">빠른 이동</h3>
      <div className="space-y-3">
        {showDashboardLink && (
          <Link
            to={dashboardPath}
            className="flex items-center gap-3 w-full p-4 bg-primary-50 text-primary-700 rounded-xl hover:bg-primary-100 transition-colors"
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-sm font-medium">{dashboardLabel}</span>
          </Link>
        )}
        {children}
        {onLogout && (
          <button
            onClick={onLogout}
            className="flex items-center gap-3 w-full p-4 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="text-sm font-medium">로그아웃</span>
          </button>
        )}
      </div>
    </div>
  );
}
