import type { BaseEntity, User, MediaItem } from '@o4o/types';

export type FundingStatus = 'draft' | 'pending' | 'ongoing' | 'successful' | 'failed' | 'cancelled';
export type FundingCategory = 'tech' | 'art' | 'design' | 'fashion' | 'food' | 'social' | 'other';

export interface FundingProject extends BaseEntity {
  // Basic Information
  title: string;
  slug: string;
  description: string;
  shortDescription: string;
  category: FundingCategory;
  tags: string[];
  
  // Creator Information
  creatorId: string;
  creator?: User;
  creatorName: string;
  creatorDescription?: string;
  
  // Funding Details
  targetAmount: number;
  currentAmount: number;
  minimumAmount?: number; // 최소 펀딩 금액 (All or Nothing)
  
  // Timeline
  startDate: Date | string;
  endDate: Date | string;
  estimatedDeliveryDate?: Date | string;
  
  // Statistics
  backerCount: number;
  viewCount: number;
  likeCount: number;
  shareCount: number;
  updateCount: number;
  
  // Status
  status: FundingStatus;
  isVisible: boolean;
  isFeatured: boolean;
  isStaffPick: boolean;
  
  // Media
  mainImage?: MediaItem | string;
  images: MediaItem[] | string[];
  videoUrl?: string;
  
  // Content
  story: string; // Rich text content
  risks?: string; // 위험 및 도전 과제
  faqs?: ProjectFAQ[];
  updates?: ProjectUpdate[];
  
  // Settings
  allowComments: boolean;
  allowAnonymousBacking: boolean;
  showBackerList: boolean;
  
  // Approval
  approvedAt?: Date | string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface ProjectFAQ {
  id: string;
  question: string;
  answer: string;
  order: number;
  createdAt: Date | string;
}

export interface ProjectUpdate {
  id: string;
  projectId: string;
  title: string;
  content: string;
  isPublic: boolean; // false면 후원자에게만 공개
  author: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface FundingProjectFormData {
  title: string;
  description: string;
  shortDescription: string;
  category: FundingCategory;
  tags: string[];
  targetAmount: number;
  minimumAmount?: number;
  startDate: string;
  endDate: string;
  estimatedDeliveryDate?: string;
  story: string;
  risks?: string;
  mainImage?: File | string;
  images?: (File | string)[];
  videoUrl?: string;
}

// Aggregate types for analytics
export interface ProjectStats {
  projectId: string;
  dailyBackers: number;
  dailyAmount: number;
  totalBackers: number;
  totalAmount: number;
  conversionRate: number;
  averageBackingAmount: number;
  fundingProgress: number;
  daysLeft: number;
  estimatedEndAmount: number;
}

export interface ProjectFilters {
  search?: string;
  category?: FundingCategory;
  status?: FundingStatus;
  minAmount?: number;
  maxAmount?: number;
  creatorId?: string;
  tags?: string[];
  sortBy?: 'latest' | 'popular' | 'ending_soon' | 'most_funded';
  page?: number;
  limit?: number;
}