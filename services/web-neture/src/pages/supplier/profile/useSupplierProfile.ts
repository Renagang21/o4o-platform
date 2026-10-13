import { useState, useEffect, useCallback } from 'react';
import {
  supplierProfileApi,
  supplierOnboardingApi,
  supplierRegulatedCategoryApi,
} from '../../../lib/api';
import { useSupplierBusinessProfile } from './useSupplierBusinessProfile';
import { useSupplierOnboarding } from './useSupplierOnboarding';
import { useSupplierProfileCategories } from './useSupplierProfileCategories';

export function useSupplierProfile() {
  const [loading, setLoading] = useState(true);
  const [profileLoadError, setProfileLoadError] = useState(false);
  const business = useSupplierBusinessProfile();
  const onboarding = useSupplierOnboarding();
  const categories = useSupplierProfileCategories();
  const { initializeProfile } = business;
  const { initializeOnboarding, setOnboardingLoadError, setTaxInvoiceEmail } = onboarding;
  const { setRegulatedCategories, setCategoriesLoadError } = categories;
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setProfileLoadError(false);
    // WO-O4O-NETURE-SUPPLIER-PROFILE-AUX-LOAD-ERROR-CONTRACT-V1:
    //   보조 조회 2종은 실패 시 throw 한다. 영역별로 분리해 한쪽 실패가
    //   기본 프로필이나 다른 섹션을 가리지 않게 한다.
    const [profileRes, onboardingRes, categoriesRes] = await Promise.allSettled([
      supplierProfileApi.getProfile(),
      supplierOnboardingApi.getOnboarding(),
      supplierRegulatedCategoryApi.list(),
    ]);
    const data = profileRes.status === 'fulfilled' ? profileRes.value : null;
    const onboardingData = onboardingRes.status === 'fulfilled' ? onboardingRes.value : null;
    // WO-O4O-NETURE-SUPPLIER-REMAINING-LOAD-ERROR-CONTRACT-V1: 프로필 조회 실패 표면화
    setProfileLoadError(profileRes.status === 'rejected');
    setOnboardingLoadError(onboardingRes.status === 'rejected');
    if (categoriesRes.status === 'fulfilled') {
      setRegulatedCategories(categoriesRes.value);
      setCategoriesLoadError(false);
    } else {
      setRegulatedCategories(null);
      setCategoriesLoadError(true);
    }
    if (data) {
      initializeProfile(data);
      setTaxInvoiceEmail(data.taxInvoiceEmail || '');
    }
    if (onboardingData) initializeOnboarding(onboardingData, data?.taxInvoiceEmail);
    setLoading(false);
  }, [
    initializeProfile,
    initializeOnboarding,
    setOnboardingLoadError,
    setRegulatedCategories,
    setCategoriesLoadError,
    setTaxInvoiceEmail,
  ]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    business,
    onboarding,
    categories,
    loading,
    profileLoadError,
    fetchProfile,
  };
}
