/**
 * Shipping Address Form Component
 * R-6-8: Handles shipping address input with validation
 */

import React from 'react';
import { MapPin, Home } from 'lucide-react';

export interface ShippingAddress {
  postcode: string;
  address: string;
  address_detail?: string;
}

interface ShippingAddressFormProps {
  value: ShippingAddress;
  onChange: (value: ShippingAddress) => void;
  orderNote?: string;
  onOrderNoteChange?: (note: string) => void;
  errors?: Partial<Record<keyof ShippingAddress, string>>;
}

export const ShippingAddressForm: React.FC<ShippingAddressFormProps> = ({
  value,
  onChange,
  orderNote = '',
  onOrderNoteChange,
  errors = {},
}) => {
  const handleChange = (field: keyof ShippingAddress, fieldValue: string) => {
    onChange({ ...value, [field]: fieldValue });
  };

  return (
    <div className="space-y-6">
      {/* Shipping Address */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5" />
          배송 주소
        </h2>

        <div className="space-y-4">
          {/* Postcode */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              우편번호 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={value.postcode}
              onChange={(e) => handleChange('postcode', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.postcode ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="12345"
              required
            />
            {errors.postcode && (
              <p className="mt-1 text-sm text-red-600">{errors.postcode}</p>
            )}
          </div>

          {/* Main Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              주소 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={value.address}
              onChange={(e) => handleChange('address', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.address ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="서울시 강남구 테헤란로"
              required
            />
            {errors.address && (
              <p className="mt-1 text-sm text-red-600">{errors.address}</p>
            )}
          </div>

          {/* Detail Address */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상세 주소
            </label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                <Home className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={value.address_detail || ''}
                onChange={(e) => handleChange('address_detail', e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors"
                placeholder="101동 202호"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Delivery Note */}
      {onOrderNoteChange && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">
            배송 요청사항
          </h2>
          <textarea
            value={orderNote}
            onChange={(e) => onOrderNoteChange(e.target.value)}
            rows={3}
            placeholder="배송 시 요청사항을 입력해주세요."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-colors"
          />
        </div>
      )}
    </div>
  );
};

export default ShippingAddressForm;
