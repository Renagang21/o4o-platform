import { useState } from 'react';
import {
  supplierRegulatedCategoryApi,
  type SupplierRegulatedCategory,
  type RegulatedCategory,
} from '../../../lib/api';

export function useSupplierProfileCategories() {
  const [regulatedCategories, setRegulatedCategories] = useState<
    SupplierRegulatedCategory[] | null
  >(null);
  const [categoryBusy, setCategoryBusy] = useState<RegulatedCategory | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [categoriesLoadError, setCategoriesLoadError] = useState(false);
  const refreshCategories = async () => {
    try {
      setRegulatedCategories(await supplierRegulatedCategoryApi.list());
      setCategoriesLoadError(false);
    } catch {
      setRegulatedCategories(null);
      setCategoriesLoadError(true);
    }
  };

  // === 공급 예정 품목군 핸들러 ===
  // refreshCategories 는 위 보조 조회 재시도와 동일 함수를 사용한다.

  const handleToggleCategory = async (
    category: RegulatedCategory,
    selected: boolean,
    removable: boolean,
  ) => {
    setCategoryError(null);
    setCategoryBusy(category);
    if (selected) {
      const result = await supplierRegulatedCategoryApi.select(category);
      if (!result.success) setCategoryError(result.error || '품목군 선택에 실패했습니다.');
    } else {
      if (!removable) {
        setCategoryError('검토 중이거나 승인/제한된 품목군은 선택 해제할 수 없습니다.');
        setCategoryBusy(null);
        return;
      }
      const result = await supplierRegulatedCategoryApi.remove(category);
      if (!result.success) setCategoryError(result.error || '품목군 해제에 실패했습니다.');
    }
    await refreshCategories();
    setCategoryBusy(null);
  };

  // WO-O4O-NETURE-SUPPLIER-PROFILE-CATEGORY-SELECTION-ONLY-AND-PRODUCT-LIGHTWEIGHT-GATE-V1:
  // 프로필 단계 선택-only — 번호 저장/검토 요청/증빙 업로드 핸들러 제거(해당 액션은 상품/운영자 단계로 이동).
  // 기존 제출 데이터 열람은 유지(보존).
  const handleDownloadCategoryEvidence = async (category: RegulatedCategory) => {
    const blob = await supplierRegulatedCategoryApi.downloadEvidence(category);
    if (!blob) {
      setCategoryError('증빙 문서를 열 수 없습니다.');
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  return {
    regulatedCategories,
    setRegulatedCategories,
    categoryBusy,
    setCategoryBusy,
    categoryError,
    setCategoryError,
    categoriesLoadError,
    setCategoriesLoadError,
    refreshCategories,
    handleToggleCategory,
    handleDownloadCategoryEvidence,
  };
}
