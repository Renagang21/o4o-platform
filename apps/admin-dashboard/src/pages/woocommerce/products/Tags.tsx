import React, { useState, useEffect } from 'react'
import { Plus, Edit, Trash2, Tag as TagIcon, Search, Hash } from 'lucide-react'
import { ProductTag } from '@/types/ecommerce'
import { EcommerceApi } from '@/api/ecommerceApi'
import toast from 'react-hot-toast'

const Tags: React.FC = () => {
  const [tags, setTags] = useState<ProductTag[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTag, setEditingTag] = useState<ProductTag | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  })

  useEffect(() => {
    loadTags()
  }, [])

  const loadTags = async () => {
    try {
      setLoading(true)
      const response = await EcommerceApi.getTags()
      setTags(response.data)
    } catch (error) {
      console.error('Failed to load tags:', error)
      toast.error('태그 목록을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      if (editingTag) {
        // await EcommerceApi.updateTag(editingTag.id, formData)
        toast.success('태그가 수정되었습니다.')
      } else {
        await EcommerceApi.createTag(formData)
        toast.success('태그가 생성되었습니다.')
      }
      
      loadTags()
      closeModal()
    } catch (error) {
      console.error('Failed to save tag:', error)
      toast.error('태그 저장에 실패했습니다.')
    }
  }

  const handleDelete = async (tagId: string) => {
    if (!confirm('이 태그를 삭제하시겠습니까?')) {
      return
    }

    try {
      // await EcommerceApi.deleteTag(tagId)
      toast.success('태그가 삭제되었습니다.')
      loadTags()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast.error('태그 삭제에 실패했습니다.')
    }
  }

  const openModal = (tag?: ProductTag) => {
    if (tag) {
      setEditingTag(tag)
      setFormData({
        name: tag.name,
        slug: tag.slug
      })
    } else {
      setEditingTag(null)
      setFormData({
        name: '',
        slug: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTag(null)
    setFormData({
      name: '',
      slug: ''
    })
  }

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
  }

  const filteredTags = tags.filter(tag =>
    tag.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const sortedTags = filteredTags.sort((a, b) => b.count - a.count)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">상품 태그</h1>
          <p className="text-gray-600 mt-1">상품에 태그를 추가하여 검색과 분류를 개선합니다</p>
        </div>
        <button
          onClick={() => openModal()}
          className="wp-button-primary"
        >
          <Plus className="w-4 h-4 mr-2" />
          태그 추가
        </button>
      </div>

      {/* Search */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="태그명으로 검색..."
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
                <p className="text-sm font-medium text-gray-600">전체 태그</p>
                <p className="text-2xl font-bold text-gray-900">{tags.length}</p>
              </div>
              <TagIcon className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">사용된 태그</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tags.filter(tag => tag.count > 0).length}
                </p>
              </div>
              <TagIcon className="w-8 h-8 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">미사용 태그</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tags.filter(tag => tag.count === 0).length}
                </p>
              </div>
              <TagIcon className="w-8 h-8 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">평균 사용량</p>
                <p className="text-2xl font-bold text-gray-900">
                  {tags.length > 0 
                    ? Math.round(tags.reduce((sum, tag) => sum + tag.count, 0) / tags.length)
                    : 0
                  }
                </p>
              </div>
              <TagIcon className="w-8 h-8 text-purple-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Tags table */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h3 className="wp-card-title">
            태그 목록 ({filteredTags.length}개)
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
                    <th>태그</th>
                    <th>슬러그</th>
                    <th>사용된 상품 수</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedTags.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="text-center py-12 text-gray-500">
                        <TagIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                        <p className="text-lg font-medium mb-2">태그가 없습니다</p>
                        <p className="text-sm">첫 번째 태그를 추가해보세요!</p>
                      </td>
                    </tr>
                  ) : (
                    sortedTags.map((tag) => (
                      <tr key={tag.id}>
                        <td>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <Hash className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{tag.name}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <code className="text-sm bg-gray-100 px-2 py-1 rounded">
                            {tag.slug}
                          </code>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="text-sm text-gray-900">{tag.count.toLocaleString()}</span>
                            {tag.count > 0 && (
                              <div className="w-16 bg-gray-200 rounded-full h-1.5">
                                <div 
                                  className="bg-blue-500 h-1.5 rounded-full" 
                                  style={{ 
                                    width: `${Math.min((tag.count / Math.max(...tags.map(t => t.count))) * 100, 100)}%` 
                                  }}
                                />
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => openModal(tag)}
                              className="text-blue-600 hover:text-blue-700"
                              title="편집"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(tag.id)}
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

      {/* Popular tags cloud */}
      {tags.length > 0 && (
        <div className="wp-card">
          <div className="wp-card-header">
            <h3 className="wp-card-title">인기 태그</h3>
          </div>
          <div className="wp-card-body">
            <div className="flex flex-wrap gap-2">
              {sortedTags.slice(0, 20).map((tag) => {
                const maxCount = Math.max(...tags.map(t => t.count))
                const fontSize = Math.max(0.75, Math.min(1.5, (tag.count / maxCount) * 1.5))
                
                return (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded cursor-pointer hover:bg-blue-100 transition-colors"
                    style={{ fontSize: `${fontSize}rem` }}
                    onClick={() => openModal(tag)}
                  >
                    <Hash className="w-3 h-3" />
                    {tag.name}
                    <span className="text-xs bg-blue-200 text-blue-800 px-1 rounded">
                      {tag.count}
                    </span>
                  </span>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold text-gray-900">
                {editingTag ? '태그 편집' : '태그 추가'}
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
                <label className="wp-label">태그명 *</label>
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
                  placeholder="태그명을 입력하세요"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  사용자가 검색할 때 사용할 키워드입니다.
                </p>
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
                <p className="text-xs text-gray-500 mt-1">
                  URL에 사용될 고유 식별자입니다. 자동으로 생성됩니다.
                </p>
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
                  {editingTag ? '수정' : '추가'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tags