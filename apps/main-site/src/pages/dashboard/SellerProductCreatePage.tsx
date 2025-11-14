/**
 * Seller Product Create Page
 * Page for importing supplier products and creating seller products
 */

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Search, Package, Check, AlertCircle, Clock, XCircle, Send } from 'lucide-react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PageHeader } from '../../components/common/PageHeader';
import { EmptyState } from '../../components/common/EmptyState';
import { sellerProductAPI } from '../../services/sellerProductApi';
import { authorizationAPI } from '../../services/authorizationApi';
import {
  SupplierProductForSelection,
  SellerProductCreateRequest,
} from '../../types/seller-product';
import { AuthorizationStatus } from '../../types/dropshipping-authorization';

export const SellerProductCreatePage: React.FC = () => {
  const navigate = useNavigate();

  // Supplier products list
  const [supplierProducts, setSupplierProducts] = useState<SupplierProductForSelection[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchInput, setSearchInput] = useState('');

  // Selected supplier product
  const [selectedProduct, setSelectedProduct] = useState<SupplierProductForSelection | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [isPublished, setIsPublished] = useState(true);
  const [creating, setCreating] = useState(false);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchQuery(searchInput);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchInput]);

  // Fetch supplier products
  useEffect(() => {
    const fetchSupplierProducts = async () => {
      setLoadingProducts(true);
      try {
        const response = await sellerProductAPI.fetchSupplierProductsForSelection({
          search: searchQuery || undefined,
          limit: 100,
        });
        setSupplierProducts(response.data.products);
      } catch (error) {
        console.error('공급상품 조회 실패:', error);
        alert('공급상품 목록을 불러오는데 실패했습니다.');
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchSupplierProducts();
  }, [searchQuery]);

  // Handle product selection
  const handleSelectProduct = (product: SupplierProductForSelection) => {
    // Only allow selection if approved
    if (product.authorization_status !== 'approved') {
      return;
    }
    setSelectedProduct(product);
    setTitle(product.title);
    setSalePrice('');
  };

  // Handle authorization request
  const handleRequestAuthorization = async (product: SupplierProductForSelection) => {
    try {
      const response = await authorizationAPI.createAuthorization({
        supplier_product_id: product.id,
        message: '이 상품을 판매하고 싶습니다.',
      });
      alert(response.message || '판매 신청이 완료되었습니다. 공급자 승인을 기다려주세요.');

      // Refresh supplier products list
      const refreshResponse = await sellerProductAPI.fetchSupplierProductsForSelection({
        search: searchQuery || undefined,
        limit: 100,
      });
      setSupplierProducts(refreshResponse.data.products);
    } catch (error) {
      console.error('판매 신청 실패:', error);
      alert('판매 신청에 실패했습니다.');
    }
  };

  // Get authorization status badge
  const getAuthorizationBadge = (status?: AuthorizationStatus) => {
    switch (status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
            <Check className="w-3 h-3" />
            승인됨
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3" />
            승인 대기중
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800">
            <XCircle className="w-3 h-3" />
            신청 거절됨
          </span>
        );
      case 'none':
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
            <AlertCircle className="w-3 h-3" />
            신청 필요
          </span>
        );
    }
  };

  // Calculate margin
  const calculateMargin = () => {
    if (!selectedProduct || !salePrice) return { amount: 0, rate: 0 };

    const salePriceNum = parseInt(salePrice);
    const supplyPrice = selectedProduct.supply_price;
    const marginAmount = salePriceNum - supplyPrice;
    const marginRate = supplyPrice > 0 ? (marginAmount / supplyPrice) * 100 : 0;

    return {
      amount: marginAmount,
      rate: marginRate,
    };
  };

  // Handle create
  const handleCreate = async () => {
    if (!selectedProduct) {
      alert('공급상품을 선택해주세요.');
      return;
    }

    if (!salePrice || parseInt(salePrice) <= 0) {
      alert('판매가를 입력해주세요.');
      return;
    }

    const salePriceNum = parseInt(salePrice);
    if (salePriceNum <= selectedProduct.supply_price) {
      alert('판매가는 공급가보다 높아야 합니다.');
      return;
    }

    setCreating(true);
    try {
      const margin = calculateMargin();

      const payload: SellerProductCreateRequest = {
        supplier_product_id: selectedProduct.id,
        title,
        sale_price: salePriceNum,
        margin_amount: margin.amount,
        margin_rate: margin.rate,
        is_published: isPublished,
      };

      const response = await sellerProductAPI.createProduct(payload);
      alert(response.message || '상품이 등록되었습니다. 판매 상품 목록에서 확인할 수 있습니다.');
      navigate('/dashboard/seller/products');
    } catch (error) {
      console.error('상품 등록 실패:', error);
      alert('상품 등록에 실패했습니다.');
    } finally {
      setCreating(false);
    }
  };

  const margin = calculateMargin();

  return (
    <>
      <Breadcrumb
        items={[
          { label: '판매자 대시보드', href: '/dashboard/seller' },
          { label: '상품 관리', href: '/dashboard/seller/products' },
          { label: '상품 가져오기', isCurrent: true },
        ]}
      />

      <PageHeader
        title="상품 가져오기"
        subtitle="공급자가 등록한 상품을 선택하여 내 판매 상품으로 등록합니다."
        actions={
          <button
            onClick={() => navigate('/dashboard/seller/products')}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            목록으로
          </button>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Supplier Product Selection */}
        <div className="bg-white rounded-lg shadow-sm">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              1. 공급 상품 선택
            </h2>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="상품명 또는 SKU 검색..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="p-4 max-h-[600px] overflow-y-auto">
            {loadingProducts ? (
              <div className="text-center py-8 text-gray-500">로딩 중...</div>
            ) : supplierProducts.length === 0 ? (
              <EmptyState
                icon={<Package className="w-12 h-12 text-gray-400" />}
                title="공급상품이 없습니다"
                description="검색 조건을 변경하거나 나중에 다시 시도해주세요."
              />
            ) : (
              <div className="space-y-3">
                {supplierProducts.map((product) => {
                  const isApproved = product.authorization_status === 'approved';
                  const isPending = product.authorization_status === 'pending';
                  const isRejected = product.authorization_status === 'rejected';
                  const isNone = !product.authorization_status || product.authorization_status === 'none';

                  return (
                    <div
                      key={product.id}
                      className={`border rounded-lg p-3 transition-all ${
                        selectedProduct?.id === product.id
                          ? 'border-blue-500 bg-blue-50'
                          : isApproved
                          ? 'border-gray-200 hover:border-blue-300 cursor-pointer'
                          : 'border-gray-200 opacity-75'
                      }`}
                      onClick={() => isApproved && handleSelectProduct(product)}
                    >
                      <div className="flex items-start gap-3">
                        {product.thumbnail_url && (
                          <img
                            src={product.thumbnail_url}
                            alt={product.title}
                            className="w-16 h-16 rounded object-cover flex-shrink-0"
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="font-medium text-gray-900 flex-1">
                              {product.title}
                            </div>
                            {getAuthorizationBadge(product.authorization_status)}
                          </div>
                          <div className="text-xs text-gray-500 mb-1">
                            SKU: {product.sku}
                          </div>
                          {product.category && (
                            <div className="text-xs text-gray-500 mb-2">
                              분류: {product.category}
                            </div>
                          )}
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium text-gray-900">
                              공급가: {product.supply_price.toLocaleString()}원
                            </div>
                            {selectedProduct?.id === product.id && isApproved && (
                              <div className="flex items-center gap-1 text-blue-600 text-sm font-medium">
                                <Check className="w-4 h-4" />
                                선택됨
                              </div>
                            )}
                          </div>

                          {/* Authorization Actions */}
                          {isNone && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleRequestAuthorization(product);
                              }}
                              className="mt-2 w-full inline-flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                              <Send className="w-4 h-4" />
                              판매 신청
                            </button>
                          )}

                          {isRejected && product.authorization_rejection_reason && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
                              <div className="font-medium mb-1">거절 사유:</div>
                              {product.authorization_rejection_reason}
                            </div>
                          )}

                          {isPending && (
                            <div className="mt-2 text-xs text-yellow-700">
                              공급자 승인을 기다리고 있습니다.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right: Sales Settings Form */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            2. 판매 설정
          </h2>

          {!selectedProduct ? (
            <div className="text-center py-12">
              <Package className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                왼쪽에서 공급상품을 선택해주세요.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Selected Product Summary */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="text-sm font-medium text-blue-900 mb-2">
                  선택된 공급상품
                </div>
                <div className="flex items-center gap-3">
                  {selectedProduct.thumbnail_url && (
                    <img
                      src={selectedProduct.thumbnail_url}
                      alt={selectedProduct.title}
                      className="w-12 h-12 rounded object-cover"
                    />
                  )}
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">
                      {selectedProduct.title}
                    </div>
                    <div className="text-xs text-gray-600">
                      SKU: {selectedProduct.sku}
                    </div>
                  </div>
                </div>
              </div>

              {/* Product Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  판매 상품명
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="상품명을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  공급상품명과 다르게 설정할 수 있습니다.
                </p>
              </div>

              {/* Supply Price (Read-only) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  공급가
                </label>
                <input
                  type="text"
                  value={`${selectedProduct.supply_price.toLocaleString()}원`}
                  disabled
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 text-gray-600"
                />
              </div>

              {/* Sale Price */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  판매가 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={salePrice}
                  onChange={(e) => setSalePrice(e.target.value)}
                  placeholder="판매가를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  공급가보다 높은 가격을 입력해주세요.
                </p>
              </div>

              {/* Margin Display */}
              {salePrice && parseInt(salePrice) > 0 && (
                <div
                  className={`p-4 border rounded-lg ${
                    margin.amount > 0
                      ? 'bg-green-50 border-green-200'
                      : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      예상 마진
                    </span>
                    <span
                      className={`text-lg font-bold ${
                        margin.amount > 0 ? 'text-green-600' : 'text-red-600'
                      }`}
                    >
                      {margin.amount.toLocaleString()}원
                    </span>
                  </div>
                  <div className="text-xs text-gray-600">
                    마진율: {margin.rate.toFixed(2)}%
                  </div>
                  {margin.amount <= 0 && (
                    <div className="text-xs text-red-600 mt-2">
                      ⚠️ 판매가가 공급가보다 낮습니다.
                    </div>
                  )}
                </div>
              )}

              {/* Published Status */}
              <div className="pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <div className="relative">
                    <input
                      type="checkbox"
                      checked={isPublished}
                      onChange={(e) => setIsPublished(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:bg-blue-600 peer-focus:ring-4 peer-focus:ring-blue-300 transition-colors"></div>
                    <div className="absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform peer-checked:translate-x-5"></div>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-700">
                      {isPublished ? '판매 중' : '비공개'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {isPublished
                        ? '고객에게 노출됩니다.'
                        : '고객에게 노출되지 않습니다.'}
                    </div>
                  </div>
                </label>
              </div>

              {/* Actions */}
              <div className="pt-4 border-t border-gray-200 space-y-2">
                <button
                  onClick={handleCreate}
                  disabled={
                    creating ||
                    !selectedProduct ||
                    !salePrice ||
                    parseInt(salePrice) <= selectedProduct.supply_price
                  }
                  className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                >
                  {creating ? '등록 중...' : '등록하기'}
                </button>
                <button
                  onClick={() => navigate('/dashboard/seller/products')}
                  className="w-full px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default SellerProductCreatePage;
