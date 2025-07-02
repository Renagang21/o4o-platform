import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePartnerStore, PartnerApplication } from '../../store/partnerStore';

const PartnerApply: React.FC = () => {
  const navigate = useNavigate();
  const { applyAsPartner, loading, error, clearError } = usePartnerStore();
  
  const [form, setForm] = useState<PartnerApplication>({
    name: '',
    email: '',
    phone: '',
    description: '',
    agreeToTerms: false,
  });
  
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setForm(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
    
    // 에러가 있으면 클리어
    if (error) clearError();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!form.agreeToTerms) {
      alert('이용약관에 동의해주세요.');
      return;
    }
    
    try {
      await applyAsPartner(form);
      setSubmitted(true);
    } catch (err) {
      // 에러는 스토어에서 관리됨
      console.error('Partner 신청 실패:', err);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-lg shadow-lg">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">신청이 완료되었습니다!</h2>
          <p className="text-gray-600 mb-6">
            파트너 신청서가 성공적으로 제출되었습니다.<br />
            검토 후 승인 결과를 이메일로 안내드리겠습니다.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-lg shadow-lg">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">파트너 신청</h1>
        <p className="text-gray-600">
          우리와 함께 성장하는 파트너가 되어보세요. 제품을 추천하고 수수료를 받으실 수 있습니다.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* 이름 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이름 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="name"
            value={form.name}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="홍길동"
            required
            disabled={loading.apply}
          />
        </div>

        {/* 이메일 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            이메일 <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            value={form.email}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="partner@example.com"
            required
            disabled={loading.apply}
          />
        </div>

        {/* 전화번호 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            전화번호 <span className="text-red-500">*</span>
          </label>
          <input
            type="tel"
            name="phone"
            value={form.phone}
            onChange={handleChange}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="010-1234-5678"
            required
            disabled={loading.apply}
          />
        </div>
        {/* 자기소개 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            자기소개 및 마케팅 경험
          </label>
          <textarea
            name="description"
            value={form.description}
            onChange={handleChange}
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="자신을 소개하고 마케팅 경험이나 관심 분야를 알려주세요."
            disabled={loading.apply}
          />
        </div>

        {/* 파트너 혜택 안내 */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">파트너 혜택</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• 1단계 마케팅 시스템 (다단계 ❌)</li>
            <li>• 추천 링크 생성 및 관리</li>
            <li>• 실시간 성과 추적 대시보드</li>
            <li>• 수수료 정산은 별도 협의 (오프라인 처리)</li>
          </ul>
        </div>

        {/* 약관 동의 */}
        <div className="flex items-start space-x-3">
          <input
            type="checkbox"
            name="agreeToTerms"
            checked={form.agreeToTerms}
            onChange={handleChange}
            className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            required
            disabled={loading.apply}
          />
          <label className="text-sm text-gray-700">
            <span className="text-red-500">*</span> 파트너 이용약관 및 개인정보 처리방침에 동의합니다.
            <br />
            <a href="/terms/partner" className="text-blue-600 hover:underline" target="_blank">
              이용약관 보기
            </a>
          </label>
        </div>

        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <svg className="h-5 w-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg font-medium hover:bg-blue-700 focus:ring-4 focus:ring-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
          disabled={loading.apply || !form.agreeToTerms}
        >
          {loading.apply ? (
            <div className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              신청 중...
            </div>
          ) : (
            '파트너 신청하기'
          )}
        </button>
      </form>
    </div>
  );
};

export default PartnerApply;