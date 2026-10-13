import { Building2, FileText, MapPin } from 'lucide-react';
import { BusinessRegistrationFields } from '@o4o/account-ui';
import { AddressSearch } from '@o4o/ui';
import { inputClass, disabledInputClass } from './profilePresentation';
import type { useSupplierBusinessProfile } from './useSupplierBusinessProfile';

export default function SupplierBusinessInfo({
  controller,
}: {
  controller: ReturnType<typeof useSupplierBusinessProfile>;
}) {
  const {
    profile,
    representativeName,
    setRepresentativeName,
    businessNumber,
    setBusinessNumber,
    businessType,
    setBusinessType,
    businessItem,
    setBusinessItem,
    businessEntityType,
    setBusinessEntityType,
    businessStartDate,
    setBusinessStartDate,
    businessZipCode,
    setBusinessZipCode,
    businessAddress,
    setBusinessAddress,
    businessAddressDetail,
    setBusinessAddressDetail,
  } = controller;
  if (!profile) return null;
  return (
    <>
      {/* Section A: 사업자 기본정보 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-5">
          <Building2 className="w-5 h-5 text-gray-500" />
          사업자 기본정보
        </h2>
        <div className="space-y-5">
          {/* 상호명 (읽기 전용) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">상호명</label>
            <input type="text" value={profile.name} disabled className={disabledInputClass} />
            <p className="mt-1 text-xs text-gray-400">상호명은 공급자 등록 시 설정됩니다.</p>
          </div>

          {/* 대표자명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">대표자명</label>
            <input
              type="text"
              value={representativeName}
              onChange={(e) => setRepresentativeName(e.target.value)}
              placeholder="홍길동"
              className={inputClass}
            />
          </div>

          {/* 사업자등록번호 */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <FileText className="w-3.5 h-3.5 text-gray-400" />
              사업자등록번호
            </label>
            <input
              type="text"
              value={businessNumber}
              onChange={(e) => setBusinessNumber(e.target.value)}
              placeholder="123-45-67890"
              maxLength={12}
              className={inputClass}
            />
          </div>

          {/* 사업자등록증 4 fields — WO-O4O-NETURE-SUPPLIER-PROFILE-BUSINESSREGISTRATIONFIELDS-REUSE-V1
                + WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1:
                @o4o/account-ui 공통 BusinessRegistrationFields 4 fields 모두 노출.
                businessType / businessItem 는 neture_suppliers 컬럼,
                businessEntityType / businessStartDate 는 organizations.metadata.businessProfile SSOT. */}
          <BusinessRegistrationFields
            value={{
              businessType,
              businessItem,
              businessEntityType: (businessEntityType as any) || undefined,
              businessStartDate,
            }}
            onChange={(patch) => {
              if (patch.businessType !== undefined) setBusinessType(patch.businessType);
              if (patch.businessItem !== undefined) setBusinessItem(patch.businessItem);
              if (patch.businessEntityType !== undefined)
                setBusinessEntityType(patch.businessEntityType || '');
              if (patch.businessStartDate !== undefined)
                setBusinessStartDate(patch.businessStartDate || '');
            }}
          />

          {/* 사업장 주소 — WO-O4O-POSTAL-CODE-ADDRESS-V1 */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-2">
              <MapPin className="w-3.5 h-3.5 text-gray-400" />
              사업장 주소
            </label>
            <AddressSearch
              zipCode={businessZipCode}
              address={businessAddress}
              addressDetail={businessAddressDetail}
              onChange={({ zipCode, address, addressDetail }) => {
                setBusinessZipCode(zipCode);
                setBusinessAddress(address);
                setBusinessAddressDetail(addressDetail);
              }}
              inputClassName={inputClass}
            />
          </div>

          {/* WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §E:
              세금계산서 이메일 입력은 **정산 정보 저장 버튼이 있는 Section A-2 로 옮겼다.**
              쓰기 소유가 onboarding 단독이 된 뒤에도 입력이 여기 남아 있으면, 이 섹션의
              저장 버튼을 눌렀을 때 "저장됨" 만 뜨고 값은 어디에도 기록되지 않는다(조용한 성공). */}
        </div>
      </div>
    </>
  );
}
