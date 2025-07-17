import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index
} from 'typeorm';

export enum DashboardType {
  OVERVIEW = 'overview',
  INFRASTRUCTURE = 'infrastructure',
  PERFORMANCE = 'performance',
  ALERTS = 'alerts',
  SERVICES = 'services',
  CUSTOM = 'custom'
}

export enum WidgetType {
  METRIC_CARD = 'metric_card',
  LINE_CHART = 'line_chart',
  BAR_CHART = 'bar_chart',
  PIE_CHART = 'pie_chart',
  TABLE = 'table',
  ALERT_LIST = 'alert_list',
  SERVICE_STATUS = 'service_status',
  UPTIME_STATUS = 'uptime_status',
  LOG_VIEWER = 'log_viewer',
  GAUGE = 'gauge'
}

export enum RefreshInterval {
  REAL_TIME = 'real_time',
  THIRTY_SECONDS = '30s',
  ONE_MINUTE = '1m',
  FIVE_MINUTES = '5m',
  FIFTEEN_MINUTES = '15m',
  THIRTY_MINUTES = '30m',
  ONE_HOUR = '1h'
}

@Entity('operations_dashboards')
@Index(['dashboardType', 'isActive'])
@Index(['createdBy'])
export class OperationsDashboard {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'enum', enum: DashboardType })
  dashboardType!: DashboardType;

  @Column({ type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ type: 'boolean', default: false })
  isDefault!: boolean;

  @Column({ type: 'boolean', default: false })
  isPublic!: boolean;

  @Column({ type: 'uuid', nullable: true })
  createdBy?: string;

  // Dashboard layout configuration
  @Column({ type: 'json' })
  layout!: {
    columns: number;
    rows: number;
    widgets: DashboardWidget[];
  };

  // Dashboard settings
  @Column({ type: 'json', nullable: true })
  settings?: {
    refreshInterval: RefreshInterval;
    autoRefresh: boolean;
    showTimestamp: boolean;
    theme: 'light' | 'dark' | 'auto';
    timeRange: string; // 1h, 24h, 7d, 30d
    timezone: string;
    notifications: {
      enabled: boolean;
      soundEnabled: boolean;
      desktopNotifications: boolean;
    };
  };

  // Access control
  @Column({ type: 'simple-array', nullable: true })
  allowedRoles?: string[];

  @Column({ type: 'simple-array', nullable: true })
  allowedUsers?: string[];

  // Sharing and export settings
  @Column({ type: 'json', nullable: true })
  sharing?: {
    publicUrl?: string;
    embedEnabled: boolean;
    exportEnabled: boolean;
    allowedDomains?: string[];
  };

  @CreateDateColumn()
  createdAt!: Date;

  @UpdateDateColumn()
  updatedAt!: Date;

  // Static factory methods
  static createOverviewDashboard(name: string, createdBy: string): Partial<OperationsDashboard> {
    return {
      name,
      description: 'System overview dashboard showing key metrics and alerts',
      dashboardType: DashboardType.OVERVIEW,
      isActive: true,
      isDefault: true,
      createdBy,
      layout: {
        columns: 12,
        rows: 6,
        widgets: [
          {
            id: 'system-status',
            type: WidgetType.SERVICE_STATUS,
            title: 'System Status',
            position: { x: 0, y: 0, width: 6, height: 2 },
            config: {
              showDetails: true,
              showResponseTimes: true
            }
          },
          {
            id: 'active-alerts',
            type: WidgetType.ALERT_LIST,
            title: 'Active Alerts',
            position: { x: 6, y: 0, width: 6, height: 2 },
            config: {
              maxItems: 5,
              showSeverityFilter: true
            }
          },
          {
            id: 'response-time',
            type: WidgetType.LINE_CHART,
            title: 'Average Response Time',
            position: { x: 0, y: 2, width: 6, height: 2 },
            config: {
              metricType: 'performance',
              metricCategory: 'response_time',
              timeRange: '1h'
            }
          },
          {
            id: 'memory-usage',
            type: WidgetType.GAUGE,
            title: 'Memory Usage',
            position: { x: 6, y: 2, width: 3, height: 2 },
            config: {
              metricType: 'system',
              metricCategory: 'memory_usage',
              thresholds: {
                warning: 70,
                critical: 85
              }
            }
          },
          {
            id: 'cpu-usage',
            type: WidgetType.GAUGE,
            title: 'CPU Usage',
            position: { x: 9, y: 2, width: 3, height: 2 },
            config: {
              metricType: 'system',
              metricCategory: 'cpu_usage',
              thresholds: {
                warning: 70,
                critical: 85
              }
            }
          },
          {
            id: 'uptime-status',
            type: WidgetType.UPTIME_STATUS,
            title: 'Service Uptime (24h)',
            position: { x: 0, y: 4, width: 12, height: 2 },
            config: {
              services: ['api-server', 'web-app', 'admin-dashboard', 'database'],
              timeRange: '24h'
            }
          }
        ]
      },
      settings: {
        refreshInterval: RefreshInterval.THIRTY_SECONDS,
        autoRefresh: true,
        showTimestamp: true,
        theme: 'auto',
        timeRange: '24h',
        timezone: 'UTC',
        notifications: {
          enabled: true,
          soundEnabled: false,
          desktopNotifications: true
        }
      }
    };
  }

  static createInfrastructureDashboard(name: string, createdBy: string): Partial<OperationsDashboard> {
    return {
      name,
      description: 'Infrastructure monitoring dashboard',
      dashboardType: DashboardType.INFRASTRUCTURE,
      isActive: true,
      createdBy,
      layout: {
        columns: 12,
        rows: 8,
        widgets: [
          {
            id: 'server-metrics',
            type: WidgetType.METRIC_CARD,
            title: 'Server Metrics',
            position: { x: 0, y: 0, width: 12, height: 1 },
            config: {
              metrics: ['cpu_usage', 'memory_usage', 'disk_usage', 'network_io'],
              showTrends: true
            }
          },
          {
            id: 'cpu-chart',
            type: WidgetType.LINE_CHART,
            title: 'CPU Usage Over Time',
            position: { x: 0, y: 1, width: 6, height: 3 },
            config: {
              metricType: 'system',
              metricCategory: 'cpu_usage',
              timeRange: '6h'
            }
          },
          {
            id: 'memory-chart',
            type: WidgetType.LINE_CHART,
            title: 'Memory Usage Over Time',
            position: { x: 6, y: 1, width: 6, height: 3 },
            config: {
              metricType: 'system',
              metricCategory: 'memory_usage',
              timeRange: '6h'
            }
          },
          {
            id: 'disk-usage',
            type: WidgetType.PIE_CHART,
            title: 'Disk Usage',
            position: { x: 0, y: 4, width: 4, height: 2 },
            config: {
              metricType: 'system',
              metricCategory: 'storage_usage'
            }
          },
          {
            id: 'network-stats',
            type: WidgetType.BAR_CHART,
            title: 'Network Statistics',
            position: { x: 4, y: 4, width: 8, height: 2 },
            config: {
              metricType: 'system',
              metricCategory: 'network_io',
              timeRange: '1h'
            }
          },
          {
            id: 'database-connections',
            type: WidgetType.LINE_CHART,
            title: 'Database Connections',
            position: { x: 0, y: 6, width: 6, height: 2 },
            config: {
              metricType: 'system',
              metricCategory: 'concurrent_users',
              source: 'database'
            }
          },
          {
            id: 'load-average',
            type: WidgetType.LINE_CHART,
            title: 'System Load Average',
            position: { x: 6, y: 6, width: 6, height: 2 },
            config: {
              metricType: 'system',
              metricCategory: 'load_average',
              timeRange: '2h'
            }
          }
        ]
      },
      settings: {
        refreshInterval: RefreshInterval.ONE_MINUTE,
        autoRefresh: true,
        showTimestamp: true,
        theme: 'dark',
        timeRange: '6h',
        timezone: 'UTC',
        notifications: {
          enabled: false,
          soundEnabled: false,
          desktopNotifications: false
        }
      }
    };
  }

  static createPerformanceDashboard(name: string, createdBy: string): Partial<OperationsDashboard> {
    return {
      name,
      description: 'Application performance monitoring dashboard',
      dashboardType: DashboardType.PERFORMANCE,
      isActive: true,
      createdBy,
      layout: {
        columns: 12,
        rows: 6,
        widgets: [
          {
            id: 'performance-overview',
            type: WidgetType.METRIC_CARD,
            title: 'Performance Overview',
            position: { x: 0, y: 0, width: 12, height: 1 },
            config: {
              metrics: ['avg_response_time', 'error_rate', 'throughput', 'apdex_score'],
              showComparison: true
            }
          },
          {
            id: 'response-times',
            type: WidgetType.LINE_CHART,
            title: 'Response Times by Endpoint',
            position: { x: 0, y: 1, width: 8, height: 3 },
            config: {
              metricType: 'performance',
              metricCategory: 'response_time',
              groupBy: 'endpoint',
              timeRange: '2h'
            }
          },
          {
            id: 'error-rate-gauge',
            type: WidgetType.GAUGE,
            title: 'Error Rate',
            position: { x: 8, y: 1, width: 4, height: 2 },
            config: {
              metricType: 'error',
              metricCategory: 'error_rate',
              thresholds: {
                warning: 2,
                critical: 5
              }
            }
          },
          {
            id: 'throughput-chart',
            type: WidgetType.LINE_CHART,
            title: 'Request Throughput',
            position: { x: 8, y: 3, width: 4, height: 1 },
            config: {
              metricType: 'system',
              metricCategory: 'throughput',
              timeRange: '1h'
            }
          },
          {
            id: 'slow-queries',
            type: WidgetType.TABLE,
            title: 'Slow Database Queries',
            position: { x: 0, y: 4, width: 6, height: 2 },
            config: {
              metricType: 'performance',
              metricCategory: 'database_query_time',
              showTop: 10,
              sortBy: 'response_time'
            }
          },
          {
            id: 'api-performance',
            type: WidgetType.BAR_CHART,
            title: 'API Endpoint Performance',
            position: { x: 6, y: 4, width: 6, height: 2 },
            config: {
              metricType: 'performance',
              metricCategory: 'api_latency',
              groupBy: 'endpoint',
              timeRange: '1h'
            }
          }
        ]
      },
      settings: {
        refreshInterval: RefreshInterval.THIRTY_SECONDS,
        autoRefresh: true,
        showTimestamp: true,
        theme: 'light',
        timeRange: '2h',
        timezone: 'UTC',
        notifications: {
          enabled: true,
          soundEnabled: true,
          desktopNotifications: true
        }
      }
    };
  }

  // Instance methods
  addWidget(widget: DashboardWidget): void {
    this.layout.widgets.push(widget);
  }

  removeWidget(widgetId: string): void {
    this.layout.widgets = this.layout.widgets.filter(w => w.id !== widgetId);
  }

  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): void {
    const widgetIndex = this.layout.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex !== -1) {
      this.layout.widgets[widgetIndex] = {
        ...this.layout.widgets[widgetIndex],
        ...updates
      };
    }
  }

  getWidget(widgetId: string): DashboardWidget | undefined {
    return this.layout.widgets.find(w => w.id === widgetId);
  }

  isAccessibleBy(userId: string, userRoles: string[]): boolean {
    // Public dashboards are accessible to everyone
    if (this.isPublic) return true;

    // Check if user is the creator
    if (this.createdBy === userId) return true;

    // Check allowed users
    if (this.allowedUsers && this.allowedUsers.includes(userId)) return true;

    // Check allowed roles
    if (this.allowedRoles && userRoles.some(role => this.allowedRoles!.includes(role))) return true;

    return false;
  }

  canBeEditedBy(userId: string, userRoles: string[]): boolean {
    // Only creator and admins can edit
    if (this.createdBy === userId) return true;
    if (userRoles.includes('admin')) return true;
    return false;
  }

  getRefreshIntervalMs(): number {
    const intervalMap: Record<RefreshInterval, number> = {
      [RefreshInterval.REAL_TIME]: 5000,
      [RefreshInterval.THIRTY_SECONDS]: 30000,
      [RefreshInterval.ONE_MINUTE]: 60000,
      [RefreshInterval.FIVE_MINUTES]: 300000,
      [RefreshInterval.FIFTEEN_MINUTES]: 900000,
      [RefreshInterval.THIRTY_MINUTES]: 1800000,
      [RefreshInterval.ONE_HOUR]: 3600000
    };

    return intervalMap[this.settings?.refreshInterval || RefreshInterval.ONE_MINUTE];
  }

  generatePublicUrl(): string {
    if (!this.isPublic) {
      throw new Error('Dashboard must be public to generate URL');
    }
    
    const baseUrl = process.env.PUBLIC_URL || 'https://your-domain.com';
    return `${baseUrl}/status/dashboard/${this.id}`;
  }

  clone(newName: string, createdBy: string): Partial<OperationsDashboard> {
    return {
      name: newName,
      description: `Copy of ${this.name}`,
      dashboardType: this.dashboardType,
      isActive: true,
      isDefault: false,
      isPublic: false,
      createdBy,
      layout: JSON.parse(JSON.stringify(this.layout)),
      settings: JSON.parse(JSON.stringify(this.settings)),
      allowedRoles: this.allowedRoles ? [...this.allowedRoles] : undefined,
      allowedUsers: undefined
    };
  }
}

export interface DashboardWidget {
  id: string;
  type: WidgetType;
  title: string;
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: {
    metricType?: string;
    metricCategory?: string;
    source?: string;
    endpoint?: string;
    timeRange?: string;
    refreshInterval?: RefreshInterval;
    thresholds?: {
      warning?: number;
      critical?: number;
    };
    filters?: {
      [key: string]: string | number | boolean | string[];
    };
    displayOptions?: {
      showLegend?: boolean;
      showGrid?: boolean;
      showLabels?: boolean;
      colorScheme?: string;
      aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
    };
    [key: string]: unknown;
  };
}