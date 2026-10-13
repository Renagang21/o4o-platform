import { User, Mail, Phone, Globe, MessageCircle } from 'lucide-react';
import { inputClass, VisibilitySelector } from './profilePresentation';
import type { useSupplierBusinessProfile } from './useSupplierBusinessProfile';

export default function SupplierContactFields({
  controller,
}: {
  controller: ReturnType<typeof useSupplierBusinessProfile>;
}) {
  const {
    managerName,
    setManagerName,
    managerPhone,
    setManagerPhone,
    contactEmail,
    setContactEmail,
    contactPhone,
    setContactPhone,
    contactWebsite,
    setContactWebsite,
    contactKakao,
    setContactKakao,
    emailVisibility,
    setEmailVisibility,
    phoneVisibility,
    setPhoneVisibility,
    websiteVisibility,
    setWebsiteVisibility,
    kakaoVisibility,
    setKakaoVisibility,
  } = controller;
  return (
    <>
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
          판매자가 공급자 프로필에서 문의할 때 사용되는 연락처입니다. 각 항목의 공개 범위를 설정할
          수 있습니다.
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
              placeholder="contact@example.com"
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
    </>
  );
}
