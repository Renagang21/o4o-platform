/**
 * Dashboard type definitions
 */

// Sales data types
export interface SalesDataItem {
  date: string;
  sales?: number;
  amount?: number;
  orders: number;
}

// Order types
export interface Order {
  id: string;
  status: string;
  orderNumber?: string;
  totalAmount?: number;
  createdAt?: string;
  [key: string]: unknown;
}

// Notification types
export interface Notification {
  id: string;
  type: 'urgent' | 'approval' | 'success' | 'info';
  title: string;
  message: string;
  time: string;
  read: boolean;
  actionUrl?: string;
}

// Activity types
export interface Activity {
  id: string;
  type: 'user' | 'order' | 'product' | 'content';
  message: string;
  time: string;
  user?: string;
  icon: string;
}

// Order status data
export interface OrderStatusData {
  status: string;
  count: number;
  color: string;
}

// User data for charts
export interface UserChartData {
  date: string;
  newUsers: number;
  activeUsers: number;
}

// System health status type (includes 'error' for API unavailable state)
export type SystemHealthStatusType = 'healthy' | 'warning' | 'critical' | 'error';

// System health types
export interface SystemHealthStatus {
  api: {
    status: SystemHealthStatusType;
    responseTime: number;
    lastCheck: string;
  };
  database: {
    status: SystemHealthStatusType;
    connections: number;
    lastCheck: string;
  };
  storage: {
    status: SystemHealthStatusType;
    usage: number;
    total: number;
  };
  memory: {
    status: SystemHealthStatusType;
    usage: number;
    total: number;
  };
}