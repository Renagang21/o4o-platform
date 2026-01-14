/**
 * PartnershipRequestCreatePage - 제휴 요청 생성 폼
 *
 * WO-NETURE-SMOKE-STABILIZATION-V1
 * - 로그인 필요
 * - 제휴 요청 생성 후 상세 페이지로 이동
 */

import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { netureApi } from '../../../lib/api';
import { useAuth } from '../../../contexts';

export default function PartnershipRequestCreatePage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    sellerName: '',
    sellerServiceType: '',
    sellerStoreUrl: '',
    periodStart: '',
    periodEnd: '',
    revenueStructure: '',
    promotionSns: false,
    promotionContent: false,
    promotionBanner: false,
    promotionOther: '',
    contactEmail: '',
    contactPhone: '',
    contactKakao: '',
    productName1: '',
    productCategory1: '',
    productName2: '',
    productCategory2: '',
  });

  if (authLoading) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">로그인이 필요합니다</h1>
        <p className="text-gray-600 mb-6">제휴 요청을 하려면 먼저 로그인해 주세요.</p>
        <Link
          to="/login"
          className="inline-block bg-primary-600 text-white px-6 py-3 rounded-md hover:bg-primary-700 transition-colors"
        >
          로그인하기
        </Link>
      </div>
    );
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    try {
      // Build products array
      const products: Array<{ name: string; category?: string }> = [];
      if (formData.productName1) {
        products.push({ name: formData.productName1, category: formData.productCategory1 });
      }
      if (formData.productName2) {
        products.push({ name: formData.productName2, category: formData.productCategory2 });
      }

      const result = await netureApi.createPartnershipRequest({
        sellerName: formData.sellerName,
        sellerServiceType: formData.sellerServiceType || undefined,
        sellerStoreUrl: formData.sellerStoreUrl || undefined,
        periodStart: formData.periodStart || undefined,
        periodEnd: formData.periodEnd || undefined,
        revenueStructure: formData.revenueStructure || undefined,
        promotionSns: formData.promotionSns,
        promotionContent: formData.promotionContent,
        promotionBanner: formData.promotionBanner,
        promotionOther: formData.promotionOther || undefined,
        contactEmail: formData.contactEmail || undefined,
        contactPhone: formData.contactPhone || undefined,
        contactKakao: formData.contactKakao || undefined,
        products: products.length > 0 ? products : undefined,
      });

      if (result.success && result.data) {
        // Navigate to the created request detail page
        navigate(`/partners/requests/${result.data.id}`);
      } else {
        setError(result.error || '제휴 요청 생성에 실패했습니다.');
      }
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link
        to="/partners/requests"
        className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        제휴 요청 목록으로
      </Link>

      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">제휴 요청하기</h1>
        <p className="text-lg text-gray-600">
          파트너십 제안을 등록하여 공급자를 찾으세요
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* 기본 정보 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">기본 정보</h2>
          <div className="space-y-4">
            <div>
              <label htmlFor="sellerName" className="block text-sm font-medium text-gray-700 mb-1">
                판매자명 <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="sellerName"
                name="sellerName"
                value={formData.sellerName}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="예: 글라이코팜 강남점"
              />
            </div>

            <div>
              <label
                htmlFor="sellerServiceType"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                서비스 유형
              </label>
              <select
                id="sellerServiceType"
                name="sellerServiceType"
                value={formData.sellerServiceType}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">선택해 주세요</option>
                <option value="glycopharm">GlycoPharm (약국)</option>
                <option value="k-cosmetics">K-Cosmetics (화장품)</option>
                <option value="other">기타</option>
              </select>
            </div>

            <div>
              <label
                htmlFor="sellerStoreUrl"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                스토어 URL
              </label>
              <input
                type="url"
                id="sellerStoreUrl"
                name="sellerStoreUrl"
                value={formData.sellerStoreUrl}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://..."
              />
            </div>
          </div>
        </div>

        {/* 기간 및 조건 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">기간 및 조건</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="periodStart"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  시작일
                </label>
                <input
                  type="date"
                  id="periodStart"
                  name="periodStart"
                  value={formData.periodStart}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label htmlFor="periodEnd" className="block text-sm font-medium text-gray-700 mb-1">
                  종료일
                </label>
                <input
                  type="date"
                  id="periodEnd"
                  name="periodEnd"
                  value={formData.periodEnd}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="revenueStructure"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                수익 구조
              </label>
              <textarea
                id="revenueStructure"
                name="revenueStructure"
                value={formData.revenueStructure}
                onChange={handleInputChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="예: 판매 수수료 15%, 월 정산"
              />
            </div>
          </div>
        </div>

        {/* 프로모션 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">프로모션 범위</h2>
          <div className="space-y-3">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="promotionSns"
                checked={formData.promotionSns}
                onChange={handleCheckboxChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">SNS 홍보</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="promotionContent"
                checked={formData.promotionContent}
                onChange={handleCheckboxChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">콘텐츠 마케팅</span>
            </label>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="promotionBanner"
                checked={formData.promotionBanner}
                onChange={handleCheckboxChange}
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="ml-2 text-gray-700">배너 광고</span>
            </label>
            <div>
              <label
                htmlFor="promotionOther"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                기타
              </label>
              <input
                type="text"
                id="promotionOther"
                name="promotionOther"
                value={formData.promotionOther}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="예: 약국 내 POP 광고"
              />
            </div>
          </div>
        </div>

        {/* 제품 정보 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">취급 제품</h2>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="productName1"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  제품명 1
                </label>
                <input
                  type="text"
                  id="productName1"
                  name="productName1"
                  value={formData.productName1}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="productCategory1"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  카테고리
                </label>
                <input
                  type="text"
                  id="productCategory1"
                  name="productCategory1"
                  value={formData.productCategory1}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="productName2"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  제품명 2
                </label>
                <input
                  type="text"
                  id="productName2"
                  name="productName2"
                  value={formData.productName2}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label
                  htmlFor="productCategory2"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  카테고리
                </label>
                <input
                  type="text"
                  id="productCategory2"
                  name="productCategory2"
                  value={formData.productCategory2}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* 연락처 */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">연락처</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="contactEmail"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                이메일
              </label>
              <input
                type="email"
                id="contactEmail"
                name="contactEmail"
                value={formData.contactEmail}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder={user?.email || ''}
              />
            </div>
            <div>
              <label
                htmlFor="contactPhone"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                전화번호
              </label>
              <input
                type="tel"
                id="contactPhone"
                name="contactPhone"
                value={formData.contactPhone}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="02-1234-5678"
              />
            </div>
            <div>
              <label
                htmlFor="contactKakao"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                카카오톡 채널
              </label>
              <input
                type="url"
                id="contactKakao"
                name="contactKakao"
                value={formData.contactKakao}
                onChange={handleInputChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-primary-500 focus:border-primary-500"
                placeholder="https://pf.kakao.com/..."
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-4">
          <Link
            to="/partners/requests"
            className="px-6 py-3 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors"
          >
            취소
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-3 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? '요청 중...' : '제휴 요청하기'}
          </button>
        </div>
      </form>
    </div>
  );
}
