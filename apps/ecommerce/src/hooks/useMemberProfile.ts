/**
 * useMemberProfile Hook
 *
 * Phase 4: Profile/License/Pharmacy data hooks
 *
 * Policy Enforcement:
 * - License: READ-ONLY (no mutation)
 * - Pharmacy: Self-edit only with confirmation
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  memberApi,
  MemberProfileResponse,
  LicenseResponse,
  PharmacyInfoResponse,
  PharmacyUpdateRequest,
  PharmacyUpdateResponse,
} from '@/lib/api/member';

// ===== Query Keys =====
const PROFILE_KEY = ['member-profile'];
const LICENSE_KEY = ['member-license'];
const PHARMACY_KEY = ['member-pharmacy'];

// ===== Profile Hook =====

/**
 * Fetch member profile
 * 본인 프로필 조회
 */
export const useMemberProfile = () => {
  return useQuery<MemberProfileResponse>({
    queryKey: PROFILE_KEY,
    queryFn: memberApi.getProfile,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};

// ===== License Hook (READ-ONLY) =====

/**
 * Fetch member license
 * 본인 면허번호 조회 (수정 불가)
 *
 * ⚠️ Mutation 의도적 미제공
 */
export const useMemberLicense = () => {
  return useQuery<LicenseResponse>({
    queryKey: LICENSE_KEY,
    queryFn: memberApi.getLicense,
    staleTime: 30 * 60 * 1000, // Longer cache - rarely changes
    gcTime: 60 * 60 * 1000,
    retry: 1,
  });
};

// ===== Pharmacy Hooks =====

/**
 * Fetch pharmacy info
 * 본인 약국 정보 조회
 */
export const usePharmacyInfo = () => {
  return useQuery<PharmacyInfoResponse>({
    queryKey: PHARMACY_KEY,
    queryFn: memberApi.getPharmacyInfo,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    retry: 1,
  });
};

/**
 * Update pharmacy info mutation
 * 본인 약국 정보 수정
 *
 * ⚠️ 본인만 수정 가능
 * ⚠️ 수정 시 책임 안내 표시 필수
 */
export const useUpdatePharmacyInfo = () => {
  const queryClient = useQueryClient();

  return useMutation<PharmacyUpdateResponse, Error, PharmacyUpdateRequest>({
    mutationFn: memberApi.updatePharmacyInfo,
    onSuccess: () => {
      // Invalidate pharmacy query to refetch
      queryClient.invalidateQueries({ queryKey: PHARMACY_KEY });
      // Also invalidate profile as it may contain related data
      queryClient.invalidateQueries({ queryKey: PROFILE_KEY });
    },
  });
};

// ===== Composite Hook =====

/**
 * Fetch all profile-related data
 * Combined hook for profile page
 */
export const useMemberProfilePage = () => {
  const profileQuery = useMemberProfile();
  const licenseQuery = useMemberLicense();
  const pharmacyQuery = usePharmacyInfo();
  const updatePharmacy = useUpdatePharmacyInfo();

  return {
    // Profile data
    profile: profileQuery.data,
    isLoadingProfile: profileQuery.isLoading,
    profileError: profileQuery.error,

    // License data (READ-ONLY)
    license: licenseQuery.data,
    isLoadingLicense: licenseQuery.isLoading,
    licenseError: licenseQuery.error,

    // Pharmacy data
    pharmacy: pharmacyQuery.data,
    isLoadingPharmacy: pharmacyQuery.isLoading,
    pharmacyError: pharmacyQuery.error,

    // Pharmacy mutation
    updatePharmacy: updatePharmacy.mutate,
    updatePharmacyAsync: updatePharmacy.mutateAsync,
    isUpdatingPharmacy: updatePharmacy.isPending,
    updatePharmacyError: updatePharmacy.error,
    updatePharmacyResult: updatePharmacy.data,

    // Combined loading state
    isLoading: profileQuery.isLoading || licenseQuery.isLoading || pharmacyQuery.isLoading,

    // Refetch functions
    refetchProfile: profileQuery.refetch,
    refetchPharmacy: pharmacyQuery.refetch,
  };
};

/**
 * Type exports for components
 */
export type {
  MemberProfileResponse,
  MemberProfileData,
  LicenseResponse,
  LicenseData,
  PharmacyInfoResponse,
  PharmacyInfoData,
  PharmacyUpdateRequest,
  PharmacyUpdateResponse,
} from '@/lib/api/member';
