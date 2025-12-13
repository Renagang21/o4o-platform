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
};
