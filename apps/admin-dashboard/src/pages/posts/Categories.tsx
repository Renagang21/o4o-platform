import { useState, useEffect } from 'react';
import { 
  Plus,
  Search,
  Edit,
  Trash2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  EyeOff,
  Save,
  X,
  AlertCircle,
  RefreshCw
} from 'lucide-react'
import { Category } from '@/types/content'
import { ContentApi } from '@/api/contentApi'
import toast from 'react-hot-toast'

const Categories: FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [searchTerm, setSearchTerm] = useState('')
  const [draggedCategory, setDraggedCategory] = useState<string | null>(null)

  const [formData, setFormData] = useState<Partial<Category>>({
    name: '',
    slug: '',
    description: '',
    parentId: '',
    image: '',
    color: '#3b82f6',
    order: 0,
    isActive: true
  })

  useEffect(() => {
    loadCategories()
  }, [])

  const loadCategories = async () => {
    try {
      setLoading(true)
      const response = await ContentApi.getCategories(true)
      setCategories(response.data)
    } catch (error) {
      console.error('Failed to load categories:', error)
      toast.error('카테고리를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const openModal = (mode: 'create' | 'edit', category?: Category, parentId?: string) => {
    setModalMode(mode)
    if (category) {
      setSelectedCategory(category)
      setFormData(category)
    } else {
      setSelectedCategory(null)
      setFormData({
        name: '',
        slug: '',
        description: '',
        parentId: parentId || '',
        image: '',
        color: '#3b82f6',
        order: 0,
        isActive: true
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedCategory(null)
    setFormData({})
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      if (!formData.name?.trim()) {
        toast.error('카테고리 이름을 입력해주세요.')
        return
      }

      // Auto-generate slug if not provided
      if (!formData.slug?.trim()) {
        const slugResponse = await ContentApi.generateSlug(formData.name, 'category')
        formData.slug = slugResponse.data.slug
      }

      if (modalMode === 'create') {
        await ContentApi.createCategory(formData as Category)
        toast.success('카테고리가 생성되었습니다.')
      } else if (modalMode === 'edit' && selectedCategory) {
        await ContentApi.updateCategory(selectedCategory.id, formData as Category)
        toast.success('카테고리가 수정되었습니다.')
      }
      
      closeModal()
      loadCategories()
    } catch (error) {
      console.error('Failed to save category:', error)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (categoryId: string) => {
    const category = findCategoryById(categories, categoryId)
    
    if (category?.postCount && category.postCount > 0) {
      if (!confirm(`이 카테고리에는 ${category.postCount}개의 게시물이 있습니다. 정말 삭제하시겠습니까?`)) {
        return
      }
    } else if (!confirm('이 카테고리를 삭제하시겠습니까?')) {
      return
    }

    try {
      await ContentApi.deleteCategory(categoryId)
      toast.success('카테고리가 삭제되었습니다.')
      loadCategories()
    } catch (error) {
      console.error('Failed to delete category:', error)
      toast.error('삭제에 실패했습니다.')
    }
  }

  const updateFormData = (key: keyof Category, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const toggleExpanded = (categoryId: string) => {
    setExpandedCategories(prev => {
      const newSet = new Set(prev)
      if (newSet.has(categoryId)) {
        newSet.delete(categoryId)
      } else {
        newSet.add(categoryId)
      }
      return newSet
    })
  }

  const findCategoryById = (categories: Category[], id: string): Category | null => {
    for (const category of categories) {
      if (category.id === id) return category
      if (category.children) {
        const found = findCategoryById(category.children, id)
        if (found) return found
      }
    }
    return null
  }

  const filterCategories = (categories: Category[], searchTerm: string): Category[] => {
    if (!searchTerm) return categories

    return categories.filter(category => {
      const matches = category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     category.description?.toLowerCase().includes(searchTerm.toLowerCase())
      
      if (matches) return true
      
      if (category.children) {
        const filteredChildren = filterCategories(category.children, searchTerm)
        if (filteredChildren.length > 0) {
          return true
        }
      }
      
      return false
    }).map(category => ({
      ...category,
      children: category.children ? filterCategories(category.children, searchTerm) : undefined
    }))
  }

  const handleDragStart = (e: React.DragEvent, categoryId: string) => {
    setDraggedCategory(categoryId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetCategoryId: string) => {
    e.preventDefault()
    
    if (!draggedCategory || draggedCategory === targetCategoryId) {
      setDraggedCategory(null)
      return
    }

    try {
      const draggedCat = findCategoryById(categories, draggedCategory)
      if (draggedCat) {
        await ContentApi.updateCategory(draggedCategory, { parentId: targetCategoryId })
        toast.success('카테고리가 이동되었습니다.')
        loadCategories()
      }
    } catch (error) {
      console.error('Failed to move category:', error)
      toast.error('이동에 실패했습니다.')
    }
    
    setDraggedCategory(null)
  }

  const renderCategory = (category: Category, level: number = 0) => {
    const hasChildren = category.children && category.children.length > 0
    const isExpanded = expandedCategories.has(category.id)
    const indent = level * 24

    return (
      <div key={category.id}>
        <div
          className={`flex items-center py-2 px-3 hover:bg-gray-50 border-l-2 transition-all ${
            draggedCategory === category.id ? 'opacity-50' : ''
          } ${category.isActive ? 'border-l-transparent' : 'border-l-red-300'}`}
          style={{ paddingLeft: `${12 + indent}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, category.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, category.id)}
        >
          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpanded(category.id)}
            className={`mr-2 ${hasChildren ? 'visible' : 'invisible'}`}
          >
            {hasChildren && isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Category Icon */}
          <div className="mr-3">
            {hasChildren && isExpanded ? (
              <FolderOpen className="w-5 h-5 text-blue-500" />
            ) : (
              <Folder className="w-5 h-5 text-gray-500" />
            )}
          </div>

          {/* Category Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-medium text-gray-900 truncate">
                {category.name}
              </span>
              
              {/* Color Indicator */}
              {category.color && (
                <div
                  className="w-3 h-3 rounded-full border border-gray-300"
                  style={{ backgroundColor: category.color }}
                />
              )}
              
              {/* Post Count */}
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                {category.postCount}
              </span>
              
              {/* Status */}
              {!category.isActive && (
                <EyeOff className="w-4 h-4 text-red-500" />
              )}
            </div>
            
            {category.description && (
              <div className="text-sm text-gray-500 truncate mt-1">
                {category.description}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            <button
              onClick={() => openModal('create', undefined, category.id)}
              className="text-green-600 hover:text-green-700 p-1"
              title="하위 카테고리 추가"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => openModal('edit', category)}
              className="text-blue-600 hover:text-blue-700 p-1"
              title="수정"
            >
              <Edit className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDelete(category.id)}
              className="text-red-600 hover:text-red-700 p-1"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && category.children && (
          <div>
            {category.children.map(child => renderCategory(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const filteredCategories = filterCategories(categories, searchTerm)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">카테고리를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">카테고리</h1>
          <p className="text-gray-600 mt-1">계층적 카테고리 구조를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCategories}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button
            onClick={() => openModal('create')}
            className="wp-button-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            카테고리 추가
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="카테고리 이름이나 설명으로 검색..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="wp-input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Help Text */}
      <div className="wp-card border-l-4 border-l-blue-500">
        <div className="wp-card-body">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">카테고리 관리 도움말</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600">
                <li>드래그 앤 드롭으로 카테고리 구조를 변경할 수 있습니다</li>
                <li>하위 카테고리를 생성하려면 상위 카테고리의 + 버튼을 클릭하세요</li>
                <li>게시물이 있는 카테고리를 삭제하면 게시물이 미분류로 이동합니다</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Tree */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="wp-card-title">카테고리 구조</h2>
        </div>
        <div className="wp-card-body p-0">
          {filteredCategories.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Folder className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                {searchTerm ? '검색 결과가 없습니다' : '카테고리가 없습니다'}
              </p>
              <p className="text-sm">
                {searchTerm ? '다른 검색어를 시도해보세요' : '새로운 카테고리를 추가해보세요'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredCategories.map(category => renderCategory(category))}
            </div>
          )}
        </div>
      </div>

      {/* Category Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {modalMode === 'create' ? '카테고리 추가' : '카테고리 수정'}
                </h3>
                <button
                  onClick={closeModal}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="wp-label">카테고리 이름 *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e: any) => updateFormData('name', e.target.value)}
                    className="wp-input"
                    placeholder="카테고리 이름을 입력하세요"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="wp-label">슬러그</label>
                  <input
                    type="text"
                    value={formData.slug || ''}
                    onChange={(e: any) => updateFormData('slug', e.target.value)}
                    className="wp-input"
                    placeholder="자동 생성됩니다"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    URL에 사용될 고유한 식별자입니다
                  </p>
                </div>

                <div>
                  <label className="wp-label">설명</label>
                  <textarea
                    value={formData.description || ''}
                    onChange={(e: any) => updateFormData('description', e.target.value)}
                    className="wp-input min-h-[80px]"
                    placeholder="카테고리에 대한 설명을 입력하세요"
                  />
                </div>

                <div>
                  <label className="wp-label">상위 카테고리</label>
                  <select
                    value={formData.parentId || ''}
                    onChange={(e: any) => updateFormData('parentId', e.target.value)}
                    className="wp-select"
                  >
                    <option value="">최상위 카테고리</option>
                    {categories.map(category => (
                      <option 
                        key={category.id} 
                        value={category.id}
                        disabled={selectedCategory?.id === category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="wp-label">색상</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={formData.color || '#3b82f6'}
                        onChange={(e: any) => updateFormData('color', e.target.value)}
                        className="w-10 h-10 rounded border border-gray-300"
                      />
                      <input
                        type="text"
                        value={formData.color || '#3b82f6'}
                        onChange={(e: any) => updateFormData('color', e.target.value)}
                        className="wp-input flex-1"
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="wp-label">정렬 순서</label>
                    <input
                      type="number"
                      value={formData.order || 0}
                      onChange={(e: any) => updateFormData('order', parseInt(e.target.value))}
                      className="wp-input"
                      min="0"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive || false}
                    onChange={(e: any) => updateFormData('isActive', e.target.checked)}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    카테고리 활성화
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={closeModal}
                  className="wp-button-secondary"
                >
                  취소
                </button>
                <button
                  onClick={handleSave}
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
                      저장
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Categories