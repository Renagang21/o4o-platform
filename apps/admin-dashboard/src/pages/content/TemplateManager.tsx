import { useState } from 'react';
import {
  Layout,
  Plus,
  Search,
  Edit2,
  Copy,
  Trash2,
  Download,
  Star,
  Grid,
  List,
  MoreVertical
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { 
  Template, 
  TemplateCategory, 
  TemplateType, 
  TemplateListResponse 
} from '@o4o/types'
import toast from 'react-hot-toast'
import TemplateBuilder from '@/components/template/TemplateBuilder'
import TemplateLibrary from '@/components/template/TemplateLibrary'

type ViewMode = 'grid' | 'list'

const TemplateManager: FC = () => {
  const queryClient = useQueryClient()
  const [viewMode, setViewMode] = useState<ViewMode>('grid')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [isLibraryOpen, setIsLibraryOpen] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [page, setPage] = useState(1)
  const limit = 12

  // Fetch templates
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['templates', { 
      search: searchQuery, 
      category: selectedCategory, 
      type: selectedType,
      status: selectedStatus,
      page, 
      limit 
    }],
    queryFn: async (): Promise<TemplateListResponse> => {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
      })

      if (searchQuery) params.append('search', searchQuery)
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (selectedType !== 'all') params.append('type', selectedType)
      if (selectedStatus !== 'all') params.append('status', selectedStatus)

      const response = await authClient.api.get(`/templates?${params}`)
      return response.data
    }
  })

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/templates/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('템플릿이 삭제되었습니다')
    },
    onError: () => {
      toast.error('삭제에 실패했습니다')
    }
  })

  // Duplicate mutation
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.post(`/templates/${id}/duplicate`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      toast.success('템플릿이 복제되었습니다')
    },
    onError: () => {
      toast.error('복제에 실패했습니다')
    }
  })

  // Get category badge color
  const getCategoryColor = (category: TemplateCategory) => {
    const colors = {
      'landing-page': 'bg-blue-100 text-blue-800',
      'homepage': 'bg-green-100 text-green-800',
      'about': 'bg-purple-100 text-purple-800',
      'contact': 'bg-orange-100 text-orange-800',
      'portfolio': 'bg-pink-100 text-pink-800',
      'blog': 'bg-indigo-100 text-indigo-800',
      'ecommerce': 'bg-red-100 text-red-800',
      'business': 'bg-gray-100 text-gray-800',
      'personal': 'bg-yellow-100 text-yellow-800',
      'creative': 'bg-teal-100 text-teal-800',
      'education': 'bg-cyan-100 text-cyan-800',
      'nonprofit': 'bg-lime-100 text-lime-800',
    }
    return colors[category] || 'bg-gray-100 text-gray-800'
  }

  // Get type icon
  const getTypeIcon = (type: TemplateType) => {
    switch (type) {
      case 'page':
        return '📄'
      case 'post':
        return '📝'
      case 'category':
        return '📁'
      case 'archive':
        return '📚'
      case 'search':
        return '🔍'
      case '404':
        return '❌'
      case 'email':
        return '📧'
      case 'popup':
        return '💬'
      default:
        return '📄'
    }
  }

  // Handle create new template
  const handleCreateTemplate = () => {
    setEditingTemplate(null)
    setIsBuilderOpen(true)
  }

  // Handle edit template
  const handleEditTemplate = (template: Template) => {
    setEditingTemplate(template)
    setIsBuilderOpen(true)
  }

  // Handle delete template
  const handleDeleteTemplate = (template: Template) => {
    if (confirm(`정말 "${template.name}" 템플릿을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(template.id)
    }
  }

  // Handle duplicate template
  const handleDuplicateTemplate = (template: Template) => {
    duplicateMutation.mutate(template.id)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">템플릿 관리</h1>
          <p className="text-gray-600 mt-1">페이지 및 컨텐츠 템플릿을 관리합니다</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setIsLibraryOpen(true)}
          >
            <Download className="w-4 h-4 mr-2" />
            템플릿 라이브러리
          </Button>
          <Button onClick={handleCreateTemplate}>
            <Plus className="w-4 h-4 mr-2" />
            새 템플릿
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="템플릿 검색..."
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Category Filter */}
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="카테고리" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 카테고리</SelectItem>
                <SelectItem value="homepage">홈페이지</SelectItem>
                <SelectItem value="landing-page">랜딩 페이지</SelectItem>
                <SelectItem value="blog">블로그</SelectItem>
                <SelectItem value="ecommerce">이커머스</SelectItem>
                <SelectItem value="portfolio">포트폴리오</SelectItem>
                <SelectItem value="business">비즈니스</SelectItem>
              </SelectContent>
            </Select>

            {/* Type Filter */}
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="타입" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 타입</SelectItem>
                <SelectItem value="page">페이지</SelectItem>
                <SelectItem value="post">포스트</SelectItem>
                <SelectItem value="email">이메일</SelectItem>
                <SelectItem value="popup">팝업</SelectItem>
              </SelectContent>
            </Select>

            {/* Status Filter */}
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="상태" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="draft">초안</SelectItem>
                <SelectItem value="published">게시됨</SelectItem>
                <SelectItem value="archived">보관됨</SelectItem>
              </SelectContent>
            </Select>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 border rounded-lg p-1">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Templates */}
      {isLoading ? (
        <div className="flex items-center justify-center h-96">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : data?.templates?.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Layout className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <p className="text-gray-500 mb-4">템플릿이 없습니다</p>
            <Button onClick={handleCreateTemplate}>
              <Plus className="w-4 h-4 mr-2" />
              첫 템플릿 만들기
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {data?.templates?.map((template: Template) => (
            <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Preview */}
              <div className="aspect-video bg-gray-100 relative">
                {template.preview?.thumbnail ? (
                  <img
                    src={template.preview.thumbnail}
                    alt={template.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Layout className="w-12 h-12" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className="text-2xl">{getTypeIcon(template.type)}</span>
                </div>
                <div className="absolute top-2 right-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm" className="bg-white/80 hover:bg-white">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        편집
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                        <Copy className="w-4 h-4 mr-2" />
                        복제
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDeleteTemplate(template)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Content */}
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <h3 className="font-semibold text-lg truncate">{template.name}</h3>
                  {template.metadata?.featured && (
                    <Star className="w-4 h-4 text-yellow-500 flex-shrink-0 ml-2" />
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  <Badge className={getCategoryColor(template.category)}>
                    {template.category}
                  </Badge>
                  <Badge variant={
                    template.status === 'published' ? 'default' :
                    template.status === 'draft' ? 'secondary' : 'outline'
                  }>
                    {template.status}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>사용: {template.metadata?.usageCount || 0}회</span>
                  <span>{new Date(template.updatedAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        // List view
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      템플릿
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      카테고리
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      상태
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      사용횟수
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      수정일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      작업
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {data?.templates?.map((template: Template) => (
                    <tr key={template.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-gray-100 rounded flex items-center justify-center mr-3">
                            <span className="text-lg">{getTypeIcon(template.type)}</span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{template.name}</div>
                            <div className="text-sm text-gray-500">{template.description}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <Badge className={getCategoryColor(template.category)}>
                          {template.category}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Badge variant={
                          template.status === 'published' ? 'default' :
                          template.status === 'draft' ? 'secondary' : 'outline'
                        }>
                          {template.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {template.metadata?.usageCount || 0}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {new Date(template.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditTemplate(template)}>
                              <Edit2 className="w-4 h-4 mr-2" />
                              편집
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleDuplicateTemplate(template)}>
                              <Copy className="w-4 h-4 mr-2" />
                              복제
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTemplate(template)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === data.totalPages}
          >
            다음
          </Button>
        </div>
      )}

      {/* Template Builder Modal */}
      {isBuilderOpen && (
        <TemplateBuilder
          template={editingTemplate}
          onClose={() => {
            setIsBuilderOpen(false)
            setEditingTemplate(null)
          }}
          onSave={() => {
            refetch()
            setIsBuilderOpen(false)
            setEditingTemplate(null)
          }}
        />
      )}

      {/* Template Library Modal */}
      {isLibraryOpen && (
        <TemplateLibrary
          onClose={() => setIsLibraryOpen(false)}
          onImport={() => {
            refetch()
            setIsLibraryOpen(false)
          }}
        />
      )}
    </div>
  )
}

export default TemplateManager