import { FormEvent, type FC } from 'react';
import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft, 
  Save, 
  Package,
  DollarSign,
  Image as ImageIcon,
  X,
  FolderTree,
  Settings2
} from 'lucide-react';
import { useProduct, useCreateProduct, useUpdateProduct } from '@/hooks/useProducts';
import { Product } from '@/types/ecommerce';
import ProductVariantManager, { ProductOption, ProductVariant } from '@/components/ecommerce/ProductVariantManager';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
// import TipTapEditor from '@/components/ui/TipTapEditor';

const ProductForm: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = !!id;

  // API Hooks
  const { data: productData, isLoading } = useProduct(id || '', isEditMode);
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();

  // Form State
  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    slug: '',
    sku: '',
    description: '',
    shortDescription: '',
    retailPrice: 0,
    wholesalePrice: 0,
    cost: 0,
    stockQuantity: 0,
    stockStatus: 'instock',
    manageStock: true,
    weight: 0,
    dimensions: { length: 0, width: 0, height: 0, weight: 0, unit: 'cm', weightUnit: 'kg' },
    type: 'simple',
    status: 'active',
    featured: false,
    tags: [],
    images: [],
    metaTitle: '',
    metaDescription: '',
    categories: [],
  });

  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productVariants, setProductVariants] = useState<ProductVariant[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  // const [activeTab, setActiveTab] = useState('general');
  const [isSaving, setIsSaving] = useState(false);

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['product-categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/v1/ecommerce/categories/tree');
      return response.data;
    }
  });
  const categories = categoriesData?.data || [];

  // Load product data in edit mode
  useEffect(() => {
    if (productData?.data) {
      setFormData(productData.data);
    }
  }, [productData]);

  const handleInputChange = (field: keyof Product, value: string | number | boolean | object) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      if (isEditMode) {
        await updateProduct.mutateAsync({
          productId: id!,
          productData: formData
        });
      } else {
        await createProduct.mutateAsync(formData);
      }
      navigate('/products');
    } catch (error: any) {
      console.error('Failed to save product:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const generateSlug = () => {
    const slug = formData.name
      ?.toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    handleInputChange('slug', slug || '');
  };

  const toggleCategory = (categoryId: string) => {
    const newCategories = selectedCategories.includes(categoryId)
      ? selectedCategories.filter(id => id !== categoryId)
      : [...selectedCategories, categoryId];
    
    setSelectedCategories(newCategories);
    handleInputChange('categories', newCategories);
  };

  const renderCategoryTree = (cats: any[], level = 0) => {
    return cats.map(category => (
      <div key={category.id}>
        <div
          className={`flex items-center p-2 hover:bg-gray-50 rounded cursor-pointer`}
          style={{ paddingLeft: `${level * 1.5}rem` }}
        >
          <input
            type="checkbox"
            checked={selectedCategories.includes(category.id)}
            onChange={() => toggleCategory(category.id)}
            className="mr-2"
          />
          <span className="text-sm">{category.name}</span>
          <span className="text-xs text-gray-500 ml-2">({category.productCount})</span>
        </div>
        {category.children && category.children.length > 0 && (
          <div>{renderCategoryTree(category.children, level + 1)}</div>
        )}
      </div>
    ));
  };

  if (isLoading && isEditMode) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="mr-4 p-2 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditMode ? '상품 수정' : '새 상품 추가'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditMode ? '상품 정보를 수정합니다' : '새로운 상품을 등록합니다'}
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/products')}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSaving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">기본 정보</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상품명 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name || ''}
                  onChange={(e: any) => handleInputChange('name', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  URL 슬러그
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e: any) => handleInputChange('slug', e.target.value)}
                    className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={generateSlug}
                    className="px-3 py-2 border rounded-lg hover:bg-gray-50"
                  >
                    자동 생성
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  간단한 설명
                </label>
                <textarea
                  value={formData.shortDescription || ''}
                  onChange={(e: any) => handleInputChange('shortDescription', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상세 설명
                </label>
                <textarea
                  value={formData.description || ''}
                  onChange={(e: any) => handleInputChange('description', e.target.value)}
                  placeholder="상품에 대한 상세한 설명을 입력하세요"
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  rows={5}
                />
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <DollarSign className="w-5 h-5 mr-2" />
              가격 설정
            </h2>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  판매가 <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  value={formData.retailPrice || 0}
                  onChange={(e: any) => handleInputChange('retailPrice', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  정가 (할인 전 가격)
                </label>
                <input
                  type="number"
                  value={formData.wholesalePrice || 0}
                  onChange={(e: any) => handleInputChange('wholesalePrice', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  원가
                </label>
                <input
                  type="number"
                  value={formData.cost || 0}
                  onChange={(e: any) => handleInputChange('cost', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  min="0"
                />
              </div>
            </div>

            {/* Role-based Pricing */}
            <div className="mt-6">
              <h3 className="text-sm font-medium text-gray-700 mb-3">역할별 가격</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600">도매 가격</label>
                  <input
                    type="number"
                    value={formData.wholesalePrice || 0}
                    onChange={(e: any) => handleInputChange('wholesalePrice', parseFloat(e.target.value))}
                    className="w-32 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-gray-600">파트너 가격</label>
                  <input
                    type="number"
                    value={formData.affiliatePrice || 0}
                    onChange={(e: any) => handleInputChange('affiliatePrice', parseFloat(e.target.value))}
                    className="w-32 px-3 py-1 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <FolderTree className="w-5 h-5 mr-2" />
              카테고리
            </h2>
            
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {renderCategoryTree(categories)}
            </div>
          </div>

          {/* Product Options & Variants */}
          {formData.type === 'variable' && (
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center">
                <Settings2 className="w-5 h-5 mr-2" />
                상품 옵션 및 변형
              </h2>
              
              <ProductVariantManager
                options={productOptions}
                variants={productVariants}
                basePrice={formData.retailPrice || 0}
                baseSku={formData.sku || ''}
                onOptionsChange={setProductOptions}
                onVariantsChange={setProductVariants}
              />
            </div>
          )}

          {/* Inventory */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              재고 관리
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  SKU (재고 관리 코드)
                </label>
                <input
                  type="text"
                  value={formData.sku || ''}
                  onChange={(e: any) => handleInputChange('sku', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="trackInventory"
                  checked={formData.manageStock || false}
                  onChange={(e: any) => handleInputChange('manageStock', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="trackInventory" className="ml-2 text-sm text-gray-700">
                  재고 추적
                </label>
              </div>

              {formData.manageStock && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      재고 수량
                    </label>
                    <input
                      type="number"
                      value={formData.stockQuantity || 0}
                      onChange={(e: any) => handleInputChange('stockQuantity', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      재고 상태
                    </label>
                    <select
                      value={formData.stockStatus || 'in_stock'}
                      onChange={(e: any) => handleInputChange('stockStatus', e.target.value)}
                      className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="in_stock">재고 있음</option>
                      <option value="out_of_stock">품절</option>
                      <option value="on_backorder">입고 예정</option>
                    </select>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">상태</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  판매 상태
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e: any) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">판매중</option>
                  <option value="inactive">판매중지</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  상태
                </label>
                <select
                  value={formData.status || 'active'}
                  onChange={(e: any) => handleInputChange('status', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="active">공개</option>
                  <option value="draft">임시저장</option>
                  <option value="private">비공개</option>
                </select>
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured || false}
                  onChange={(e: any) => handleInputChange('featured', e.target.checked)}
                  className="rounded"
                />
                <label htmlFor="featured" className="ml-2 text-sm text-gray-700">
                  추천 상품으로 설정
                </label>
              </div>
            </div>
          </div>

          {/* Product Type */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">상품 유형</h2>
            
            <select
              value={formData.type || 'physical'}
              onChange={(e: any) => handleInputChange('type', e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="simple">단순 상품</option>
              <option value="variable">옵션 상품</option>
              <option value="digital">디지털 상품</option>
              <option value="service">서비스</option>
            </select>

            {(formData.type === 'simple' || formData.type === 'variable') && (
              <div className="mt-4 space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    무게 (kg)
                  </label>
                  <input
                    type="number"
                    value={formData.weight || 0}
                    onChange={(e: any) => handleInputChange('weight', parseFloat(e.target.value))}
                    className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.1"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    크기 (cm)
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      type="number"
                      placeholder="길이"
                      value={formData.dimensions?.length || 0}
                      onChange={(e: any) => handleInputChange('dimensions', {
                        ...formData.dimensions,
                        length: parseFloat(e.target.value)
                      })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                    <input
                      type="number"
                      placeholder="너비"
                      value={formData.dimensions?.width || 0}
                      onChange={(e: any) => handleInputChange('dimensions', {
                        ...formData.dimensions,
                        width: parseFloat(e.target.value)
                      })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                    <input
                      type="number"
                      placeholder="높이"
                      value={formData.dimensions?.height || 0}
                      onChange={(e: any) => handleInputChange('dimensions', {
                        ...formData.dimensions,
                        height: parseFloat(e.target.value)
                      })}
                      className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      min="0"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Images */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center">
              <ImageIcon className="w-5 h-5 mr-2" />
              상품 이미지
            </h2>
            
            <div className="space-y-3">
              {formData.images && formData.images.length > 0 ? (
                formData.images.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={image.alt || ''}
                      className="w-full h-32 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const newImages = [...(formData.images || [])];
                        newImages.splice(index, 1);
                        handleInputChange('images', newImages);
                      }}
                      className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                  <ImageIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">
                    클릭하여 이미지를 업로드하세요
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* SEO */}
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4">SEO 설정</h2>
            
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메타 제목
                </label>
                <input
                  type="text"
                  value={formData.metaTitle || ''}
                  onChange={(e: any) => handleInputChange('metaTitle', e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  메타 설명
                </label>
                <textarea
                  value={formData.metaDescription || ''}
                  onChange={(e: any) => handleInputChange('metaDescription', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
};

export default ProductForm;