/**
 * P1 Phase C: Role-Based Dashboard Wrapper
 *
 * Generic dashboard component that loads widgets based on role and capabilities.
 */

import { FC, useMemo } from 'react';
import { DashboardGrid } from '@/components/dashboard/DashboardGrid';
import { WidgetBase } from '@/components/widgets/WidgetBase';
import { WidgetContainer } from '@/components/widgets/WidgetStates';
import { useDashboardLayout } from '@/hooks/useDashboardLayout';
import { useWidget } from '@/hooks/useWidget';
import { widgetRegistry } from '@/lib/widgets/widgetRegistry';
import type { DashboardLayout, DashboardWidgetRegistryEntry } from '@o4o/types';

export interface RoleDashboardProps {
  /** Role for this dashboard */
  role: 'supplier' | 'seller' | 'partner' | 'admin';

  /** User's capabilities */
  capabilities: string[];

  /** Default layout */
  defaultLayout: DashboardLayout;

  /** Page title */
  title: string;

  /** Page description */
  description?: string;
}

/**
 * Role-Based Dashboard Component
 *
 * Renders widgets based on role and capabilities with layout persistence
 */
export const RoleDashboard: FC<RoleDashboardProps> = ({
  role,
  capabilities,
  defaultLayout,
  title,
  description,
}) => {
  const { layout, hideWidget, isWidgetHidden } = useDashboardLayout({
    role,
    defaultLayout,
  });

  // Get widgets for this role that user has access to
  const availableWidgets = useMemo(() => {
    const roleWidgets = widgetRegistry.getByRole(role);
    const accessibleWidgets = roleWidgets.filter((entry) => {
      const required = entry.config.requiredCapabilities || [];
      if (required.length === 0) return true;
      return required.some((cap) => capabilities.includes(cap));
    });
    return accessibleWidgets;
  }, [role, capabilities]);

  // Filter out hidden widgets
  const visibleWidgets = useMemo(() => {
    return availableWidgets.filter((entry) => !isWidgetHidden(entry.config.id));
  }, [availableWidgets, isWidgetHidden]);

  // Sort by priority and order
  const sortedWidgets = useMemo(() => {
    const priorityMap = { critical: 4, high: 3, normal: 2, low: 1 };

    return [...visibleWidgets].sort((a, b) => {
      const aPriority = priorityMap[a.config.priority || 'normal'];
      const bPriority = priorityMap[b.config.priority || 'normal'];

      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }

      const aIndex = layout.widgetIds.indexOf(a.config.id);
      const bIndex = layout.widgetIds.indexOf(b.config.id);

      if (aIndex === -1 && bIndex === -1) return 0;
      if (aIndex === -1) return 1;
      if (bIndex === -1) return -1;

      return aIndex - bIndex;
    });
  }, [visibleWidgets, layout.widgetIds]);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">{title}</h1>
        {description && <p className="mt-2 text-gray-600">{description}</p>}
      </div>

      {/* Widgets Grid */}
      <DashboardGrid layout={layout}>
        {sortedWidgets.map((entry) => (
          <WidgetRenderer
            key={entry.config.id}
            entry={entry}
            onHide={() => hideWidget(entry.config.id)}
          />
        ))}
      </DashboardGrid>

      {/* Empty State */}
      {sortedWidgets.length === 0 && (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-gray-600">표시할 위젯이 없습니다.</p>
        </div>
      )}
    </div>
  );
};

/**
 * Widget Renderer Component
 *
 * Renders a single widget with data loading and error handling
 */
interface WidgetRendererProps {
  entry: DashboardWidgetRegistryEntry;
  onHide: () => void;
}

const WidgetRenderer: FC<WidgetRendererProps> = ({ entry, onHide }) => {
  const { config, component: WidgetComponent, dataLoader } = entry;

  const { dataState, refresh, isRefreshing } = useWidget({
    config,
    dataLoader: dataLoader || (async () => ({})),
  });

  return (
    <WidgetBase
      config={config}
      isRefreshing={isRefreshing}
      onRefresh={dataLoader ? refresh : undefined}
      onHide={config.userConfigurable ? onHide : undefined}
    >
      <WidgetContainer
        state={dataState.state}
        error={dataState.error}
        onRetry={refresh}
      >
        <WidgetComponent config={config} dataState={dataState} onRefresh={refresh} />
      </WidgetContainer>
    </WidgetBase>
  );
};
