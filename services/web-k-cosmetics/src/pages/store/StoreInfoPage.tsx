/**
 * K-Cosmetics StoreInfoPage — 매장/사업자 정보 조회·수정
 *
 * WO-O4O-KCOSMETICS-STORE-PROFILE-EDIT-PAGE-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   GlycoPharm `PharmacyInfoPage` 와 95% 동일하던 화면 본문(475줄)을
 *   `@o4o/account-ui` 의 `BusinessProfileSection` 으로 수렴.
 *   이 파일은 용어(매장) · accent · API adapter 만 남긴다.
 *
 * 저장 source: users.businessInfo JSONB (canonical signup source) — 이 WO 에서 정본 미변경.
 * Read-only: businessRegistrationNumber (변경 불가 정책).
 * 계좌 정보 미포함 (canonical 정책).
 */

import {
  BusinessProfileSection,
  type BusinessProfileData,
  type BusinessProfilePatch,
} from '@o4o/account-ui';
import {
  cosmeticsMypageApi,
  type CosmeticsBusinessInfo,
  type UpdateCosmeticsBusinessInfoPayload,
} from '@/api/mypage';

function toCommon(data: CosmeticsBusinessInfo): BusinessProfileData {
  return {
    entityName: data.storeName,
    businessRegistrationNumber: data.businessRegistrationNumber,
    businessName: data.businessName,
    representativeName: data.representativeName,
    businessAddress: data.businessAddress,
    businessPhone: data.businessPhone,
    businessEmail: data.businessEmail,
    contactEmail: data.contactEmail,
    businessType: data.businessType,
    businessItem: data.businessItem,
    businessEntityType: data.businessEntityType,
    businessStartDate: data.businessStartDate,
    taxInvoiceEmail: data.taxInvoiceEmail,
  };
}

function toPayload(patch: BusinessProfilePatch): UpdateCosmeticsBusinessInfoPayload {
  return {
    storeName: patch.entityName ?? undefined,
    businessName: patch.businessName ?? undefined,
    representativeName: patch.representativeName ?? undefined,
    businessAddress: patch.businessAddress ?? undefined,
    businessPhone: patch.businessPhone ?? undefined,
    businessEmail: patch.businessEmail ?? undefined,
    contactEmail: patch.contactEmail ?? undefined,
    businessType: patch.businessType ?? undefined,
    businessItem: patch.businessItem ?? undefined,
    businessEntityType: patch.businessEntityType ?? undefined,
    businessStartDate: patch.businessStartDate ?? undefined,
    taxInvoiceEmail: patch.taxInvoiceEmail ?? undefined,
  };
}

export default function StoreInfoPage() {
  return (
    <BusinessProfileSection
      entityLabel="매장"
      businessEmailLabel="회사 대표 이메일"
      accent="pink"
      emailPlaceholderDomain="store.com"
      load={async () => toCommon(await cosmeticsMypageApi.getBusinessInfo())}
      save={async (patch) => toCommon(await cosmeticsMypageApi.updateBusinessInfo(toPayload(patch)))}
    />
  );
}
