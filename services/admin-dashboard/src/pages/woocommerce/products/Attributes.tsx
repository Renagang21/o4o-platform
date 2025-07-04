import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Settings, Eye, Search, Filter, Move } from 'lucide-react'
import { ProductAttribute } from '@/types/ecommerce'
import toast from 'react-hot-toast'

const Attributes: React.FC = () => {
  const [attributes, setAttributes] = useState<ProductAttribute[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingAttribute, setEditingAttribute] = useState<ProductAttribute | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    type: 'select' as ProductAttribute['type'],
    values: [] as string[],
    visible: true,
    variation: false,
    sortOrder: 0
  })

  const [newValue, setNewValue] = useState('')

  // Mock data for demonstration
  useEffect(() => {
    loadAttributes()
  }, [])

  const loadAttributes = async () => {
    try {
      setLoading(true)
      // Mock data - replace with actual API call
      const mockAttributes: ProductAttribute[] = [
        {
          id: '1',
          name: '색상',
          slug: 'color',
          type: 'color',
          values: ['빨강', '파랑', '녹색', '검정', '흰색'],
          visible: true,
          variation: true,
          sortOrder: 1
        },
        {
          id: '2',
          name: '크기',
          slug: 'size',
          type: 'select',
          values: ['S', 'M', 'L', 'XL', 'XXL'],
          visible: true,
          variation: true,
          sortOrder: 2
        },
        {
          id: '3',
          name: '재질',
          slug: 'material',
          type: 'select',
          values: ['면', '폴리에스터', '울', '리넨', '실크'],
          visible: true,
          variation: false,
          sortOrder: 3
        },
        {
          id: '4',
          name: '무게',
          slug: 'weight',
          type: 'number',
          values: [],
          visible: true,
          variation: false,
          sortOrder: 4
        }
      ]
      setAttributes(mockAttributes)
    } catch (error) {
      console.error('Failed to load attributes:', error)
      toast.error('속성 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      const attributeData = {
        ...formData,
        id: editingAttribute?.id || Date.now().toString()
      }

      if (editingAttribute) {
        setAttributes(prev => prev.map(attr => 
          attr.id === editingAttribute.id ? attributeData : attr
        ))
        toast.success('속성이 수정되었습니다.')
      } else {
        setAttributes(prev => [...prev, attributeData])
        toast.success('속성이 생성되었습니다.')
      }
      
      closeModal()
    } catch (error) {
      console.error('Failed to save attribute:', error)
      toast.error('속성 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (attributeId: string) => {
    if (!confirm('이 속성을 삭제하시겠습니까? 연결된 상품 변형도 함께 영향을 받을 수 있습니다.')) {
      return
    }

    try {
      setAttributes(prev => prev.filter(attr => attr.id !== attributeId))
      toast.success('속성이 삭제되었습니다.')
    } catch (error) {
      console.error('Failed to delete attribute:', error)
      toast.error('속성 삭제에 실패했습니다.')
    }
  }

  const openModal = (attribute?: ProductAttribute) => {
    if (attribute) {
      setEditingAttribute(attribute)
      setFormData({
        name: attribute.name,
        slug: attribute.slug,
        type: attribute.type,
        values: [...attribute.values],
        visible: attribute.visible,
        variation: attribute.variation,
        sortOrder: attribute.sortOrder
      })
    } else {
      setEditingAttribute(null)
      setFormData({
        name: '',
        slug: '',
        type: 'select',
        values: [],
        visible: true,
        variation: false,
        sortOrder: attributes.length + 1
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingAttribute(null)
    setNewValue('')
    setFormData({
      name: '',
      slug: '',
      type: 'select',
      values: [],
      visible: true,
      variation: false,
      sortOrder: 0
    })
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const addValue = () => {
    if (newValue.trim() && !formData.values.includes(newValue.trim())) {
      setFormData(prev => ({
        ...prev,
        values: [...prev.values, newValue.trim()]
      }))
      setNewValue('')
    }
  }

  const removeValue = (valueToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      values: prev.values.filter(v => v !== valueToRemove)
    }))
  }

  const getTypeIcon = (type: ProductAttribute['type']) => {
    switch (type) {
      case 'color': return '🎨'
      case 'image': return '🖼️'
      case 'number': return '🔢'
      case 'text': return '📝'
      default: return '📋'
    }
  }

  const getTypeName = (type: ProductAttribute['type']) => {
    const names = {
      select: '선택',
      text: '텍스트',
      number: '숫자',
      color: '색상',
      image: '이미지'
    }
    return names[type]
  }

  const filteredAttributes = attributes.filter(attr =>
    attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    attr.slug.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedAttributes = filteredAttributes.sort((a, b) => a.sortOrder - b.sortOrder)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 속성</h1>
          <p className="text-gray-600 mt-1">상품의 변형과 추가 정보를 위한 속성을 관리합니다</p>
        </div>
        <button
          onClick={() => openModal()}
          className="wp-button-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          속성 추가
        </button>
      </div>

      {/* Search */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="속성명, 슬러그로 검색..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="wp-input pl-10"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 속성</p>
                <p className="text-2xl font-bold text-gray-900">{attributes.length}</p>
              </div>
              <Settings className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">변형 속성</p>
                <p className="text-2xl font-bold text-gray-900">
                  {attributes.filter(attr => attr.variation).length}
                </p>
              </div>
              <Settings className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">공개 속성</p>
                <p className="text-2xl font-bold text-gray-900">
                  {attributes.filter(attr => attr.visible).length}
                </p>
              </div>
              <Eye className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 값 개수</p>
                <p className="text-2xl font-bold text-gray-900">
                  {attributes.reduce((sum, attr) => sum + attr.values.length, 0)}
                </p>
              </div>
              <Settings className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Attributes table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            속성 목록 ({filteredAttributes.length}개)
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
                    <th>순서</th>
                    <th>속성</th>
                    <th>유형</th>
                    <th>값</th>
                    <th>설정</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAttributes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center py-12 text-gray-500">
                        <Settings className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">속성이 없습니다</p>
                        <p className="text-sm">첫 번째 속성을 추가해보세요!</p>
                      </td>
                    </tr>
                  ) : (
                    sortedAttributes.map((attribute) => (
                      <tr key={attribute.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <Move className="w-4 h-4 text-gray-400 cursor-move" />
                            <span className="text-sm text-gray-600">{attribute.sortOrder}</span>
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-3">
                            <span className="text-lg">{getTypeIcon(attribute.type)}</span>
                            <div>
                              <div className="font-medium text-gray-900">{attribute.name}</div>
                              <code className="text-xs text-gray-500">{attribute.slug}</code>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded">
                            {getTypeName(attribute.type)}
                          </span>
                        </td>
                        <td>
                          <div className="max-w-xs">
                            {attribute.values.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {attribute.values.slice(0, 3).map((value) => (
                                  <span
                                    key={value}
                                    className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded"
                                  >
                                    {value}
                                  </span>
                                ))}
                                {attribute.values.length > 3 && (
                                  <span className="text-xs text-gray-500">
                                    +{attribute.values.length - 3}개 더
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400">값 없음</span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex flex-col gap-1">
                            {attribute.visible && (
                              <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded">
                                공개
                              </span>
                            )}
                            {attribute.variation && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                변형
                              </span>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openModal(attribute)}
                              className="text-blue-600 hover:text-blue-700"
                              title="편집"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(attribute.id)}
                              className="text-red-600 hover:text-red-700"
                              title="삭제"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
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
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingAttribute ? '속성 편집' : '속성 추가'}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600"
              >
                <Plus className="w-6 h-6 rotate-45" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wp-label">속성명 *</label>
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
                    placeholder="속성명을 입력하세요"
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
              </div>

              {/* Type and Order */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="wp-label">속성 유형</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                    className="wp-select"
                  >
                    <option value="select">선택 (드롭다운)</option>
                    <option value="text">텍스트</option>
                    <option value="number">숫자</option>
                    <option value="color">색상</option>
                    <option value="image">이미지</option>
                  </select>
                </div>

                <div>
                  <label className="wp-label">정렬 순서</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => setFormData(prev => ({ ...prev, sortOrder: parseInt(e.target.value) || 0 }))}
                    className="wp-input"
                    min="0"
                  />
                </div>
              </div>

              {/* Settings */}
              <div className="space-y-3">
                <h4 className="font-medium text-gray-900">설정</h4>
                
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="visible"
                    checked={formData.visible}
                    onChange={(e) => setFormData(prev => ({ ...prev, visible: e.target.checked }))}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="visible" className="text-sm font-medium text-gray-700">
                    상품 페이지에서 공개
                  </label>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="variation"
                    checked={formData.variation}
                    onChange={(e) => setFormData(prev => ({ ...prev, variation: e.target.checked }))}
                    className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                  />
                  <label htmlFor="variation" className="text-sm font-medium text-gray-700">
                    변형 생성에 사용
                  </label>
                </div>
              </div>

              {/* Values */}
              {(formData.type === 'select' || formData.type === 'color') && (
                <div className="space-y-3">
                  <h4 className="font-medium text-gray-900">속성 값</h4>
                  
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newValue}
                      onChange={(e) => setNewValue(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addValue())}
                      className="wp-input flex-1"
                      placeholder="새 값을 입력하세요"
                    />
                    <button
                      type="button"
                      onClick={addValue}
                      className="wp-button-primary"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {formData.values.map((value) => (
                      <span
                        key={value}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-gray-100 text-gray-700 rounded"
                      >
                        {value}
                        <button
                          type="button"
                          onClick={() => removeValue(value)}
                          className="text-gray-400 hover:text-red-600"
                        >
                          <Plus className="w-3 h-3 rotate-45" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

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
                  {editingAttribute ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Attributes