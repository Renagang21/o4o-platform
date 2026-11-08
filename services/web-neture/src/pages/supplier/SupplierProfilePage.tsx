/**
 * SupplierProfilePage - 사업자 프로필 관리
 *
 * WO-O4O-AUTH-ONBOARDING-UX-CLEANUP-V1 T4: 4개 묶음 · 묶음별 저장.
 *   1. 사업자 정보       — 상호 · 대표자 · 사업자번호 · 업태/종목 · 주소       → [사업자 정보 저장] (PATCH profile)
 *   2. 담당자 · 공개 연락처 — 담당자 · 공개 이메일/전화/웹사이트/카카오 + 공개 범위 → [연락처 저장] (PATCH profile)
 *   3. 정산             — 세금계산서 이메일 · 계좌 · 정산 담당자 · 증빙          → [정산 정보 저장] (PATCH onboarding)
 *   4. 판매 조건         — 통신판매업([통신판매업 정보 저장]) · 품목군(즉시 저장) · 주문/배송 → [주문 · 배송 조건 저장]
 *
 * 각 버튼은 **자기 묶음 필드만** 보낸다(서버는 보낸 필드만 갱신). 입력은 그것을 저장하는 버튼과 같은 묶음에 둔다 —
 * 어긋나면 저장을 눌러도 값이 기록되지 않는 조용한 성공이 생긴다
 * (WO-O4O-SUPPLIER-IDENTITY-RELATIONSHIP-AND-BUSINESS-PROFILE-CANONICALIZATION-V1 §E).
 *
 * WO-O4O-SUPPLIER-PUBLIC-CONTACT-POLICY-V1
 * WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
 */

import type { ReactNode } from 'react';
import SupplierReviewRequestsPanel from '../../components/supplier/SupplierReviewRequestsPanel';
import { Info, BadgeCheck } from 'lucide-react';
import { SUPPLIER_STATUS_CONFIG } from './profile/profilePresentation';
import { useSupplierProfile } from './profile/useSupplierProfile';
import SupplierBusinessInfo from './profile/SupplierBusinessInfo';
import SupplierOnboardingFields from './profile/SupplierOnboardingFields';
import SupplierMailOrderFields from './profile/SupplierMailOrderFields';
import SupplierCategoryFields from './profile/SupplierCategoryFields';
import SupplierContactFields from './profile/SupplierContactFields';
import SupplierOrderShippingFields from './profile/SupplierOrderShippingFields';
import SupplierGroupSaveBar from './profile/SupplierGroupSaveBar';
import SupplierProfileChecklist, { SUPPLIER_PROFILE_GROUP_ANCHORS } from './profile/SupplierProfileChecklist';

function ProfileGroup({
  id,
  step,
  title,
  description,
  children,
}: {
  id: string;
  step: number;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="mb-8 scroll-mt-20">
      <div className="mb-3">
        <h2 id={`${id}-title`} className="text-lg font-bold text-gray-900">
          <span className="mr-2 text-primary-600">{step}</span>
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-gray-500">{description}</p>
      </div>
      {children}
    </section>
  );
}

export default function SupplierProfilePage() {
  const { business, onboarding, categories, loading, profileLoadError, fetchProfile } =
    useSupplierProfile();
  const { profile, saving, prefilled, handleSave } = business;
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
  const busy = saving;
  const status = business.groupStatus;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
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
        네 묶음으로 나눠 관리합니다. 각 묶음의 저장 버튼은 그 묶음의 내용만 저장합니다.
      </p>

      {/* Pre-fill banner */}
      {prefilled && (
        <div className="mb-6 flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-4">
          <Info className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-amber-800">
            가입 시 입력한 사업자 정보가 자동으로 채워졌습니다. 확인 후 저장해 주시기 바랍니다.
          </p>
        </div>
      )}

      <SupplierProfileChecklist
        missingProfileFields={profile.missingProfileFields}
        missingSettlementFields={onboarding.onboarding?.missingSettlementFields}
      />

      <SupplierReviewRequestsPanel key={profile.id} supplierId={profile.id} disabled={profile.status?.toUpperCase() === 'INACTIVE'} />

      <ProfileGroup
        id={SUPPLIER_PROFILE_GROUP_ANCHORS.business}
        step={1}
        title="사업자 정보"
        description="사업자등록증에 적힌 정보입니다."
      >
        <SupplierBusinessInfo controller={business} />
        <SupplierGroupSaveBar
          label="사업자 정보 저장"
          onSave={() => handleSave('business')}
          busy={busy}
          {...status('business')}
          savedMessage="사업자 정보가 저장되었습니다."
        />
      </ProfileGroup>

      <ProfileGroup
        id={SUPPLIER_PROFILE_GROUP_ANCHORS.contact}
        step={2}
        title="담당자 · 공개 연락처"
        description="담당자 정보는 운영 연락에만 쓰고, 공개 연락처는 공개 범위에 따라 매장에 보입니다."
      >
        <SupplierContactFields controller={business} />
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2 mb-4">
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
        <SupplierGroupSaveBar
          label="연락처 저장"
          onSave={() => handleSave('contact')}
          busy={busy}
          {...status('contact')}
          savedMessage="담당자 · 공개 연락처가 저장되었습니다."
        />
      </ProfileGroup>

      <ProfileGroup
        id={SUPPLIER_PROFILE_GROUP_ANCHORS.settlement}
        step={3}
        title="정산"
        description="정산 계좌와 세금계산서 수신 정보입니다."
      >
        <SupplierOnboardingFields
          controller={onboarding}
          manager={{ name: business.managerName, email: business.managerEmail }}
          businessName={business.name}
        />
      </ProfileGroup>

      <ProfileGroup
        id={SUPPLIER_PROFILE_GROUP_ANCHORS.sales}
        step={4}
        title="판매 조건"
        description="통신판매업 신고, 공급 예정 품목군, 주문 · 배송 조건입니다."
      >
        <SupplierMailOrderFields controller={onboarding} />
        <SupplierCategoryFields controller={categories} />
        <SupplierOrderShippingFields controller={business} />
        <SupplierGroupSaveBar
          label="주문 · 배송 조건 저장"
          onSave={() => handleSave('orderShipping')}
          busy={busy}
          {...status('orderShipping')}
          savedMessage="주문 · 배송 조건이 저장되었습니다."
        />
      </ProfileGroup>
    </div>
  );
}
