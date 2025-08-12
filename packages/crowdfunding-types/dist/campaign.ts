import type { BaseEntity } from '@o4o/types';
import type { FundingProject } from './project';
import type { BackerStats } from './backer';

export interface Campaign extends BaseEntity {
  // Basic Info
  name: string;
  description: string;
  type: CampaignType;
  
  // Timeline
  startDate: Date | string;
  endDate: Date | string;
  
  // Projects
  projects: FundingProject[];
  projectIds: string[];
  
  // Goals
  targetProjects?: number;
  targetAmount?: number;
  targetBackers?: number;
  
  // Current Stats
  activeProjects: number;
  totalAmount: number;
  totalBackers: number;
  
  // Visibility
  isActive: boolean;
  isPublic: boolean;
  isFeatured: boolean;
  
  // Branding
  bannerImage?: string;
  logoImage?: string;
  primaryColor?: string;
  secondaryColor?: string;
}

export type CampaignType = 
  | 'seasonal'      // 시즌 캠페인 (e.g., "Summer 2024")
  | 'category'      // 카테고리 캠페인 (e.g., "Tech Innovation")
  | 'social'        // 사회공헌 캠페인
  | 'brand'         // 브랜드 캠페인
  | 'event';        // 이벤트 캠페인

export interface CampaignMetrics {
  campaignId: string;
  
  // Performance
  conversionRate: number;
  averageBackingAmount: number;
  projectSuccessRate: number;
  
  // Engagement
  totalViews: number;
  uniqueVisitors: number;
  shareCount: number;
  
  // Time-based
  dailyMetrics: DailyMetric[];
  
  // Top Performers
  topProjects: FundingProject[];
  topBackers: BackerStats[];
}

export interface DailyMetric {
  date: string;
  views: number;
  backings: number;
  amount: number;
  newProjects: number;
}

// Marketing & Promotion
export interface PromotionBanner {
  id: string;
  campaignId?: string;
  title: string;
  subtitle?: string;
  imageUrl: string;
  linkUrl: string;
  position: BannerPosition;
  priority: number;
  startDate: Date | string;
  endDate: Date | string;
  isActive: boolean;
  clickCount: number;
  impressionCount: number;
}

export type BannerPosition = 'home_hero' | 'home_middle' | 'category_top' | 'project_sidebar';

export interface CampaignEmail {
  id: string;
  campaignId: string;
  subject: string;
  content: string;
  recipientType: 'all_users' | 'backers' | 'creators' | 'subscribers';
  recipientFilters?: {
    minBackings?: number;
    categories?: string[];
    lastActiveAfter?: Date | string;
  };
  scheduledAt: Date | string;
  sentAt?: Date | string;
  sentCount?: number;
  openRate?: number;
  clickRate?: number;
}