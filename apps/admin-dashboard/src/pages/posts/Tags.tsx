import { useState, useEffect, FC } from 'react';
import { 
  Plus,
  Search,
  Edit,
  Trash2,
  Tag as TagIcon,
  Hash,
  Save,
  X,
  RefreshCw,
  Merge,
  CheckCircle,
  ArrowRight
} from 'lucide-react'
import { Tag } from '@/types/content'
import { ContentApi } from '@/api/contentApi'
import toast from 'react-hot-toast'

const Tags: FC = () => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [tags, setTags] = useState<Tag[]>([])
  const [filteredTags, setFilteredTags] = useState<Tag[]>([])
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [selectedTag, setSelectedTag] = useState<Tag | null>(null)
  const [showModal, setShowModal] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create')
  const [searchTerm, setSearchTerm] = useState('')
  
  // Quick add state
  const [quickAddMode, setQuickAddMode] = useState(false)
  const [quickTagName, setQuickTagName] = useState('')

  // Merge state
  const [mergeFromTag, setMergeFromTag] = useState<Tag | null>(null)
  const [mergeToTag, setMergeToTag] = useState<Tag | null>(null)

  const [formData, setFormData] = useState<Partial<Tag>>({
    name: '',
    slug: '',
    description: '',
    color: '#3b82f6'
  })

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [sortBy, setSortBy] = useState<'name' | 'postCount' | 'createdAt'>('name')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  useEffect(() => {
    loadTags()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [tags, searchTerm, sortBy, sortOrder])

  const loadTags = async () => {
    try {
      setLoading(true)
      const response = await ContentApi.getTags()
      setTags(response.data)
    } catch (error) {
      console.error('Failed to load tags:', error)
      toast.error('태그를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const applyFilters = () => {
    let filtered = [...tags]

    // Search filter
    if (searchTerm) {
      const term = searchTerm.toLowerCase()
      filtered = filtered.filter(tag => 
        tag.name.toLowerCase().includes(term) ||
        tag.description?.toLowerCase().includes(term) ||
        tag.slug.toLowerCase().includes(term)
      )
    }

    // Sort
    filtered.sort((a: any, b: any) => {
      let comparison = 0
      
      switch (sortBy) {
        case 'name':
          comparison = a.name.localeCompare(b.name)
          break
        case 'postCount':
          comparison = a.postCount - b.postCount
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      
      return sortOrder === 'desc' ? -comparison : comparison
    })

    setFilteredTags(filtered)
  }

  const openModal = (mode: 'create' | 'edit', tag?: Tag) => {
    setModalMode(mode)
    if (tag) {
      setSelectedTag(tag)
      setFormData(tag)
    } else {
      setSelectedTag(null)
      setFormData({
        name: '',
        slug: '',
        description: '',
        color: '#3b82f6'
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setSelectedTag(null)
    setFormData({})
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      
      if (!formData.name?.trim()) {
        toast.error('태그 이름을 입력해주세요.')
        return
      }

      // Auto-generate slug if not provided
      if (!formData.slug?.trim()) {
        const slugResponse = await ContentApi.generateSlug(formData.name, 'tag')
        formData.slug = slugResponse.data.slug
      }

      if (modalMode === 'create') {
        await ContentApi.createTag(formData as Tag)
        toast.success('태그가 생성되었습니다.')
      } else if (modalMode === 'edit' && selectedTag) {
        await ContentApi.updateTag(selectedTag.id, formData as Tag)
        toast.success('태그가 수정되었습니다.')
      }
      
      closeModal()
      loadTags()
    } catch (error) {
      console.error('Failed to save tag:', error)
      toast.error('저장에 실패했습니다.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (tagId: string) => {
    const tag = tags.find(t => t.id === tagId)
    
    if (tag?.postCount && tag.postCount > 0) {
      if (!confirm(`이 태그는 ${tag.postCount}개의 게시물에서 사용 중입니다. 정말 삭제하시겠습니까?`)) {
        return
      }
    } else if (!confirm('이 태그를 삭제하시겠습니까?')) {
      return
    }

    try {
      await ContentApi.deleteTag(tagId)
      toast.success('태그가 삭제되었습니다.')
      loadTags()
    } catch (error) {
      console.error('Failed to delete tag:', error)
      toast.error('삭제에 실패했습니다.')
    }
  }

  const handleQuickAdd = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!quickTagName.trim()) return

    try {
      const slugResponse = await ContentApi.generateSlug(quickTagName, 'tag')
      await ContentApi.createTag({
        name: quickTagName.trim(),
        slug: slugResponse.data.slug,
        description: '',
        color: '#3b82f6'
      } as Tag)
      
      toast.success('태그가 추가되었습니다.')
      setQuickTagName('')
      setQuickAddMode(false)
      loadTags()
    } catch (error) {
      console.error('Failed to create tag:', error)
      toast.error('태그 생성에 실패했습니다.')
    }
  }

  const handleSelectTag = (tagId: string) => {
    setSelectedTags(prev => 
      prev.includes(tagId) 
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleSelectAll = () => {
    if (selectedTags.length === filteredTags.length) {
      setSelectedTags([])
    } else {
      setSelectedTags(filteredTags.map(tag => tag.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedTags.length === 0) {
      toast.error('선택된 태그가 없습니다.')
      return
    }

    const tagsWithPosts = selectedTags
      .map(id => tags.find(t => t.id === id))
      .filter(tag => tag && tag.postCount > 0)

    if (tagsWithPosts.length > 0) {
      const totalPosts = tagsWithPosts.reduce((sum: any, tag: any) => sum + (tag?.postCount || 0), 0)
      if (!confirm(`선택된 태그 중 ${tagsWithPosts.length}개가 총 ${totalPosts}개의 게시물에서 사용 중입니다. 정말 삭제하시겠습니까?`)) {
        return
      }
    }

    try {
      await Promise.all(selectedTags.map(id => ContentApi.deleteTag(id)))
      toast.success(`${selectedTags.length}개 태그가 삭제되었습니다.`)
      setSelectedTags([])
      loadTags()
    } catch (error) {
      console.error('Failed to bulk delete tags:', error)
      toast.error('일괄 삭제에 실패했습니다.')
    }
  }

  const openMergeModal = (fromTag: Tag) => {
    setMergeFromTag(fromTag)
    setMergeToTag(null)
    setShowMergeModal(true)
  }

  const handleMergeTags = async () => {
    if (!mergeFromTag || !mergeToTag) {
      toast.error('병합할 태그를 선택해주세요.')
      return
    }

    if (mergeFromTag.id === mergeToTag.id) {
      toast.error('같은 태그는 병합할 수 없습니다.')
      return
    }

    try {
      await ContentApi.mergeTags(mergeFromTag.id, mergeToTag.id)
      toast.success(`"${mergeFromTag.name}" 태그가 "${mergeToTag.name}" 태그로 병합되었습니다.`)
      setShowMergeModal(false)
      setMergeFromTag(null)
      setMergeToTag(null)
      loadTags()
    } catch (error) {
      console.error('Failed to merge tags:', error)
      toast.error('태그 병합에 실패했습니다.')
    }
  }

  const updateFormData = (key: keyof Tag, value: string | number | boolean) => {
    setFormData(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const getDisplayedTags = () => {
    const startIndex = (currentPage - 1) * pageSize
    const endIndex = startIndex + pageSize
    return filteredTags.slice(startIndex, endIndex)
  }

  const totalPages = Math.ceil(filteredTags.length / pageSize)

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">태그를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">태그</h1>
          <p className="text-gray-600 mt-1">게시물 태그를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setQuickAddMode(!quickAddMode)}
            className="wp-button-secondary"
          >
            <Hash className="w-4 h-4 mr-2" />
            빠른 추가
          </button>
          <button
            onClick={loadTags}
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
            태그 추가
          </button>
        </div>
      </div>

      {/* Quick Add */}
      {quickAddMode && (
        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <form onSubmit={handleQuickAdd} className="flex items-center gap-2">
              <Hash className="w-5 h-5 text-green-500" />
              <input
                type="text"
                value={quickTagName}
                onChange={(e: any) => setQuickTagName(e.target.value)}
                placeholder="태그 이름을 입력하고 Enter를 누르세요"
                className="wp-input flex-1"
                autoFocus
              />
              <button
                type="submit"
                className="wp-button-primary"
                disabled={!quickTagName.trim()}
              >
                추가
              </button>
              <button
                type="button"
                onClick={() => {
                  setQuickAddMode(false)
                  setQuickTagName('')
                }}
                className="wp-button-secondary"
              >
                <X className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="태그 이름, 설명, 슬러그로 검색..."
                  value={searchTerm}
                  onChange={(e: any) => setSearchTerm(e.target.value)}
                  className="wp-input pl-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={sortBy}
                onChange={(e: any) => setSortBy(e.target.value as 'name' | 'postCount' | 'createdAt')}
                className="wp-select"
              >
                <option value="name">이름순</option>
                <option value="postCount">사용횟수순</option>
                <option value="createdAt">생성일순</option>
              </select>

              <button
                onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                className="wp-button-secondary"
                title={sortOrder === 'asc' ? '오름차순' : '내림차순'}
              >
                {sortOrder === 'asc' ? '↑' : '↓'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedTags.length > 0 && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <span className="text-blue-700">
                {selectedTags.length}개 태그가 선택되었습니다
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBulkDelete}
                  className="wp-button-secondary text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  선택 삭제
                </button>
                <button
                  onClick={() => setSelectedTags([])}
                  className="wp-button-secondary"
                >
                  선택 해제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tags Table */}
      <div className="wp-card">
        <div className="wp-card-body p-0">
          {filteredTags.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <TagIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                {searchTerm ? '검색 결과가 없습니다' : '태그가 없습니다'}
              </p>
              <p className="text-sm">
                {searchTerm ? '다른 검색어를 시도해보세요' : '새로운 태그를 추가해보세요'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th className="w-8">
                      <input
                        type="checkbox"
                        checked={selectedTags.length === filteredTags.length && filteredTags.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                    </th>
                    <th>이름</th>
                    <th>슬러그</th>
                    <th>설명</th>
                    <th>사용횟수</th>
                    <th>생성일</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {getDisplayedTags().map((tag) => (
                    <tr key={tag.id} className="hover:bg-gray-50">
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedTags.includes(tag.id)}
                          onChange={() => handleSelectTag(tag.id)}
                          className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                        />
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <div
                            className="w-3 h-3 rounded-full border border-gray-300"
                            style={{ backgroundColor: tag.color }}
                          />
                          <span className="font-medium text-gray-900">{tag.name}</span>
                        </div>
                      </td>
                      <td>
                        <code className="text-sm text-gray-600 bg-gray-100 px-2 py-1 rounded">
                          {tag.slug}
                        </code>
                      </td>
                      <td>
                        <div className="max-w-48 truncate text-sm text-gray-600">
                          {tag.description || '-'}
                        </div>
                      </td>
                      <td>
                        <span className="px-2 py-1 text-sm bg-blue-100 text-blue-800 rounded">
                          {tag.postCount}
                        </span>
                      </td>
                      <td>
                        <span className="text-sm text-gray-600">
                          {formatDate(tag.createdAt)}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openModal('edit', tag)}
                            className="text-blue-600 hover:text-blue-700"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => openMergeModal(tag)}
                            className="text-purple-600 hover:text-purple-700"
                            title="병합"
                          >
                            <Merge className="w-4 h-4" />
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
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-700">
                  {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, filteredTags.length)}개 / 총 {filteredTags.length}개
                </span>
                <select
                  value={pageSize}
                  onChange={(e: any) => setPageSize(parseInt(e.target.value))}
                  className="wp-select w-20"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-sm text-gray-700">개씩 보기</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="wp-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  이전
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = currentPage - 2 + i
                    if (page < 1 || page > totalPages) return null
                    
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        className={`px-3 py-1 text-sm rounded ${
                          page === currentPage
                            ? 'bg-admin-blue text-white'
                            : 'text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    )
                  })}
                </div>
                
                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="wp-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  다음
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tag Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  {modalMode === 'create' ? '태그 추가' : '태그 수정'}
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
                  <label className="wp-label">태그 이름 *</label>
                  <input
                    type="text"
                    value={formData.name || ''}
                    onChange={(e: any) => updateFormData('name', e.target.value)}
                    className="wp-input"
                    placeholder="태그 이름을 입력하세요"
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
                    placeholder="태그에 대한 설명을 입력하세요"
                  />
                </div>

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

      {/* Merge Modal */}
      {showMergeModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">태그 병합</h3>
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800">
                    첫 번째 태그의 모든 게시물이 두 번째 태그로 이동되고, 첫 번째 태그는 삭제됩니다.
                  </p>
                </div>

                <div>
                  <label className="wp-label">병합할 태그 (삭제됨)</label>
                  <div className="p-3 border border-gray-300 rounded bg-gray-50">
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border border-gray-300"
                        style={{ backgroundColor: mergeFromTag?.color }}
                      />
                      <span className="font-medium">{mergeFromTag?.name}</span>
                      <span className="text-sm text-gray-600">
                        ({mergeFromTag?.postCount}개 게시물)
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-center">
                  <ArrowRight className="w-6 h-6 text-gray-400" />
                </div>

                <div>
                  <label className="wp-label">대상 태그 (유지됨)</label>
                  <select
                    value={mergeToTag?.id || ''}
                    onChange={(e: any) => {
                      const selectedTag = tags.find(t => t.id === e.target.value)
                      setMergeToTag(selectedTag || null)
                    }}
                    className="wp-select"
                  >
                    <option value="">태그를 선택하세요</option>
                    {tags
                      .filter(tag => tag.id !== mergeFromTag?.id)
                      .map(tag => (
                        <option key={tag.id} value={tag.id}>
                          {tag.name} ({tag.postCount}개 게시물)
                        </option>
                      ))}
                  </select>
                </div>

                {mergeToTag && (
                  <div className="p-3 border border-gray-300 rounded bg-green-50">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-green-800">
                        병합 후 "{mergeToTag.name}" 태그는 총 {(mergeFromTag?.postCount || 0) + mergeToTag.postCount}개의 게시물을 가지게 됩니다.
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowMergeModal(false)}
                  className="wp-button-secondary"
                >
                  취소
                </button>
                <button
                  onClick={handleMergeTags}
                  disabled={!mergeToTag}
                  className="wp-button-primary bg-red-600 hover:bg-red-700 disabled:opacity-50"
                >
                  <Merge className="w-4 h-4 mr-2" />
                  병합
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Tags