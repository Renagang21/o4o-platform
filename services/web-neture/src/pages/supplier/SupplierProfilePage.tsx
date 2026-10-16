/**
 * SupplierProfilePage - 사업자 프로필 관리
 *
 * 섹션 A  : 사업자 기본정보 (상호명, 대표자명, 사업자등록번호, 업종, 주소)
 * 섹션 A-2: 공급자 서류 및 정산 정보 (세금계산서 이메일, 정산 계좌·담당자, 제출 문서)
 * 섹션 B  : 담당자 정보 (담당자명, 담당자 전화번호)
 * 섹션 C  : 외부 공개 연락처 (이메일, 전화, 웹사이트, 카카오톡 + visibility)
 *
 * 저장 버튼은 섹션별로 다른 API 를 호출한다. **입력은 그것을 저장하는 버튼과 같은 섹션에 둔다** —
 * 어긋나면 저장을 눌러도 값이 기록되지 않는 조용한 성공이 생긴다
 * (WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §E).
 *
 * WO-O4O-SUPPLIER-PUBLIC-CONTACT-POLICY-V1
 * WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
 */

import SupplierReviewRequestsPanel from '../../components/supplier/SupplierReviewRequestsPanel';
import { Save, Loader2, CheckCircle, Info, BadgeCheck } from 'lucide-react';
import { SUPPLIER_STATUS_CONFIG } from './profile/profilePresentation';
import { useSupplierProfile } from './profile/useSupplierProfile';
import SupplierBusinessInfo from './profile/SupplierBusinessInfo';
import SupplierOnboardingFields from './profile/SupplierOnboardingFields';
import SupplierMailOrderFields from './profile/SupplierMailOrderFields';
import SupplierCategoryFields from './profile/SupplierCategoryFields';
import SupplierContactFields from './profile/SupplierContactFields';
import SupplierOrderShippingFields from './profile/SupplierOrderShippingFields';

export default function SupplierProfilePage() {
  const { business, onboarding, categories, loading, profileLoadError, fetchProfile } =
    useSupplierProfile();
  const { profile, saving, saved, error, prefilled, handleSave } = business;
  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-500">프로필 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (profileLoadError) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-500">공급자 프로필을 불러오지 못했습니다.</p>
        <button
          type="button"
          onClick={() => fetchProfile()}
          className="mt-3 rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-200"
        >
          다시 시도
        </button>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-500">공급자 프로필을 찾을 수 없습니다.</p>
      </div>
    );
  }

  const statusCfg = profile?.status ? SUPPLIER_STATUS_CONFIG[profile.status.toLowerCase()] : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">사업자 프로필 관리</h1>
        {statusCfg && (
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${statusCfg.cls}`}
          >
            <BadgeCheck className="w-3.5 h-3.5" />
            {statusCfg.label}
          </span>
        )}
      </div>
      <p className="text-sm text-gray-500 mb-6">
        사업자 기본정보, 담당자 정보, 외부 공개 연락처를 관리합니다.
      </p>

      {/* Pre-fill banner */}
      {prefilled && (
        <div className="mb-6 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            가입 시 입력한 사업자 정보가 자동으로 채워졌습니다. 확인 후 저장해주세요.
          </p>
        </div>
      )}

      <SupplierReviewRequestsPanel key={profile.id} supplierId={profile.id} disabled={profile.status?.toUpperCase() === 'INACTIVE'} />

      <SupplierBusinessInfo controller={business} />

      <SupplierOnboardingFields controller={onboarding} />

      <SupplierMailOrderFields controller={onboarding} />

      <SupplierCategoryFields controller={categories} />

      <SupplierContactFields controller={business} />

      <SupplierOrderShippingFields controller={business} />

      {/* Save button */}
      <div className="flex items-center gap-3 pt-2 mb-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center gap-2 px-6 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <CheckCircle className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? '저장 중...' : saved ? '저장됨' : '저장'}
        </button>
        {error && <p className="text-sm text-red-500">{error}</p>}
        {saved && <p className="text-sm text-green-600">프로필 정보가 업데이트되었습니다.</p>}
      </div>

      {/* Visibility info */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
        <p className="text-xs font-medium text-blue-800">공개 범위 안내</p>
        <ul className="text-xs text-blue-700 space-y-1">
          <li>
            <strong>전체 공개</strong> — 로그인한 모든 판매자에게 표시됩니다.
          </li>
          <li>
            <strong>승인 거래처만</strong> — 공급 승인된 매장(거래처)에게만 표시됩니다.
          </li>
          <li>
            <strong>비공개</strong> — 본인만 확인할 수 있으며, 프로필에서 숨겨집니다.
          </li>
        </ul>
      </div>
    </div>
  );
}
