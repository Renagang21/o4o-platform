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
} from 'lucide-react';
import { supplierProfileApi, type SupplierProfile, type ContactVisibility } from '../../lib/api';
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

export default function SupplierProfilePage() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Section A: 사업자 기본정보
  const [representativeName, setRepresentativeName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessZipCode, setBusinessZipCode] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessAddressDetail, setBusinessAddressDetail] = useState('');
  const [taxEmail, setTaxEmail] = useState('');

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

  // Pre-fill indicator
  const [prefilled, setPrefilled] = useState(false);

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const data = await supplierProfileApi.getProfile();
      if (data) {
        setProfile(data);
        // Section A
        setRepresentativeName(data.representativeName || '');
        setBusinessNumber(data.businessNumber || '');
        setBusinessType(data.businessType || '');
        setBusinessZipCode(data.businessZipCode || '');
        setBusinessAddress(data.businessAddress || '');
        setBusinessAddressDetail(data.businessAddressDetail || '');
        setTaxEmail(data.taxEmail || '');
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
        // Pre-fill
        setPrefilled(!!data._prefilled);
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
      taxEmail,
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

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">사업자 프로필 관리</h1>
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

          {/* 업종 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">업종</label>
            <input
              type="text"
              value={businessType}
              onChange={(e) => setBusinessType(e.target.value)}
              placeholder="화장품 / 건강식품 / 의료기기 등"
              className={inputClass}
            />
          </div>

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
              세금계산서 이메일
            </label>
            <input
              type="email"
              value={taxEmail}
              onChange={(e) => setTaxEmail(e.target.value)}
              placeholder="tax@company.com"
              className={inputClass}
            />
          </div>
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
