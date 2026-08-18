/**
 * GlycoPharm PharmacyInfoPage — 약국/사업자 정보 조회·수정
 *
 * WO-O4O-GLYCOPHARM-PHARMACY-PROFILE-EDIT-PAGE-V1
 * WO-O4O-CROSS-SERVICE-PROFILE-COMMONIZATION-V1:
 *   K-Cosmetics `StoreInfoPage` 와 95% 동일하던 화면 본문(488줄)을
 *   `@o4o/account-ui` 의 `BusinessProfileSection` 으로 수렴.
 *   이 파일은 용어(약국) · accent · API adapter 만 남긴다.
 *
 * 저장 source: users.businessInfo JSONB (canonical signup source) — 이 WO 에서 정본 미변경.
 * Read-only: businessRegistrationNumber (변경 불가), pharmacistLicenseNumber (자격 보호).
 * 계좌 정보 미포함 (canonical 정책).
 */

import {
  BusinessProfileSection,
  type BusinessProfileData,
  type BusinessProfilePatch,
} from '@o4o/account-ui';
import {
  mypageApi,
  type PharmacyBusinessInfo,
  type UpdatePharmacyBusinessInfoPayload,
} from '@/api/mypage';

function toCommon(data: PharmacyBusinessInfo): BusinessProfileData {
  return {
    entityName: data.pharmacyName,
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
    licenseNumber: data.pharmacistLicenseNumber,
  };
}

function toPayload(patch: BusinessProfilePatch): UpdatePharmacyBusinessInfoPayload {
  return {
    pharmacyName: patch.entityName ?? undefined,
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

export default function PharmacyInfoPage() {
  return (
    <BusinessProfileSection
      entityLabel="약국"
      accent="emerald"
      emailPlaceholderDomain="pharmacy.com"
      licenseField={{
        label: '약사면허번호',
        hint: '면허번호 변경은 자격 확인 절차를 통해 진행됩니다.',
      }}
      load={async () => toCommon(await mypageApi.getBusinessInfo())}
      save={async (patch) => toCommon(await mypageApi.updateBusinessInfo(toPayload(patch)))}
    />
  );
}
