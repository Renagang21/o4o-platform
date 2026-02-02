/**
 * SupplierProfilePage - 공급자 연락처 정보 관리
 *
 * 공급자가 자신의 연락처 정보(이메일, 전화, 웹사이트, 카카오톡)를
 * 등록/수정하고 공개 범위를 설정할 수 있는 페이지
 *
 * WO-O4O-SUPPLIER-PUBLIC-CONTACT-POLICY-V1
 */

import { useState, useEffect } from 'react';
import { Mail, Phone, Globe, MessageCircle, Save, Loader2, CheckCircle } from 'lucide-react';
import { supplierProfileApi, type SupplierProfile, type ContactVisibility } from '../../lib/api';

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

export default function SupplierProfilePage() {
  const [profile, setProfile] = useState<SupplierProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [contactEmail, setContactEmail] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactWebsite, setContactWebsite] = useState('');
  const [contactKakao, setContactKakao] = useState('');

  const [emailVisibility, setEmailVisibility] = useState<ContactVisibility>('public');
  const [phoneVisibility, setPhoneVisibility] = useState<ContactVisibility>('private');
  const [websiteVisibility, setWebsiteVisibility] = useState<ContactVisibility>('public');
  const [kakaoVisibility, setKakaoVisibility] = useState<ContactVisibility>('partners');

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      const data = await supplierProfileApi.getProfile();
      if (data) {
        setProfile(data);
        setContactEmail(data.contactEmail || '');
        setContactPhone(data.contactPhone || '');
        setContactWebsite(data.contactWebsite || '');
        setContactKakao(data.contactKakao || '');
        setEmailVisibility(data.contactEmailVisibility || 'public');
        setPhoneVisibility(data.contactPhoneVisibility || 'private');
        setWebsiteVisibility(data.contactWebsiteVisibility || 'public');
        setKakaoVisibility(data.contactKakaoVisibility || 'partners');
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
      contactEmail,
      contactPhone,
      contactWebsite,
      contactKakao,
      contactEmailVisibility: emailVisibility,
      contactPhoneVisibility: phoneVisibility,
      contactWebsiteVisibility: websiteVisibility,
      contactKakaoVisibility: kakaoVisibility,
    });

    setSaving(false);

    if (result.success) {
      setSaved(true);
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
      <h1 className="text-2xl font-bold text-gray-900 mb-2">연락처 정보 관리</h1>
      <p className="text-sm text-gray-500 mb-8">
        판매자가 공급자 프로필에서 문의할 때 사용되는 연락처입니다.
        각 연락처의 공개 범위를 설정할 수 있습니다.
      </p>

      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
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
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
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
            className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <VisibilitySelector value={kakaoVisibility} onChange={setKakaoVisibility} />
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3 pt-2">
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
          {saved && <p className="text-sm text-green-600">연락처 정보가 업데이트되었습니다.</p>}
        </div>
      </div>

      <div className="mt-6 bg-blue-50 border border-blue-100 rounded-xl p-4 space-y-2">
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
