import { api } from '../base';
import { apiEndpoints } from '@/config/apps.config';

export interface CrowdfundingStats {
  totalCampaigns: number;
  activeCampaigns: number;
  totalRaised: number;
  totalContributions: number;
  totalBackers: number;
  successRate: number;
}

export interface CrowdfundingCampaign {
  id: string;
  title: string;
  description: string;
  shortDescription?: string;
  creator: {
    id: string;
    name: string;
    avatar?: string;
    verified?: boolean;
  };
  category: {
    id: string;
    name: string;
    slug: string;
  };
  goal: number;
  raised: number;
  currency: string;
  backerCount: number;
  startDate: string;
  endDate: string;
  status: 'draft' | 'pending' | 'active' | 'completed' | 'failed' | 'cancelled';
  featured: boolean;
  images: string[];
  video?: string;
  rewards?: CampaignReward[];
  updates?: CampaignUpdate[];
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CampaignReward {
  id: string;
  title: string;
  description: string;
  amount: number;
  currency: string;
  limitQuantity?: number;
  availableQuantity?: number;
  deliveryDate?: string;
  shippingRequired: boolean;
  backerCount: number;
}

export interface CampaignUpdate {
  id: string;
  title: string;
  content: string;
  author: {
    id: string;
    name: string;
  };
  publishedAt: string;
  isPublic: boolean;
}

export interface CrowdfundingContribution {
  id: string;
  campaignId: string;
  campaignTitle: string;
  backer: {
    id: string;
    name: string;
    email: string;
    anonymous: boolean;
  };
  amount: number;
  currency: string;
  reward?: {
    id: string;
    title: string;
  };
  paymentMethod: string;
  paymentStatus: 'pending' | 'completed' | 'failed' | 'refunded';
  message?: string;
  createdAt: string;
}

export interface PayoutRequest {
  id: string;
  campaignId: string;
  campaignTitle: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };
  amount: number;
  currency: string;
  status: 'pending' | 'processing' | 'completed' | 'rejected';
  bankAccount?: {
    bankName: string;
    accountNumber: string; // masked
  };
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

class CrowdfundingService {
  async getStats(): Promise<CrowdfundingStats> {
    const response = await api.get<CrowdfundingStats>(apiEndpoints.crowdfunding.stats);
    return response.data;
  }

  // Campaign Management
  async getCampaigns(params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    featured?: boolean;
    search?: string;
    sortBy?: 'raised' | 'backers' | 'endDate' | 'createdAt';
    order?: 'asc' | 'desc';
  }) {
    const response = await api.get(apiEndpoints.crowdfunding.campaigns, { params });
    return response.data;
  }

  async getCampaign(id: string): Promise<CrowdfundingCampaign> {
    const response = await api.get<CrowdfundingCampaign>(`${apiEndpoints.crowdfunding.campaigns}/${id}`);
    return response.data;
  }

  async approveCampaign(id: string): Promise<void> {
    await api.post(`${apiEndpoints.crowdfunding.campaigns}/${id}/approve`);
  }

  async rejectCampaign(id: string, reason: string): Promise<void> {
    await api.post(`${apiEndpoints.crowdfunding.campaigns}/${id}/reject`, { reason });
  }

  async featureCampaign(id: string, featured: boolean): Promise<void> {
    await api.patch(`${apiEndpoints.crowdfunding.campaigns}/${id}`, { featured });
  }

  async suspendCampaign(id: string, reason: string): Promise<void> {
    await api.post(`${apiEndpoints.crowdfunding.campaigns}/${id}/suspend`, { reason });
  }

  async deleteCampaign(id: string): Promise<void> {
    await api.delete(`${apiEndpoints.crowdfunding.campaigns}/${id}`);
  }

  // Contribution Management
  async getContributions(params?: {
    page?: number;
    limit?: number;
    campaignId?: string;
    userId?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  }) {
    const response = await api.get(apiEndpoints.crowdfunding.contributions, { params });
    return response.data;
  }

  async getContribution(id: string): Promise<CrowdfundingContribution> {
    const response = await api.get<CrowdfundingContribution>(`${apiEndpoints.crowdfunding.contributions}/${id}`);
    return response.data;
  }

  async refundContribution(id: string, reason: string): Promise<void> {
    await api.post(`${apiEndpoints.crowdfunding.contributions}/${id}/refund`, { reason });
  }

  // Payout Management
  async getPayouts(params?: {
    page?: number;
    limit?: number;
    status?: string;
    campaignId?: string;
    creatorId?: string;
  }) {
    const response = await api.get(apiEndpoints.crowdfunding.payouts, { params });
    return response.data;
  }

  async getPayout(id: string): Promise<PayoutRequest> {
    const response = await api.get<PayoutRequest>(`${apiEndpoints.crowdfunding.payouts}/${id}`);
    return response.data;
  }

  async approvePayout(id: string, notes?: string): Promise<void> {
    await api.post(`${apiEndpoints.crowdfunding.payouts}/${id}/approve`, { notes });
  }

  async rejectPayout(id: string, reason: string): Promise<void> {
    await api.post(`${apiEndpoints.crowdfunding.payouts}/${id}/reject`, { reason });
  }

  async processPayout(id: string, transactionId: string): Promise<void> {
    await api.post(`${apiEndpoints.crowdfunding.payouts}/${id}/process`, { transactionId });
  }

  // Reports and Analytics
  async getCampaignAnalytics(campaignId: string) {
    const response = await api.get(`${apiEndpoints.crowdfunding.campaigns}/${campaignId}/analytics`);
    return response.data;
  }

  async getRevenueReport(params?: {
    startDate: string;
    endDate: string;
    groupBy?: 'day' | 'week' | 'month';
  }) {
    const response = await api.get(`${apiEndpoints.crowdfunding.stats}/revenue`, { params });
    return response.data;
  }

  async getTopCampaigns(params?: {
    limit?: number;
    period?: 'week' | 'month' | 'year' | 'all';
    sortBy?: 'raised' | 'backers' | 'percentage';
  }) {
    const response = await api.get(`${apiEndpoints.crowdfunding.stats}/top-campaigns`, { params });
    return response.data;
  }

  // Bulk operations
  async bulkApproveCampaigns(ids: string[]): Promise<void> {
    await api.post(`${apiEndpoints.crowdfunding.campaigns}/bulk/approve`, { ids });
  }

  async bulkFeatureCampaigns(ids: string[], featured: boolean): Promise<void> {
    await api.post(`${apiEndpoints.crowdfunding.campaigns}/bulk/feature`, { ids, featured });
  }

  async exportContributions(params: {
    campaignId?: string;
    startDate?: string;
    endDate?: string;
    format: 'csv' | 'excel';
  }): Promise<{ url: string }> {
    const response = await api.get<{ url: string }>(`${apiEndpoints.crowdfunding.contributions}/export`, { 
      params,
      responseType: 'blob' 
    });
    return response.data;
  }
}

export const crowdfundingService = new CrowdfundingService();