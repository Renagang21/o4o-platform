/**
 * SupplierDetailPage - 공급자 프로필 페이지
 *
 * Work Order: WO-SUPPLIER-PROFILE-V1
 *
 * 화면 성격: 관리 화면이 아닌, 읽기 전용 정보 제공용 프로필
 * 주 사용자: 판매자 (공급자를 이해하고 판단하기 위한 소개 화면)
 *
 * 원칙:
 * - "센터/관리" 문구 없음
 * - 설정/수정/센터 진입 개념 없음
 * - 정보 탐색용 이동만 허용
 */

import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Mail, Phone, Globe, MessageCircle, ArrowLeft, Send, CheckCircle, Loader2 } from 'lucide-react';
import { netureApi, sellerApi, type SupplierDetail } from '../../lib/api';
import { ProductPurposeBadge } from '../../components/ProductPurposeBadge';

// 서비스 참여 현황 정적 데이터
const SERVICE_INFO: Record<string, { name: string; icon: string; description: string; usageAreas: string[] }> = {
  glycopharm: {
    name: 'GlycoPharm',
    icon: '🏥',
    description: '약국 공급 플랫폼',
    usageAreas: ['상품 상세 페이지', '약국 매장 콘텐츠'],
  },
  'k-cosmetics': {
    name: 'K-Cosmetics',
    icon: '💄',
    description: '화장품 유통 플랫폼',
    usageAreas: ['상품 상세 설명', '메인 배너', '프로모션 영역'],
  },
  glucoseview: {
    name: 'GlucoseView',
    icon: '📊',
    description: '혈당 관리 플랫폼',
    usageAreas: ['공급자 소개 영역', '서비스 안내'],
  },
};

export default function SupplierDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const [supplier, setSupplier] = useState<SupplierDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 취급 요청 상태 관리
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
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <p className="text-gray-500">공급자 정보를 불러오는 중...</p>
      </div>
    );
  }

  if (error || !supplier) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-4">
          {error ? `Error: ${error}` : '공급자를 찾을 수 없습니다'}
        </h1>
        <Link to="/workspace/suppliers" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  // 공급 성향 태그
  const supplyTraits = getSupplyTraits(supplier);
  // 판매자 관점 장점
  const sellerBenefits = getSellerBenefits(supplier);
  // 참여 서비스 목록
  const participatingServices = Object.keys(SERVICE_INFO);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Back Button */}
      <Link to="/workspace/suppliers" className="inline-flex items-center text-primary-600 hover:text-primary-700 mb-8">
        <ArrowLeft className="w-4 h-4 mr-2" />
        공급자 목록으로
      </Link>

      {/* ① 공급자 요약 영역 (Hero) */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
        <div className="flex items-start gap-6">
          <img src={supplier.logo} alt={supplier.name} className="w-28 h-28 rounded-2xl object-cover border border-gray-100" />
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <span className="inline-block px-3 py-1 text-sm bg-primary-100 text-primary-700 rounded-full font-medium">
                {supplier.category}
              </span>
              {supplyTraits.map((trait) => (
                <span key={trait} className="inline-block px-3 py-1 text-xs bg-gray-100 text-gray-600 rounded-full">
                  {trait}
                </span>
              ))}
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{supplier.name}</h1>
            <p className="text-lg text-gray-600">{supplier.shortDescription}</p>

            {/* Contact Info */}
            <div className="flex flex-wrap gap-3 mt-6">
              <a href={`mailto:${supplier.contact.email}`} className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium">
                <Mail className="w-4 h-4 mr-2" />
                이메일 문의
              </a>
              <a href={`tel:${supplier.contact.phone}`} className="inline-flex items-center px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <Phone className="w-4 h-4 mr-2" />
                전화
              </a>
              <a href={supplier.contact.website} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <Globe className="w-4 h-4 mr-2" />
                웹사이트
              </a>
              <a href={supplier.contact.kakao} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm">
                <MessageCircle className="w-4 h-4 mr-2" />
                카카오톡
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* ② 공급자 소개 (About Supplier) */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">공급자 소개</h2>
        <p className="text-gray-700 leading-relaxed mb-6">{supplier.description}</p>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500 mb-1">주력 취급 분야</p>
            <p className="text-gray-900 font-medium">{supplier.category}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="text-sm font-medium text-gray-500 mb-1">취급 제품 수</p>
            <p className="text-gray-900 font-medium">{supplier.products.length}개 제품</p>
          </div>
        </div>
      </div>

      {/* ③ 제공 가치 요약 (Why choose this supplier) */}
      {sellerBenefits.length > 0 && (
        <div className="bg-gradient-to-br from-primary-50 to-blue-50 border border-primary-100 rounded-xl p-8 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">이 공급자를 선택하는 이유</h2>
          <ul className="space-y-3">
            {sellerBenefits.map((benefit, idx) => (
              <li key={idx} className="flex items-start gap-3">
                <span className="text-primary-600 mt-0.5 font-bold">✓</span>
                <span className="text-gray-700">{benefit}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ④ 서비스 참여 현황 */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">제품/콘텐츠가 활용되는 서비스</h2>
        <p className="text-sm text-gray-500 mb-6">
          이 공급자의 제품과 콘텐츠는 아래 서비스의 매장에서 활용됩니다.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {participatingServices.map((serviceId) => {
            const service = SERVICE_INFO[serviceId];
            if (!service) return null;
            return (
              <div key={serviceId} className="border border-gray-200 rounded-lg p-5">
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{service.icon}</span>
                  <div>
                    <p className="font-semibold text-gray-900">{service.name}</p>
                    <p className="text-xs text-gray-500">{service.description}</p>
                  </div>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-400 mb-2">활용 영역</p>
                  <div className="flex flex-wrap gap-1.5">
                    {service.usageAreas.map((area) => (
                      <span key={area} className="inline-block px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded">
                        {area}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-gray-400 text-center mt-6">
          Neture는 콘텐츠 보관 및 안내만 제공합니다. 실제 콘텐츠 적용은 각 서비스에서 진행됩니다.
        </p>
      </div>

      {/* 취급 제품 */}
      <div className="bg-white border border-gray-200 rounded-xl p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-2">취급 제품</h2>
        <p className="text-sm text-gray-500 mb-6">
          {supplier.name}이(가) 제공하는 제품 목록입니다.
        </p>
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

                {/* 취급 요청 */}
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

      {/* ⑤ 거래 참고 정보 */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">거래 참고 정보</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">가격 정책</p>
            <p className="text-gray-800">{supplier.pricingPolicy}</p>
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 mb-1">최소 주문 수량 (MOQ)</p>
            <p className="text-gray-800">{supplier.moq}</p>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-6">
          거래 참고 정보는 변경될 수 있습니다. 정확한 조건은 공급자에게 직접 문의해 주세요.
        </p>
      </div>

      {/* Footer Notice */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center">
        <p className="text-sm text-slate-600">
          이 페이지는 공급자 소개 목적으로 제공됩니다.
        </p>
        <p className="text-xs text-slate-400 mt-1">
          Neture는 공급자와 판매자 간 연결을 돕는 역할을 합니다.
        </p>
      </div>
    </div>
  );
}

// 공급 성향 태그 생성
function getSupplyTraits(supplier: SupplierDetail): string[] {
  const traits: string[] = [];

  if (supplier.products.some((p) => p.purpose === 'ACTIVE_SALES')) {
    traits.push('현재 판매 중');
  }
  if (supplier.products.some((p) => p.purpose === 'APPLICATION')) {
    traits.push('취급 신청 가능');
  }
  if (supplier.products.length >= 5) {
    traits.push('다품목');
  }
  if (supplier.category.includes('약') || supplier.category.includes('건강')) {
    traits.push('건강/의약');
  }
  if (supplier.category.includes('화장') || supplier.category.includes('뷰티')) {
    traits.push('뷰티/화장품');
  }

  return traits.slice(0, 4);
}

// 판매자 관점 장점 생성
function getSellerBenefits(supplier: SupplierDetail): string[] {
  const benefits: string[] = [];

  benefits.push(`${supplier.category} 분야 전문 공급자`);

  if (supplier.products.length > 0) {
    benefits.push(`${supplier.products.length}개 제품 라인업 보유`);
  }

  if (supplier.products.some((p) => p.purpose === 'APPLICATION' || p.purpose === 'ACTIVE_SALES')) {
    benefits.push('취급 신청을 통한 간편한 거래 시작');
  }

  benefits.push('여러 서비스에서의 콘텐츠 활용 가능');

  if (supplier.moq) {
    benefits.push(`명확한 MOQ 정책 (${supplier.moq})`);
  }

  return benefits.slice(0, 5);
}
