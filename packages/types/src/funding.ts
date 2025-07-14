/**
 * Funding service type definitions
 */

export interface FundingCreator {
  id: string;
  name: string;
  avatar?: string;
  bio?: string;
}

export interface FundingReward {
  id: string;
  title: string;
  description: string;
  minAmount: number;
  available: number;
  totalQuantity: number;
  estimatedDelivery: string;
  shippingRequired: boolean;
  selectedQuantity?: number;
}

export interface FundingProject {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  currentAmount: number;
  backerCount: number;
  startDate: string;
  endDate: string;
  daysLeft: number;
  imageUrl: string;
  videoUrl?: string;
  creator: FundingCreator;
  rewards: FundingReward[];
  status: 'draft' | 'active' | 'completed' | 'cancelled' | 'failed';
  featured?: boolean;
  story?: string;
  updates?: FundingUpdate[];
  faqs?: FundingFAQ[];
}

export interface FundingUpdate {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  author: FundingCreator;
}

export interface FundingFAQ {
  id: string;
  question: string;
  answer: string;
}

export interface FundingContribution {
  id: string;
  projectId: string;
  userId: string;
  amount: number;
  rewardId?: string;
  quantity?: number;
  status: 'pending' | 'completed' | 'refunded';
  createdAt: string;
}

// Request/Response types
export interface FundingListParams {
  page?: number;
  limit?: number;
  category?: string;
  status?: FundingProject['status'];
  featured?: boolean;
  search?: string;
  sortBy?: 'newest' | 'ending_soon' | 'most_funded' | 'most_backed';
}

export interface FundingListResponse {
  projects: FundingProject[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FundingCreateRequest {
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  startDate: string;
  endDate: string;
  imageUrl: string;
  videoUrl?: string;
  story: string;
  rewards: Omit<FundingReward, 'id'>[];
}

export interface FundingUpdateRequest {
  title?: string;
  description?: string;
  category?: string;
  targetAmount?: number;
  endDate?: string;
  imageUrl?: string;
  videoUrl?: string;
  story?: string;
  status?: FundingProject['status'];
}

export interface FundingContributeRequest {
  amount: number;
  rewardId?: string;
  quantity?: number;
  paymentMethod: string;
}