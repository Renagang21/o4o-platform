import React, { useState, useEffect } from 'react';
import { X, Save, Calculator, Package, Truck, DollarSign } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';

interface ProductEditorProps {
  product?: any;
  onClose: () => void;
}

const ProductEditor: React.FC<ProductEditorProps> = ({ product, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    acf: {
      cost_price: 0,
      selling_price: 0,
      margin_rate: '0',
      can_modify_price: true,
      supplier: '',
      supplier_sku: '',
      shipping_days_min: 3,
      shipping_days_max: 7,
      shipping_fee: 0
    }
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (product) {
      setFormData({
        title: product.title || '',
        content: product.content || '',
        excerpt: product.excerpt || '',
        acf: {
          cost_price: product.acf?.cost_price || 0,
          selling_price: product.acf?.selling_price || 0,
          margin_rate: product.acf?.margin_rate || '0',
          can_modify_price: product.acf?.can_modify_price ?? true,
          supplier: product.acf?.supplier || '',
          supplier_sku: product.acf?.supplier_sku || '',
          shipping_days_min: product.acf?.shipping_days_min || 3,
          shipping_days_max: product.acf?.shipping_days_max || 7,
          shipping_fee: product.acf?.shipping_fee || 0
        }
      });
    }
  }, [product]);

  // Auto-calculate margin when prices change
  useEffect(() => {
    calculateMargin();
  }, [formData.acf.cost_price, formData.acf.selling_price]);

  const calculateMargin = () => {
    const costPrice = Number(formData.acf.cost_price) || 0;
    const sellingPrice = Number(formData.acf.selling_price) || 0;
    
    let marginRate = '0';
    if (sellingPrice > 0) {
      marginRate = ((sellingPrice - costPrice) / sellingPrice * 100).toFixed(2);
    }
    
    setFormData(prev => ({
      ...prev,
      acf: {
        ...prev.acf,
        margin_rate: marginRate
      }
    }));
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('상품명을 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      let response;
      if (product) {
        response = await dropshippingAPI.updateProduct(product.id, formData);
      } else {
        response = await dropshippingAPI.createProduct(formData);
      }

      if (response.success) {
        toast.success(product ? '상품이 수정되었습니다' : '상품이 등록되었습니다');
        onClose();
      }
    } catch (error) {
      
      toast.error('상품 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const getMarginColor = () => {
    const rate = parseFloat(formData.acf.margin_rate);
    if (rate < 10) return 'bg-red-50 border-red-200 text-red-900';
    if (rate < 20) return 'bg-yellow-50 border-yellow-200 text-yellow-900';
    return 'bg-green-50 border-green-200 text-green-900';
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('ko-KR').format(value);
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {product ? '상품 편집' : '새 상품 추가'}
          </h1>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상품명
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="상품명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    간단 설명
                  </label>
                  <input
                    type="text"
                    value={formData.excerpt}
                    onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="간단한 상품 설명"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    상세 설명
                  </label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    rows={8}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="상품 상세 설명을 입력하세요"
                  />
                </div>
              </div>
            </div>

            {/* Supplier Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                공급자 정보
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    공급자
                  </label>
                  <input
                    type="text"
                    value={formData.acf.supplier}
                    onChange={(e) => setFormData({
                      ...formData,
                      acf: { ...formData.acf, supplier: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="공급자명"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    공급자 상품코드
                  </label>
                  <input
                    type="text"
                    value={formData.acf.supplier_sku}
                    onChange={(e) => setFormData({
                      ...formData,
                      acf: { ...formData.acf, supplier_sku: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                    placeholder="SUP-12345"
                  />
                </div>
              </div>
            </div>

            {/* Shipping Info */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Truck className="h-5 w-5 mr-2" />
                배송 정보
              </h2>
              
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최소 배송일
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.acf.shipping_days_min}
                      onChange={(e) => setFormData({
                        ...formData,
                        acf: { ...formData.acf, shipping_days_min: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max="30"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500">일</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    최대 배송일
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={formData.acf.shipping_days_max}
                      onChange={(e) => setFormData({
                        ...formData,
                        acf: { ...formData.acf, shipping_days_max: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      min="1"
                      max="30"
                    />
                    <span className="absolute right-3 top-2.5 text-gray-500">일</span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    배송비
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₩</span>
                    <input
                      type="number"
                      value={formData.acf.shipping_fee}
                      onChange={(e) => setFormData({
                        ...formData,
                        acf: { ...formData.acf, shipping_fee: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="500"
                    />
                  </div>
                  {formData.acf.shipping_fee === 0 && (
                    <p className="text-sm text-green-600 mt-1">무료배송</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar - Pricing */}
          <div className="lg:col-span-1 space-y-6">
            {/* Price & Margin Calculator */}
            <div className="bg-white rounded-lg shadow p-6 sticky top-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                가격 정보
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    공급가
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₩</span>
                    <input
                      type="number"
                      value={formData.acf.cost_price}
                      onChange={(e) => setFormData({
                        ...formData,
                        acf: { ...formData.acf, cost_price: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    판매가
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-gray-500">₩</span>
                    <input
                      type="number"
                      value={formData.acf.selling_price}
                      onChange={(e) => setFormData({
                        ...formData,
                        acf: { ...formData.acf, selling_price: parseInt(e.target.value) || 0 }
                      })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                      min="0"
                      step="1000"
                    />
                  </div>
                </div>

                {/* Margin Display */}
                <div className={`p-4 rounded-lg border ${getMarginColor()}`}>
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-medium">마진율</span>
                    <span className="text-2xl font-bold">{formData.acf.margin_rate}%</span>
                  </div>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>수익금:</span>
                      <span className="font-medium">
                        ₩{formatCurrency(formData.acf.selling_price - formData.acf.cost_price)}
                      </span>
                    </div>
                    <div className="text-xs opacity-75">
                      계산식: (판매가 - 공급가) / 판매가 × 100
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id="can_modify_price"
                    checked={formData.acf.can_modify_price}
                    onChange={(e) => setFormData({
                      ...formData,
                      acf: { ...formData.acf, can_modify_price: e.target.checked }
                    })}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="can_modify_price" className="text-sm text-gray-700">
                    파트너가 판매가를 수정할 수 있음
                  </label>
                </div>
              </div>

              {/* Save Button */}
              <div className="mt-6 pt-6 border-t">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full flex items-center justify-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  <Save className="h-5 w-5 mr-2" />
                  {saving ? '저장 중...' : (product ? '수정하기' : '등록하기')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductEditor;