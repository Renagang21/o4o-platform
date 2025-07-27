import { FC, useState } from 'react';
import {
  Download,
  Star,
  Search,
  Grid,
  List,
  Eye,
  Crown,
  ArrowRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useQuery, useMutation } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { WidgetTemplate, WidgetCategory } from '@o4o/types'
import toast from 'react-hot-toast'

interface WidgetLibraryProps {
  onApplyTemplate: () => void
}

const WidgetLibrary: FC<WidgetLibraryProps> = ({ onApplyTemplate }) => {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<WidgetCategory | 'all'>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [showPremiumOnly, setShowPremiumOnly] = useState(false)

  // Fetch widget templates
  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['widget-templates', selectedCategory, searchTerm, showPremiumOnly],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (selectedCategory !== 'all') params.append('category', selectedCategory)
      if (searchTerm) params.append('search', searchTerm)
      if (showPremiumOnly) params.append('premium', 'true')
      
      const response = await authClient.api.get(`/widget-templates?${params}`)
      return response.data.templates as WidgetTemplate[]
    }
  })

  // Apply template mutation
  const applyMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return authClient.api.post(`/widget-templates/${templateId}/apply`, {
        targetArea: 'footer-1',
        replaceExisting: false
      })
    },
    onSuccess: () => {
      toast.success('위젯 템플릿이 적용되었습니다')
      onApplyTemplate()
    },
    onError: () => {
      toast.error('템플릿 적용에 실패했습니다')
    }
  })

  const handleApplyTemplate = (template: WidgetTemplate) => {
    if (template.isPremium) {
      toast('프리미엄 템플릿은 구매가 필요합니다')
      return
    }
    applyMutation.mutate(template.id)
  }

  const getCategoryDisplayName = (category: WidgetCategory) => {
    const names: Record<WidgetCategory, string> = {
      'content': '콘텐츠',
      'navigation': '네비게이션',
      'social': '소셜',
      'forms': '폼',
      'media': '미디어',
      'advanced': '고급'
    }
    return names[category] || category
  }

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory
    const matchesPremium = !showPremiumOnly || template.isPremium
    
    return matchesSearch && matchesCategory && matchesPremium
  })

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`w-3 h-3 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-gray-600 ml-1">{rating.toFixed(1)}</span>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">위젯 템플릿을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">위젯 라이브러리</h2>
          <p className="text-gray-600">미리 만들어진 위젯 템플릿을 사용하여 빠르게 사이트를 구성하세요</p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size={"sm" as const}
            onClick={() => setViewMode('grid')}
          >
            <Grid className="w-4 h-4" />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size={"sm" as const}
            onClick={() => setViewMode('list')}
          >
            <List className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="템플릿 검색..."
              value={searchTerm}
              onChange={(e: any) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <Select value={selectedCategory} onValueChange={(value: string) => setSelectedCategory(value as WidgetCategory | 'all')}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="카테고리 선택" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">모든 카테고리</SelectItem>
            <SelectItem value="content">콘텐츠</SelectItem>
            <SelectItem value="navigation">네비게이션</SelectItem>
            <SelectItem value="social">소셜</SelectItem>
            <SelectItem value="forms">폼</SelectItem>
            <SelectItem value="media">미디어</SelectItem>
            <SelectItem value="advanced">고급</SelectItem>
          </SelectContent>
        </Select>
        <Button
          variant={showPremiumOnly ? 'default' : 'outline'}
          onClick={() => setShowPremiumOnly(!showPremiumOnly)}
          className="flex items-center gap-2"
        >
          <Crown className="w-4 h-4" />
          프리미엄만
        </Button>
      </div>

      {/* Templates Grid/List */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="aspect-video bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg mb-3 relative overflow-hidden">
                  {template.preview ? (
                    <img
                      src={template.preview}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <Eye className="w-8 h-8" />
                    </div>
                  )}
                  {template.isPremium && (
                    <div className="absolute top-2 right-2">
                      <Badge className="bg-yellow-500 text-white">
                        <Crown className="w-3 h-3 mr-1" />
                        Premium
                      </Badge>
                    </div>
                  )}
                </div>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                    <Badge variant={"outline" as const} className="mt-1">
                      {getCategoryDisplayName(template.category)}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                  {template.description}
                </p>
                
                <div className="flex items-center justify-between mb-3">
                  {renderStars(template.rating)}
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Download className="w-3 h-3" />
                      {template.downloads.toLocaleString()}
                    </span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  onClick={() => handleApplyTemplate(template)}
                  disabled={applyMutation.isPending}
                >
                  {template.isPremium ? (
                    <>
                      <Crown className="w-4 h-4 mr-2" />
                      구매하기
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4 mr-2" />
                      적용하기
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-24 h-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-lg flex-shrink-0 overflow-hidden">
                    {template.preview ? (
                      <img
                        src={template.preview}
                        alt={template.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-gray-400">
                        <Eye className="w-6 h-6" />
                      </div>
                    )}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium">{template.name}</h3>
                        {template.isPremium && (
                          <Badge className="bg-yellow-500 text-white">
                            <Crown className="w-3 h-3 mr-1" />
                            Premium
                          </Badge>
                        )}
                        <Badge variant={"outline" as const}>
                          {getCategoryDisplayName(template.category)}
                        </Badge>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-2 line-clamp-1">
                      {template.description}
                    </p>
                    
                    <div className="flex items-center gap-4">
                      {renderStars(template.rating)}
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Download className="w-3 h-3" />
                        {template.downloads.toLocaleString()}회 다운로드
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant={"outline" as const}
                      size={"sm" as const}
                    >
                      <Eye className="w-4 h-4 mr-2" />
                      미리보기
                    </Button>
                    <Button
                      size={"sm" as const}
                      onClick={() => handleApplyTemplate(template)}
                      disabled={applyMutation.isPending}
                    >
                      {template.isPremium ? (
                        <>
                          <Crown className="w-4 h-4 mr-2" />
                          구매
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          적용
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">템플릿을 찾을 수 없습니다</h3>
          <p className="text-gray-600 mb-4">다른 검색어나 필터를 시도해보세요</p>
          <Button
            variant={"outline" as const}
            onClick={() => {
              setSearchTerm('')
              setSelectedCategory('all')
              setShowPremiumOnly(false)
            }}
          >
            필터 초기화
          </Button>
        </div>
      )}

      {/* Featured Templates Section */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">추천 템플릿</h3>
            <p className="text-gray-600">인기 있는 위젯 템플릿들을 확인해보세요</p>
          </div>
          <Button variant={"outline" as const} size={"sm" as const}>
            전체 보기
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {templates.slice(0, 3).map((template) => (
            <Card key={template.id} className="group hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="aspect-video bg-gradient-to-br from-purple-50 to-pink-100 rounded-lg mb-3 relative overflow-hidden">
                  {template.preview ? (
                    <img
                      src={template.preview}
                      alt={template.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full text-gray-400">
                      <Eye className="w-8 h-8" />
                    </div>
                  )}
                  <div className="absolute top-2 left-2">
                    <Badge className="bg-purple-500 text-white">
                      <Star className="w-3 h-3 mr-1" />
                      추천
                    </Badge>
                  </div>
                </div>
                <CardTitle className="text-base">{template.name}</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center justify-between mb-3">
                  {renderStars(template.rating)}
                  <span className="text-xs text-gray-500">
                    {template.downloads.toLocaleString()}회
                  </span>
                </div>
                <Button
                  size={"sm" as const}
                  className="w-full"
                  onClick={() => handleApplyTemplate(template)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  적용하기
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}

export default WidgetLibrary