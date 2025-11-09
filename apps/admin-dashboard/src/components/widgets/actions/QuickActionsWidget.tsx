/**
 * P1 Phase C: Quick Actions Widget
 *
 * Shows quick action buttons for common tasks.
 */

import { FC } from 'react';
import { Link } from 'react-router-dom';
import { Plus, ShoppingBag, Users, Settings } from 'lucide-react';
import type { DashboardWidgetProps, ActionWidgetData } from '@o4o/types';

const iconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Plus,
  ShoppingBag,
  Users,
  Settings,
};

export const QuickActionsWidget: FC<DashboardWidgetProps<ActionWidgetData>> = ({ dataState }) => {
  if (!dataState.data) return null;

  const { actions } = dataState.data;

  return (
    <div className="grid grid-cols-2 gap-3">
      {actions.map((action) => {
        const Icon = action.icon ? iconMap[action.icon] : null;
        const baseClasses = 'flex items-center justify-center px-4 py-3 rounded-lg font-medium transition-colors';
        const variantClasses = {
          primary: 'bg-blue-600 text-white hover:bg-blue-700',
          secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
          danger: 'bg-red-600 text-white hover:bg-red-700',
        };

        const className = `${baseClasses} ${variantClasses[action.variant || 'secondary']}`;

        if (action.href) {
          return (
            <Link key={action.id} to={action.href} className={className}>
              {Icon && <Icon className="w-4 h-4 mr-2" />}
              {action.label}
            </Link>
          );
        }

        return (
          <button
            key={action.id}
            onClick={action.onClick}
            disabled={action.disabled}
            className={`${className} ${action.disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {Icon && <Icon className="w-4 h-4 mr-2" />}
            {action.label}
          </button>
        );
      })}
    </div>
  );
};

export default QuickActionsWidget;
