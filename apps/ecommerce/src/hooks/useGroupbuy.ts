/**
 * Groupbuy Hooks for Member (Pharmacy) UI
 * Phase 3: UI Integration
 *
 * Work Order: WO-GROUPBUY-YAKSA-PHASE3-UI-INTEGRATION
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import type {
  GroupbuyCampaign,
  CampaignProduct,
  GroupbuyOrder,
  CampaignListFilters,
  OrderFilters,
  ParticipateData
} from '@/lib/api/groupbuy';

// =====================================================
// Query Keys
// =====================================================

export const groupbuyKeys = {
  all: ['groupbuy'] as const,
  campaigns: (organizationId: string, filters?: CampaignListFilters) =>
    [...groupbuyKeys.all, 'campaigns', organizationId, filters] as const,
  campaign: (id: string) => [...groupbuyKeys.all, 'campaign', id] as const,
  products: (campaignId: string) => [...groupbuyKeys.all, 'products', campaignId] as const,
  availableProducts: (campaignId: string) => [...groupbuyKeys.all, 'availableProducts', campaignId] as const,
  product: (id: string) => [...groupbuyKeys.all, 'product', id] as const,
  orders: (pharmacyId: string, filters?: OrderFilters) =>
    [...groupbuyKeys.all, 'orders', pharmacyId, filters] as const,
  summary: (campaignId: string) => [...groupbuyKeys.all, 'summary', campaignId] as const
};

// =====================================================
// Campaign Hooks
// =====================================================

/**
 * Get active campaigns for member's organization
 */
export const useGroupbuyCampaigns = (
  organizationId: string,
  filters?: CampaignListFilters
) => {
  return useQuery<GroupbuyCampaign[]>({
    queryKey: groupbuyKeys.campaigns(organizationId, filters),
    queryFn: () => api.groupbuy.getCampaigns(organizationId, filters),
    enabled: !!organizationId
  });
};

/**
 * Get campaign detail with products
 */
export const useGroupbuyCampaignDetail = (campaignId: string) => {
  return useQuery<GroupbuyCampaign>({
    queryKey: groupbuyKeys.campaign(campaignId),
    queryFn: () => api.groupbuy.getCampaignDetail(campaignId),
    enabled: !!campaignId
  });
};

// =====================================================
// Product Hooks
// =====================================================

/**
 * Get all products in a campaign
 */
export const useCampaignProducts = (campaignId: string) => {
  return useQuery<CampaignProduct[]>({
    queryKey: groupbuyKeys.products(campaignId),
    queryFn: () => api.groupbuy.getCampaignProducts(campaignId),
    enabled: !!campaignId
  });
};

/**
 * Get available products for ordering (period/status validated)
 */
export const useAvailableProducts = (campaignId: string) => {
  return useQuery<CampaignProduct[]>({
    queryKey: groupbuyKeys.availableProducts(campaignId),
    queryFn: () => api.groupbuy.getAvailableProducts(campaignId),
    enabled: !!campaignId
  });
};

/**
 * Get product detail
 */
export const useGroupbuyProduct = (productId: string) => {
  return useQuery<CampaignProduct>({
    queryKey: groupbuyKeys.product(productId),
    queryFn: () => api.groupbuy.getProductDetail(productId),
    enabled: !!productId
  });
};

// =====================================================
// Order Hooks
// =====================================================

/**
 * Get pharmacy's order history
 */
export const useMyGroupbuyOrders = (
  pharmacyId: string,
  filters?: OrderFilters
) => {
  return useQuery<GroupbuyOrder[]>({
    queryKey: groupbuyKeys.orders(pharmacyId, filters),
    queryFn: () => api.groupbuy.getMyOrders(pharmacyId, filters),
    enabled: !!pharmacyId
  });
};

/**
 * Participate in groupbuy (create order)
 */
export const useParticipateGroupbuy = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: ParticipateData) => api.groupbuy.participate(data),
    onSuccess: (_, variables) => {
      // Invalidate related queries
      queryClient.invalidateQueries({
        queryKey: groupbuyKeys.orders(variables.pharmacyId)
      });
      queryClient.invalidateQueries({
        queryKey: groupbuyKeys.campaign(variables.campaignId)
      });
      queryClient.invalidateQueries({
        queryKey: groupbuyKeys.products(variables.campaignId)
      });
      queryClient.invalidateQueries({
        queryKey: groupbuyKeys.summary(variables.campaignId)
      });
    }
  });
};

/**
 * Cancel pending order
 */
export const useCancelGroupbuyOrder = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => api.groupbuy.cancelOrder(orderId),
    onSuccess: () => {
      // Invalidate all groupbuy queries since we don't know the pharmacyId
      queryClient.invalidateQueries({
        queryKey: groupbuyKeys.all
      });
    }
  });
};

// =====================================================
// Summary Hook
// =====================================================

/**
 * Get campaign quantity summary
 */
export const useCampaignSummary = (campaignId: string) => {
  return useQuery({
    queryKey: groupbuyKeys.summary(campaignId),
    queryFn: () => api.groupbuy.getCampaignSummary(campaignId),
    enabled: !!campaignId
  });
};

// =====================================================
// Helper Hooks
// =====================================================

/**
 * Calculate progress percentage for threshold
 */
export const useThresholdProgress = (
  confirmedQuantity: number,
  minTotalQuantity: number
): { percentage: number; isThresholdMet: boolean } => {
  const percentage = minTotalQuantity > 0
    ? Math.min((confirmedQuantity / minTotalQuantity) * 100, 100)
    : 0;
  const isThresholdMet = confirmedQuantity >= minTotalQuantity;

  return { percentage, isThresholdMet };
};

/**
 * Format remaining time for campaign/product
 */
export const useRemainingTime = (endDate: string): {
  days: number;
  hours: number;
  isExpired: boolean;
  label: string;
} => {
  const now = new Date();
  const end = new Date(endDate);
  const diff = end.getTime() - now.getTime();

  if (diff <= 0) {
    return { days: 0, hours: 0, isExpired: true, label: '마감됨' };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

  let label = '';
  if (days > 0) {
    label = `${days}일 ${hours}시간 남음`;
  } else if (hours > 0) {
    label = `${hours}시간 남음`;
  } else {
    label = '1시간 미만 남음';
  }

  return { days, hours, isExpired: false, label };
};
