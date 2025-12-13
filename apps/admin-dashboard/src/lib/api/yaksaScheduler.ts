/**
 * Yaksa Scheduler API Client
 *
 * API client for Yaksa Scheduler admin operations
 * Including integrated dashboard data
 */

import { authClient } from '@o4o/auth-client';

const BASE_PATH = '/api/v1/yaksa-scheduler';

// ============================================
// Types for Integrated Dashboard
// ============================================

export interface OverdueInvoiceItem {
  id: string;
  invoiceNumber: string;
  memberName: string;
  amount: number;
  dueDate: Date;
  daysOverdue: number;
}

export interface OverdueInvoiceWidget {
  totalCount: number;
  totalAmount: number;
  items: OverdueInvoiceItem[];
}

export interface ExpiringVerificationItem {
  id: string;
  memberName: string;
  licenseNumber: string;
  expiresAt: Date;
  daysUntilExpiry: number;
}

export interface ExpiringVerificationWidget {
  thisWeekCount: number;
  thisMonthCount: number;
  items: ExpiringVerificationItem[];
}

export interface PendingAssignmentItem {
  id: string;
  memberName: string;
  courseName: string;
  assignedAt: Date;
  dueDate?: Date;
  daysRemaining?: number;
}

export interface PendingAssignmentWidget {
  totalPending: number;
  overdueCount: number;
  nearDeadlineCount: number;
  items: PendingAssignmentItem[];
}

export interface PendingReportItem {
  id: string;
  reportType: string;
  reportYear: number;
  submitterName: string;
  status: string;
  submittedAt?: Date;
}

export interface PendingReportWidget {
  draftCount: number;
  reviewedCount: number;
  failedSubmissionCount: number;
  items: PendingReportItem[];
}

export interface FailureQueueItem {
  id: string;
  jobName: string;
  targetService: string;
  errorMessage: string;
  failedAt: Date;
  retryCount: number;
}

export interface FailureQueueWidget {
  pendingCount: number;
  exhaustedCount: number;
  recentFailures: FailureQueueItem[];
}

export interface SchedulerHealthWidget {
  activeJobs: number;
  pausedJobs: number;
  errorJobs: number;
  recentRuns: Array<{
    jobId: string;
    jobName: string;
    status: 'success' | 'failure';
    executedAt: Date;
    duration: number;
  }>;
  successRate: number;
}

export interface IntegratedDashboardData {
  overdueInvoices: OverdueInvoiceWidget;
  expiringVerifications: ExpiringVerificationWidget;
  pendingAssignments: PendingAssignmentWidget;
  pendingReports: PendingReportWidget;
  failureQueue: FailureQueueWidget;
  schedulerHealth: SchedulerHealthWidget;
  lastUpdated: Date;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  code?: string;
}

// ============================================
// API Functions
// ============================================

export const yaksaSchedulerApi = {
  /**
   * Get integrated dashboard data (all 6 widgets)
   */
  async getIntegratedDashboard(organizationId?: string): Promise<ApiResponse<IntegratedDashboardData>> {
    try {
      const params = organizationId ? { organizationId } : {};
      const response = await authClient.api.get(`${BASE_PATH}/integrated-dashboard`, { params });
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      console.error('Failed to fetch integrated dashboard:', error);
      return {
        success: false,
        error: error.response?.data?.message || '대시보드 데이터를 불러올 수 없습니다.',
        code: error.response?.data?.code,
      };
    }
  },

  /**
   * Get single widget data
   */
  async getWidget(
    widgetName: 'overdueInvoices' | 'expiringVerifications' | 'pendingAssignments' | 'pendingReports' | 'failureQueue' | 'schedulerHealth',
    organizationId?: string
  ): Promise<ApiResponse<any>> {
    try {
      const params = organizationId ? { organizationId } : {};
      const response = await authClient.api.get(`${BASE_PATH}/integrated-dashboard/${widgetName}`, { params });
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      console.error(`Failed to fetch widget ${widgetName}:`, error);
      return {
        success: false,
        error: error.response?.data?.message || '위젯 데이터를 불러올 수 없습니다.',
        code: error.response?.data?.code,
      };
    }
  },

  /**
   * Get scheduler health
   */
  async getHealth(): Promise<ApiResponse<SchedulerHealthWidget>> {
    try {
      const response = await authClient.api.get(`${BASE_PATH}/health`);
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      console.error('Failed to fetch scheduler health:', error);
      return {
        success: false,
        error: error.response?.data?.message || '헬스 데이터를 불러올 수 없습니다.',
        code: error.response?.data?.code,
      };
    }
  },

  /**
   * Get failure queue
   */
  async getFailureQueue(organizationId?: string): Promise<ApiResponse<FailureQueueWidget>> {
    try {
      const params = organizationId ? { organizationId } : {};
      const response = await authClient.api.get(`${BASE_PATH}/failures`, { params });
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      console.error('Failed to fetch failure queue:', error);
      return {
        success: false,
        error: error.response?.data?.message || '실패 큐 데이터를 불러올 수 없습니다.',
        code: error.response?.data?.code,
      };
    }
  },

  /**
   * Get admin alerts
   */
  async getAlerts(organizationId?: string, unreadOnly = false): Promise<ApiResponse<AdminAlertsData>> {
    try {
      const params: any = { limit: 10 };
      if (organizationId) params.organizationId = organizationId;
      if (unreadOnly) params.unreadOnly = 'true';

      const response = await authClient.api.get(`${BASE_PATH}/alerts`, { params });
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      console.error('Failed to fetch alerts:', error);
      return {
        success: false,
        error: error.response?.data?.message || '알림을 불러올 수 없습니다.',
        code: error.response?.data?.code,
      };
    }
  },

  /**
   * Mark alert as read
   */
  async markAlertAsRead(alertId: string): Promise<ApiResponse<void>> {
    try {
      await authClient.api.post(`${BASE_PATH}/alerts/${alertId}/read`);
      return { success: true };
    } catch (error: any) {
      console.error('Failed to mark alert as read:', error);
      return {
        success: false,
        error: error.response?.data?.message || '알림 읽음 처리에 실패했습니다.',
      };
    }
  },

  /**
   * Seed default jobs for organization
   */
  async seedJobs(organizationId: string): Promise<ApiResponse<{ created: number; skipped: number }>> {
    try {
      const response = await authClient.api.post(`${BASE_PATH}/seed-jobs`, { organizationId });
      return {
        success: true,
        data: response.data.data || response.data,
      };
    } catch (error: any) {
      console.error('Failed to seed jobs:', error);
      return {
        success: false,
        error: error.response?.data?.message || 'Job Seed에 실패했습니다.',
      };
    }
  },
};

// ============================================
// Admin Alert Types
// ============================================

export interface AdminAlert {
  id: string;
  type: 'job_failure' | 'retry_exhausted' | 'overdue_alert' | 'expiry_warning' | 'deadline_reminder' | 'system_health';
  priority: 'low' | 'normal' | 'high' | 'critical';
  title: string;
  message: string;
  organizationId?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
  read: boolean;
  actionUrl?: string;
}

export interface AdminAlertsData {
  alerts: AdminAlert[];
  unreadCount: number;
}
