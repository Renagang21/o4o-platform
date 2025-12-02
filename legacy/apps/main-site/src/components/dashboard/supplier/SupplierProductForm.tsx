/**
 * Supplier Product Form
 * Reusable form component for creating and editing products
 */

import React, { useState, useEffect } from 'react';
import { Save, X } from 'lucide-react';
import {
  SupplierProductFormValues,
  SupplierProductFormErrors,
  SupplierProductStatus,
  SupplierProductDetail,
} from '../../../types/supplier-product';

export interface SupplierProductFormProps {
  initialValues?: SupplierProductDetail;
  onSubmit: (values: SupplierProductFormValues) => Promise<void>;
  onCancel: () => void;
  isEdit?: boolean;
}

export const SupplierProductForm: React.FC<SupplierProductFormProps> = ({
  initialValues,
  onSubmit,
  onCancel,
  isEdit = false,
}) => {
  // Form state
  const [formValues, setFormValues] = useState<SupplierProductFormValues>({
    sku: '',
    name: '',
    description: '',
    category: '',
    price: 0,
    costPrice: 0,
    stock: 0,
    minStock: 0,
    unit: 'kg',
    status: SupplierProductStatus.ACTIVE,
    tags: [],
    specifications: {},
  });

  // Form errors
  const [errors, setErrors] = useState<SupplierProductFormErrors>({});

  // Submission state
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form with initial values if editing
  useEffect(() => {
    if (initialValues) {
      setFormValues({
        sku: initialValues.sku,
        name: initialValues.name,
        description: initialValues.description,
        category: initialValues.category,
        price: initialValues.price,
        costPrice: initialValues.costPrice,
        stock: initialValues.stock,
        minStock: initialValues.minStock,
        unit: initialValues.unit,
        status: initialValues.status,
        tags: initialValues.tags,
        specifications: initialValues.specifications,
      });
    }
  }, [initialValues]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: SupplierProductFormErrors = {};

    if (!formValues.sku.trim()) {
      newErrors.sku = 'SKU를 입력해주세요.';
    }
    if (!formValues.name.trim()) {
      newErrors.name = '제품명을 입력해주세요.';
    }
    if (!formValues.description.trim()) {
      newErrors.description = '제품 설명을 입력해주세요.';
    }
    if (!formValues.category.trim()) {
      newErrors.category = '카테고리를 선택해주세요.';
    }
    if (formValues.price <= 0) {
      newErrors.price = '판매가를 입력해주세요.';
    }
    if (formValues.costPrice <= 0) {
      newErrors.costPrice = '원가를 입력해주세요.';
    }
    if (formValues.stock < 0) {
      newErrors.stock = '재고는 0 이상이어야 합니다.';
    }
    if (formValues.minStock < 0) {
      newErrors.minStock = '최소 재고는 0 이상이어야 합니다.';
    }
    if (!formValues.unit.trim()) {
      newErrors.unit = '단위를 입력해주세요.';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      await onSubmit(formValues);
    } catch (error) {
      console.error('Form submission error:', error);
      alert('제품 저장에 실패했습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle input change
  const handleChange = (
    field: keyof SupplierProductFormValues,
    value: any
  ) => {
    setFormValues({ ...formValues, [field]: value });
    // Clear error for this field
    if (errors[field as keyof SupplierProductFormErrors]) {
      setErrors({ ...errors, [field]: undefined });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          기본 정보
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              SKU <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formValues.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.sku ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="PROD-001"
            />
            {errors.sku && (
              <p className="mt-1 text-sm text-red-500">{errors.sku}</p>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제품명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formValues.name}
              onChange={(e) => handleChange('name', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.name ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="프리미엄 유기농 쌀"
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              카테고리 <span className="text-red-500">*</span>
            </label>
            <select
              value={formValues.category}
              onChange={(e) => handleChange('category', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.category ? 'border-red-500' : 'border-gray-300'
              }`}
            >
              <option value="">선택하세요</option>
              <option value="식품">식품</option>
              <option value="채소">채소</option>
              <option value="과일">과일</option>
              <option value="축산">축산</option>
              <option value="수산">수산</option>
            </select>
            {errors.category && (
              <p className="mt-1 text-sm text-red-500">{errors.category}</p>
            )}
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태 <span className="text-red-500">*</span>
            </label>
            <select
              value={formValues.status}
              onChange={(e) =>
                handleChange('status', e.target.value as SupplierProductStatus)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value={SupplierProductStatus.ACTIVE}>판매중</option>
              <option value={SupplierProductStatus.INACTIVE}>비활성</option>
              <option value={SupplierProductStatus.OUT_OF_STOCK}>품절</option>
              <option value={SupplierProductStatus.DISCONTINUED}>단종</option>
            </select>
          </div>

          {/* Description (full width) */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              제품 설명 <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formValues.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="제품에 대한 자세한 설명을 입력해주세요."
            />
            {errors.description && (
              <p className="mt-1 text-sm text-red-500">{errors.description}</p>
            )}
          </div>
        </div>
      </div>

      {/* Pricing and Inventory */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          가격 및 재고
        </h3>

        <div className="grid grid-cols-2 gap-4">
          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              판매가 (원) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formValues.price}
              onChange={(e) => handleChange('price', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.price ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="25000"
            />
            {errors.price && (
              <p className="mt-1 text-sm text-red-500">{errors.price}</p>
            )}
          </div>

          {/* Cost Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              원가 (원) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formValues.costPrice}
              onChange={(e) =>
                handleChange('costPrice', Number(e.target.value))
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.costPrice ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="18000"
            />
            {errors.costPrice && (
              <p className="mt-1 text-sm text-red-500">{errors.costPrice}</p>
            )}
          </div>

          {/* Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              재고 수량 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formValues.stock}
              onChange={(e) => handleChange('stock', Number(e.target.value))}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.stock ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="150"
            />
            {errors.stock && (
              <p className="mt-1 text-sm text-red-500">{errors.stock}</p>
            )}
          </div>

          {/* Min Stock */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              최소 재고 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0"
              value={formValues.minStock}
              onChange={(e) =>
                handleChange('minStock', Number(e.target.value))
              }
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.minStock ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="20"
            />
            {errors.minStock && (
              <p className="mt-1 text-sm text-red-500">{errors.minStock}</p>
            )}
          </div>

          {/* Unit */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              단위 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formValues.unit}
              onChange={(e) => handleChange('unit', e.target.value)}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                errors.unit ? 'border-red-500' : 'border-gray-300'
              }`}
              placeholder="kg, 개, 박스 등"
            />
            {errors.unit && (
              <p className="mt-1 text-sm text-red-500">{errors.unit}</p>
            )}
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="w-4 h-4 inline mr-2" />
          취소
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-4 h-4 inline mr-2" />
          {isSubmitting ? '저장 중...' : isEdit ? '수정하기' : '등록하기'}
        </button>
      </div>
    </form>
  );
};

export default SupplierProductForm;
