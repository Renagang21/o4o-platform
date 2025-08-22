import { useState, useEffect, FC } from 'react';
import { 
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Copy,
  FileText,
  Users,
  RefreshCw,
  CheckCircle,
  Clock,
  Archive,
  Tag,
  Folder,
  X,
  ChevronDown
} from 'lucide-react'
import { Post, PostStatus, PostType } from '@/types/content'
import { ContentApi } from '@/api/contentApi'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const AllPosts: FC = () => {
  const [loading, setLoading] = useState(true)
  const [posts, setPosts] = useState<any[]>([])
  const [filteredPosts, setFilteredPosts] = useState<any[]>([])
  const [selectedPosts, setSelectedPosts] = useState<any[]>([])
  const [_viewMode, _setViewMode] = useState<'list' | 'grid'>('list')
  const [_showBulkActions, _setShowBulkActions] = useState(false)

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [totalItems, setTotalItems] = useState(0)

  // Filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: '',
    category: '',
    author: '',
    dateFrom: '',
    dateTo: '',
    type: 'post' as PostType
  })
  
  // Temporary filters (before applying)
  const [tempFilters, setTempFilters] = useState({
    searchTerm: '',
    status: '',
    category: '',
    author: '',
    dateFrom: '',
    dateTo: '',
    type: 'post' as PostType
  })

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([])
  const [authors, setAuthors] = useState<Array<{id: string, name: string}>>([])

  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    archived: 0,
    scheduled: 0
  })

  useEffect(() => {
    loadPosts()
    loadCategories()
    loadAuthors()
  }, [currentPage, pageSize, filters.type])

  useEffect(() => {
    applyFilters()
  }, [posts, filters])

  const loadPosts = async () => {
    try {
      setLoading(true)
      const response = await ContentApi.getPosts(
        currentPage, 
        pageSize, 
        { type: filters.type }
      )
      setPosts(response.data)
      setTotalItems(response.pagination?.totalItems || 0)
      calculateStats(response.data)
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('게시물을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadCategories = async () => {
    try {
      const response = await ContentApi.getCategories()
      setCategories(response.data)
    } catch (error: any) {
    // Error logging - use proper error handler
    }
  }

  const loadAuthors = async () => {
    try {
      const response = await ContentApi.getAuthors()
      setAuthors(response.data)
    } catch (error: any) {
    // Error logging - use proper error handler
    }
  }

  const calculateStats = (postsData: Post[]) => {
    const stats = {
      total: postsData.length,
      published: postsData.filter((p: any) => p.status === 'published').length,
      draft: postsData.filter((p: any) => p.status === 'draft').length,
      archived: postsData.filter((p: any) => p.status === 'archived').length,
      scheduled: postsData.filter((p: any) => p.status === 'scheduled').length
    }
    setStats(stats)
  }

  const applyFilters = () => {
    let filtered = [...posts]

    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter((post: any) => 
        post.title.toLowerCase().includes(term) ||
        post.excerpt?.toLowerCase().includes(term) ||
        post.author.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (filters.status) {
      filtered = filtered.filter((post: any) => post.status === filters.status)
    }

    // Category filter
    if (filters.category) {
      filtered = filtered.filter((post: any) => post.category === filters.category)
    }

    // Author filter
    if (filters.author) {
      filtered = filtered.filter((post: any) => post.author === filters.author)
    }

    // Date range filter
    if (filters.dateFrom) {
      const fromDate = new Date(filters.dateFrom)
      filtered = filtered.filter((post: any) => new Date(post.createdAt) >= fromDate)
    }
    if (filters.dateTo) {
      const toDate = new Date(filters.dateTo)
      toDate.setHours(23, 59, 59, 999)
      filtered = filtered.filter((post: any) => new Date(post.createdAt) <= toDate)
    }

    setFilteredPosts(filtered)
  }

  const updateTempFilter = (key: string, value: string) => {
    setTempFilters((prev: any) => ({
      ...prev,
      [key]: value
    }))
  }
  
  const applyFiltersClick = () => {
    setFilters(tempFilters)
  }

  const clearFilters = () => {
    const clearedFilters = {
      searchTerm: '',
      status: '',
      category: '',
      author: '',
      dateFrom: '',
      dateTo: '',
      type: filters.type
    }
    setFilters(clearedFilters)
    setTempFilters(clearedFilters)
  }

  const handleSelectPost = (postId: string) => {
    setSelectedPosts((prev: any) => 
      prev.includes(postId) 
        ? prev.filter((id: any) => id !== postId)
        : [...prev, postId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPosts.length === filteredPosts.length) {
      setSelectedPosts([])
    } else {
      setSelectedPosts(filteredPosts.map((post: any) => post.id))
    }
  }

  const handleBulkAction = async (action: string) => {
    if (selectedPosts.length === 0) {
      toast.error('선택된 게시물이 없습니다.')
      return
    }

    try {
      switch (action) {
        case 'publish':
          await ContentApi.bulkUpdatePosts(selectedPosts, { status: 'published' })
          toast.success(`${selectedPosts.length}개 게시물이 발행되었습니다.`)
          break
        case 'draft':
          await ContentApi.bulkUpdatePosts(selectedPosts, { status: 'draft' })
          toast.success(`${selectedPosts.length}개 게시물이 초안으로 변경되었습니다.`)
          break
        case 'archive':
          await ContentApi.bulkUpdatePosts(selectedPosts, { status: 'archived' })
          toast.success(`${selectedPosts.length}개 게시물이 보관되었습니다.`)
          break
        case 'delete':
          if (confirm(`선택된 ${selectedPosts.length}개 게시물을 삭제하시겠습니까?`)) {
            await ContentApi.bulkDeletePosts(selectedPosts)
            toast.success(`${selectedPosts.length}개 게시물이 삭제되었습니다.`)
          }
          break
      }
      setSelectedPosts([])
      loadPosts()
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('일괄 작업에 실패했습니다.')
    }
  }

  const handleDeletePost = async (postId: string) => {
    if (confirm('이 게시물을 삭제하시겠습니까?')) {
      try {
        await ContentApi.deletePost(postId)
        toast.success('게시물이 삭제되었습니다.')
        loadPosts()
      } catch (error: any) {
    // Error logging - use proper error handler
        toast.error('삭제에 실패했습니다.')
      }
    }
  }

  const handleClonePost = async (postId: string) => {
    try {
      await ContentApi.clonePost(postId)
      toast.success('게시물이 복제되었습니다.')
      loadPosts()
    } catch (error: any) {
    // Error logging - use proper error handler
      toast.error('복제에 실패했습니다.')
    }
  }

  const getStatusBadge = (status: PostStatus) => {
    const statusConfig: Record<PostStatus, {bg: string; text: string; label: string}> = {
      published: { bg: 'bg-green-100', text: 'text-green-800', label: '발행됨' },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: '초안' },
      archived: { bg: 'bg-red-100', text: 'text-red-800', label: '보관됨' },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: '예약됨' },
      private: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '비공개' }
    }
    const config = statusConfig[status] || statusConfig.draft
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    )
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const postTypes = [
    { value: 'post', label: '게시물' },
    { value: 'notice', label: '공지사항' },
    { value: 'news', label: '뉴스' }
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">게시물을 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">게시물</h1>
          <p className="text-gray-600 mt-1">
            블로그 게시물, 공지사항 등을 관리합니다
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/posts/categories"
            className="wp-button-secondary"
          >
            <Folder className="w-4 h-4 mr-2" />
            카테고리
          </Link>
          <Link
            to="/posts/tags"
            className="wp-button-secondary"
          >
            <Tag className="w-4 h-4 mr-2" />
            태그
          </Link>
          <button
            onClick={loadPosts}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <Link
            to="/posts/new"
            className="wp-button-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            게시물 추가
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체</p>
                <p className="text-xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <FileText className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">발행됨</p>
                <p className="text-xl font-bold text-green-600">{stats.published}</p>
              </div>
              <CheckCircle className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-gray-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">초안</p>
                <p className="text-xl font-bold text-gray-600">{stats.draft}</p>
              </div>
              <FileText className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">예약됨</p>
                <p className="text-xl font-bold text-blue-600">{stats.scheduled}</p>
              </div>
              <Clock className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-red-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">보관됨</p>
                <p className="text-xl font-bold text-red-600">{stats.archived}</p>
              </div>
              <Archive className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Post Type Tabs */}
      <div className="wp-card">
        <div className="wp-card-header border-b-0">
          <div className="flex space-x-1">
            {postTypes.map((type: any) => (
              <button
                key={type.value}
                onClick={() => {
                  updateTempFilter('type', type.value)
                  setFilters((prev: any) => ({...prev, type: type.value}))
                }}
                className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-t-lg border-b-2 ${
                  filters.type === type.value
                    ? 'text-admin-blue border-admin-blue bg-blue-50'
                    : 'text-gray-500 border-transparent hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {type.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="space-y-4">
            {/* Basic Filters */}
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="제목, 내용, 작성자로 검색..."
                    value={tempFilters.searchTerm}
                    onChange={(e: any) => updateTempFilter('searchTerm', e.target.value)}
                    className="wp-input pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={tempFilters.status}
                  onChange={(e: any) => updateTempFilter('status', e.target.value)}
                  className="wp-select min-w-[120px]"
                >
                  <option value="">전체 상태</option>
                  <option value="published">발행됨</option>
                  <option value="draft">초안</option>
                  <option value="scheduled">예약됨</option>
                  <option value="archived">보관됨</option>
                </select>

                <select
                  value={tempFilters.category}
                  onChange={(e: any) => updateTempFilter('category', e.target.value)}
                  className="wp-select min-w-[120px]"
                >
                  <option value="">전체 카테고리</option>
                  {categories.map((category: any) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={applyFiltersClick}
                  className="wp-button-primary"
                >
                  필터 적용
                </button>

                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="wp-button-secondary"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  고급 필터
                  <ChevronDown className={`w-4 h-4 ml-1 transform transition-transform ${showAdvancedFilters ? 'rotate-180' : ''}`} />
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="wp-label">작성자</label>
                  <select
                    value={tempFilters.author}
                    onChange={(e: any) => updateTempFilter('author', e.target.value)}
                    className="wp-select"
                  >
                    <option value="">전체 작성자</option>
                    {authors.map((author: any) => (
                      <option key={author.id} value={author.id}>
                        {author.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="wp-label">시작일</label>
                  <input
                    type="date"
                    value={tempFilters.dateFrom}
                    onChange={(e: any) => updateTempFilter('dateFrom', e.target.value)}
                    className="wp-input"
                  />
                </div>
                <div>
                  <label className="wp-label">종료일</label>
                  <input
                    type="date"
                    value={tempFilters.dateTo}
                    onChange={(e: any) => updateTempFilter('dateTo', e.target.value)}
                    className="wp-input"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    onClick={clearFilters}
                    className="wp-button-secondary w-full"
                  >
                    <X className="w-4 h-4 mr-2" />
                    필터 초기화
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedPosts.length > 0 && (
        <div className="wp-card bg-blue-50 border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <span className="text-blue-700 font-medium">
                {selectedPosts.length}개 게시물이 선택되었습니다
              </span>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 mr-2">일괄 작업:</label>
                <select
                  onChange={(e: any) => e.target.value && handleBulkAction(e.target.value)}
                  className="wp-select"
                  value=""
                >
                  <option value="">작업 선택...</option>
                  <option value="publish">발행</option>
                  <option value="draft">초안으로 변경</option>
                  <option value="archive">보관</option>
                  <option value="delete">삭제</option>
                </select>
                <button
                  onClick={() => setSelectedPosts([])}
                  className="wp-button-secondary"
                >
                  선택 해제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Posts Table */}
      <div className="wp-card">
        <div className="wp-card-body p-0">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">게시물이 없습니다</p>
              <p className="text-sm">새로운 게시물을 작성해보세요.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="wp-table">
                <thead>
                  <tr>
                    <th className="w-8">
                      <input
                        type="checkbox"
                        checked={selectedPosts.length === filteredPosts.length && filteredPosts.length > 0}
                        onChange={handleSelectAll}
                        className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                      />
                    </th>
                    <th>제목</th>
                    <th>작성자</th>
                    <th>카테고리</th>
                    <th>조회수</th>
                    <th>상태</th>
                    <th>날짜</th>
                    <th>작업</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPosts.map((post: any) => (
                    <tr key={post.id} className="hover:bg-gray-50">
                      <td>
                        <input
                          type="checkbox"
                          checked={selectedPosts.includes(post.id)}
                          onChange={() => handleSelectPost(post.id)}
                          className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue"
                        />
                      </td>
                      <td>
                        <div>
                          <Link
                            to={`/posts/edit/${post.id}`}
                            className="font-medium text-gray-900 hover:text-admin-blue"
                          >
                            {post.title}
                          </Link>
                          {post.excerpt && (
                            <div className="text-sm text-gray-500 mt-1 truncate max-w-md">
                              {post.excerpt}
                            </div>
                          )}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Users className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{post.author}</span>
                        </div>
                      </td>
                      <td>
                        {post.category && (
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                            {categories.find((c: any) => c.id === post.category)?.name || post.category}
                          </span>
                        )}
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Eye className="w-4 h-4 text-gray-400" />
                          <span className="text-sm">{post.views}</span>
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(post.status)}
                      </td>
                      <td>
                        <div className="text-sm text-gray-600">
                          {formatDate(post.createdAt)}
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-1">
                          <Link
                            to={`/posts/preview/${post.id}`}
                            className="text-blue-600 hover:text-blue-700"
                            title="미리보기"
                            target="_blank"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            to={`/posts/edit/${post.id}`}
                            className="text-yellow-600 hover:text-yellow-700"
                            title="수정"
                          >
                            <Edit className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => handleClonePost(post.id)}
                            className="text-green-600 hover:text-green-700"
                            title="복제"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeletePost(post.id)}
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
      <div className="wp-card">
        <div className="wp-card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-700">
                {((currentPage - 1) * pageSize) + 1}-{Math.min(currentPage * pageSize, totalItems)}개 / 총 {totalItems}개
              </span>
              <select
                value={pageSize}
                onChange={(e: any) => setPageSize(parseInt(e.target.value))}
                className="wp-select w-20"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
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
                {Array.from({ length: Math.min(5, Math.ceil(totalItems / pageSize)) }, (_, i) => {
                  const page = currentPage - 2 + i
                  if (page < 1 || page > Math.ceil(totalItems / pageSize)) return null
                  
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
                onClick={() => setCurrentPage(Math.min(Math.ceil(totalItems / pageSize), currentPage + 1))}
                disabled={currentPage === Math.ceil(totalItems / pageSize)}
                className="wp-button-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                다음
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AllPosts