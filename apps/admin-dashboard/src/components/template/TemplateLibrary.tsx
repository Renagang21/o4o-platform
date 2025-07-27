import { useState, FC } from 'react';
import {
  X,
  Download,
  Star,
  Eye,
  Search,
  Filter,
  Heart,
  Clock,
  Users,
  Zap,
  Crown
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { 
  TemplateLibraryItem, 
  TemplateLibraryResponse,
  TemplateCategory,
  TemplateLibraryFilter 
} from '@o4o/types'
import toast from 'react-hot-toast'

interface TemplateLibraryProps {
  onClose: () => void
  onImport: () => void
}

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({ onClose, onImport }) => {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<TemplateLibraryFilter>({
    category: undefined,
    search: '',
    isPremium: undefined,
    rating: undefined
  })
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateLibraryItem | null>(null)
  const [activeTab, setActiveTab] = useState('all')

  // Fetch template library
  const { data, isLoading } = useQuery({
    queryKey: ['template-library', filter],
    queryFn: async (): Promise<TemplateLibraryResponse> => {
      const params = new URLSearchParams()
      
      if (filter.search) params.append('search', filter.search)
      if (filter.category) params.append('category', filter.category)
      if (filter.isPremium !== undefined) params.append('isPremium', filter.isPremium.toString())
      if (filter.rating) params.append('rating', filter.rating.toString())

      const response = await authClient.api.get(`/template-library?${params}`)
      return response.data
    }
  })

  // Import template mutation
  const importMutation = useMutation({
    mutationFn: async (templateId: string) => {
      return authClient.api.post(`/template-library/${templateId}/import`)
    },
    onSuccess: () => {
      toast.success('템플릿이 가져와졌습니다')
      queryClient.invalidateQueries({ queryKey: ['templates'] })
      onImport()
    },
    onError: () => {
      toast.error('가져오기에 실패했습니다')
    }
  })

  // Handle import
  const handleImport = (template: TemplateLibraryItem) => {
    if (template.isPremium) {
      // In a real app, this would open a payment dialog
      toast('프리미엄 템플릿은 구매가 필요합니다')
      return
    }
    importMutation.mutate(template.id)
  }

  // Filter templates by tab
  const getFilteredTemplates = () => {
    if (!data?.items) return []
    
    let filtered = data.items

    switch (activeTab) {
      case 'free':
        filtered = filtered.filter(item => !item.isPremium)
        break
      case 'premium':
        filtered = filtered.filter(item => item.isPremium)
        break
      case 'featured':
        filtered = filtered.filter(item => item.featured)
        break
      case 'popular':
        filtered = filtered.sort((a: any, b: any) => b.popularity - a.popularity)
        break
    }

    return filtered
  }

  // Get category color
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

  // Render star rating
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

  const filteredTemplates = getFilteredTemplates()

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl w-full h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>템플릿 라이브러리</DialogTitle>
            <Button variant="ghost" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Filters */}
          <div className="border-b pb-4 mb-4">
            <div className="flex flex-col sm:flex-row gap-4">
              {/* Search */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="템플릿 검색..."
                  value={filter.search || ''}
                  onChange={(e: any) => setFilter({ ...filter, search: e.target.value })}
                  className="pl-10"
                />
              </div>

              {/* Category Filter */}
              <Select
                value={filter.category || 'all'}
                onValueChange={(value) => setFilter({ 
                  ...filter, 
                  category: value === 'all' ? undefined : value as TemplateCategory 
                })}
              >
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

              {/* Price Filter */}
              <Select
                value={filter.isPremium === undefined ? 'all' : filter.isPremium ? 'premium' : 'free'}
                onValueChange={(value) => setFilter({ 
                  ...filter, 
                  isPremium: value === 'all' ? undefined : value === 'premium'
                })}
              >
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="가격" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="free">무료</SelectItem>
                  <SelectItem value="premium">프리미엄</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="all">전체</TabsTrigger>
              <TabsTrigger value="free">무료</TabsTrigger>
              <TabsTrigger value="premium">프리미엄</TabsTrigger>
              <TabsTrigger value="featured">추천</TabsTrigger>
              <TabsTrigger value="popular">인기</TabsTrigger>
            </TabsList>

            <TabsContent value={activeTab} className="flex-1 overflow-y-auto mt-4">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              ) : filteredTemplates.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-500">
                    <Filter className="w-12 h-12 mx-auto mb-4" />
                    <p>조건에 맞는 템플릿이 없습니다</p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredTemplates.map((template) => (
                    <Card key={template.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      {/* Preview */}
                      <div className="aspect-video bg-gray-100 relative group">
                        {template.preview?.thumbnail ? (
                          <img
                            src={template.preview.thumbnail}
                            alt={template.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400">
                            <div className="text-center">
                              <div className="w-16 h-16 bg-gray-200 rounded-lg mx-auto mb-2 flex items-center justify-center">
                                📄
                              </div>
                              <p className="text-sm">No Preview</p>
                            </div>
                          </div>
                        )}

                        {/* Overlay with actions */}
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              variant="secondary"
                              onClick={() => setSelectedTemplate(template)}
                            >
                              <Eye className="w-4 h-4 mr-2" />
                              미리보기
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleImport(template)}
                              disabled={importMutation.isPending}
                            >
                              <Download className="w-4 h-4 mr-2" />
                              가져오기
                            </Button>
                          </div>
                        </div>

                        {/* Badges */}
                        <div className="absolute top-2 left-2 flex flex-col gap-1">
                          {template.isPremium && (
                            <Badge className="bg-yellow-500 text-white">
                              <Crown className="w-3 h-3 mr-1" />
                              Premium
                            </Badge>
                          )}
                          {template.featured && (
                            <Badge className="bg-red-500 text-white">
                              <Star className="w-3 h-3 mr-1" />
                              Featured
                            </Badge>
                          )}
                        </div>

                        {/* Price */}
                        {template.isPremium && template.price && (
                          <div className="absolute top-2 right-2">
                            <Badge variant="secondary">
                              ${template.price}
                            </Badge>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-semibold text-lg truncate">{template.name}</h3>
                          <Button variant="ghost" size="sm">
                            <Heart className="w-4 h-4" />
                          </Button>
                        </div>

                        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                          {template.description}
                        </p>

                        {/* Category */}
                        <div className="mb-3">
                          <Badge className={getCategoryColor(template.category)}>
                            {template.category}
                          </Badge>
                        </div>

                        {/* Stats */}
                        <div className="flex items-center justify-between text-sm text-gray-500 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center gap-1">
                              <Users className="w-3 h-3" />
                              {template.metadata.downloads}
                            </div>
                            <div className="flex items-center gap-1">
                              <Zap className="w-3 h-3" />
                              {template.popularity}
                            </div>
                          </div>
                          {renderStars(template.metadata.rating)}
                        </div>

                        {/* Tags */}
                        <div className="flex flex-wrap gap-1 mb-3">
                          {template.metadata.tags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {template.metadata.tags.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{template.metadata.tags.length - 3}
                            </Badge>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => setSelectedTemplate(template)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            미리보기
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => handleImport(template)}
                            disabled={importMutation.isPending}
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {template.isPremium ? '구매' : '가져오기'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Template Preview Modal */}
        {selectedTemplate && (
          <Dialog open={true} onOpenChange={() => setSelectedTemplate(null)}>
            <DialogContent className="max-w-4xl">
              <DialogHeader>
                <DialogTitle>{selectedTemplate.name}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                  {selectedTemplate.preview?.thumbnail ? (
                    <img
                      src={selectedTemplate.preview.thumbnail}
                      alt={selectedTemplate.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">
                      No preview available
                    </div>
                  )}
                </div>
                
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <p className="text-gray-600 mb-4">{selectedTemplate.description}</p>
                    
                    <div className="flex items-center gap-4 mb-4">
                      <Badge className={getCategoryColor(selectedTemplate.category)}>
                        {selectedTemplate.category}
                      </Badge>
                      {selectedTemplate.isPremium && (
                        <Badge className="bg-yellow-500 text-white">
                          <Crown className="w-3 h-3 mr-1" />
                          Premium ${selectedTemplate.price}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Users className="w-4 h-4" />
                        {selectedTemplate.metadata.downloads} downloads
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Updated {selectedTemplate.metadata.author}
                      </div>
                      {renderStars(selectedTemplate.metadata.rating)}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedTemplate(null)}
                    >
                      닫기
                    </Button>
                    <Button
                      onClick={() => {
                        handleImport(selectedTemplate)
                        setSelectedTemplate(null)
                      }}
                      disabled={importMutation.isPending}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      {selectedTemplate.isPremium ? '구매하기' : '가져오기'}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default TemplateLibrary