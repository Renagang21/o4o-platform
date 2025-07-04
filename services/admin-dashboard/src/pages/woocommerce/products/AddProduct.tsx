import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Save, 
  ArrowLeft, 
  Eye, 
  Upload, 
  X, 
  Plus, 
  Trash2,
  Settings,
  Package,
  DollarSign,
  BarChart3,
  Tag,
  Globe
} from 'lucide-react'
import { Product, ProductCategory, ProductTag } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const AddProduct: React.FC = () => {
  const { productId } = useParams()
  const navigate = useNavigate()
  const isEditing = Boolean(productId)
  
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [tags, setTags] = useState<ProductTag[]>([])
  
  const [product, setProduct] = useState<Partial<Product>>({
    name: '',
    shortDescription: '',
    description: '',
    sku: '',
    status: 'draft',
    type: 'simple',
    featured: false,
    virtual: false,
    downloadable: false,
    retailPrice: 0,
    cost: 0,
    manageStock: true,
    stockQuantity: 0,
    lowStockThreshold: 5,
    stockStatus: 'instock',
    weight: 0,
    dimensions: {
      length: 0,
      width: 0,
      height: 0
    },
    categories: [],
    tags: [],
    attributes: [],
    images: [],
    metaTitle: '',
    metaDescription: ''
  })

  const [activeTab, setActiveTab] = useState('general')
  
  useEffect(() => {
    loadCategories()
    loadTags()
    
    if (isEditing && productId) {
      loadProduct(productId)
    }
  }, [productId])

  const loadProduct = async (id: string) => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getProduct(id)
      setProduct(response.data)
    } catch (error) {
      console.error('Failed to load product:', error)
      toast.error('상품을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await EcommerceApi.getCategories()
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to load categories:', error)
    }
  }

  const loadTags = async () => {
    try {
      const response = await EcommerceApi.getTags()
      setTags(response.data)
    } catch (error) {
      console.error('Failed to load tags:', error)
    }
  }

  const handleSave = async (status?: string) => {
    try {
      setSaving(true)
      
      const productData = {
        ...product,
        status: status || product.status
      }

      let response
      if (isEditing && productId) {
        response = await EcommerceApi.updateProduct(productId, productData)
      } else {
        response = await EcommerceApi.createProduct(productData)
      }

      toast.success(isEditing ? '상품이 수정되었습니다.' : '상품이 생성되었습니다.')
      
      if (!isEditing) {
        navigate(`/woocommerce/products/${response.data.id}/edit`)
      }
    } catch (error) {
      console.error('Failed to save product:', error)
      toast.error('상품 저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleImageUpload = async (file: File) => {
    try {
      const response = await EcommerceApi.uploadMedia(file)
      const newImage = {
        id: response.data.id,
        url: response.data.url,
        alt: product.name || '',
        sortOrder: product.images?.length || 0
      }
      
      setProduct(prev => ({
        ...prev,
        images: [...(prev.images || []), newImage],
        featuredImage: prev.featuredImage || response.data.url
      }))
      
      toast.success('이미지가 업로드되었습니다.')
    } catch (error) {
      console.error('Failed to upload image:', error)
      toast.error('이미지 업로드에 실패했습니다.')
    }
  }

  const removeImage = (imageId: string) => {
    setProduct(prev => ({
      ...prev,
      images: prev.images?.filter(img => img.id !== imageId) || []
    }))
  }

  const updateField = (field: keyof Product, value: any) => {
    setProduct(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const updateNestedField = (parentField: keyof Product, childField: string, value: any) => {
    setProduct(prev => ({
      ...prev,
      [parentField]: {
        ...(prev[parentField] as any),
        [childField]: value
      }
    }))
  }

  const tabs = [
    { id: 'general', label: '기본 정보', icon: Package },
    { id: 'pricing', label: '가격', icon: DollarSign },
    { id: 'inventory', label: '재고', icon: BarChart3 },
    { id: 'attributes', label: '속성', icon: Settings },
    { id: 'seo', label: 'SEO', icon: Globe }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">로딩 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/woocommerce/products')}
            className="wp-button-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {isEditing ? '상품 편집' : '상품 추가'}
            </h1>
            <p className="text-gray-600 mt-1">
              {isEditing ? '기존 상품을 편집합니다' : '새로운 상품을 추가합니다'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isEditing && product.slug && (
            <a
              href={`/shop/products/${product.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="wp-button-secondary"
            >
              <Eye className="w-4 h-4 mr-2" />
              미리보기
            </a>
          )}
          
          <button
            onClick={() => handleSave('draft')}
            disabled={saving}
            className="wp-button-secondary"
          >
            임시저장
          </button>
          
          <button
            onClick={() => handleSave('published')}
            disabled={saving}
            className="wp-button-primary"
          >
            {saving ? (
              <>
                <div className="loading-spinner w-4 h-4 mr-2" />
                저장 중...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEditing ? '업데이트' : '게시하기'}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-6">
        {/* Main content */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Basic Info */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">상품 정보</h3>
            </div>
            <div className="wp-card-body space-y-4">
              <div>
                <label className="wp-label">상품명 *</label>
                <input
                  type="text"
                  value={product.name || ''}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="wp-input"
                  placeholder="상품명을 입력하세요"
                />
              </div>

              <div>
                <label className="wp-label">짧은 설명</label>
                <textarea
                  value={product.shortDescription || ''}
                  onChange={(e) => updateField('shortDescription', e.target.value)}
                  className="wp-textarea"
                  rows={3}
                  placeholder="상품의 짧은 설명을 입력하세요"
                />
              </div>

              <div>
                <label className="wp-label">상세 설명</label>
                <textarea
                  value={product.description || ''}
                  onChange={(e) => updateField('description', e.target.value)}
                  className="wp-textarea"
                  rows={8}
                  placeholder="상품의 상세 설명을 입력하세요"
                />
              </div>
            </div>
          </div>

          {/* Product Images */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">상품 이미지</h3>
            </div>
            <div className="wp-card-body">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {product.images?.map((image) => (
                  <div key={image.id} className="relative group">
                    <img
                      src={image.url}
                      alt={image.alt}
                      className="w-full h-32 object-cover rounded border"
                    />
                    <button
                      onClick={() => removeImage(image.id)}
                      className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded cursor-pointer hover:bg-gray-50">
                  <Upload className="w-8 h-8 text-gray-400" />
                  <span className="text-sm text-gray-500 mt-2">이미지 추가</span>
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || [])
                      files.forEach(handleImageUpload)
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="wp-card">
            <div className="wp-card-header border-b-0">
              <div className="flex space-x-1">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
                      activeTab === tab.id
                        ? 'text-admin-blue border-admin-blue bg-blue-50'
                        : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="wp-card-body">
              {activeTab === 'general' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="wp-label">SKU</label>
                      <input
                        type="text"
                        value={product.sku || ''}
                        onChange={(e) => updateField('sku', e.target.value)}
                        className="wp-input"
                        placeholder="상품 고유 코드"
                      />
                    </div>
                    
                    <div>
                      <label className="wp-label">상품 유형</label>
                      <select
                        value={product.type || 'simple'}
                        onChange={(e) => updateField('type', e.target.value)}
                        className="wp-select"
                      >
                        <option value="simple">단순상품</option>
                        <option value="variable">변수상품</option>
                        <option value="grouped">그룹상품</option>
                        <option value="external">외부상품</option>
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="wp-label">무게 (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.weight || ''}
                        onChange={(e) => updateField('weight', parseFloat(e.target.value) || 0)}
                        className="wp-input"
                      />
                    </div>
                    
                    <div>
                      <label className="wp-label">길이 (cm)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.dimensions?.length || ''}
                        onChange={(e) => updateNestedField('dimensions', 'length', parseFloat(e.target.value) || 0)}
                        className="wp-input"
                      />
                    </div>
                    
                    <div>
                      <label className="wp-label">너비 (cm)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.dimensions?.width || ''}
                        onChange={(e) => updateNestedField('dimensions', 'width', parseFloat(e.target.value) || 0)}
                        className="wp-input"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="wp-label">높이 (cm)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={product.dimensions?.height || ''}
                      onChange={(e) => updateNestedField('dimensions', 'height', parseFloat(e.target.value) || 0)}
                      className="wp-input"
                    />
                  </div>
                </div>
              )}

              {activeTab === 'pricing' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="wp-label">일반 판매가 *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.retailPrice || ''}
                        onChange={(e) => updateField('retailPrice', parseFloat(e.target.value) || 0)}
                        className="wp-input"
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <label className="wp-label">도매가</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.wholesalePrice || ''}
                        onChange={(e) => updateField('wholesalePrice', parseFloat(e.target.value) || undefined)}
                        className="wp-input"
                        placeholder="0"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="wp-label">파트너가</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.affiliatePrice || ''}
                        onChange={(e) => updateField('affiliatePrice', parseFloat(e.target.value) || undefined)}
                        className="wp-input"
                        placeholder="0"
                      />
                    </div>
                    
                    <div>
                      <label className="wp-label">원가</label>
                      <input
                        type="number"
                        step="0.01"
                        value={product.cost || ''}
                        onChange={(e) => updateField('cost', parseFloat(e.target.value) || undefined)}
                        className="wp-input"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'inventory' && (
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="manageStock"
                      checked={product.manageStock || false}
                      onChange={(e) => updateField('manageStock', e.target.checked)}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor="manageStock" className="text-sm font-medium text-gray-700">
                      재고 추적 활성화
                    </label>
                  </div>

                  {product.manageStock && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="wp-label">재고 수량</label>
                        <input
                          type="number"
                          value={product.stockQuantity || ''}
                          onChange={(e) => updateField('stockQuantity', parseInt(e.target.value) || 0)}
                          className="wp-input"
                        />
                      </div>
                      
                      <div>
                        <label className="wp-label">재고 부족 알림 기준</label>
                        <input
                          type="number"
                          value={product.lowStockThreshold || ''}
                          onChange={(e) => updateField('lowStockThreshold', parseInt(e.target.value) || undefined)}
                          className="wp-input"
                        />
                      </div>
                    </div>
                  )}

                  <div>
                    <label className="wp-label">재고 상태</label>
                    <select
                      value={product.stockStatus || 'instock'}
                      onChange={(e) => updateField('stockStatus', e.target.value)}
                      className="wp-select"
                    >
                      <option value="instock">재고있음</option>
                      <option value="outofstock">품절</option>
                      <option value="onbackorder">예약주문</option>
                    </select>
                  </div>
                </div>
              )}

              {activeTab === 'seo' && (
                <div className="space-y-4">
                  <div>
                    <label className="wp-label">SEO 제목</label>
                    <input
                      type="text"
                      value={product.metaTitle || ''}
                      onChange={(e) => updateField('metaTitle', e.target.value)}
                      className="wp-input"
                      placeholder="SEO용 제목"
                    />
                  </div>
                  
                  <div>
                    <label className="wp-label">SEO 설명</label>
                    <textarea
                      value={product.metaDescription || ''}
                      onChange={(e) => updateField('metaDescription', e.target.value)}
                      className="wp-textarea"
                      rows={3}
                      placeholder="SEO용 설명"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          {/* Publish */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">게시</h3>
            </div>
            <div className="wp-card-body space-y-4">
              <div>
                <label className="wp-label">상태</label>
                <select
                  value={product.status || 'draft'}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="wp-select"
                >
                  <option value="draft">임시저장</option>
                  <option value="published">게시됨</option>
                  <option value="private">비공개</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="featured"
                    checked={product.featured || false}
                    onChange={(e) => updateField('featured', e.target.checked)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="featured" className="text-sm text-gray-700">
                    추천 상품
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="virtual"
                    checked={product.virtual || false}
                    onChange={(e) => updateField('virtual', e.target.checked)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="virtual" className="text-sm text-gray-700">
                    가상 상품
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="downloadable"
                    checked={product.downloadable || false}
                    onChange={(e) => updateField('downloadable', e.target.checked)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="downloadable" className="text-sm text-gray-700">
                    다운로드 상품
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Categories */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">카테고리</h3>
            </div>
            <div className="wp-card-body">
              <div className="max-h-48 overflow-y-auto space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id={`category-${category.id}`}
                      checked={product.categories?.some(c => c.id === category.id) || false}
                      onChange={(e) => {
                        if (e.target.checked) {
                          updateField('categories', [...(product.categories || []), category])
                        } else {
                          updateField('categories', product.categories?.filter(c => c.id !== category.id) || [])
                        }
                      }}
                      className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                    />
                    <label htmlFor={`category-${category.id}`} className="text-sm text-gray-700">
                      {category.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="wp-card-title">태그</h3>
            </div>
            <div className="wp-card-body">
              <div className="flex flex-wrap gap-2 mb-3">
                {product.tags?.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded"
                  >
                    #{tag.name}
                    <button
                      onClick={() => updateField('tags', product.tags?.filter(t => t.id !== tag.id) || [])}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              
              <select
                onChange={(e) => {
                  const tag = tags.find(t => t.id === e.target.value)
                  if (tag && !product.tags?.some(t => t.id === tag.id)) {
                    updateField('tags', [...(product.tags || []), tag])
                  }
                  e.target.value = ''
                }}
                className="wp-select"
                defaultValue=""
              >
                <option value="">태그 선택</option>
                {tags.filter(tag => !product.tags?.some(t => t.id === tag.id)).map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddProduct