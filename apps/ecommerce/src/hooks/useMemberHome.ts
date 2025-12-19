/**
 * useMemberHome Hook
 *
 * Phase 3: Member Home data fetching hook
 *
 * Uses Phase 2 API endpoint to get home data
 * Each section can fail independently
 */

import { useQuery } from '@tanstack/react-query';
import { memberApi, MemberHomeResponse } from '@/lib/api/member';

/**
 * Fetch Member Home data
 */
export const useMemberHome = () => {
  return useQuery<MemberHomeResponse>({
    queryKey: ['member-home'],
    queryFn: memberApi.getHomeData,
    // Refetch every 5 minutes
    staleTime: 5 * 60 * 1000,
    // Cache for 10 minutes
    gcTime: 10 * 60 * 1000,
    // Retry on failure
    retry: 1,
  });
};

/**
 * Type exports for components
 */
export type {
  MemberHomeResponse,
  MemberHomeData,
  OrganizationNoticeSummary,
  GroupbuySummary,
  EducationSummary,
  ForumSummary,
  BannerSummary,
} from '@/lib/api/member';
