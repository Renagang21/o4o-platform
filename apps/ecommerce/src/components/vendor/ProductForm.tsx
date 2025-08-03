import { ChangeEvent, useEffect, useState } from 'react';
import { 
  X, 
  Upload, 
  Plus, 
  Trash2, 
  Save,
  AlertCircle
} from 'lucide-react';
import { 
  Button, 
  Input, 
  Textarea,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from '@o4o/ui';
import type { Product, ProductDimensions } from '@o4o/types';

interface ProductFormProps {
  product?: Product;
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<Product>) => Promise<void>;
}

interface ProductFormData {
  name: string;
  description: string;
  sku: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  cost?: number;
  stockQuantity: number;
  stockStatus: 'in_stock' | 'out_of_stock' | 'on_backorder';
  images: string[];
  variants: ProductVariant[];
  seoTitle?: string;
  seoDescription?: string;
  tags: string[];
  weight?: number;
  dimensions?: {
    length?: number;
    width?: number;
    height?: number;
  };
}

interface ProductVariant {
  id: string;
  name: string;
  price: number;
  sku: string;
  stockQuantity: number;
}

export function ProductForm({ product, isOpen, onClose, onSubmit }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    sku: '',
    category: '',
    price: 0,
    stockQuantity: 0,
    stockStatus: 'in_stock',
    images: [],
    variants: [],
    tags: [],
    dimensions: {}
  });

  const [newTag, setNewTag] = useState('');

  useEffect(() => {
    if (product) {
      setFormData({
        name: product.name || '',
        description: product.description || '',
        sku: product.sku || '',
        category: product.categories?.[0] || '',
        price: product.pricing?.customer || 0,
        compareAtPrice: 0, // Not in Product interface
        cost: product.cost,
        stockQuantity: product.inventory?.stockQuantity || 0,
        stockStatus: product.inventory?.stockStatus || 'in_stock',
        images: product.images?.map(img => img.url) || [],
        variants: [],
        seoTitle: product.seo?.metaTitle,
        seoDescription: product.seo?.metaDescription,
        tags: product.tags || [],
        weight: product.shippingInfo?.weight,
        dimensions: product.shippingInfo?.dimensions || {}
      });
    }
  }, [product]);

  const tabs = [
    { id: 'basic', name: '기본 정보' },
    { id: 'media', name: '이미지' },
    { id: 'inventory', name: '재고' },
    { id: 'shipping', name: '배송' },
    { id: 'seo', name: 'SEO' }
  ];

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = '상품명을 입력해주세요';
    }
    if (!formData.sku.trim()) {
      newErrors.sku = 'SKU를 입력해주세요';
    }
    if (formData.price <= 0) {
      newErrors.price = '가격은 0보다 커야 합니다';
    }
    if (formData.stockQuantity < 0) {
      newErrors.stockQuantity = '재고는 0 이상이어야 합니다';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      await onSubmit({
        name: formData.name,
        description: formData.description,
        sku: formData.sku,
        pricing: {
          customer: formData.price,
          business: formData.price * 0.8, // Example discount
          affiliate: formData.price * 0.85,
          retailer: {
            gold: formData.price * 0.75,
            premium: formData.price * 0.7,
            vip: formData.price * 0.65
          }
        },
        cost: formData.cost,
        inventory: {
          stockQuantity: formData.stockQuantity,
          stockStatus: formData.stockStatus as 'in_stock' | 'out_of_stock' | 'on_backorder',
          minOrderQuantity: 1,
          lowStockThreshold: 10,
          manageStock: true,
          allowBackorder: false
        },
        images: formData.images.map((url, index) => ({
          id: `img-${index}`,
          url,
          alt: formData.name,
          sortOrder: index,
          isFeatured: index === 0
        })),
        seo: {
          metaTitle: formData.seoTitle || formData.name,
          metaDescription: formData.seoDescription || formData.description
        },
        shippingInfo: formData.weight ? {
          weight: formData.weight,
          dimensions: formData.dimensions as ProductDimensions,
          shippingCost: 0
        } : undefined,
        tags: formData.tags
      });
      onClose();
    } catch (error: any) {
      console.error('Failed to save product:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files) {
      // 실제 구현에서는 파일을 서버에 업로드하고 URL을 받아와야 함
      const newImages = Array.from(files).map(file => URL.createObjectURL(file));
      setFormData(prev => ({
        ...prev,
        images: [...prev.images, ...newImages]
      }));
    }
  };

  const removeImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }));
  };

  const addTag = () => {
    if (newTag.trim() && !formData.tags.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const removeTag = (tag: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(t => t !== tag)
    }));
  };

  const addVariant = () => {
    const newVariant: ProductVariant = {
      id: `variant-${Date.now()}`,
      name: '',
      price: formData.price,
      sku: '',
      stockQuantity: 0
    };
    setFormData(prev => ({
      ...prev,
      variants: [...prev.variants, newVariant]
    }));
  };

  const updateVariant = (id: string, field: keyof ProductVariant, value: any) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map(v => 
        v.id === id ? { ...v, [field]: value } : v
      )
    }));
  };

  const removeVariant = (id: string) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(v => v.id !== id)
    }));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">
            {product ? '상품 수정' : '새 상품 등록'}
          </DialogTitle>
        </DialogHeader>

        <div className="mt-6">
          {/* 탭 네비게이션 */}
          <div className="flex space-x-1 border-b">
            {tabs.map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.name}
              </button>
            ))}
          </div>

          {/* 탭 컨텐츠 */}
          <div className="mt-6">
            {activeTab === 'basic' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상품명 <span className="text-red-500">*</span>
                  </label>
                  <Input
                    value={formData.name}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="예: 무선 블루투스 이어폰"
                    className={errors.name ? 'border-red-500' : ''}
                  />
                  {errors.name && (
                    <p className="text-red-500 text-sm mt-1">{errors.name}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    상품 설명
                  </label>
                  <Textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="상품의 특징과 장점을 설명해주세요"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <Input
                      value={formData.sku}
                      onChange={(e: any) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      placeholder="예: BT-EAR-001"
                      className={errors.sku ? 'border-red-500' : ''}
                    />
                    {errors.sku && (
                      <p className="text-red-500 text-sm mt-1">{errors.sku}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      카테고리
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.category}
                      onChange={(e: any) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    >
                      <option value="">카테고리 선택</option>
                      <option value="electronics">전자제품</option>
                      <option value="fashion">패션</option>
                      <option value="home">홈/리빙</option>
                      <option value="beauty">뷰티</option>
                      <option value="food">식품</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      판매가 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.price}
                      onChange={(e: any) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      placeholder="0"
                      className={errors.price ? 'border-red-500' : ''}
                    />
                    {errors.price && (
                      <p className="text-red-500 text-sm mt-1">{errors.price}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      할인 전 가격
                    </label>
                    <Input
                      type="number"
                      value={formData.compareAtPrice || ''}
                      onChange={(e: any) => setFormData(prev => ({ 
                        ...prev, 
                        compareAtPrice: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      placeholder="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      원가
                    </label>
                    <Input
                      type="number"
                      value={formData.cost || ''}
                      onChange={(e: any) => setFormData(prev => ({ 
                        ...prev, 
                        cost: e.target.value ? parseFloat(e.target.value) : undefined 
                      }))}
                      placeholder="0"
                    />
                  </div>
                </div>

                {/* 태그 */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    태그
                  </label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newTag}
                      onChange={(e: any) => setNewTag(e.target.value)}
                      placeholder="태그 입력"
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                    />
                    <Button onClick={addTag} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {formData.tags.map((tag: any) => (
                      <span
                        key={tag}
                        className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-gray-100 text-gray-700"
                      >
                        {tag}
                        <button
                          onClick={() => removeTag(tag)}
                          className="ml-2 text-gray-500 hover:text-gray-700"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'media' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    상품 이미지
                  </label>
                  
                  {/* 이미지 업로드 영역 */}
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                    <input
                      type="file"
                      multiple
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-600">
                        클릭하여 이미지를 업로드하거나 드래그 앤 드롭하세요
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        JPG, PNG, GIF (최대 5MB)
                      </p>
                    </label>
                  </div>

                  {/* 업로드된 이미지 목록 */}
                  {formData.images.length > 0 && (
                    <div className="grid grid-cols-4 gap-4 mt-4">
                      {formData.images.map((image, index) => (
                        <div key={index} className="relative group">
                          <img
                            src={image}
                            alt={`Product ${index + 1}`}
                            className="w-full h-32 object-cover rounded-lg"
                          />
                          <button
                            onClick={() => removeImage(index)}
                            className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <X className="h-4 w-4" />
                          </button>
                          {index === 0 && (
                            <span className="absolute bottom-2 left-2 px-2 py-1 bg-blue-500 text-white text-xs rounded">
                              대표 이미지
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'inventory' && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      재고 수량 <span className="text-red-500">*</span>
                    </label>
                    <Input
                      type="number"
                      value={formData.stockQuantity}
                      onChange={(e: any) => setFormData(prev => ({ 
                        ...prev, 
                        stockQuantity: parseInt(e.target.value) || 0 
                      }))}
                      placeholder="0"
                      className={errors.stockQuantity ? 'border-red-500' : ''}
                    />
                    {errors.stockQuantity && (
                      <p className="text-red-500 text-sm mt-1">{errors.stockQuantity}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      재고 상태
                    </label>
                    <select
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      value={formData.stockStatus}
                      onChange={(e: any) => setFormData(prev => ({ 
                        ...prev, 
                        stockStatus: e.target.value as any 
                      }))}
                    >
                      <option value="in_stock">재고 있음</option>
                      <option value="out_of_stock">품절</option>
                      <option value="pre_order">예약 판매</option>
                    </select>
                  </div>
                </div>

                {/* 옵션 상품 */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium text-gray-700">옵션 상품</h3>
                    <Button onClick={addVariant} variant="outline" size="sm">
                      <Plus className="h-4 w-4 mr-1" />
                      옵션 추가
                    </Button>
                  </div>

                  {formData.variants.length > 0 && (
                    <div className="space-y-3">
                      {formData.variants.map((variant: any) => (
                        <div key={variant.id} className="p-4 border rounded-lg space-y-3">
                          <div className="grid grid-cols-4 gap-3">
                            <Input
                              placeholder="옵션명"
                              value={variant.name}
                              onChange={(e: any) => updateVariant(variant.id, 'name', e.target.value)}
                            />
                            <Input
                              placeholder="SKU"
                              value={variant.sku}
                              onChange={(e: any) => updateVariant(variant.id, 'sku', e.target.value)}
                            />
                            <Input
                              type="number"
                              placeholder="가격"
                              value={variant.price}
                              onChange={(e: any) => updateVariant(variant.id, 'price', parseFloat(e.target.value) || 0)}
                            />
                            <div className="flex gap-2">
                              <Input
                                type="number"
                                placeholder="재고"
                                value={variant.stockQuantity}
                                onChange={(e: any) => updateVariant(variant.id, 'stockQuantity', parseInt(e.target.value) || 0)}
                              />
                              <Button
                                onClick={() => removeVariant(variant.id)}
                                variant="outline"
                                size="sm"
                                className="px-2"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'shipping' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    무게 (kg)
                  </label>
                  <Input
                    type="number"
                    step="0.1"
                    value={formData.weight || ''}
                    onChange={(e: any) => setFormData(prev => ({ 
                      ...prev, 
                      weight: e.target.value ? parseFloat(e.target.value) : undefined 
                    }))}
                    placeholder="0.0"
                  />
                </div>

                <div>
                  <h3 className="text-sm font-medium text-gray-700 mb-3">포장 크기</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">길이 (cm)</label>
                      <Input
                        type="number"
                        value={formData.dimensions?.length || ''}
                        onChange={(e: any) => setFormData(prev => ({
                          ...prev,
                          dimensions: {
                            ...prev.dimensions,
                            length: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">너비 (cm)</label>
                      <Input
                        type="number"
                        value={formData.dimensions?.width || ''}
                        onChange={(e: any) => setFormData(prev => ({
                          ...prev,
                          dimensions: {
                            ...prev.dimensions,
                            width: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                        placeholder="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">높이 (cm)</label>
                      <Input
                        type="number"
                        value={formData.dimensions?.height || ''}
                        onChange={(e: any) => setFormData(prev => ({
                          ...prev,
                          dimensions: {
                            ...prev.dimensions,
                            height: e.target.value ? parseFloat(e.target.value) : undefined
                          }
                        }))}
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-gray-400 mt-0.5 mr-2" />
                    <div className="text-sm text-gray-600">
                      <p className="font-medium mb-1">배송비 안내</p>
                      <p>배송비는 스토어 설정에서 일괄 관리됩니다.</p>
                      <p>특별 배송비가 필요한 경우 고객센터로 문의해주세요.</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'seo' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO 제목
                  </label>
                  <Input
                    value={formData.seoTitle || ''}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, seoTitle: e.target.value }))}
                    placeholder={formData.name || '상품명이 기본값으로 사용됩니다'}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(formData.seoTitle || formData.name || '').length}/60자
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    SEO 설명
                  </label>
                  <Textarea
                    rows={3}
                    value={formData.seoDescription || ''}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, seoDescription: e.target.value }))}
                    placeholder="검색 결과에 표시될 설명을 입력하세요"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {(formData.seoDescription || '').length}/160자
                  </p>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">검색 결과 미리보기</h4>
                  <div className="bg-white p-3 rounded border">
                    <h3 className="text-blue-600 text-base font-medium hover:underline cursor-pointer">
                      {formData.seoTitle || formData.name || '상품 제목'}
                    </h3>
                    <p className="text-sm text-green-700">www.o4o-store.com/products/...</p>
                    <p className="text-sm text-gray-600 mt-1">
                      {formData.seoDescription || formData.description || '상품 설명이 여기에 표시됩니다...'}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 하단 버튼 */}
          <div className="mt-8 flex justify-end space-x-3 pt-6 border-t">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              취소
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? '저장 중...' : (product ? '수정 완료' : '상품 등록')}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}