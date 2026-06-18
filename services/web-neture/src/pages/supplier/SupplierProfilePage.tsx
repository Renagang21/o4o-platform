/**
 * SupplierProfilePage - 사업자 프로필 관리
 *
 * 섹션 A: 사업자 기본정보 (상호명, 대표자명, 사업자등록번호, 업종, 주소, 세금계산서 이메일)
 * 섹션 B: 담당자 정보 (담당자명, 담당자 전화번호)
 * 섹션 C: 외부 공개 연락처 (이메일, 전화, 웹사이트, 카카오톡 + visibility)
 *
 * WO-O4O-SUPPLIER-PUBLIC-CONTACT-POLICY-V1
 * WO-NETURE-SUPPLIER-BUSINESS-PROFILE-FORM-ALIGNMENT-V1
 */

import { useState, useEffect } from 'react';
import {
  Building2,
  User,
  Mail,
  Phone,
  Globe,
  MessageCircle,
  Save,
  Loader2,
  CheckCircle,
  FileText,
  MapPin,
  Info,
  ShoppingCart,
  BadgeCheck,
  Upload,
  Download,
} from 'lucide-react';

import { BusinessRegistrationFields } from '@o4o/account-ui';
import {
  supplierProfileApi,
  supplierOnboardingApi,
  supplierRegulatedCategoryApi,
  REGULATED_CATEGORY_LABELS,
  REGULATED_CATEGORY_ORDER,
  REGULATED_CATEGORY_STATUS_LABELS,
  type SupplierProfile,
  type SupplierOnboarding,
  type SupplierRegulatedCategory,
  type RegulatedCategory,
  type ContactVisibility,
} from '../../lib/api';

const REGULATED_STATUS_BADGE: Record<string, string> = {
  not_requested: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-100 text-blue-700',
  approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700',
  needs_update: 'bg-amber-100 text-amber-700',
  suspended: 'bg-gray-200 text-gray-600',
};

const SUPPLIER_STATUS_CONFIG: Record<string, { label: string; cls: string }> = {
  pending:   { label: '승인 대기 중', cls: 'bg-amber-100 text-amber-700 border-amber-200' },
  active:    { label: '활성',         cls: 'bg-green-100 text-green-700 border-green-200' },
  approved:  { label: '승인됨',       cls: 'bg-blue-100 text-blue-700 border-blue-200' },
  suspended: { label: '이용 정지',    cls: 'bg-red-100 text-red-700 border-red-200' },
  rejected:  { label: '거절됨',       cls: 'bg-gray-100 text-gray-600 border-gray-200' },
};
import { AddressSearch } from '@o4o/ui';

const VISIBILITY_OPTIONS: { value: ContactVisibility; label: string; desc: string }[] = [
  { value: 'public', label: '전체 공개', desc: '모든 판매자에게 표시' },
  { value: 'partners', label: '파트너만', desc: '승인된 파트너에게만 표시' },
  { value: 'private', label: '비공개', desc: '본인만 확인 가능' },
];

function VisibilitySelector({ value, onChange }: { value: ContactVisibility; onChange: (v: ContactVisibility) => void }) {
  return (
    <div className="flex gap-1.5 mt-2">
      {VISIBILITY_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          title={opt.desc}
          className={`px-3 py-1 text-xs rounded-md transition-colors ${
            value === opt.value
              ? 'bg-primary-600 text-white'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

const inputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
const disabledInputClass = 'w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm bg-gray-50 text-gray-500 cursor-not-allowed';
const fileInputClass = 'block w-full text-sm text-gray-600 file:mr-3 file:rounded-md file:border-0 file:bg-gray-100 file:px-3 file:py-2 file:text-sm file:font-medium file:text-gray-700 hover:file:bg-gray-200';

export default function SupplierProfilePage() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [onboarding, setOnboarding] = useState<SupplierOnboarding | null>(null);
  const [onboardingSaving, setOnboardingSaving] = useState(false);
  const [onboardingSaved, setOnboardingSaved] = useState(false);
  const [onboardingError, setOnboardingError] = useState<string | null>(null);
  const [businessRegistrationFile, setBusinessRegistrationFile] = useState<File | null>(null);
  const [bankbookFile, setBankbookFile] = useState<File | null>(null);
  const [mailOrderReportFile, setMailOrderReportFile] = useState<File | null>(null);
  const [uploadingDocument, setUploadingDocument] = useState<'business_registration' | 'bank_statement' | 'mail_order_report' | null>(null);
  // 공급 예정 품목군 (WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1)
  const [regulatedCategories, setRegulatedCategories] = useState<SupplierRegulatedCategory[]>([]);
  const [categoryBusy, setCategoryBusy] = useState<RegulatedCategory | null>(null);
  const [categoryError, setCategoryError] = useState<string | null>(null);

  // Section A: 사업자 기본정보
  const [representativeName, setRepresentativeName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessItem, setBusinessItem] = useState('');
  // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1: 사업자 유형 / 개업일
  const [businessEntityType, setBusinessEntityType] = useState('');
  const [businessStartDate, setBusinessStartDate] = useState('');
  const [businessZipCode, setBusinessZipCode] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessAddressDetail, setBusinessAddressDetail] = useState('');
  const [taxInvoiceEmail, setTaxInvoiceEmail] = useState('');
  const [settlementBankName, setSettlementBankName] = useState('');
  const [settlementAccountNumber, setSettlementAccountNumber] = useState('');
  const [settlementAccountHolder, setSettlementAccountHolder] = useState('');
  const [settlementContactName, setSettlementContactName] = useState('');
  const [settlementContactEmail, setSettlementContactEmail] = useState('');
  // 통신판매업 신고 정보 (WO-O4O-SUPPLIER-MAIL-ORDER-REPORTING-FIELDS-V1)
  const [mailOrderSalesStatus, setMailOrderSalesStatus] = useState('');
  const [mailOrderSalesRegistrationNumber, setMailOrderSalesRegistrationNumber] = useState('');

  // Section B: 담당자 정보
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');

  // Section C: 외부 공개 연락처 (기존)
  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');
  const [contactKakao, setContactKakao] = useState('');
  const [emailVisibility, setEmailVisibility] = useState<ContactVisibility>('public');
  const [phoneVisibility, setPhoneVisibility] = useState<ContactVisibility>('private');
  const [websiteVisibility, setWebsiteVisibility] = useState<ContactVisibility>('public');
  const [kakaoVisibility, setKakaoVisibility] = useState<ContactVisibility>('partners');

  // Section D: B2B 주문 조건 (WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1)
  const [minOrderAmount, setMinOrderAmount] = useState('');
  const [minOrderSurcharge, setMinOrderSurcharge] = useState('');
  const [orderConditionNote, setOrderConditionNote] = useState('');

  // Section E: 배송 정책 (WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1)
  const [baseShippingFee, setBaseShippingFee] = useState('');
  const [freeShippingThreshold, setFreeShippingThreshold] = useState('');
  const [averageDispatchDays, setAverageDispatchDays] = useState('');
  const [returnExchangeNotice, setReturnExchangeNotice] = useState('');
  const [shippingStandard, setShippingStandard] = useState('');
  const [shippingIsland, setShippingIsland] = useState('');
  const [shippingMountain, setShippingMountain] = useState('');

  // Pre-fill indicator
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const [data, onboardingData, categoriesData] = await Promise.all([
        supplierProfileApi.getProfile(),
        supplierOnboardingApi.getOnboarding(),
        supplierRegulatedCategoryApi.list(),
      ]);
      setRegulatedCategories(categoriesData);
      if (data) {
        setProfile(data);
        // Section A
        setRepresentativeName(data.representativeName || '');
        setBusinessNumber(data.businessNumber || '');
        setBusinessType(data.businessType || '');
        setBusinessItem(data.businessItem || '');
        // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
        setBusinessEntityType(data.businessEntityType || '');
        setBusinessStartDate(data.businessStartDate || '');
        setBusinessZipCode(data.businessZipCode || '');
        setBusinessAddress(data.businessAddress || '');
        setBusinessAddressDetail(data.businessAddressDetail || '');
        setTaxInvoiceEmail(data.taxInvoiceEmail || '');
        // Section B
        setManagerName(data.managerName || '');
        setManagerPhone(data.managerPhone || '');
        // Section C
        setContactEmail(data.contactEmail || '');
        setContactPhone(data.contactPhone || '');
        setContactWebsite(data.contactWebsite || '');
        setContactKakao(data.contactKakao || '');
        setEmailVisibility(data.contactEmailVisibility || 'public');
        setPhoneVisibility(data.contactPhoneVisibility || 'private');
        setWebsiteVisibility(data.contactWebsiteVisibility || 'public');
        setKakaoVisibility(data.contactKakaoVisibility || 'partners');
        // Section D: B2B 주문 조건
        setMinOrderAmount(data.minOrderAmount != null ? String(data.minOrderAmount) : '');
        setMinOrderSurcharge(data.minOrderSurcharge != null ? String(data.minOrderSurcharge) : '');
        setOrderConditionNote(data.orderConditionNote || '');
        // Section E: 배송 정책
        setBaseShippingFee(data.baseShippingFee != null ? String(data.baseShippingFee) : '');
        setFreeShippingThreshold(data.freeShippingThreshold != null ? String(data.freeShippingThreshold) : '');
        setAverageDispatchDays(data.averageDispatchDays != null ? String(data.averageDispatchDays) : '');
        setReturnExchangeNotice(data.returnExchangeNotice || '');
        setShippingStandard(data.shippingStandard || '');
        setShippingIsland(data.shippingIsland || '');
        setShippingMountain(data.shippingMountain || '');
        // Pre-fill
        setPrefilled(!!data._prefilled);
      }
      if (onboardingData) {
        setOnboarding(onboardingData);
        setTaxInvoiceEmail(onboardingData.taxInvoiceEmail || data?.taxInvoiceEmail || '');
        setSettlementBankName(onboardingData.settlementBankName || '');
        setSettlementAccountNumber(onboardingData.settlementAccountNumber || '');
        setSettlementAccountHolder(onboardingData.settlementAccountHolder || '');
        setSettlementContactName(onboardingData.settlementContactName || '');
        setSettlementContactEmail(onboardingData.settlementContactEmail || '');
        setMailOrderSalesStatus(onboardingData.mailOrderSalesStatus || '');
        setMailOrderSalesRegistrationNumber(onboardingData.mailOrderSalesRegistrationNumber || '');
      }
      setLoading(false);
    };
    fetchProfile();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaved(false);

    const result = await supplierProfileApi.updateProfile({
      // Section A
      businessNumber,
      representativeName,
      businessZipCode,
      businessAddress,
      businessAddressDetail,
      businessType,
      businessItem,
      // WO-O4O-NETURE-SUPPLIER-PROFILE-P4-FIELDS-ADD-V1
      businessEntityType: businessEntityType || undefined,
      businessStartDate: businessStartDate || undefined,
      taxInvoiceEmail,
      // Section B
      managerName,
      managerPhone,
      // Section C
      contactEmail,
      contactPhone,
      contactWebsite,
      contactKakao,
      contactEmailVisibility: emailVisibility,
      contactPhoneVisibility: phoneVisibility,
      contactWebsiteVisibility: websiteVisibility,
      contactKakaoVisibility: kakaoVisibility,
      // Section D: B2B 주문 조건
      minOrderAmount: minOrderAmount.trim() === '' ? null : Number(minOrderAmount.replace(/[^\d]/g, '')),
      minOrderSurcharge: minOrderSurcharge.trim() === '' ? null : Number(minOrderSurcharge.replace(/[^\d]/g, '')),
      orderConditionNote: orderConditionNote.trim() === '' ? null : orderConditionNote,
      // Section E: 배송 정책 (저장만 — 배송비 계산 미적용)
      baseShippingFee: baseShippingFee.trim() === '' ? null : Number(baseShippingFee.replace(/[^\d]/g, '')),
      freeShippingThreshold: freeShippingThreshold.trim() === '' ? null : Number(freeShippingThreshold.replace(/[^\d]/g, '')),
      averageDispatchDays: averageDispatchDays.trim() === '' ? null : Number(averageDispatchDays.replace(/[^\d]/g, '')),
      returnExchangeNotice: returnExchangeNotice.trim() === '' ? null : returnExchangeNotice,
      shippingStandard: shippingStandard.trim() === '' ? null : shippingStandard,
      shippingIsland: shippingIsland.trim() === '' ? null : shippingIsland,
      shippingMountain: shippingMountain.trim() === '' ? null : shippingMountain,
    });

    setSaving(false);

    if (result.success) {
      setSaved(true);
      setPrefilled(false);
      setTimeout(() => setSaved(false), 3000);
    } else {
      setError(result.error || '저장에 실패했습니다.');
    }
  };

  const refreshOnboarding = async () => {
    const data = await supplierOnboardingApi.getOnboarding();
    if (data) {
      setOnboarding(data);
      setTaxInvoiceEmail(data.taxInvoiceEmail || '');
      setSettlementBankName(data.settlementBankName || '');
      setSettlementAccountNumber(data.settlementAccountNumber || '');
      setSettlementAccountHolder(data.settlementAccountHolder || '');
      setSettlementContactName(data.settlementContactName || '');
      setSettlementContactEmail(data.settlementContactEmail || '');
      setMailOrderSalesStatus(data.mailOrderSalesStatus || '');
      setMailOrderSalesRegistrationNumber(data.mailOrderSalesRegistrationNumber || '');
    }
  };

  const handleSaveOnboarding = async () => {
    setOnboardingSaving(true);
    setOnboardingSaved(false);
    setOnboardingError(null);

    const result = await supplierOnboardingApi.updateOnboarding({
      taxInvoiceEmail,
      settlementBankName,
      settlementAccountNumber,
      settlementAccountHolder,
      settlementContactName,
      settlementContactEmail,
      mailOrderSalesStatus,
      mailOrderSalesRegistrationNumber,
    });

    setOnboardingSaving(false);
    if (result.success) {
      if (result.data) setOnboarding(result.data);
      setOnboardingSaved(true);
      setTimeout(() => setOnboardingSaved(false), 3000);
    } else {
      setOnboardingError(result.error || '온보딩 정보 저장에 실패했습니다.');
    }
  };

  const handleUploadDocument = async (documentType: 'business_registration' | 'bank_statement' | 'mail_order_report') => {
    const file = documentType === 'business_registration'
      ? businessRegistrationFile
      : documentType === 'mail_order_report'
        ? mailOrderReportFile
        : bankbookFile;
    if (!file) {
      setOnboardingError('PDF 파일을 선택해 주세요.');
      return;
    }
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setOnboardingError('PDF 파일만 업로드할 수 있습니다.');
      return;
    }

    setUploadingDocument(documentType);
    setOnboardingError(null);
    const result = await supplierOnboardingApi.uploadDocument(documentType, file);
    setUploadingDocument(null);

    if (result.success) {
      if (documentType === 'business_registration') setBusinessRegistrationFile(null);
      else if (documentType === 'mail_order_report') setMailOrderReportFile(null);
      else setBankbookFile(null);
      await refreshOnboarding();
    } else {
      setOnboardingError(result.error || '문서 업로드에 실패했습니다.');
    }
  };

  const handleDownloadDocument = async (documentType: 'business_registration' | 'bank_statement' | 'mail_order_report') => {
    const blob = await supplierOnboardingApi.downloadDocument(documentType);
    if (!blob) {
      setOnboardingError('문서를 열 수 없습니다.');
      return;
    }
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener,noreferrer');
    setTimeout(() => URL.revokeObjectURL(url), 30_000);
  };

  // === 공급 예정 품목군 핸들러 ===
  const refreshCategories = async () => {
    setRegulatedCategories(await supplierRegulatedCategoryApi.list());
  };

  const handleToggleCategory = async (category: RegulatedCategory, selected: boolean, removable: boolean) => {
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

  const handleSaveCategoryRegistration = async (category: RegulatedCategory, registrationNumber: string) => {
    setCategoryError(null);
    setCategoryBusy(category);
    const result = await supplierRegulatedCategoryApi.updateRegistrationNumber(category, registrationNumber);
    if (!result.success) setCategoryError(result.error || '저장에 실패했습니다.');
    await refreshCategories();
    setCategoryBusy(null);
  };

  const handleUploadCategoryEvidence = async (category: RegulatedCategory, file: File) => {
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setCategoryError('PDF 파일만 업로드할 수 있습니다.');
      return;
    }
    setCategoryError(null);
    setCategoryBusy(category);
    const result = await supplierRegulatedCategoryApi.uploadEvidence(category, file);
    if (!result.success) setCategoryError(result.error || '증빙 업로드에 실패했습니다.');
    await refreshCategories();
    setCategoryBusy(null);
  };

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

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto py-16 text-center">
        <p className="text-gray-500">프로필 정보를 불러오는 중...</p>
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

  const statusCfg = profile?.status
    ? SUPPLIER_STATUS_CONFIG[profile.status.toLowerCase()]
    : null;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-gray-900">사업자 프로필 관리</h1>
        {statusCfg && (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border ${statusCfg.cls}`}>
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
            <input
              type="text"
              value={profile.name}
              disabled
              className={disabledInputClass}
            />
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
                businessEntityType / businessStartDate 는 users.businessInfo JSONB SSOT. */}
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
              if (patch.businessEntityType !== undefined) setBusinessEntityType(patch.businessEntityType || '');
              if (patch.businessStartDate !== undefined) setBusinessStartDate(patch.businessStartDate || '');
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

          {/* 세금계산서 이메일 */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Mail className="w-3.5 h-3.5 text-gray-400" />
              세금계산서 이메일 <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={taxInvoiceEmail}
              onChange={(e) => setTaxInvoiceEmail(e.target.value)}
              placeholder="tax@company.com"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Section A-2: 공급자 온보딩 서류/정산 정보 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <FileText className="w-5 h-5 text-gray-500" />
          공급자 서류 및 정산 정보
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          공급자 활성화 전에 운영자가 확인하는 기본 서류와 정산 정보입니다. 사업자등록증과 통장 사본은 PDF로 제출해 주세요.
        </p>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">은행명 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={settlementBankName}
                onChange={(e) => setSettlementBankName(e.target.value)}
                placeholder="예: 국민은행"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">계좌번호 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={settlementAccountNumber}
                onChange={(e) => setSettlementAccountNumber(e.target.value)}
                placeholder="숫자와 하이픈 입력"
                className={inputClass}
              />
              {onboarding?.settlementAccountNumberMasked && (
                <p className="mt-1 text-xs text-gray-400">저장된 계좌: {onboarding.settlementAccountNumberMasked}</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">예금주 <span className="text-red-500">*</span></label>
              <input
                type="text"
                value={settlementAccountHolder}
                onChange={(e) => setSettlementAccountHolder(e.target.value)}
                placeholder="예: 주식회사 O4O"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">정산 담당자명</label>
              <input
                type="text"
                value={settlementContactName}
                onChange={(e) => setSettlementContactName(e.target.value)}
                placeholder="선택"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">정산 담당자 이메일</label>
              <input
                type="email"
                value={settlementContactEmail}
                onChange={(e) => setSettlementContactEmail(e.target.value)}
                placeholder="settlement@company.com"
                className={inputClass}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">사업자등록증 PDF <span className="text-red-500">*</span></label>
              {onboarding?.businessRegistrationDocument && (
                <button
                  type="button"
                  onClick={() => handleDownloadDocument('business_registration')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800 mb-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  제출 파일 열람
                </button>
              )}
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setBusinessRegistrationFile(e.target.files?.[0] || null)}
                className={fileInputClass}
              />
              <button
                type="button"
                onClick={() => handleUploadDocument('business_registration')}
                disabled={uploadingDocument !== null || !businessRegistrationFile}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {uploadingDocument === 'business_registration' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                업로드
              </button>
            </div>

            <div className="rounded-lg border border-gray-200 p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">통장 사본 PDF <span className="text-red-500">*</span></label>
              {onboarding?.settlementBankbookDocument && (
                <button
                  type="button"
                  onClick={() => handleDownloadDocument('bank_statement')}
                  className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800 mb-3"
                >
                  <Download className="w-3.5 h-3.5" />
                  제출 파일 열람
                </button>
              )}
              <input
                type="file"
                accept="application/pdf,.pdf"
                onChange={(e) => setBankbookFile(e.target.files?.[0] || null)}
                className={fileInputClass}
              />
              <button
                type="button"
                onClick={() => handleUploadDocument('bank_statement')}
                disabled={uploadingDocument !== null || !bankbookFile}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
              >
                {uploadingDocument === 'bank_statement' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                업로드
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveOnboarding}
              disabled={onboardingSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
            >
              {onboardingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : onboardingSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {onboardingSaving ? '저장 중...' : onboardingSaved ? '저장됨' : '정산 정보 저장'}
            </button>
            {onboardingError && <p className="text-sm text-red-500">{onboardingError}</p>}
            {onboardingSaved && <p className="text-sm text-green-600">온보딩 정보가 저장되었습니다.</p>}
          </div>
        </div>
      </div>

      {/* Section A-3: 통신판매업 신고 정보 (WO-O4O-SUPPLIER-MAIL-ORDER-REPORTING-FIELDS-V1) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <FileText className="w-5 h-5 text-gray-500" />
          통신판매업 신고 정보
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          온라인 주문·판매 기능을 이용하는 공급자는 통신판매업 신고 정보를 입력해 주세요.
          통신판매업 신고 대상이 아니거나 아직 신고 전인 경우 현재 상태를 선택할 수 있습니다.
          O4O 는 신고 대상 여부나 유효성을 보증하지 않으며, 운영자 확인을 위한 참고 정보로만 사용됩니다.
        </p>

        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">통신판매업 신고 상태</label>
              <select
                value={mailOrderSalesStatus}
                onChange={(e) => setMailOrderSalesStatus(e.target.value)}
                className={inputClass}
              >
                <option value="">선택 안 함</option>
                <option value="not_applicable">해당 없음</option>
                <option value="reported">신고 완료</option>
                <option value="pending">신고 예정 또는 확인 필요</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                통신판매업 신고번호
                {mailOrderSalesStatus === 'reported' && <span className="text-red-500"> *</span>}
              </label>
              <input
                type="text"
                value={mailOrderSalesRegistrationNumber}
                onChange={(e) => setMailOrderSalesRegistrationNumber(e.target.value)}
                placeholder="예: 2026-서울강남-01234"
                className={inputClass}
              />
              {mailOrderSalesStatus === 'reported' && (
                <p className="mt-1 text-xs text-gray-400">신고 완료 상태에서는 신고번호가 필요합니다.</p>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 p-4 max-w-md">
            <label className="block text-sm font-medium text-gray-700 mb-2">통신판매업 신고증 PDF</label>
            {onboarding?.mailOrderSalesDocument && (
              <button
                type="button"
                onClick={() => handleDownloadDocument('mail_order_report')}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800 mb-3"
              >
                <Download className="w-3.5 h-3.5" />
                제출 파일 열람
              </button>
            )}
            <input
              type="file"
              accept="application/pdf,.pdf"
              onChange={(e) => setMailOrderReportFile(e.target.files?.[0] || null)}
              className={fileInputClass}
            />
            <button
              type="button"
              onClick={() => handleUploadDocument('mail_order_report')}
              disabled={uploadingDocument !== null || !mailOrderReportFile}
              className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-50"
            >
              {uploadingDocument === 'mail_order_report' ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              업로드
            </button>
            <p className="mt-2 text-xs text-gray-400">신고증 PDF 는 선택 사항입니다.</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSaveOnboarding}
              disabled={onboardingSaving}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-medium disabled:opacity-50"
            >
              {onboardingSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : onboardingSaved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />}
              {onboardingSaving ? '저장 중...' : onboardingSaved ? '저장됨' : '통신판매업 정보 저장'}
            </button>
            {onboardingError && <p className="text-sm text-red-500">{onboardingError}</p>}
          </div>
        </div>
      </div>

      {/* Section A-4: 공급 예정 품목군 (WO-O4O-SUPPLIER-REGULATED-CATEGORY-DOCUMENTS-V1) */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <FileText className="w-5 h-5 text-gray-500" />
          공급 예정 품목군
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          O4O 에 공급하려는 품목군을 선택하고, 품목군별로 필요한 증빙 PDF 를 제출해 주세요.
          운영자가 확인 후 O4O 내부 등록 가능 상태를 설정합니다.
          O4O 는 법적 허가 여부를 인증하지 않으며, 제출 서류는 운영자 검토용 참고 정보로만 사용됩니다.
        </p>

        <div className="space-y-3">
          {REGULATED_CATEGORY_ORDER.map((category) => {
            const row = regulatedCategories.find((c) => c.category === category);
            const selected = !!row;
            const removable = !row || ['not_requested', 'rejected', 'needs_update'].includes(row.status);
            const busy = categoryBusy === category;
            // WO-O4O-NETURE-SUPPLIER-GENERAL-CATEGORY-NO-DOCUMENT-V1:
            // 일반 상품은 backend 면제(번호/파일/심사 없음) → 증빙 입력 UI·심사 배지 미표시, 안내만.
            const isGeneral = category === 'general';
            return (
              <div key={category} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between gap-3">
                  <label className="flex items-center gap-2 text-sm font-medium text-gray-800">
                    <input
                      type="checkbox"
                      checked={selected}
                      disabled={busy || (selected && !removable)}
                      onChange={(e) => handleToggleCategory(category, e.target.checked, removable)}
                      className="w-4 h-4"
                    />
                    {REGULATED_CATEGORY_LABELS[category]}
                  </label>
                  {row && !isGeneral && (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${REGULATED_STATUS_BADGE[row.status] || 'bg-gray-100 text-gray-600'}`}>
                      {REGULATED_CATEGORY_STATUS_LABELS[row.status] || row.status}
                    </span>
                  )}
                  {row && isGeneral && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-100">
                      서류 불필요
                    </span>
                  )}
                </div>

                {/* 일반 상품: backend 면제 → 증빙 입력 UI 대신 안내만 */}
                {row && isGeneral && (
                  <p className="mt-3 pl-6 text-xs text-gray-500 leading-relaxed">
                    일반 상품은 별도 허가/신고 서류가 필요하지 않습니다. 바로 제품 등록을 진행할 수 있으며,
                    법정 인증 대상 상품은 제품 등록 단계에서 별도로 확인됩니다.
                  </p>
                )}

                {row && !isGeneral && (
                  <div className="mt-3 space-y-3 pl-6">
                    {row.reviewNote && (row.status === 'rejected' || row.status === 'needs_update' || row.status === 'suspended') && (
                      <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded px-2 py-1.5">
                        운영자 메모: {row.reviewNote}
                      </p>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">허가/신고 번호 (선택)</label>
                        <input
                          type="text"
                          defaultValue={row.registrationNumber || ''}
                          onBlur={(e) => {
                            const v = e.target.value.trim();
                            if (v !== (row.registrationNumber || '')) handleSaveCategoryRegistration(category, v);
                          }}
                          placeholder="입력 후 포커스 이동 시 저장"
                          className={inputClass}
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <input
                          type="file"
                          accept="application/pdf,.pdf"
                          disabled={busy}
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) handleUploadCategoryEvidence(category, f);
                            e.target.value = '';
                          }}
                          className={fileInputClass}
                        />
                        {row.evidenceDocument && (
                          <button
                            type="button"
                            onClick={() => handleDownloadCategoryEvidence(category)}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary-700 hover:text-primary-800 whitespace-nowrap"
                          >
                            <Download className="w-3.5 h-3.5" />
                            증빙 열람
                          </button>
                        )}
                      </div>
                    </div>
                    {row.evidenceDocument && (
                      <p className="text-xs text-gray-400">제출 파일: {row.evidenceDocument.fileName}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
          {categoryError && <p className="text-sm text-red-500">{categoryError}</p>}
        </div>
      </div>

      {/* Section B: 담당자 정보 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-5">
          <User className="w-5 h-5 text-gray-500" />
          담당자 정보
        </h2>
        <div className="space-y-5">
          {/* 담당자명 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">담당자명</label>
            <input
              type="text"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="김담당"
              className={inputClass}
            />
          </div>

          {/* 담당자 전화번호 */}
          <div>
            <label className="flex items-center gap-1.5 text-sm font-medium text-gray-700 mb-1.5">
              <Phone className="w-3.5 h-3.5 text-gray-400" />
              담당자 전화번호
            </label>
            <input
              type="tel"
              value={managerPhone}
              onChange={(e) => setManagerPhone(e.target.value)}
              placeholder="010-1234-5678"
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Section C: 외부 공개 연락처 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-5">
          <Globe className="w-5 h-5 text-gray-500" />
          외부 공개 연락처
        </h2>
        <p className="text-xs text-gray-400 mb-5">
          판매자가 공급자 프로필에서 문의할 때 사용되는 연락처입니다. 각 항목의 공개 범위를 설정할 수 있습니다.
        </p>
        <div className="space-y-6">
          {/* Email */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Mail className="w-4 h-4 text-gray-400" />
              이메일
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              placeholder="partner@example.com"
              className={inputClass}
            />
            <VisibilitySelector value={emailVisibility} onChange={setEmailVisibility} />
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 text-gray-400" />
              전화번호
            </label>
            <input
              type="tel"
              value={contactPhone}
              onChange={(e) => setContactPhone(e.target.value)}
              placeholder="02-1234-5678"
              className={inputClass}
            />
            <VisibilitySelector value={phoneVisibility} onChange={setPhoneVisibility} />
          </div>

          {/* Website */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <Globe className="w-4 h-4 text-gray-400" />
              웹사이트
            </label>
            <input
              type="url"
              value={contactWebsite}
              onChange={(e) => setContactWebsite(e.target.value)}
              placeholder="https://example.com"
              className={inputClass}
            />
            <VisibilitySelector value={websiteVisibility} onChange={setWebsiteVisibility} />
          </div>

          {/* Kakao */}
          <div>
            <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-2">
              <MessageCircle className="w-4 h-4 text-gray-400" />
              카카오톡 채널
            </label>
            <input
              type="url"
              value={contactKakao}
              onChange={(e) => setContactKakao(e.target.value)}
              placeholder="https://pf.kakao.com/example"
              className={inputClass}
            />
            <VisibilitySelector value={kakaoVisibility} onChange={setKakaoVisibility} />
          </div>
        </div>
      </div>

      {/* Section D: B2B 주문 조건 — WO-NETURE-B2B-SUPPLIER-ORDER-CONDITION-V1 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <ShoppingCart className="w-5 h-5 text-gray-500" />
          B2B 주문 조건
        </h2>
        <p className="text-xs text-gray-500 mb-5">
          매장 주문자가 장바구니/제품 리스트에서 확인할 수 있는 주문 조건입니다. 비워두면 “조건 없음”으로 표시됩니다.
        </p>
        <div className="space-y-5">
          {/* 최소 주문 금액 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">최소 주문 금액 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              value={minOrderAmount}
              onChange={(e) => setMinOrderAmount(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="예: 50000"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">미설정 시 매장 주문자에게 “조건 없음”으로 표시됩니다.</p>
          </div>

          {/* 미달 시 물류비 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">최소 주문 금액 미달 시 물류비 (원)</label>
            <input
              type="text"
              inputMode="numeric"
              value={minOrderSurcharge}
              onChange={(e) => setMinOrderSurcharge(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="예: 3000"
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">매장 주문자에게 “미달 시 물류비”로 안내됩니다. 실제 결제 반영은 별도 작업입니다.</p>
          </div>

          {/* 안내 문구 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">주문 조건 안내 문구 (선택)</label>
            <textarea
              value={orderConditionNote}
              onChange={(e) => setOrderConditionNote(e.target.value)}
              placeholder="예: 도서/산간 지역은 별도 협의가 필요합니다."
              rows={3}
              maxLength={500}
              className={inputClass}
            />
            <p className="mt-1 text-xs text-gray-400">주문 조건 모달과 장바구니에 함께 표시됩니다.</p>
          </div>
        </div>
      </div>

      {/* Section E: 배송 정책 — WO-O4O-NETURE-SUPPLIER-SHIPPING-SETTING-FOUNDATION-V1 */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 mb-4">
        <h2 className="flex items-center gap-2 text-base font-semibold text-gray-800 mb-2">
          <ShoppingCart className="w-5 h-5 text-gray-500" />
          배송 정책
        </h2>
        <p className="text-xs text-gray-500 mb-2">
          공급자별 기본 배송비, 무료배송 기준, 출고 안내, 반품/교환 안내를 설정합니다.
          장바구니·주문에서 공급자별 상품금액(같은 공급자의 일반·이벤트 상품 합산) 기준으로 배송비가 계산되며,
          다른 공급자 금액은 무료배송 기준에 포함되지 않습니다. 유통참여형 펀딩은 적용 대상이 아닙니다.
        </p>
        {/* WO-O4O-SUPPLIER-SHIPPING-POLICY-ONBOARDING-NOTICE-V1: 미설정 시 0원 fallback 경고 */}
        {baseShippingFee.trim() === '' ? (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-xs text-red-700 mb-5 space-y-1">
            <p className="font-semibold">⚠️ 기본 배송비가 설정되지 않았습니다.</p>
            <p>
              현재 기본 배송비가 비어 있어 <strong>장바구니와 주문에서 배송비가 0원으로 계산</strong>됩니다.
              공급 상품 주문의 실제 배송비 반영을 위해 기본 배송비를 입력해 주세요.
            </p>
            {freeShippingThreshold.trim() === '' && (
              <p>· 무료배송 기준 금액을 입력하면 매장이 “얼마 더 담으면 무료배송”인지 확인할 수 있습니다. 무료배송을 운영하지 않으면 비워둘 수 있습니다.</p>
            )}
            {averageDispatchDays.trim() === '' && (
              <p>· 평균 출고 소요일을 입력하면 매장 경영자가 주문 전 예상 배송 일정을 이해하는 데 도움이 됩니다.</p>
            )}
          </div>
        ) : (
          <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-xs text-emerald-700 mb-5 space-y-1">
            <p className="font-semibold">✅ 기본 배송비가 설정되어 있습니다.</p>
            <p>장바구니와 주문에서 공급자별 상품금액을 기준으로 배송비가 계산됩니다.</p>
            {freeShippingThreshold.trim() === '' && (
              <p className="text-emerald-600">· 무료배송 기준은 선택 입력입니다. 입력 시 매장이 무료배송까지 남은 금액을 확인할 수 있습니다.</p>
            )}
          </div>
        )}
        <div className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">기본 배송비 (원)</label>
              <input
                type="text"
                inputMode="numeric"
                value={baseShippingFee}
                onChange={(e) => setBaseShippingFee(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="예: 3000"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">무료배송 기준 금액 (원)</label>
              <input
                type="text"
                inputMode="numeric"
                value={freeShippingThreshold}
                onChange={(e) => setFreeShippingThreshold(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="예: 50000"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">평균 출고 소요일 (일)</label>
              <input
                type="text"
                inputMode="numeric"
                value={averageDispatchDays}
                onChange={(e) => setAverageDispatchDays(e.target.value.replace(/[^\d]/g, ''))}
                placeholder="예: 2"
                className={inputClass}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">일반 배송 안내 (선택)</label>
            <textarea
              value={shippingStandard}
              onChange={(e) => setShippingStandard(e.target.value)}
              placeholder="예: 평일 14시 이전 주문 시 당일 출고"
              rows={2}
              maxLength={500}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">제주/도서산간 안내 (선택)</label>
              <textarea
                value={shippingIsland}
                onChange={(e) => setShippingIsland(e.target.value)}
                placeholder="예: 제주/도서산간 추가 배송비 협의"
                rows={2}
                maxLength={500}
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">산간지역 안내 (선택)</label>
              <textarea
                value={shippingMountain}
                onChange={(e) => setShippingMountain(e.target.value)}
                placeholder="예: 일부 산간지역 배송 지연 가능"
                rows={2}
                maxLength={500}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">반품/교환 안내 (선택)</label>
            <textarea
              value={returnExchangeNotice}
              onChange={(e) => setReturnExchangeNotice(e.target.value)}
              placeholder="예: 단순 변심 반품은 수령 후 7일 이내, 왕복 배송비 구매자 부담"
              rows={3}
              maxLength={1000}
              className={inputClass}
            />
          </div>
        </div>
      </div>

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
          <li><strong>전체 공개</strong> — 로그인한 모든 판매자에게 표시됩니다.</li>
          <li><strong>파트너만</strong> — 취급 승인을 받은 판매자에게만 표시됩니다.</li>
          <li><strong>비공개</strong> — 본인만 확인할 수 있으며, 프로필에서 숨겨집니다.</li>
        </ul>
      </div>
    </div>
  );
}
