// Crowdfunding type definitions for API server

// Basic types
export type FundingStatus = 'draft' | 'pending' | 'ongoing' | 'successful' | 'failed' | 'cancelled';
export type FundingCategory = 'tech' | 'art' | 'design' | 'fashion' | 'food' | 'social' | 'other';
export type PaymentMethod = 'card' | 'bank_transfer' | 'kakao_pay' | 'naver_pay' | 'toss' | 'paypal';
export type PaymentStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded' | 'partially_refunded';
export type BackingStatus = 'active' | 'cancelled' | 'fulfilled' | 'refunded';

// Base interfaces
export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

export interface MediaItem {
  id: string;
  url: string;
  type: string;
  name?: string;
  size?: number;
}

// Project interfaces
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
  minimumAmount?: number;
  
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
  story: string;
  risks?: string;
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
  isPublic: boolean;
  author: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

// Backing interfaces
export interface Backing extends BaseEntity {
  projectId: string;
  backerId: string;
  backer?: User;
  amount: number;
  currency: string;
  rewards: BackerReward[];
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  paymentId?: string;
  paidAt?: Date | string;
  status: BackingStatus;
  isAnonymous: boolean;
  displayName?: string;
  backerMessage?: string;
  isMessagePublic: boolean;
  cancelledAt?: Date | string;
  cancellationReason?: string;
  refundedAt?: Date | string;
  refundAmount?: number;
}

export interface BackerReward {
  rewardId: string;
  quantity: number;
  shippingAddress?: string;
  shippingStatus?: string;
  trackingNumber?: string;
}

// Reward interfaces
export interface RewardTier extends BaseEntity {
  projectId: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  items: RewardItem[];
  estimatedDelivery: Date | string;
  shippingRequired: boolean;
  shippingFee?: number;
  limitedQuantity?: number;
  remainingQuantity?: number;
  backerCount: number;
  isHidden: boolean;
  order: number;
  imageUrl?: string;
  restrictions?: string;
}

export interface RewardItem {
  name: string;
  quantity: number;
  description?: string;
}

// Form data interfaces
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

// Analytics interfaces
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