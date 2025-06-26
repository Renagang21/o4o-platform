import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { useProductStore } from '../../stores/productStore';
import { useAuthStore } from '../../stores/authStore';
import { ProductFormData } from '../../types/product';

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  
  const { 
    createProduct, 
    updateProduct, 
    fetchProduct, 
    currentProduct, 
    flatCategories,
    isLoading,
    error,
    clearError
  } = useProductStore();
  
  const { user } = useAuthStore();
  
  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ProductFormData>({
    defaultValues: {
      pricing: {
        gold: 0,
        premium: 0,
        vip: 0,
      },
      categories: [],
      images: [],
      specifications: {},
      minOrderQuantity: 1,
    },
  });

  // Handle specifications as key-value pairs
  const [specifications, setSpecifications] = useState<{[key: string]: string}>({});

  // Handle images as array of strings
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  const [specKey, setSpecKey] = useState('');
  const [specValue, setSpecValue] = useState('');
  const [imageUrl, setImageUrl] = useState('');

  const basePrice = watch('basePrice');

  useEffect(() => {
    if (isEdit && id) {
      fetchProduct(id);
    }
  }, [isEdit, id]);

  useEffect(() => {
    if (isEdit && currentProduct) {
      reset({
        name: currentProduct.name,
        description: currentProduct.description,
        shortDescription: currentProduct.shortDescription,
        basePrice: currentProduct.basePrice,
        stockQuantity: currentProduct.stockQuantity,
        minOrderQuantity: currentProduct.minOrderQuantity,
        maxOrderQuantity: currentProduct.maxOrderQuantity,
        categories: currentProduct.categories,
        pricing: currentProduct.pricing,
        brand: currentProduct.brand,
        model: currentProduct.model,
        weight: currentProduct.weight,
        dimensions: currentProduct.dimensions,
        images: currentProduct.images,
        specifications: currentProduct.specifications,
      });
    }
  }, [currentProduct, isEdit, reset]);

  // 기본가 변경 시 할인가 자동 계산
  useEffect(() => {
    if (basePrice && basePrice > 0) {
      setValue('pricing.gold', basePrice);
      setValue('pricing.premium', Math.round(basePrice * 0.95)); // 5% 할인
      setValue('pricing.vip', Math.round(basePrice * 0.9)); // 10% 할인
    }
  }, [basePrice, setValue]);

  const onSubmit = async (data: ProductFormData) => {
    try {
      clearError();
      
      if (isEdit && id) {
        await updateProduct(id, data);
        toast.success('상품이 수정되었습니다.');
      } else {
        await createProduct({
          ...data,
          supplierId: user?.id || '',
        });
        toast.success('상품이 등록되었습니다.');
      }
      
      navigate('/supplier/products');
    } catch (err) {
      toast.error('상품 저장에 실패했습니다.');
    }
  };

  const addSpecification = () => {
    if (specKey && specValue) {
      const currentSpecs = watch('specifications') || {};
      setValue('specifications', {
        ...currentSpecs,
        [specKey]: specValue,
      });
      setSpecKey('');
      setSpecValue('');
    }
  };

  const removeSpecification = (key: string) => {
    const currentSpecs = watch('specifications') || {};
    const newSpecs = { ...currentSpecs };
    delete newSpecs[key];
    setValue('specifications', newSpecs);
  };

  const addImage = () => {
    if (imageUrl) {
      const currentImages = watch('images') || [];
      setValue('images', [...currentImages, imageUrl]);
      setImageUrl('');
    }
  };

  const watchedSpecifications = watch('specifications') || {};

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <h1 className="text-3xl font-bold text-gray-900">
              {isEdit ? '상품 수정' : '새 상품 등록'}
            </h1>
            <button
              onClick={() => navigate('/supplier/products')}
              className="text-gray-600 hover:text-gray-900"
            >
              ← 목록으로
            </button>
          </div>
        </div>
      </header>

      {/* 폼 */}
      <main className="max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
          {/* 기본 정보 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">기본 정보</h3>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  상품명 *
                </label>
                <input
                  {...register('name', { required: '상품명을 입력하세요' })}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="상품명을 입력하세요"
                />
                {errors.name && <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  브랜드
                </label>
                <input
                  {...register('brand')}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="브랜드명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  모델명
                </label>
                <input
                  {...register('model')}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="모델명"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  카테고리 *
                </label>
                <select
                  {...register('categories.0', { required: '카테고리를 선택하세요' })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="">카테고리 선택</option>
                  {flatCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.level === 2 ? `${category.name}` : category.name}
                    </option>
                  ))}
                </select>
                {errors.categories?.[0] && <p className="text-red-500 text-sm mt-1">{errors.categories[0].message}</p>}
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">
                간단 설명 *
              </label>
              <input
                {...register('shortDescription', { required: '간단 설명을 입력하세요' })}
                type="text"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="상품의 핵심 특징을 간단히 설명하세요"
              />
              {errors.shortDescription && <p className="text-red-500 text-sm mt-1">{errors.shortDescription.message}</p>}
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700">
                상세 설명 *
              </label>
              <textarea
                {...register('description', { required: '상세 설명을 입력하세요' })}
                rows={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="상품에 대한 자세한 설명을 입력하세요"
              />
              {errors.description && <p className="text-red-500 text-sm mt-1">{errors.description.message}</p>}
            </div>
          </div>

          {/* 가격 및 재고 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">가격 및 재고</h3>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  기본가 (원) *
                </label>
                <input
                  {...register('basePrice', { 
                    required: '기본가를 입력하세요',
                    min: { value: 1, message: '가격은 1원 이상이어야 합니다' }
                  })}
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0"
                />
                {errors.basePrice && <p className="text-red-500 text-sm mt-1">{errors.basePrice.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  재고수량 *
                </label>
                <input
                  {...register('stockQuantity', { 
                    required: '재고수량을 입력하세요',
                    min: { value: 0, message: '재고는 0개 이상이어야 합니다' }
                  })}
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0"
                />
                {errors.stockQuantity && <p className="text-red-500 text-sm mt-1">{errors.stockQuantity.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  최소주문수량 *
                </label>
                <input
                  {...register('minOrderQuantity', { 
                    required: '최소주문수량을 입력하세요',
                    min: { value: 1, message: '최소주문수량은 1개 이상이어야 합니다' }
                  })}
                  type="number"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="1"
                />
                {errors.minOrderQuantity && <p className="text-red-500 text-sm mt-1">{errors.minOrderQuantity.message}</p>}
              </div>
            </div>

            {/* 등급별 가격 */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">리테일러 등급별 가격</h4>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Gold 가격 (원)
                  </label>
                  <input
                    {...register('pricing.gold', { 
                      required: 'Gold 가격을 입력하세요',
                      min: { value: 1, message: '가격은 1원 이상이어야 합니다' }
                    })}
                    type="number"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Premium 가격 (원)
                  </label>
                  <input
                    {...register('pricing.premium', { 
                      required: 'Premium 가격을 입력하세요',
                      min: { value: 1, message: '가격은 1원 이상이어야 합니다' }
                    })}
                    type="number"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    VIP 가격 (원)
                  </label>
                  <input
                    {...register('pricing.vip', { 
                      required: 'VIP 가격을 입력하세요',
                      min: { value: 1, message: '가격은 1원 이상이어야 합니다' }
                    })}
                    type="number"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* 상품 이미지 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">상품 이미지</h3>
            
            <div className="flex space-x-2 mb-4">
              <input
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                type="url"
                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="이미지 URL을 입력하세요"
              />
              <button
                type="button"
                onClick={addImage}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                추가
              </button>
            </div>

            <div className="space-y-2">
              {watch('images')?.map((url, index) => (
                <div key={index} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                  <img src={url} alt="" className="w-16 h-16 object-cover rounded" onError={(e) => {
                    e.currentTarget.src = '/images/placeholder.jpg';
                  }} />
                  <span className="flex-1 text-sm text-gray-600 truncate">{url}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const images = watch('images') || [];
                      setValue('images', images.filter((_, i) => i !== index));
                    }}
                    className="text-red-600 hover:text-red-800"
                  >
                    삭제
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* 상품 규격 */}
          <div className="bg-white shadow rounded-lg p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-6">상품 규격</h3>
            
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  무게 (kg)
                </label>
                <input
                  {...register('weight')}
                  type="number"
                  step="0.01"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  크기 (가로x세로x높이)
                </label>
                <input
                  {...register('dimensions')}
                  type="text"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="예: 100 x 50 x 30mm"
                />
              </div>
            </div>

            {/* 상세 스펙 */}
            <div className="mt-6">
              <h4 className="text-md font-medium text-gray-900 mb-4">상세 스펙</h4>
              
              <div className="flex space-x-2 mb-4">
                <input
                  value={specKey}
                  onChange={(e) => setSpecKey(e.target.value)}
                  type="text"
                  className="w-1/3 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="스펙명 (예: CPU)"
                />
                <input
                  value={specValue}
                  onChange={(e) => setSpecValue(e.target.value)}
                  type="text"
                  className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  placeholder="스펙값 (예: Intel i7-12700H)"
                />
                <button
                  type="button"
                  onClick={addSpecification}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  추가
                </button>
              </div>

              <div className="space-y-2">
                {Object.entries(specifications).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                    <span className="w-1/3 font-medium text-gray-700">{key}</span>
                    <span className="flex-1 text-gray-600">{value}</span>
                    <button
                      type="button"
                      onClick={() => removeSpecification(key)}
                      className="text-red-600 hover:text-red-800"
                    >
                      삭제
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 에러 메시지 */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {/* 버튼 */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => navigate('/supplier/products')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? '저장 중...' : (isEdit ? '수정' : '등록')}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}