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

// System health types
export interface SystemHealthStatus {
  api: {
    status: 'healthy' | 'warning' | 'critical';
    responseTime: number;
    lastCheck: string;
  };
  database: {
    status: 'healthy' | 'warning' | 'critical';
    connections: number;
    lastCheck: string;
  };
  storage: {
    status: 'healthy' | 'warning' | 'critical';
    usage: number;
    total: number;
  };
  memory: {
    status: 'healthy' | 'warning' | 'critical';
    usage: number;
    total: number;
  };
}