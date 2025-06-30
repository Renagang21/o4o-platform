import React, { useState, useEffect } from 'react'
import { 
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Copy,
  FileText,
  Globe,
  Lock,
  Key,
  Calendar,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Layers,
  Home,
  X,
  ChevronUp,
  Layout,
  Menu
} from 'lucide-react'
import { Page } from '@/types/content'
import { ContentApi } from '@/api/contentApi'
import { Link } from 'react-router-dom'
import toast from 'react-hot-toast'

const AllPages: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [pages, setPages] = useState<Page[]>([])
  const [filteredPages, setFilteredPages] = useState<Page[]>([])
  const [selectedPages, setSelectedPages] = useState<string[]>([])
  const [expandedPages, setExpandedPages] = useState<Set<string>>(new Set())
  const [draggedPage, setDraggedPage] = useState<string | null>(null)

  // Filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    status: '',
    template: '',
    parent: '',
    menuLocation: '',
    hasChildren: ''
  })

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)
  const [templates, setTemplates] = useState<Array<{id: string, name: string}>>([])
  const [stats, setStats] = useState({
    total: 0,
    published: 0,
    draft: 0,
    private: 0,
    password: 0,
    homepage: 0,
    inMenu: 0
  })

  useEffect(() => {
    loadPages()
    loadTemplates()
  }, [])

  useEffect(() => {
    applyFilters()
  }, [pages, filters])

  const loadPages = async () => {
    try {
      setLoading(true)
      const response = await ContentApi.getPages()
      setPages(response.data)
      calculateStats(response.data)
    } catch (error) {
      console.error('Failed to load pages:', error)
      toast.error('페이지를 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplates = async () => {
    try {
      const response = await ContentApi.getTemplates('page')
      setTemplates(response.data.map(t => ({ id: t.id, name: t.name })))
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }


  const calculateStats = (pagesData: Page[]) => {
    const stats = {
      total: pagesData.length,
      published: pagesData.filter(p => p.status === 'published').length,
      draft: pagesData.filter(p => p.status === 'draft').length,
      private: pagesData.filter(p => p.status === 'private').length,
      password: pagesData.filter(p => p.passwordProtected).length,
      homepage: pagesData.filter(p => p.isHomepage).length,
      inMenu: pagesData.filter(p => p.showInMenu).length
    }
    setStats(stats)
  }

  const applyFilters = () => {
    let filtered = [...pages]

    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(page => 
        page.title.toLowerCase().includes(term) ||
        page.excerpt?.toLowerCase().includes(term) ||
        page.slug.toLowerCase().includes(term)
      )
    }

    // Status filter
    if (filters.status) {
      if (filters.status === 'password') {
        filtered = filtered.filter(page => page.passwordProtected)
      } else {
        filtered = filtered.filter(page => page.status === filters.status)
      }
    }

    // Template filter
    if (filters.template) {
      filtered = filtered.filter(page => page.template === filters.template)
    }

    // Parent filter
    if (filters.parent) {
      if (filters.parent === 'top-level') {
        filtered = filtered.filter(page => !page.parentId)
      } else {
        filtered = filtered.filter(page => page.parentId === filters.parent)
      }
    }

    // Menu location filter
    if (filters.menuLocation === 'in-menu') {
      filtered = filtered.filter(page => page.showInMenu)
    } else if (filters.menuLocation === 'not-in-menu') {
      filtered = filtered.filter(page => !page.showInMenu)
    }

    // Has children filter
    if (filters.hasChildren === 'yes') {
      filtered = filtered.filter(page => page.children && page.children.length > 0)
    } else if (filters.hasChildren === 'no') {
      filtered = filtered.filter(page => !page.children || page.children.length === 0)
    }

    setFilteredPages(filtered)
  }

  const updateFilter = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value
    }))
  }

  const clearFilters = () => {
    setFilters({
      searchTerm: '',
      status: '',
      template: '',
      parent: '',
      menuLocation: '',
      hasChildren: ''
    })
  }

  const handleSelectPage = (pageId: string) => {
    setSelectedPages(prev => 
      prev.includes(pageId) 
        ? prev.filter(id => id !== pageId)
        : [...prev, pageId]
    )
  }

  const handleSelectAll = () => {
    if (selectedPages.length === filteredPages.length) {
      setSelectedPages([])
    } else {
      setSelectedPages(getVisiblePageIds(filteredPages))
    }
  }

  const getVisiblePageIds = (pages: Page[]): string[] => {
    const ids: string[] = []
    
    const collectIds = (pageList: Page[]) => {
      pageList.forEach(page => {
        ids.push(page.id)
        if (page.children && expandedPages.has(page.id)) {
          collectIds(page.children)
        }
      })
    }
    
    collectIds(pages)
    return ids
  }

  const handleBulkAction = async (action: string) => {
    if (selectedPages.length === 0) {
      toast.error('선택된 페이지가 없습니다.')
      return
    }

    try {
      switch (action) {
        case 'publish':
          await ContentApi.bulkUpdatePages(selectedPages, { status: 'published' })
          toast.success(`${selectedPages.length}개 페이지가 발행되었습니다.`)
          break
        case 'draft':
          await ContentApi.bulkUpdatePages(selectedPages, { status: 'draft' })
          toast.success(`${selectedPages.length}개 페이지가 초안으로 변경되었습니다.`)
          break
        case 'private':
          await ContentApi.bulkUpdatePages(selectedPages, { status: 'private' })
          toast.success(`${selectedPages.length}개 페이지가 비공개로 변경되었습니다.`)
          break
        case 'delete':
          if (confirm(`선택된 ${selectedPages.length}개 페이지를 삭제하시겠습니까?`)) {
            await ContentApi.bulkDeletePages(selectedPages)
            toast.success(`${selectedPages.length}개 페이지가 삭제되었습니다.`)
          }
          break
      }
      setSelectedPages([])
      loadPages()
    } catch (error) {
      console.error('Bulk action failed:', error)
      toast.error('일괄 작업에 실패했습니다.')
    }
  }

  const handleDeletePage = async (pageId: string) => {
    const page = findPageById(pages, pageId)
    
    if (page?.children && page.children.length > 0) {
      if (!confirm(`이 페이지에는 ${page.children.length}개의 하위 페이지가 있습니다. 정말 삭제하시겠습니까?`)) {
        return
      }
    } else if (!confirm('이 페이지를 삭제하시겠습니까?')) {
      return
    }

    try {
      await ContentApi.deletePage(pageId)
      toast.success('페이지가 삭제되었습니다.')
      loadPages()
    } catch (error) {
      console.error('Failed to delete page:', error)
      toast.error('삭제에 실패했습니다.')
    }
  }

  const handleClonePage = async (pageId: string) => {
    try {
      await ContentApi.clonePage(pageId)
      toast.success('페이지가 복제되었습니다.')
      loadPages()
    } catch (error) {
      console.error('Failed to clone page:', error)
      toast.error('복제에 실패했습니다.')
    }
  }

  const toggleExpanded = (pageId: string) => {
    setExpandedPages(prev => {
      const newSet = new Set(prev)
      if (newSet.has(pageId)) {
        newSet.delete(pageId)
      } else {
        newSet.add(pageId)
      }
      return newSet
    })
  }

  const findPageById = (pages: Page[], id: string): Page | null => {
    for (const page of pages) {
      if (page.id === id) return page
      if (page.children) {
        const found = findPageById(page.children, id)
        if (found) return found
      }
    }
    return null
  }

  const handleDragStart = (e: React.DragEvent, pageId: string) => {
    setDraggedPage(pageId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = async (e: React.DragEvent, targetPageId: string) => {
    e.preventDefault()
    
    if (!draggedPage || draggedPage === targetPageId) {
      setDraggedPage(null)
      return
    }

    try {
      const draggedPageData = findPageById(pages, draggedPage)
      if (draggedPageData) {
        await ContentApi.updatePage(draggedPage, { parentId: targetPageId })
        toast.success('페이지가 이동되었습니다.')
        loadPages()
      }
    } catch (error) {
      console.error('Failed to move page:', error)
      toast.error('이동에 실패했습니다.')
    }
    
    setDraggedPage(null)
  }

  const getStatusBadge = (page: Page) => {
    if (page.passwordProtected) {
      return (
        <span className="px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-800 flex items-center gap-1">
          <Key className="w-3 h-3" />
          암호보호
        </span>
      )
    }

    const statusConfig = {
      published: { bg: 'bg-green-100', text: 'text-green-800', label: '발행됨', icon: Globe },
      draft: { bg: 'bg-gray-100', text: 'text-gray-800', label: '초안', icon: FileText },
      private: { bg: 'bg-red-100', text: 'text-red-800', label: '비공개', icon: Lock },
      scheduled: { bg: 'bg-blue-100', text: 'text-blue-800', label: '예약됨', icon: Calendar },
      archived: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '보관됨', icon: Layers }
    }
    
    const config = statusConfig[page.status] || statusConfig.draft
    const IconComponent = config.icon
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text} flex items-center gap-1`}>
        <IconComponent className="w-3 h-3" />
        {config.label}
      </span>
    )
  }

  const getBlockComplexity = (content: any) => {
    if (!content || !content.blocks) return { level: 'Simple', count: 0, types: [] }
    
    const blocks = content.blocks
    const blockTypes = blocks.map((b: any) => b.type)
    const uniqueTypes = [...new Set(blockTypes)]
    
    let level = 'Simple'
    if (blocks.length > 10) level = 'Complex'
    else if (blocks.length > 5) level = 'Medium'
    
    const layoutBlocks = blocks.filter((b: any) => 
      ['hero-section', 'feature-grid', 'pricing-table', 'gallery'].includes(b.type)
    ).length
    
    if (layoutBlocks > 2) level = 'Complex'
    
    return {
      level,
      count: blocks.length,
      types: uniqueTypes.slice(0, 3)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const renderPage = (page: Page, level: number = 0) => {
    const hasChildren = page.children && page.children.length > 0
    const isExpanded = expandedPages.has(page.id)
    const indent = level * 24
    const complexity = getBlockComplexity(page.content)

    return (
      <div key={page.id}>
        <div
          className={`flex items-center py-3 px-4 hover:bg-gray-50 border-l-2 transition-all ${
            draggedPage === page.id ? 'opacity-50' : ''
          } ${page.isHomepage ? 'border-l-blue-500 bg-blue-50' : 'border-l-transparent'}`}
          style={{ paddingLeft: `${16 + indent}px` }}
          draggable
          onDragStart={(e) => handleDragStart(e, page.id)}
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, page.id)}
        >
          {/* Checkbox */}
          <input
            type="checkbox"
            checked={selectedPages.includes(page.id)}
            onChange={() => handleSelectPage(page.id)}
            className="rounded border-gray-300 text-admin-blue focus:ring-admin-blue mr-3"
          />

          {/* Expand/Collapse Button */}
          <button
            onClick={() => toggleExpanded(page.id)}
            className={`mr-2 ${hasChildren ? 'visible' : 'invisible'}`}
          >
            {hasChildren && isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
          </button>

          {/* Page Icon & Homepage Indicator */}
          <div className="mr-3 flex items-center">
            {page.isHomepage ? (
              <Home className="w-5 h-5 text-blue-600" />
            ) : (
              <FileText className="w-5 h-5 text-gray-500" />
            )}
          </div>

          {/* Page Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                to={`/pages/edit/${page.id}`}
                className="font-medium text-gray-900 hover:text-admin-blue truncate"
              >
                {page.title}
              </Link>
              
              {page.isHomepage && (
                <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded">
                  홈페이지
                </span>
              )}
              
              {hasChildren && (
                <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  {page.children?.length || 0}개 하위
                </span>
              )}
            </div>
            
            {page.excerpt && (
              <div className="text-sm text-gray-500 truncate mt-1">
                {page.excerpt}
              </div>
            )}
          </div>

          {/* Template Info */}
          <div className="mx-4 text-sm text-gray-600">
            <div className="flex items-center gap-1">
              <Layout className="w-4 h-4" />
              <span>{page.template || 'default'}</span>
            </div>
          </div>

          {/* Block Complexity */}
          <div className="mx-4 text-sm">
            <div className="flex items-center gap-1">
              <Layers className="w-4 h-4 text-gray-400" />
              <span className={`px-2 py-1 text-xs rounded ${
                complexity.level === 'Complex' ? 'bg-red-100 text-red-800' :
                complexity.level === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                'bg-green-100 text-green-800'
              }`}>
                {complexity.level}
              </span>
              <span className="text-gray-500">({complexity.count})</span>
            </div>
          </div>

          {/* Menu Status */}
          <div className="mx-4 text-sm">
            {page.showInMenu ? (
              <div className="flex items-center gap-1 text-green-600">
                <Menu className="w-4 h-4" />
                <span>메뉴</span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-gray-400">
                <Menu className="w-4 h-4" />
                <span>-</span>
              </div>
            )}
          </div>

          {/* Status */}
          <div className="mx-4">
            {getStatusBadge(page)}
          </div>

          {/* Date */}
          <div className="mx-4 text-sm text-gray-600">
            {formatDate(page.updatedAt)}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 ml-2">
            <Link
              to={`/pages/preview/${page.id}`}
              className="text-blue-600 hover:text-blue-700 p-1"
              title="미리보기"
              target="_blank"
            >
              <Eye className="w-4 h-4" />
            </Link>
            <Link
              to={`/pages/edit/${page.id}`}
              className="text-yellow-600 hover:text-yellow-700 p-1"
              title="수정"
            >
              <Edit className="w-4 h-4" />
            </Link>
            <button
              onClick={() => handleClonePage(page.id)}
              className="text-green-600 hover:text-green-700 p-1"
              title="복제"
            >
              <Copy className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDeletePage(page.id)}
              className="text-red-600 hover:text-red-700 p-1"
              title="삭제"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Children */}
        {hasChildren && isExpanded && page.children && (
          <div>
            {page.children.map(child => renderPage(child, level + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">페이지를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">페이지</h1>
          <p className="text-gray-600 mt-1">사이트 페이지와 계층 구조를 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/pages/templates"
            className="wp-button-secondary"
          >
            <Layout className="w-4 h-4 mr-2" />
            템플릿
          </Link>
          <Link
            to="/pages/menus"
            className="wp-button-secondary"
          >
            <Menu className="w-4 h-4 mr-2" />
            메뉴
          </Link>
          <button
            onClick={loadPages}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <Link
            to="/pages/new"
            className="wp-button-primary"
          >
            <Plus className="w-4 h-4 mr-2" />
            페이지 추가
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
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
              <Globe className="w-6 h-6 text-green-500" />
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

        <div className="wp-card border-l-4 border-l-red-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">비공개</p>
                <p className="text-xl font-bold text-red-600">{stats.private}</p>
              </div>
              <Lock className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-orange-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">암호보호</p>
                <p className="text-xl font-bold text-orange-600">{stats.password}</p>
              </div>
              <Key className="w-6 h-6 text-orange-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">홈페이지</p>
                <p className="text-xl font-bold text-blue-600">{stats.homepage}</p>
              </div>
              <Home className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-purple-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">메뉴</p>
                <p className="text-xl font-bold text-purple-600">{stats.inMenu}</p>
              </div>
              <Menu className="w-6 h-6 text-purple-500" />
            </div>
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
                    placeholder="페이지 제목, 내용, 슬러그로 검색..."
                    value={filters.searchTerm}
                    onChange={(e) => updateFilter('searchTerm', e.target.value)}
                    className="wp-input pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.status}
                  onChange={(e) => updateFilter('status', e.target.value)}
                  className="wp-select min-w-[120px]"
                >
                  <option value="">전체 상태</option>
                  <option value="published">발행됨</option>
                  <option value="draft">초안</option>
                  <option value="private">비공개</option>
                  <option value="password">암호보호</option>
                </select>

                <select
                  value={filters.template}
                  onChange={(e) => updateFilter('template', e.target.value)}
                  className="wp-select min-w-[120px]"
                >
                  <option value="">전체 템플릿</option>
                  {templates.map(template => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                    </option>
                  ))}
                </select>

                <button
                  onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                  className="wp-button-secondary"
                >
                  <Filter className="w-4 h-4 mr-2" />
                  고급 필터
                  {showAdvancedFilters ? <ChevronUp className="w-4 h-4 ml-1" /> : <ChevronDown className="w-4 h-4 ml-1" />}
                </button>
              </div>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <label className="wp-label">부모 페이지</label>
                  <select
                    value={filters.parent}
                    onChange={(e) => updateFilter('parent', e.target.value)}
                    className="wp-select"
                  >
                    <option value="">전체</option>
                    <option value="top-level">최상위 페이지만</option>
                    {pages.filter(p => !p.parentId).map(page => (
                      <option key={page.id} value={page.id}>
                        {page.title}의 하위
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="wp-label">메뉴 포함 여부</label>
                  <select
                    value={filters.menuLocation}
                    onChange={(e) => updateFilter('menuLocation', e.target.value)}
                    className="wp-select"
                  >
                    <option value="">전체</option>
                    <option value="in-menu">메뉴에 포함됨</option>
                    <option value="not-in-menu">메뉴에서 제외됨</option>
                  </select>
                </div>
                <div>
                  <label className="wp-label">하위 페이지</label>
                  <select
                    value={filters.hasChildren}
                    onChange={(e) => updateFilter('hasChildren', e.target.value)}
                    className="wp-select"
                  >
                    <option value="">전체</option>
                    <option value="yes">하위 페이지 있음</option>
                    <option value="no">하위 페이지 없음</option>
                  </select>
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
      {selectedPages.length > 0 && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <span className="text-blue-700">
                {selectedPages.length}개 페이지가 선택되었습니다
              </span>
              <div className="flex items-center gap-2">
                <select
                  onChange={(e) => e.target.value && handleBulkAction(e.target.value)}
                  className="wp-select"
                  value=""
                >
                  <option value="">일괄 작업 선택</option>
                  <option value="publish">발행</option>
                  <option value="draft">초안으로 변경</option>
                  <option value="private">비공개로 변경</option>
                  <option value="delete">삭제</option>
                </select>
                <button
                  onClick={() => setSelectedPages([])}
                  className="wp-button-secondary"
                >
                  선택 해제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pages Hierarchy */}
      <div className="wp-card">
        <div className="wp-card-header">
          <div className="flex items-center justify-between">
            <h2 className="wp-card-title">페이지 계층 구조</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSelectAll}
                className="wp-button-secondary text-sm"
              >
                {selectedPages.length === getVisiblePageIds(filteredPages).length ? '전체 해제' : '전체 선택'}
              </button>
            </div>
          </div>
        </div>
        <div className="wp-card-body p-0">
          {filteredPages.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <FileText className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">페이지가 없습니다</p>
              <p className="text-sm">새로운 페이지를 추가해보세요.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filteredPages.filter(page => !page.parentId).map(page => renderPage(page))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AllPages