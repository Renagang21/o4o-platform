import React, { useState, useEffect } from 'react';
import { X, Save, Store, Mail, Phone, Building, Key, Globe, Shield, Info } from 'lucide-react';
import { dropshippingAPI } from '../../api/dropshipping-cpt';
import { toast } from 'react-hot-toast';

interface SupplierFormProps {
  supplier?: any;
  onClose: () => void;
}

const SupplierForm: React.FC<SupplierFormProps> = ({ supplier, onClose }) => {
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    acf: {
      supplier_email: '',
      supplier_phone: '',
      supplier_business_number: '',
      supplier_api_key: '',
      supplier_api_endpoint: ''
    }
  });

  const [saving, setSaving] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);

  useEffect(() => {
    if (supplier) {
      setFormData({
        title: supplier.title || '',
        content: supplier.content || '',
        acf: {
          supplier_email: supplier.acf?.supplier_email || '',
          supplier_phone: supplier.acf?.supplier_phone || '',
          supplier_business_number: supplier.acf?.supplier_business_number || '',
          supplier_api_key: supplier.acf?.supplier_api_key || '',
          supplier_api_endpoint: supplier.acf?.supplier_api_endpoint || ''
        }
      });
    }
  }, [supplier]);

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast.error('공급자명을 입력해주세요');
      return;
    }

    if (!formData.acf.supplier_email) {
      toast.error('이메일 주소를 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      let response;
      if (supplier) {
        response = await dropshippingAPI.updateSupplier(supplier.id, formData);
      } else {
        response = await dropshippingAPI.createSupplier(formData);
      }

      if (response.success) {
        toast.success(supplier ? '공급자 정보가 수정되었습니다' : '공급자가 등록되었습니다');
        onClose();
      }
    } catch (error) {
      console.error('Failed to save supplier:', error);
      toast.error('공급자 저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const formatBusinessNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format as XXX-XX-XXXXX
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 5) return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 5)}-${numbers.slice(5, 10)}`;
  };

  const formatPhoneNumber = (value: string) => {
    // Remove all non-numeric characters
    const numbers = value.replace(/\D/g, '');
    
    // Format as XXX-XXXX-XXXX or XX-XXXX-XXXX
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 7) {
      if (numbers.startsWith('02')) {
        return `${numbers.slice(0, 2)}-${numbers.slice(2)}`;
      }
      return `${numbers.slice(0, 3)}-${numbers.slice(3)}`;
    }
    if (numbers.startsWith('02')) {
      return `${numbers.slice(0, 2)}-${numbers.slice(2, 6)}-${numbers.slice(6, 10)}`;
    }
    return `${numbers.slice(0, 3)}-${numbers.slice(3, 7)}-${numbers.slice(7, 11)}`;
  };

  return (
    <div className="fixed inset-0 bg-gray-50 z-50 overflow-y-auto">
      <div className="max-w-7xl mx-auto p-6">
        {/* WordPress Style Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-normal text-gray-900">
            {supplier ? '공급자 편집' : '새 공급자 추가'}
          </h1>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content Area */}
          <div className="lg:col-span-2">
            {/* Title Box */}
            <div className="bg-white border border-gray-300 rounded-lg mb-4">
              <div className="p-4">
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2 text-xl border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                  placeholder="공급자명을 입력하세요"
                />
              </div>
            </div>

            {/* Basic Information Box */}
            <div className="bg-white border border-gray-300 rounded-lg mb-4">
              <div className="border-b border-gray-300 px-4 py-2 bg-gray-50">
                <h3 className="text-sm font-medium flex items-center">
                  <Building className="h-4 w-4 mr-2" />
                  기본 정보
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    이메일 <span className="text-red-500">*</span>
                  </label>
                  <div className="flex items-center space-x-2">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      value={formData.acf.supplier_email}
                      onChange={(e) => setFormData({
                        ...formData,
                        acf: { ...formData.acf, supplier_email: e.target.value }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                      placeholder="supplier@example.com"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    연락처
                  </label>
                  <div className="flex items-center space-x-2">
                    <Phone className="h-4 w-4 text-gray-400" />
                    <input
                      type="tel"
                      value={formData.acf.supplier_phone}
                      onChange={(e) => setFormData({
                        ...formData,
                        acf: { ...formData.acf, supplier_phone: formatPhoneNumber(e.target.value) }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                      placeholder="010-0000-0000"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    사업자등록번호
                  </label>
                  <div className="flex items-center space-x-2">
                    <Shield className="h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.acf.supplier_business_number}
                      onChange={(e) => setFormData({
                        ...formData,
                        acf: { ...formData.acf, supplier_business_number: formatBusinessNumber(e.target.value) }
                      })}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                      placeholder="000-00-00000"
                      maxLength={12}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Description Box */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="border-b border-gray-300 px-4 py-2 bg-gray-50">
                <span className="text-sm font-medium text-gray-700">설명</span>
              </div>
              <div className="p-4">
                <textarea
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                  placeholder="공급자에 대한 상세 정보를 입력하세요..."
                />
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1 space-y-4">
            {/* Publish Box */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="border-b border-gray-300 px-3 py-2 bg-gray-50">
                <h3 className="text-sm font-medium">공개</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">상태:</span>
                  <strong>공개</strong>
                </div>
              </div>
              <div className="border-t border-gray-300 px-4 py-3 bg-gray-50 flex justify-between">
                <button
                  onClick={onClose}
                  className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-1 bg-wordpress-blue text-white text-sm rounded hover:bg-wordpress-blue-hover disabled:opacity-50"
                >
                  {saving ? '저장 중...' : (supplier ? '업데이트' : '공개')}
                </button>
              </div>
            </div>

            {/* API Integration Box */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="border-b border-gray-300 px-3 py-2 bg-gray-50">
                <h3 className="text-sm font-medium flex items-center">
                  <Globe className="h-4 w-4 mr-2" />
                  API 연동
                </h3>
              </div>
              <div className="p-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Endpoint
                  </label>
                  <input
                    type="url"
                    value={formData.acf.supplier_api_endpoint}
                    onChange={(e) => setFormData({
                      ...formData,
                      acf: { ...formData.acf, supplier_api_endpoint: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                    placeholder="https://api.supplier.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? 'text' : 'password'}
                      value={formData.acf.supplier_api_key}
                      onChange={(e) => setFormData({
                        ...formData,
                        acf: { ...formData.acf, supplier_api_key: e.target.value }
                      })}
                      className="w-full px-3 py-2 pr-20 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                      placeholder="API 키를 입력하세요"
                    />
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-2 top-2 px-2 py-1 text-xs text-gray-600 hover:text-gray-800"
                    >
                      {showApiKey ? '숨기기' : '보기'}
                    </button>
                  </div>
                </div>

                {/* API Status */}
                {formData.acf.supplier_api_key && formData.acf.supplier_api_endpoint ? (
                  <div className="p-3 bg-green-50 border border-green-200 rounded">
                    <p className="text-sm text-green-800">
                      <strong>API 연동 설정됨</strong>
                    </p>
                    <p className="text-xs text-green-600 mt-1">
                      주문 시 자동으로 API를 통해 처리됩니다
                    </p>
                  </div>
                ) : (
                  <div className="p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <p className="text-sm text-yellow-800">
                      <strong>API 미연동</strong>
                    </p>
                    <p className="text-xs text-yellow-600 mt-1">
                      수동으로 주문을 처리해야 합니다
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-white border border-gray-300 rounded-lg">
              <div className="border-b border-gray-300 px-3 py-2 bg-gray-50">
                <h3 className="text-sm font-medium flex items-center">
                  <Info className="h-4 w-4 mr-2" />
                  도움말
                </h3>
              </div>
              <div className="p-4 text-xs text-gray-600 space-y-2">
                <p>• 공급자 정보는 상품 관리에 연결됩니다</p>
                <p>• API 연동 시 자동 주문 처리가 가능합니다</p>
                <p>• 사업자등록번호는 정산 시 필요합니다</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SupplierForm;