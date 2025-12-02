/**
 * Role Application Forms
 * Supplier, Seller, Partner application forms for logged-in users
 */

import React, { useState } from 'react';
import { authClient } from '@o4o/auth-client';
import { Building2, Package, Users, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface ApplicationState {
  isSubmitting: boolean;
  isSuccess: boolean;
  error: string | null;
}

// ===== SUPPLIER APPLICATION =====
export const SupplierApplicationForm: React.FC = () => {
  const [formData, setFormData] = useState({
    // Business Info
    businessNumber: '',
    businessName: '',
    ceoName: '',
    businessAddress: '',
    businessPhone: '',
    taxEmail: '',
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    // Supplier specific
    suppliedCategories: '',
    website: '',
    certifications: '',
    applicationMessage: ''
  });

  const [state, setState] = useState<ApplicationState>({
    isSubmitting: false,
    isSuccess: false,
    error: null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ isSubmitting: true, isSuccess: false, error: null });

    try {
      const response = await authClient.api.post('/applications/supplier', formData);

      if (response.data.success) {
        setState({ isSubmitting: false, isSuccess: true, error: null });
      } else {
        setState({ isSubmitting: false, isSuccess: false, error: response.data.message || '신청 실패' });
      }
    } catch (error: any) {
      setState({
        isSubmitting: false,
        isSuccess: false,
        error: error.response?.data?.message || '신청 중 오류가 발생했습니다.'
      });
    }
  };

  if (state.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">공급자 신청 완료!</h2>
          <p className="text-green-700">
            신청이 완료되었습니다. 관리자 승인 후 이메일로 안내드리겠습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">공급자 신청</h1>
            <p className="text-sm text-gray-600">상품을 공급하고자 하는 사업자를 위한 신청입니다</p>
          </div>
        </div>

        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{state.error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 사업자 정보 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">사업자 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업자 등록번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessNumber"
                  value={formData.businessNumber}
                  onChange={handleChange}
                  required
                  placeholder="000-00-00000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업자명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대표자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ceoName"
                  value={formData.ceoName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업자 전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="businessPhone"
                  value={formData.businessPhone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업장 소재지 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  세금계산서용 이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="taxEmail"
                  value={formData.taxEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 담당자 정보 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">담당자 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="managerName"
                  value={formData.managerName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자 전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="managerPhone"
                  value={formData.managerPhone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자 이메일
                </label>
                <input
                  type="email"
                  name="managerEmail"
                  value={formData.managerEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 공급 정보 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">공급 정보</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공급 품목/카테고리
                </label>
                <input
                  type="text"
                  name="suppliedCategories"
                  value={formData.suppliedCategories}
                  onChange={handleChange}
                  placeholder="예: 의류, 전자제품, 식품 (쉼표로 구분)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  웹사이트
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  보유 인증서
                </label>
                <input
                  type="text"
                  name="certifications"
                  value={formData.certifications}
                  onChange={handleChange}
                  placeholder="예: ISO 9001, GMP (쉼표로 구분)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  신청 메시지
                </label>
                <textarea
                  name="applicationMessage"
                  value={formData.applicationMessage}
                  onChange={handleChange}
                  rows={4}
                  placeholder="공급자로 활동하고자 하는 이유를 간단히 작성해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={state.isSubmitting}
              className="px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {state.isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  신청하기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===== SELLER APPLICATION =====
export const SellerApplicationForm: React.FC = () => {
  const [formData, setFormData] = useState({
    // Business Info
    businessNumber: '',
    businessName: '',
    ceoName: '',
    businessAddress: '',
    businessPhone: '',
    taxEmail: '',
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    // Seller specific
    storeName: '',
    storeDescription: '',
    salesChannels: '',
    applicationMessage: ''
  });

  const [state, setState] = useState<ApplicationState>({
    isSubmitting: false,
    isSuccess: false,
    error: null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setState({ isSubmitting: true, isSuccess: false, error: null });

    try {
      const response = await authClient.api.post('/applications/seller', formData);

      if (response.data.success) {
        setState({ isSubmitting: false, isSuccess: true, error: null });
      } else {
        setState({ isSubmitting: false, isSuccess: false, error: response.data.message || '신청 실패' });
      }
    } catch (error: any) {
      setState({
        isSubmitting: false,
        isSuccess: false,
        error: error.response?.data?.message || '신청 중 오류가 발생했습니다.'
      });
    }
  };

  if (state.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">판매자 신청 완료!</h2>
          <p className="text-green-700">
            신청이 완료되었습니다. 관리자 승인 후 이메일로 안내드리겠습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-purple-100 rounded-lg">
            <Building2 className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">판매자 신청</h1>
            <p className="text-sm text-gray-600">플랫폼에서 상품을 판매하고자 하는 사업자를 위한 신청입니다</p>
          </div>
        </div>

        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{state.error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 사업자 정보 - Seller와 동일 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">사업자 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업자 등록번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessNumber"
                  value={formData.businessNumber}
                  onChange={handleChange}
                  required
                  placeholder="000-00-00000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업자명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  대표자 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="ceoName"
                  value={formData.ceoName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업자 전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="businessPhone"
                  value={formData.businessPhone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  사업장 소재지 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="businessAddress"
                  value={formData.businessAddress}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  세금계산서용 이메일 <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  name="taxEmail"
                  value={formData.taxEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* 담당자 정보 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">담당자 정보</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자 이름 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="managerName"
                  value={formData.managerName}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자 전화번호 <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="managerPhone"
                  value={formData.managerPhone}
                  onChange={handleChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  담당자 이메일
                </label>
                <input
                  type="email"
                  name="managerEmail"
                  value={formData.managerEmail}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* 판매 정보 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">판매 정보</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  스토어명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="storeName"
                  value={formData.storeName}
                  onChange={handleChange}
                  required
                  placeholder="고객에게 보여질 스토어 이름"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  스토어 소개
                </label>
                <textarea
                  name="storeDescription"
                  value={formData.storeDescription}
                  onChange={handleChange}
                  rows={3}
                  placeholder="스토어에 대해 간단히 소개해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  판매 채널
                </label>
                <input
                  type="text"
                  name="salesChannels"
                  value={formData.salesChannels}
                  onChange={handleChange}
                  placeholder="예: 온라인, 오프라인 매장 (쉼표로 구분)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  신청 메시지
                </label>
                <textarea
                  name="applicationMessage"
                  value={formData.applicationMessage}
                  onChange={handleChange}
                  rows={4}
                  placeholder="판매자로 활동하고자 하는 이유를 간단히 작성해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={state.isSubmitting}
              className="px-6 py-3 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {state.isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  신청하기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ===== PARTNER APPLICATION =====
export const PartnerApplicationForm: React.FC<{
  sellerId?: string;
}> = ({ sellerId }) => {
  const [partnerType, setPartnerType] = useState<'individual' | 'corporate'>('individual');
  const [formData, setFormData] = useState({
    // Partner type
    partnerType: 'individual',
    sellerId: sellerId || '',
    // Individual fields
    name: '',
    phone: '',
    residentNumber: '',
    // Corporate fields
    businessNumber: '',
    businessName: '',
    ceoName: '',
    businessAddress: '',
    businessPhone: '',
    taxEmail: '',
    managerName: '',
    managerPhone: '',
    managerEmail: '',
    // Partner specific
    bio: '',
    website: '',
    socialMedia: '',
    applicationMessage: '',
    memo: ''
  });

  const [state, setState] = useState<ApplicationState>({
    isSubmitting: false,
    isSuccess: false,
    error: null
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleTypeChange = (type: 'individual' | 'corporate') => {
    setPartnerType(type);
    setFormData(prev => ({
      ...prev,
      partnerType: type
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.sellerId) {
      setState({ isSubmitting: false, isSuccess: false, error: '파트너가 연결할 판매자를 선택해주세요.' });
      return;
    }

    setState({ isSubmitting: true, isSuccess: false, error: null });

    try {
      const response = await authClient.api.post('/applications/partner', formData);

      if (response.data.success) {
        setState({ isSubmitting: false, isSuccess: true, error: null });
      } else {
        setState({ isSubmitting: false, isSuccess: false, error: response.data.message || '신청 실패' });
      }
    } catch (error: any) {
      setState({
        isSubmitting: false,
        isSuccess: false,
        error: error.response?.data?.message || '신청 중 오류가 발생했습니다.'
      });
    }
  };

  if (state.isSuccess) {
    return (
      <div className="max-w-2xl mx-auto p-6">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-green-900 mb-2">파트너 신청 완료!</h2>
          <p className="text-green-700">
            신청이 완료되었습니다. 승인 후 이메일로 안내드리겠습니다.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-green-100 rounded-lg">
            <Users className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">파트너 신청</h1>
            <p className="text-sm text-gray-600">제휴 마케팅으로 수익을 창출하세요</p>
          </div>
        </div>

        {state.error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-800">{state.error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 파트너 유형 선택 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">파트너 유형</h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => handleTypeChange('individual')}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  partnerType === 'individual'
                    ? 'border-green-600 bg-green-50 text-green-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">개인</div>
                <div className="text-sm text-gray-600 mt-1">개인으로 활동</div>
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('corporate')}
                className={`p-4 border-2 rounded-lg text-center transition-colors ${
                  partnerType === 'corporate'
                    ? 'border-green-600 bg-green-50 text-green-900'
                    : 'border-gray-300 hover:border-gray-400'
                }`}
              >
                <div className="font-medium">사업체</div>
                <div className="text-sm text-gray-600 mt-1">사업자로 활동</div>
              </button>
            </div>
          </div>

          {/* 판매자 선택 */}
          <div className="border-b pb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              연결할 판매자 ID <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="sellerId"
              value={formData.sellerId}
              onChange={handleChange}
              required
              placeholder="판매자의 ID를 입력하세요"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
            />
            <p className="text-xs text-gray-500 mt-1">파트너로 활동할 판매자를 지정해주세요</p>
          </div>

          {/* 개인 정보 */}
          {partnerType === 'individual' && (
            <div className="border-b pb-6">
              <h3 className="text-lg font-semibold mb-4">개인 정보</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    이름 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required={partnerType === 'individual'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    연락처 <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    required={partnerType === 'individual'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    주민등록번호
                  </label>
                  <input
                    type="text"
                    name="residentNumber"
                    value={formData.residentNumber}
                    onChange={handleChange}
                    placeholder="000000-0000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* 사업자 정보 */}
          {partnerType === 'corporate' && (
            <>
              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold mb-4">사업자 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      사업자 등록번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessNumber"
                      value={formData.businessNumber}
                      onChange={handleChange}
                      required={partnerType === 'corporate'}
                      placeholder="000-00-00000"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      사업자명 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessName"
                      value={formData.businessName}
                      onChange={handleChange}
                      required={partnerType === 'corporate'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      대표자 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="ceoName"
                      value={formData.ceoName}
                      onChange={handleChange}
                      required={partnerType === 'corporate'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      사업자 전화번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="businessPhone"
                      value={formData.businessPhone}
                      onChange={handleChange}
                      required={partnerType === 'corporate'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      사업장 소재지 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="businessAddress"
                      value={formData.businessAddress}
                      onChange={handleChange}
                      required={partnerType === 'corporate'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      세금계산서용 이메일 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      name="taxEmail"
                      value={formData.taxEmail}
                      onChange={handleChange}
                      required={partnerType === 'corporate'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>

              <div className="border-b pb-6">
                <h3 className="text-lg font-semibold mb-4">담당자 정보</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      담당자 이름 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="managerName"
                      value={formData.managerName}
                      onChange={handleChange}
                      required={partnerType === 'corporate'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      담당자 전화번호 <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      name="managerPhone"
                      value={formData.managerPhone}
                      onChange={handleChange}
                      required={partnerType === 'corporate'}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      담당자 이메일
                    </label>
                    <input
                      type="email"
                      name="managerEmail"
                      value={formData.managerEmail}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* 파트너 정보 */}
          <div className="border-b pb-6">
            <h3 className="text-lg font-semibold mb-4">활동 정보</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  자기소개
                </label>
                <textarea
                  name="bio"
                  value={formData.bio}
                  onChange={handleChange}
                  rows={3}
                  placeholder="간단한 자기소개를 작성해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  웹사이트/블로그
                </label>
                <input
                  type="url"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="https://"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메모
                </label>
                <textarea
                  name="memo"
                  value={formData.memo}
                  onChange={handleChange}
                  rows={4}
                  placeholder="파트너로 활동하고자 하는 이유를 간단히 작성해주세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500"
                />
              </div>
            </div>
          </div>

          {/* 제출 버튼 */}
          <div className="flex justify-end gap-3">
            <button
              type="submit"
              disabled={state.isSubmitting}
              className="px-6 py-3 bg-green-600 text-white font-medium rounded-lg hover:bg-green-700 disabled:bg-gray-400 flex items-center gap-2"
            >
              {state.isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  처리 중...
                </>
              ) : (
                <>
                  신청하기
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
