/**
 * P1 Phase C: Dashboard Widgets System Types
 *
 * Defines the architecture for capability-based dashboard widgets
 * with standardized loading, error, and empty states.
 */

/**
 * Dashboard Widget Categories
 */
export type DashboardWidgetType = 'stat' | 'chart' | 'table' | 'action' | 'alert' | 'custom';

/**
 * Dashboard Widget Display State
 */
export type DashboardWidgetState = 'loading' | 'error' | 'empty' | 'ready';

/**
 * Dashboard Widget Size for Grid Layout
 */
export type DashboardWidgetSize = 'small' | 'medium' | 'large' | 'full';

/**
 * Dashboard Widget Priority (higher = more important, shown first)
 */
export type DashboardWidgetPriority = 'low' | 'normal' | 'high' | 'critical';

/**
 * Dashboard Widget Refresh Interval (in seconds, 0 = manual only)
 */
export type DashboardWidgetRefreshInterval = 0 | 30 | 60 | 300 | 600;

/**
 * Base Dashboard Widget Configuration
 */
export interface DashboardWidgetConfig {
  /** Unique widget identifier */
  id: string;

  /** Widget type */
  type: DashboardWidgetType;

  /** Display title */
  title: string;

  /** Optional description/subtitle */
  description?: string;

  /** Required capabilities to view this widget */
  requiredCapabilities?: string[];

  /** Widget size in grid */
  size?: DashboardWidgetSize;

  /** Priority for default ordering */
  priority?: DashboardWidgetPriority;

  /** Auto-refresh interval */
  refreshInterval?: DashboardWidgetRefreshInterval;

  /** Whether widget can be hidden by user */
  userConfigurable?: boolean;

  /** Default visibility */
  defaultVisible?: boolean;

  /** Icon name (lucide-react) */
  icon?: string;

  /** Additional metadata */
  metadata?: Record<string, any>;
}

/**
 * Dashboard Widget Data State
 */
export interface DashboardWidgetDataState<T = any> {
  /** Current state */
  state: DashboardWidgetState;

  /** Widget data */
  data?: T;

  /** Error information */
  error?: {
    message: string;
    code?: string;
    details?: any;
  };

  /** Last updated timestamp */
  lastUpdated?: Date;

  /** Is currently refreshing */
  isRefreshing?: boolean;
}

/**
 * Widget Props Interface
 */
export interface DashboardWidgetProps<T = any> {
  /** Widget configuration */
  config: DashboardWidgetConfig;

  /** Widget data state */
  dataState: DashboardWidgetDataState<T>;

  /** Refresh callback */
  onRefresh?: () => void | Promise<void>;

  /** Hide widget callback */
  onHide?: () => void;

  /** Additional props */
  [key: string]: any;
}

/**
 * Widget Registry Entry
 */
export interface DashboardWidgetRegistryEntry {
  /** Widget configuration */
  config: DashboardWidgetConfig;

  /** Widget component (lazy loaded) */
  component: React.LazyExoticComponent<React.ComponentType<DashboardWidgetProps<any>>>;

  /** Data loader function */
  dataLoader?: () => Promise<any>;

  /** Validation function */
  validator?: (data: any) => boolean;
}

/**
 * Dashboard Layout Configuration
 */
export interface DashboardLayout {
  /** Layout identifier */
  id: string;

  /** Role this layout is for */
  role: 'supplier' | 'seller' | 'partner' | 'admin';

  /** Widget IDs in display order */
  widgetIds: string[];

  /** Hidden widget IDs */
  hiddenWidgetIds?: string[];

  /** Custom grid configuration */
  gridConfig?: {
    columns: number;
    gap: number;
  };

  /** Last modified */
  updatedAt?: Date;
}

/**
 * Stat Widget Data
 */
export interface StatWidgetData {
  /** Current value */
  value: number | string;

  /** Label */
  label: string;

  /** Change from previous period */
  change?: {
    value: number;
    percentage: number;
    direction: 'up' | 'down' | 'neutral';
  };

  /** Trend data (for sparkline) */
  trend?: number[];

  /** Target/goal value */
  target?: number;

  /** Format hint */
  format?: 'number' | 'currency' | 'percentage' | 'duration';

  /** Additional context */
  context?: string;
}

/**
 * Table Widget Data
 */
export interface TableWidgetData<T = any> {
  /** Table rows */
  rows: T[];

  /** Total count (for pagination) */
  total?: number;

  /** Column definitions */
  columns: Array<{
    key: string;
    label: string;
    width?: string;
    align?: 'left' | 'center' | 'right';
    format?: (value: any) => string;
  }>;

  /** Empty state message */
  emptyMessage?: string;

  /** Action buttons per row */
  rowActions?: Array<{
    label: string;
    icon?: string;
    onClick: (row: T) => void;
  }>;
}

/**
 * Chart Widget Data
 */
export interface ChartWidgetData {
  /** Chart type */
  type: 'line' | 'bar' | 'pie' | 'area';

  /** Chart data */
  data: Array<{
    label: string;
    value: number;
    [key: string]: any;
  }>;

  /** X-axis label */
  xAxisLabel?: string;

  /** Y-axis label */
  yAxisLabel?: string;

  /** Data keys for multi-series */
  dataKeys?: string[];

  /** Colors */
  colors?: string[];
}

/**
 * Action Widget Data
 */
export interface ActionWidgetData {
  /** Actions */
  actions: Array<{
    id: string;
    label: string;
    icon?: string;
    description?: string;
    href?: string;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'danger';
    disabled?: boolean;
  }>;
}

/**
 * Alert Widget Data
 */
export interface AlertWidgetData {
  /** Alerts */
  alerts: Array<{
    id: string;
    level: 'info' | 'warning' | 'error' | 'success';
    title: string;
    message: string;
    timestamp?: Date;
    dismissible?: boolean;
    action?: {
      label: string;
      onClick: () => void;
    };
  }>;
}
