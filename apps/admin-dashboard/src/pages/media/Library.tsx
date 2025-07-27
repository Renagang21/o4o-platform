import { useState, useEffect, FC, Fragment } from 'react';
import { 
  Upload,
  Search,
  Filter,
  Grid3X3,
  List,
  Folder,
  FolderPlus,
  Image,
  Video,
  Music,
  FileText,
  Trash2,
  RefreshCw,
  X,
  ChevronDown,
  HardDrive
} from 'lucide-react'
import { MediaFile, MediaFolder } from '@/types/content'
import { ContentApi } from '@/api/contentApi'
import MediaGrid from './components/MediaGrid'
import MediaList from './components/MediaList'
import MediaUploader from '@/components/media/MediaUploader'
import toast from 'react-hot-toast'

const Library: React.FC = () => {
  const [loading, setLoading] = useState(true)
  const [files, setFiles] = useState<MediaFile[]>([])
  const [folders, setFolders] = useState<MediaFolder[]>([])
  const [filteredFiles, setFilteredFiles] = useState<MediaFile[]>([])
  const [selectedFiles, setSelectedFiles] = useState<string[]>([])
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [currentFolder, setCurrentFolder] = useState<string>('')
  const [showUploader, setShowUploader] = useState(false)
  const [showFolderCreate, setShowFolderCreate] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')

  // Pagination
  const [currentPage, setCurrentPage] = useState(1)
  const [pageSize, setPageSize] = useState(50)
  const [totalItems, setTotalItems] = useState(0)

  // Filters
  const [filters, setFilters] = useState({
    searchTerm: '',
    fileType: '',
    dateRange: '',
    sizeRange: '',
    uploadedBy: ''
  })

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false)

  const [stats, setStats] = useState({
    totalFiles: 0,
    totalSize: 0,
    images: 0,
    videos: 0,
    documents: 0,
    others: 0
  })

  useEffect(() => {
    loadMediaFiles()
    loadFolders()
  }, [currentPage, pageSize, currentFolder])

  useEffect(() => {
    applyFilters()
  }, [files, filters])

  const loadMediaFiles = async () => {
    try {
      setLoading(true)
      const response = await ContentApi.getMediaFiles(
        currentPage,
        pageSize,
        currentFolder,
        filters.fileType,
        filters.searchTerm
      )
      setFiles(response.data)
      setTotalItems(response.pagination?.totalItems || 0)
      calculateStats(response.data)
    } catch (error) {
      console.error('Failed to load media files:', error)
      toast.error('미디어 파일을 불러오는데 실패했습니다.')
    } finally {
      setLoading(false)
    }
  }

  const loadFolders = async () => {
    try {
      const response = await ContentApi.getMediaFolders()
      setFolders(response.data)
    } catch (error) {
      console.error('Failed to load folders:', error)
    }
  }

  const calculateStats = (filesData: MediaFile[]) => {
    const stats = {
      totalFiles: filesData.length,
      totalSize: filesData.reduce((sum: any, file: any) => sum + file.size, 0),
      images: filesData.filter(f => f.type === 'image').length,
      videos: filesData.filter(f => f.type === 'video').length,
      documents: filesData.filter(f => f.type === 'document').length,
      others: filesData.filter(f => !['image', 'video', 'document'].includes(f.type)).length
    }
    setStats(stats)
  }

  const applyFilters = () => {
    let filtered = [...files]

    // Search term filter
    if (filters.searchTerm) {
      const term = filters.searchTerm.toLowerCase()
      filtered = filtered.filter(file => 
        file.name.toLowerCase().includes(term) ||
        file.originalName.toLowerCase().includes(term) ||
        file.altText?.toLowerCase().includes(term) ||
        file.description?.toLowerCase().includes(term)
      )
    }

    // File type filter
    if (filters.fileType) {
      filtered = filtered.filter(file => file.type === filters.fileType)
    }

    // Date range filter
    if (filters.dateRange) {
      const now = new Date()
      let startDate: Date
      
      switch (filters.dateRange) {
        case 'today':
          startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
          break
        case 'week':
          startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
          break
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1)
          break
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1)
          break
        default:
          startDate = new Date(0)
      }
      
      filtered = filtered.filter(file => new Date(file.uploadedAt) >= startDate)
    }

    // Size range filter
    if (filters.sizeRange) {
      const sizeRanges: Record<string, number[]> = {
        small: [0, 1024 * 1024], // < 1MB
        medium: [1024 * 1024, 10 * 1024 * 1024], // 1-10MB
        large: [10 * 1024 * 1024, Infinity] // > 10MB
      }
      
      const [min, max] = sizeRanges[filters.sizeRange] || [0, Infinity]
      filtered = filtered.filter(file => file.size >= min && file.size < max)
    }

    setFilteredFiles(filtered)
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
      fileType: '',
      dateRange: '',
      sizeRange: '',
      uploadedBy: ''
    })
  }

  const handleFileSelect = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    )
  }

  const handleSelectAll = () => {
    if (selectedFiles.length === filteredFiles.length) {
      setSelectedFiles([])
    } else {
      setSelectedFiles(filteredFiles.map(file => file.id))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedFiles.length === 0) {
      toast.error('선택된 파일이 없습니다.')
      return
    }

    if (confirm(`선택된 ${selectedFiles.length}개 파일을 삭제하시겠습니까?`)) {
      try {
        await ContentApi.bulkDeleteMediaFiles(selectedFiles)
        toast.success(`${selectedFiles.length}개 파일이 삭제되었습니다.`)
        setSelectedFiles([])
        loadMediaFiles()
      } catch (error) {
        console.error('Failed to delete files:', error)
        toast.error('파일 삭제에 실패했습니다.')
      }
    }
  }

  const handleFileUpload = async (files: File[]) => {
    try {
      await ContentApi.uploadFiles(files, currentFolder)
      toast.success(`${files.length}개 파일이 업로드되었습니다.`)
      loadMediaFiles()
      setShowUploader(false)
    } catch (error) {
      console.error('Failed to upload files:', error)
      toast.error('파일 업로드에 실패했습니다.')
    }
  }

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) {
      toast.error('폴더 이름을 입력해주세요.')
      return
    }

    try {
      await ContentApi.createMediaFolder({
        name: newFolderName.trim(),
        parentId: currentFolder || undefined
      })
      toast.success('폴더가 생성되었습니다.')
      setNewFolderName('')
      setShowFolderCreate(false)
      loadFolders()
    } catch (error) {
      console.error('Failed to create folder:', error)
      toast.error('폴더 생성에 실패했습니다.')
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  const formatTotalSize = (bytes: number) => {
    return formatFileSize(bytes)
  }

  const getBreadcrumb = () => {
    if (!currentFolder) return [{ id: '', name: '미디어 라이브러리' }]
    
    const breadcrumb = [{ id: '', name: '미디어 라이브러리' }]
    let current = folders.find(f => f.id === currentFolder)
    
    while (current) {
      breadcrumb.push({ id: current.id, name: current.name })
      current = current.parentId ? folders.find(f => f.id === current?.parentId) || undefined : undefined
    }
    
    return breadcrumb
  }

  const getCurrentFolderSubfolders = () => {
    return folders.filter(f => f.parentId === currentFolder)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="loading-spinner" />
        <span className="ml-2 text-gray-600">미디어를 불러오는 중...</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">미디어 라이브러리</h1>
          <p className="text-gray-600 mt-1">이미지, 동영상, 문서 파일을 관리합니다</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFolderCreate(true)}
            className="wp-button-secondary"
          >
            <FolderPlus className="w-4 h-4 mr-2" />
            폴더 생성
          </button>
          <button
            onClick={loadMediaFiles}
            className="wp-button-secondary"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            새로고침
          </button>
          <button
            onClick={() => setShowUploader(true)}
            className="wp-button-primary"
          >
            <Upload className="w-4 h-4 mr-2" />
            파일 업로드
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">전체 파일</p>
                <p className="text-xl font-bold text-gray-900">{stats.totalFiles}</p>
              </div>
              <HardDrive className="w-6 h-6 text-blue-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-purple-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">총 용량</p>
                <p className="text-xl font-bold text-purple-600">{formatTotalSize(stats.totalSize)}</p>
              </div>
              <HardDrive className="w-6 h-6 text-purple-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-green-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">이미지</p>
                <p className="text-xl font-bold text-green-600">{stats.images}</p>
              </div>
              <Image className="w-6 h-6 text-green-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-red-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">동영상</p>
                <p className="text-xl font-bold text-red-600">{stats.videos}</p>
              </div>
              <Video className="w-6 h-6 text-red-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-yellow-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">문서</p>
                <p className="text-xl font-bold text-yellow-600">{stats.documents}</p>
              </div>
              <FileText className="w-6 h-6 text-yellow-500" />
            </div>
          </div>
        </div>

        <div className="wp-card border-l-4 border-l-gray-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">기타</p>
                <p className="text-xl font-bold text-gray-600">{stats.others}</p>
              </div>
              <Music className="w-6 h-6 text-gray-500" />
            </div>
          </div>
        </div>
      </div>

      {/* Breadcrumb */}
      <div className="wp-card">
        <div className="wp-card-body">
          <nav className="flex items-center gap-2 text-sm">
            {getBreadcrumb().map((item, index) => (
              <React.Fragment key={item.id}>
                {index > 0 && <span className="text-gray-400">/</span>}
                <button
                  onClick={() => setCurrentFolder(item.id)}
                  className={`${
                    index === getBreadcrumb().length - 1
                      ? 'text-gray-900 font-medium'
                      : 'text-blue-600 hover:text-blue-700'
                  }`}
                >
                  {item.name}
                </button>
              </React.Fragment>
            ))}
          </nav>
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
                    placeholder="파일명, Alt 텍스트, 설명으로 검색..."
                    value={filters.searchTerm}
                    onChange={(e: any) => updateFilter('searchTerm', e.target.value)}
                    className="wp-input pl-10"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <select
                  value={filters.fileType}
                  onChange={(e: any) => updateFilter('fileType', e.target.value)}
                  className="wp-select min-w-[120px]"
                >
                  <option value="">전체 파일</option>
                  <option value="image">이미지</option>
                  <option value="video">동영상</option>
                  <option value="audio">음성</option>
                  <option value="document">문서</option>
                  <option value="other">기타</option>
                </select>

                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                  <button
                    onClick={() => setViewMode('grid')}
                    className={`p-2 rounded ${viewMode === 'grid' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                    title="그리드 뷰"
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode('list')}
                    className={`p-2 rounded ${viewMode === 'list' ? 'bg-white shadow-sm' : 'text-gray-500'}`}
                    title="리스트 뷰"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

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
                  <label className="wp-label">업로드 날짜</label>
                  <select
                    value={filters.dateRange}
                    onChange={(e: any) => updateFilter('dateRange', e.target.value)}
                    className="wp-select"
                  >
                    <option value="">전체 기간</option>
                    <option value="today">오늘</option>
                    <option value="week">이번 주</option>
                    <option value="month">이번 달</option>
                    <option value="year">올해</option>
                  </select>
                </div>
                <div>
                  <label className="wp-label">파일 크기</label>
                  <select
                    value={filters.sizeRange}
                    onChange={(e: any) => updateFilter('sizeRange', e.target.value)}
                    className="wp-select"
                  >
                    <option value="">전체 크기</option>
                    <option value="small">작음 (1MB 미만)</option>
                    <option value="medium">보통 (1-10MB)</option>
                    <option value="large">큼 (10MB 이상)</option>
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
      {selectedFiles.length > 0 && (
        <div className="wp-card border-l-4 border-l-blue-500">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <span className="text-blue-700">
                {selectedFiles.length}개 파일이 선택되었습니다
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
                  onClick={() => setSelectedFiles([])}
                  className="wp-button-secondary"
                >
                  선택 해제
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Media Content */}
      <div className="wp-card">
        <div className="wp-card-body p-0">
          {/* Subfolders */}
          {getCurrentFolderSubfolders().length > 0 && (
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-sm font-medium text-gray-900 mb-3">폴더</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {getCurrentFolderSubfolders().map((folder) => (
                  <button
                    key={folder.id}
                    onClick={() => setCurrentFolder(folder.id)}
                    className="flex flex-col items-center p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-colors"
                  >
                    <Folder className="w-8 h-8 text-blue-500 mb-2" />
                    <span className="text-sm font-medium text-gray-900 truncate w-full text-center">
                      {folder.name}
                    </span>
                    <span className="text-xs text-gray-500">
                      {folder.fileCount}개 파일
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Files */}
          {filteredFiles.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Image className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">파일이 없습니다</p>
              <p className="text-sm">파일을 업로드하거나 검색 조건을 변경해보세요.</p>
            </div>
          ) : (
            <>
              {viewMode === 'grid' ? (
                <MediaGrid
                  files={filteredFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onSelectAll={handleSelectAll}
                />
              ) : (
                <MediaList
                  files={filteredFiles}
                  selectedFiles={selectedFiles}
                  onFileSelect={handleFileSelect}
                  onSelectAll={handleSelectAll}
                />
              )}
            </>
          )}
        </div>
      </div>

      {/* Pagination */}
      {Math.ceil(totalItems / pageSize) > 1 && (
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
      )}

      {/* Upload Modal */}
      {showUploader && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">파일 업로드</h3>
                <button
                  onClick={() => setShowUploader(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              <MediaUploader
                onUploadComplete={(files) => {
                  handleFileUpload(files.map(f => new File([f.url], f.name)));
                  setShowUploader(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Create Folder Modal */}
      {showFolderCreate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">폴더 생성</h3>
                <button
                  onClick={() => setShowFolderCreate(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="wp-label">폴더 이름</label>
                  <input
                    type="text"
                    value={newFolderName}
                    onChange={(e: any) => setNewFolderName(e.target.value)}
                    className="wp-input"
                    placeholder="새 폴더 이름을 입력하세요"
                    autoFocus
                  />
                </div>

                {currentFolder && (
                  <div className="text-sm text-gray-600">
                    위치: {getBreadcrumb().map(b => b.name).join(' / ')}
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-2 mt-6">
                <button
                  onClick={() => setShowFolderCreate(false)}
                  className="wp-button-secondary"
                >
                  취소
                </button>
                <button
                  onClick={handleCreateFolder}
                  className="wp-button-primary"
                >
                  생성
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Library