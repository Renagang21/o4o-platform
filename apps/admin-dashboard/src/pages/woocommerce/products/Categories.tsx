import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Package, Eye, Search, Filter } from 'lucide-react'
import { ProductCategory } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const Categories: React.FC = () => {
  const [categories, setCategories] = useState<ProductCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingCategory, setEditingCategory] = useState<ProductCategory | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent: '',
    image: ''
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getCategories()
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast.error('카테고리 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingCategory) {
        await EcommerceApi.updateCategory(editingCategory.id, formData)
        toast.success('카테고리가 수정되었습니다.')
      } else {
        await EcommerceApi.createCategory(formData)
        toast.success('카테고리가 생성되었습니다.')
      }
      
      loadCategories()
      closeModal()
    } catch (error) {
      console.error('Failed to save category:', error)
      toast.error('카테고리 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (categoryId: string) => {
    if (!confirm('이 카테고리를 삭제하시겠습니까? 하위 카테고리도 함께 삭제됩니다.')) {
      return
    }

    try {
      await EcommerceApi.deleteCategory(categoryId)
      toast.success('카테고리가 삭제되었습니다.')
      loadCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error('카테고리 삭제에 실패했습니다.')
    }
  }

  const openModal = (category?: ProductCategory) => {
    if (category) {
      setEditingCategory(category)
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description || '',
        parent: category.parent || '',
        image: category.image || ''
      })
    } else {
      setEditingCategory(null)
      setFormData({
        name: '',
        slug: '',
        description: '',
        parent: '',
        image: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingCategory(null)
    setFormData({
      name: '',
      slug: '',
      description: '',
      parent: '',
      image: ''
    })
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const buildCategoryTree = (categories: ProductCategory[]): ProductCategory[] => {
    const categoryMap = new Map<string, ProductCategory & { children: ProductCategory[] }>()
    
    // Initialize all categories with children array
    categories.forEach(cat => {
      categoryMap.set(cat.id, { ...cat, children: [] })
    })
    
    const rootCategories: ProductCategory[] = []
    
    // Build tree structure
    categories.forEach(cat => {
      const category = categoryMap.get(cat.id)!
      if (cat.parent) {
        const parent = categoryMap.get(cat.parent)
        if (parent) {
          parent.children.push(category)
        }
      } else {
        rootCategories.push(category)
      }
    })
    
    return rootCategories
  }

  const filteredCategories = categories.filter(category =>
    category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    category.description?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const categoryTree = buildCategoryTree(filteredCategories)

  const renderCategoryRow = (category: ProductCategory & { children?: ProductCategory[] }, level = 0) => (
    <React.Fragment key={category.id}>
      <tr>
        <td>
          <div className="flex items-center gap-3" style={{ paddingLeft: `${level * 20}px` }}>
            {category.image ? (
              <img
                src={category.image}
                alt={category.name}
                className="w-10 h-10 object-cover rounded"
              />
            ) : (
              <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center">
                <Package className="w-5 h-5 text-gray-400" />
              </div>
            )}
            <div>
              <div className="font-medium text-gray-900">{category.name}</div>
              <div className="text-sm text-gray-500">/{category.slug}</div>
            </div>
          </div>
        </td>
        <td>
          <div className="text-sm text-gray-600 max-w-xs truncate">
            {category.description || '설명 없음'}
          </div>
        </td>
        <td>
          <span className="text-sm text-gray-900">{category.count.toLocaleString()}</span>
        </td>
        <td>
          <div className="flex items-center gap-2">
            <button
              onClick={() => openModal(category)}
              className="text-blue-600 hover:text-blue-700"
              title="편집"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              className="text-red-600 hover:text-red-700"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </td>
      </tr>
      {category.children?.map(child => renderCategoryRow(child, level + 1))}
    </React.Fragment>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 카테고리</h1>
          <p className="text-gray-600 mt-1">상품을 분류하고 관리할 카테고리를 설정합니다</p>
        </div>
        <button
          onClick={() => openModal()}
          className="wp-button-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          카테고리 추가
        </button>
      </div>

      {/* Search and filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="카테고리명, 설명으로 검색..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>
            <button className="wp-button-secondary">
              <Filter className="w-4 h-4 mr-2" />
              필터
            </button>
          </div>
        </div>
      </div>

      {/* Categories table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            카테고리 목록 ({categories.length}개)
          </h3>
        </div>
        <div className="wp-card-body p-0">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="loading-spinner" />
              <span className="ml-2 text-gray-600">로딩 중...</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th>카테고리</th>
                    <th>설명</th>
                    <th>상품 수</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {categoryTree.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-500">
                        <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">카테고리가 없습니다</p>
                        <p className="text-sm">첫 번째 카테고리를 추가해보세요!</p>
                      </td>
                    </tr>
                  ) : (
                    categoryTree.map(category => renderCategoryRow(category))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingCategory ? '카테고리 편집' : '카테고리 추가'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="wp-label">카테고리명 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData(prev => ({
                      ...prev,
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    }))
                  }}
                  className="wp-input"
                  placeholder="카테고리명을 입력하세요"
                  required
                />
              </div>

              <div>
                <label className="wp-label">슬러그</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
                  className="wp-input"
                  placeholder="URL에 사용될 슬러그"
                />
              </div>

              <div>
                <label className="wp-label">상위 카테고리</label>
                <select
                  value={formData.parent}
                  onChange={(e) => setFormData(prev => ({ ...prev, parent: e.target.value }))}
                  className="wp-select"
                >
                  <option value="">상위 카테고리 없음</option>
                  {categories
                    .filter(cat => cat.id !== editingCategory?.id)
                    .map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="wp-label">설명</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="wp-textarea"
                  rows={3}
                  placeholder="카테고리 설명을 입력하세요"
                />
              </div>

              <div>
                <label className="wp-label">이미지 URL</label>
                <input
                  type="url"
                  value={formData.image}
                  onChange={(e) => setFormData(prev => ({ ...prev, image: e.target.value }))}
                  className="wp-input"
                  placeholder="카테고리 대표 이미지 URL"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeModal}
                  className="wp-button-secondary flex-1"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="wp-button-primary flex-1"
                >
                  {editingCategory ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 카테고리</p>
                <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">최상위 카테고리</p>
                <p className="text-2xl font-bold text-gray-900">
                  {categories.filter(cat => !cat.parent).length}
                </p>
              </div>
              <Package className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">하위 카테고리</p>
                <p className="text-2xl font-bold text-gray-900">
                  {categories.filter(cat => cat.parent).length}
                </p>
              </div>
              <Package className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 상품 수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {categories.length > 0 
                    ? Math.round(categories.reduce((sum, cat) => sum + cat.count, 0) / categories.length)
                    : 0
                  }
                </p>
              </div>
              <Package className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Categories