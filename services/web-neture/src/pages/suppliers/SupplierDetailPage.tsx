/**
 * SupplierDetailPage - 공급자 상세 페이지
 *
 * Work Order: WO-NETURE-EXTENSION-P4
 * WO-S2S-FLOW-RECOVERY-PHASE1-V1: 취급 요청 버튼 추가
 *
 * 표현 기능:
 * - P2: 콘텐츠 활용 안내 (Content Utilization Visibility)
 * - P3: 제품 목적 표시 (Product Purpose Visibility)
 * - P4: 판매 중 매장 표시 (Active Usage Visibility)
 * - Phase1: 판매자 취급 요청 (APPLICATION/ACTIVE_SALES 제품)
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Mail, Phone, Globe, MessageCircle, ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react';
import { netureApi, sellerApi, type SupplierDetail } from '../../lib/api';
import { ContentUtilizationGuide } from '../../components/ContentUtilizationGuide';
import { ProductPurposeBadge } from '../../components/ProductPurposeBadge';
import { ActiveUsageList } from '../../components/ActiveUsageList';
import { UsageContextSummary } from '../../components/UsageContextSummary';

export default function SupplierDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // WO-S2S-FLOW-RECOVERY-PHASE1-V1: 취급 요청 상태 관리
  const [requestingProducts, setRequestingProducts] = useState<Set<string>>(new Set());
  const [requestedProducts, setRequestedProducts] = useState<Set<string>>(new Set());
  const [requestErrors, setRequestErrors] = useState<Record<string, string>>({});

  const handleRequestHandling = async (product: { id: string; name: string; category: string; purpose?: string }) => {
    if (!supplier) return;

    setRequestingProducts((prev) => new Set(prev).add(product.id));
    setRequestErrors((prev) => { const next = { ...prev }; delete next[product.id]; return next; });

    const result = await sellerApi.createHandlingRequest({
      supplierId: supplier.id,
      productId: product.id,
      productName: product.name,
      productCategory: product.category,
      productPurpose: product.purpose || 'APPLICATION',
      serviceId: 'neture',
      serviceName: 'Neture',
    });

    setRequestingProducts((prev) => { const next = new Set(prev); next.delete(product.id); return next; });

    if (result.success) {
      setRequestedProducts((prev) => new Set(prev).add(product.id));
    } else if (result.error === 'DUPLICATE_REQUEST') {
      setRequestedProducts((prev) => new Set(prev).add(product.id));
    } else {
      setRequestErrors((prev) => ({ ...prev, [product.id]: result.error || '요청 실패' }));
    }
  };

  useEffect(() => {
    const fetchSupplier = async () => {
      if (!slug) {
        setError('Supplier slug is required');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const data = await netureApi.getSupplierBySlug(slug);
        setSupplier(data);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setLoading(false);
      }
    };

    fetchSupplier();
  }, [slug]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-600">Loading supplier...</p>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {error ? `Error: ${error}` : '공급자를 찾을 수 없습니다'}
        </h1>
        <Link to="/suppliers" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link to="/suppliers" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" />
        공급자 목록으로
      </Link>

      {/* Header */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <div className="flex items-start gap-6">
          <img src={supplier.logo} alt={supplier.name} className="w-32 h-32 rounded-full" />
          <div className="flex-1">
            <span className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full mb-2">
              {supplier.category}
            </span>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{supplier.name}</h1>
            <p className="text-lg text-gray-600 mb-6">{supplier.shortDescription}</p>

            {/* Contact Buttons */}
            <div className="flex flex-wrap gap-3">
              <a href={`mailto:${supplier.contact.email}`} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors">
                <Mail className="w-4 h-4 mr-2" />
                이메일
              </a>
              <a href={`tel:${supplier.contact.phone}`} className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                <Phone className="w-4 h-4 mr-2" />
                전화
              </a>
              <a href={supplier.contact.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                <Globe className="w-4 h-4 mr-2" />
                웹사이트
              </a>
              <a href={supplier.contact.kakao} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors">
                <MessageCircle className="w-4 h-4 mr-2" />
                카카오톡
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">소개</h2>
        <p className="text-gray-700 leading-relaxed">{supplier.description}</p>
      </div>

      {/* Products (WO-NETURE-EXTENSION-P3: 목적 라벨 추가) */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">취급 제품</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {supplier.products.map((product) => {
            const isRequesting = requestingProducts.has(product.id);
            const isRequested = requestedProducts.has(product.id);
            const errorMsg = requestErrors[product.id];
            const canRequest = product.purpose === 'APPLICATION' || product.purpose === 'ACTIVE_SALES';

            return (
              <div key={product.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">{product.name}</h3>
                  <ProductPurposeBadge purpose={product.purpose} size="small" />
                </div>
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded mb-2">
                  {product.category}
                </span>
                <p className="text-sm text-gray-600 mb-3">{product.description}</p>

                {/* WO-S2S-FLOW-RECOVERY-PHASE1-V1: 취급 요청 버튼 */}
                {canRequest && (
                  <div className="mt-2 pt-2 border-t border-gray-100">
                    {isRequested ? (
                      <span className="inline-flex items-center gap-1.5 text-sm text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        요청됨
                      </span>
                    ) : (
                      <button
                        onClick={() => handleRequestHandling(product)}
                        disabled={isRequesting}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary-700 bg-primary-50 rounded-md hover:bg-primary-100 transition-colors disabled:opacity-50"
                      >
                        {isRequesting ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                        {isRequesting ? '요청 중...' : '취급 요청'}
                      </button>
                    )}
                    {errorMsg && (
                      <p className="mt-1 text-xs text-red-500">{errorMsg}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 판매 중 매장 표시 (WO-NETURE-EXTENSION-P4) - ACTIVE_SALES 제품만 */}
      {supplier.products.some((p) => p.purpose === 'ACTIVE_SALES') && (
        <div className="mb-8">
          {supplier.products
            .filter((p) => p.purpose === 'ACTIVE_SALES')
            .map((product) => (
              <div key={product.id} className="mb-4">
                <ActiveUsageList
                  productId={product.id}
                  productName={product.name}
                />
              </div>
            ))}
        </div>
      )}

      {/* 사용 맥락 요약 (WO-NETURE-EXTENSION-P5) - ACTIVE_SALES 제품만 */}
      {supplier.products.some((p) => p.purpose === 'ACTIVE_SALES') && (
        <div className="mb-8">
          {supplier.products
            .filter((p) => p.purpose === 'ACTIVE_SALES')
            .map((product) => (
              <div key={product.id} className="mb-4">
                <UsageContextSummary
                  productId={product.id}
                  productName={product.name}
                />
              </div>
            ))}
        </div>
      )}

      {/* 콘텐츠 활용 안내 (WO-NETURE-EXTENSION-P2) */}
      <div className="mb-8">
        <ContentUtilizationGuide
          contentType="product"
          usageNote={`${supplier.name}의 제품 콘텐츠(이미지, 설명 등)는 제휴된 서비스에서 활용할 수 있습니다.`}
        />
      </div>

      {/* Distribution Terms */}
      <div className="bg-white border border-gray-200 rounded-lg p-8 mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">유통 조건</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">가격 정책</h3>
            <p className="text-gray-700">{supplier.pricingPolicy}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">최소 주문 수량 (MOQ)</h3>
            <p className="text-gray-700">{supplier.moq}</p>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 mb-2">배송 정책</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
              <div className="border border-gray-200 rounded p-3">
                <p className="font-medium text-gray-900 mb-1">일반 지역</p>
                <p className="text-sm text-gray-600">{supplier.shippingPolicy.standard}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="font-medium text-gray-900 mb-1">도서 지역</p>
                <p className="text-sm text-gray-600">{supplier.shippingPolicy.island}</p>
              </div>
              <div className="border border-gray-200 rounded p-3">
                <p className="font-medium text-gray-900 mb-1">산간 지역</p>
                <p className="text-sm text-gray-600">{supplier.shippingPolicy.mountain}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Notice */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
        <p className="text-blue-900 font-medium">
          거래를 원하시면 각 서비스의 판매자 대시보드에서 신청하세요
        </p>
      </div>
    </div>
  );
}
