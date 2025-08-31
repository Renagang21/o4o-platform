export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  timestamp: string;
}

export interface AffiliateUserResponse {
  id: string;
  userId: string;
  referralCode: string;
  status: string;
  commissionRate: number;
  totalClicks: number;
  totalConversions: number;
  totalEarnings: number;
  pendingEarnings: number;
  paidEarnings: number;
  websiteUrl?: string;
  description?: string;
  lastClickAt?: Date;
  lastConversionAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AffiliateLinkResponse {
  fullUrl: string;
  shortUrl?: string;
  referralCode: string;
  landingUrl: string;
  trackingParams: {
    source?: string;
    medium?: string;
    campaign?: string;
    [key: string]: any;
  };
  createdAt: string;
}

export interface ClickTrackingResponse {
  success: boolean;
  clickId: string;
  sessionId: string;
  message: string;
}

export interface ConversionTrackingResponse {
  success: boolean;
  conversionId: string;
  commissionAmount: number;
  status: string;
  message: string;
}

export interface AffiliateStatsResponse {
  period: {
    startDate: string;
    endDate: string;
  };
  summary: {
    totalClicks: number;
    uniqueClicks: number;
    totalConversions: number;
    conversionRate: number;
    totalRevenue: number;
    totalCommission: number;
    pendingCommission: number;
    paidCommission: number;
  };
  daily?: Array<{
    date: string;
    clicks: number;
    conversions: number;
    revenue: number;
    commission: number;
  }>;
  topPerformers?: Array<{
    affiliateId: string;
    referralCode: string;
    clicks: number;
    conversions: number;
    revenue: number;
    commission: number;
  }>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}