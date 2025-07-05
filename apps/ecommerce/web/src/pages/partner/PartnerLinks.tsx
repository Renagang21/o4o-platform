import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { usePartnerStore } from '../../store/partnerStore';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  images?: Array<{ url: string }>;
}

const PartnerLinks: React.FC = () => {
  const { 
    partner,
    referralLinks,
    loading,
    error,
    generateReferralLink,
    getReferralLinks,
    clearError
  } = usePartnerStore();

  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');

  // 제품 목록 로드
  useEffect(() => {
    const fetchProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await fetch('/store/products');
        if (response.ok) {
          const data = await response.json();
          setProducts(data.products || []);
        }
      } catch (err) {
        console.error('제품 목록 로드 실패:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchProducts();
    
    // 기존 추천 링크 로드
    if (partner) {
      getReferralLinks();
    }
  }, [partner]);

  // 에러 자동 클리어
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => clearError(), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const handleGenerateLink = async (product: Product) => {
    try {
      const newLink = await generateReferralLink(product.id);
      setGeneratedLink(newLink.referralUrl);
      setSelectedProduct(product);
      setShowLinkModal(true);
    } catch (err) {
      console.error('링크 생성 실패:', err);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      alert('링크가 클립보드에 복사되었습니다!');
    } catch (err) {
      console.error('복사 실패:', err);
      alert('복사에 실패했습니다.');
    }
  };

  if (!partner) {
    return (
      <div className="max-w-2xl mx-auto mt-20 p-8 bg-white rounded-lg shadow-lg text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">파트너 인증이 필요합니다</h2>
        <Link
          to="/partner/apply"
          className="bg-blue-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-blue-700 transition"
        >
          파트너 신청하기
        </Link>
      </div>
    );
  }
  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">추천 링크 관리</h1>
              <p className="text-gray-600">제품을 선택하고 추천 링크를 생성하세요</p>
            </div>
            <Link
              to="/partner/dashboard"
              className="bg-gray-600 text-white px-4 py-2 rounded-lg font-medium hover:bg-gray-700 transition"
            >
              ← 대시보드
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 에러 메시지 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
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

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* 제품 목록 */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">제품 선택</h2>
                <p className="text-sm text-gray-600">추천하고 싶은 제품을 선택하세요</p>
              </div>
              
              <div className="p-6">
                {loadingProducts ? (
                  <div className="flex justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : products.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {products.map((product) => (
                      <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                        {product.images?.[0] && (
                          <img
                            src={product.images[0].url}
                            alt={product.title}
                            className="w-full h-48 object-cover rounded-lg mb-3"
                          />
                        )}
                        <h3 className="font-medium text-gray-900 mb-2">{product.title}</h3>
                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">{product.description}</p>
                        <div className="flex justify-between items-center">
                          <span className="text-lg font-bold text-blue-600">
                            ₩{product.price.toLocaleString()}
                          </span>
                          <button
                            onClick={() => handleGenerateLink(product)}
                            disabled={loading.links}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                          >
                            {loading.links ? '생성 중...' : '링크 생성'}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-12">등록된 제품이 없습니다.</p>
                )}
              </div>
            </div>
          </div>
          {/* 기존 링크 목록 */}
          <div>
            <div className="bg-white rounded-lg shadow">
              <div className="px-6 py-4 border-b border-gray-200">
                <h2 className="text-lg font-medium text-gray-900">내 추천 링크</h2>
                <p className="text-sm text-gray-600">생성된 링크들을 관리하세요</p>
              </div>
              
              <div className="p-6">
                {loading.links ? (
                  <div className="flex justify-center py-8">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                  </div>
                ) : referralLinks.length > 0 ? (
                  <div className="space-y-4">
                    {referralLinks.map((link) => (
                      <div key={link.id} className="border border-gray-200 rounded-lg p-4">
                        <h4 className="font-medium text-gray-900 mb-2">{link.productName}</h4>
                        <div className="space-y-2 text-sm text-gray-600">
                          <div className="flex justify-between">
                            <span>클릭수:</span>
                            <span className="font-medium">{link.clicks}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>전환수:</span>
                            <span className="font-medium">{link.conversions}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>전환율:</span>
                            <span className="font-medium text-blue-600">
                              {link.clicks > 0 ? ((link.conversions / link.clicks) * 100).toFixed(1) : '0.0'}%
                            </span>
                          </div>
                        </div>
                        <div className="mt-3 flex space-x-2">
                          <button
                            onClick={() => copyToClipboard(link.referralUrl)}
                            className="flex-1 bg-gray-100 text-gray-700 px-3 py-2 rounded text-sm font-medium hover:bg-gray-200 transition"
                          >
                            복사
                          </button>
                          <a
                            href={link.referralUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm font-medium text-center hover:bg-blue-200 transition"
                          >
                            미리보기
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-8">아직 생성된 링크가 없습니다.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 링크 생성 완료 모달 */}
      {showLinkModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full p-6">
            <div className="flex items-center mb-4">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-medium text-gray-900">링크 생성 완료!</h3>
                <p className="text-gray-600">{selectedProduct.title}</p>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">추천 링크</label>
              <div className="flex">
                <input
                  type="text"
                  value={generatedLink}
                  readOnly
                  className="flex-1 border border-gray-300 rounded-l-lg px-3 py-2 bg-gray-50"
                />
                <button
                  onClick={() => copyToClipboard(generatedLink)}
                  className="bg-blue-600 text-white px-4 py-2 rounded-r-lg hover:bg-blue-700 transition"
                >
                  복사
                </button>
              </div>
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowLinkModal(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition"
              >
                닫기
              </button>
              <a
                href={generatedLink}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                링크 확인
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PartnerLinks;