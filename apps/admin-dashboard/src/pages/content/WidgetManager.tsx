import { useState, FC } from 'react';
import {
  Layout,
  Plus,
  Settings,
  Eye,
  EyeOff,
  Edit2,
  Trash2,
  Copy,
  Download,
  MoreVertical,
  Smartphone,
  Tablet,
  Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { 
  Widget, 
  WidgetPosition,
  WidgetListResponse
} from '@o4o/types'
import toast from 'react-hot-toast'
import WidgetBuilder from '@/components/widget/WidgetBuilder'
import WidgetLibrary from '@/components/widget/WidgetLibrary'

type ViewMode = 'builder' | 'list' | 'library'

const WidgetManager: FC = () => {
  const [viewMode, setViewMode] = useState('builder')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPosition, setSelectedPosition] = useState<WidgetPosition | 'all'>('all')
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'tablet' | 'mobile'>('desktop')
  const [isBuilderOpen, setIsBuilderOpen] = useState(false)
  const [editingWidget, setEditingWidget] = useState<Widget | null>(null)

  const queryClient = useQueryClient()

  // Fetch widgets and areas
  const { data: widgetData, isLoading } = useQuery({
    queryKey: ['widgets'],
    queryFn: async () => {
      const response = await authClient.api.get('/widgets')
      return response.data as WidgetListResponse
    }
  })

  // Create widget mutation (not used directly here, handled in WidgetBuilder)
  // const createMutation = useMutation({
  //   mutationFn: async (data: CreateWidgetDto) => {
  //     return authClient.api.post('/widgets', data)
  //   },
  //   onSuccess: () => {
  //     toast.success('위젯이 생성되었습니다')
  //     queryClient.invalidateQueries({ queryKey: ['widgets'] })
  //     setIsBuilderOpen(false)
  //   },
  //   onError: () => {
  //     toast.error('생성에 실패했습니다')
  //   }
  // })

  // Delete widget mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return authClient.api.delete(`/widgets/${id}`)
    },
    onSuccess: () => {
      toast.success('위젯이 삭제되었습니다')
      queryClient.invalidateQueries({ queryKey: ['widgets'] })
    },
    onError: () => {
      toast.error('삭제에 실패했습니다')
    }
  })

  // Toggle widget active state
  const toggleMutation = useMutation({
    mutationFn: async (data: { id: string; isActive: boolean }) => {
      return authClient.api.patch(`/widgets/${data.id}`, { isActive: data.isActive })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['widgets'] })
    }
  })

  const widgets = widgetData?.widgets || []
  const areas = widgetData?.areas || []

  // Filter widgets
  const filteredWidgets = widgets.filter(widget => {
    const matchesSearch = widget.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         widget.type.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPosition = selectedPosition === 'all' || widget.position === selectedPosition
    return matchesSearch && matchesPosition
  })

  // Group widgets by position
  const widgetsByPosition = widgets.reduce((acc: any, widget: any) => {
    if (!acc[widget.position]) {
      acc[widget.position] = []
    }
    acc[widget.position].push(widget)
    return acc
  }, {} as Record<WidgetPosition, Widget[]>)

  // Sort widgets by order within each position
  Object.keys(widgetsByPosition).forEach(position => {
    widgetsByPosition[position as WidgetPosition].sort((a: any, b: any) => a.order - b.order)
  })

  const handleEdit = (widget: Widget) => {
    setEditingWidget(widget)
    setIsBuilderOpen(true)
  }

  const handleDelete = (widget: Widget) => {
    if (confirm(`"${widget.title}" 위젯을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(widget.id)
    }
  }

  const handleToggleActive = (widget: Widget) => {
    toggleMutation.mutate({ id: widget.id, isActive: !widget.isActive })
  }

  const getPositionDisplayName = (position: WidgetPosition) => {
    const names: Record<WidgetPosition, string> = {
      'footer-1': '푸터 1',
      'footer-2': '푸터 2',
      'footer-3': '푸터 3',
      'footer-4': '푸터 4',
      'sidebar-main': '메인 사이드바',
      'sidebar-shop': '쇼핑 사이드바',
      'header-top': '헤더 상단',
      'header-bottom': '헤더 하단'
    }
    return names[position] || position
  }

  const getWidgetTypeDisplayName = (type: string) => {
    const names: Record<string, string> = {
      'text': '텍스트',
      'html': 'HTML',
      'image': '이미지',
      'menu': '메뉴',
      'recent-posts': '최근 게시글',
      'categories': '카테고리',
      'tags': '태그',
      'archives': '아카이브',
      'search': '검색',
      'social-links': '소셜 링크',
      'contact-info': '연락처 정보',
      'newsletter': '뉴스레터',
      'custom-code': '커스텀 코드',
      'rss-feed': 'RSS 피드',
      'calendar': '캘린더'
    }
    return names[type] || type
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">위젯을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">위젯 관리</h1>
          <p className="text-gray-600 mt-1">사이트의 위젯을 관리하고 레이아웃을 구성하세요</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Preview Device Selector */}
          <div className="flex items-center border rounded-lg p-1">
            <Button
              size={"sm" as const}
              variant={previewDevice === 'desktop' ? 'default' : 'ghost'}
              onClick={() => setPreviewDevice('desktop')}
            >
              <Monitor className="w-4 h-4" />
            </Button>
            <Button
              size={"sm" as const}
              variant={previewDevice === 'tablet' ? 'default' : 'ghost'}
              onClick={() => setPreviewDevice('tablet')}
            >
              <Tablet className="w-4 h-4" />
            </Button>
            <Button
              size={"sm" as const}
              variant={previewDevice === 'mobile' ? 'default' : 'ghost'}
              onClick={() => setPreviewDevice('mobile')}
            >
              <Smartphone className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={() => {
              setEditingWidget(null)
              setIsBuilderOpen(true)
            }}
          >
            <Plus className="w-4 h-4 mr-2" />
            위젯 추가
          </Button>
        </div>
      </div>

      {/* View Mode Tabs */}
      <Tabs value={viewMode} onValueChange={(value: string) => setViewMode(value as ViewMode)}>
        <TabsList>
          <TabsTrigger value="builder">위젯 빌더</TabsTrigger>
          <TabsTrigger value="list">목록 보기</TabsTrigger>
          <TabsTrigger value="library">위젯 라이브러리</TabsTrigger>
        </TabsList>

        {/* Widget Builder */}
        <TabsContent value="builder" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            {/* Widget Areas */}
            <div className="xl:col-span-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Layout className="w-5 h-5" />
                    위젯 영역
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {areas.map((area: any) => (
                      <div key={area.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-medium">{area.name}</h3>
                            <p className="text-sm text-gray-600">{area.description}</p>
                          </div>
                          <Badge variant={area.isActive ? 'default' : 'secondary'}>
                            {area.isActive ? '활성' : '비활성'}
                          </Badge>
                        </div>

                        {/* Widgets in this area */}
                        <div className={`grid gap-3 ${area.settings.columns > 1 ? `grid-cols-${area.settings.columns}` : 'grid-cols-1'}`}>
                          {widgetsByPosition[area.position]?.map((widget: any) => (
                            <div
                              key={widget.id}
                              className={`border rounded-lg p-3 transition-all ${
                                widget.isActive 
                                  ? 'border-blue-200 bg-blue-50' 
                                  : 'border-gray-200 bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                  <Badge variant={"outline" as const} className="text-xs">
                                    {getWidgetTypeDisplayName(widget.type)}
                                  </Badge>
                                  {!widget.isActive && (
                                    <Badge variant="secondary" className="text-xs">
                                      비활성
                                    </Badge>
                                  )}
                                </div>
                                <DropdownMenu>
                                  <DropdownMenuTrigger>
                                    <Button size={"sm" as const} variant={"ghost" as const} className="h-6 w-6 p-0">
                                      <MoreVertical className="w-3 h-3" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleEdit(widget)}>
                                      <Edit2 className="w-4 h-4 mr-2" />
                                      편집
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleToggleActive(widget)}>
                                      {widget.isActive ? (
                                        <>
                                          <EyeOff className="w-4 h-4 mr-2" />
                                          비활성화
                                        </>
                                      ) : (
                                        <>
                                          <Eye className="w-4 h-4 mr-2" />
                                          활성화
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <Copy className="w-4 h-4 mr-2" />
                                      복제
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem 
                                      onClick={() => handleDelete(widget)}
                                      className="text-red-600"
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      삭제
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                              <h4 className="font-medium text-sm">{widget.title}</h4>
                              <p className="text-xs text-gray-600 mt-1">
                                순서: {widget.order}
                              </p>
                            </div>
                          )) || (
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-500">
                              <Plus className="w-8 h-8 mx-auto mb-2 opacity-50" />
                              <p className="text-sm">위젯을 추가하세요</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Statistics */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>위젯 통계</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">전체 위젯</span>
                      <span className="font-medium">{widgets.length}개</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">활성 위젯</span>
                      <span className="font-medium text-green-600">
                        {widgets.filter(w => w.isActive).length}개
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">비활성 위젯</span>
                      <span className="font-medium text-red-600">
                        {widgets.filter(w => !w.isActive).length}개
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600">위젯 영역</span>
                      <span className="font-medium">{areas.length}개</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>빠른 작업</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Button 
                      variant={"outline" as const} 
                      size={"sm" as const} 
                      className="w-full justify-start"
                      onClick={() => {
                        setEditingWidget(null)
                        setIsBuilderOpen(true)
                      }}
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      새 위젯 추가
                    </Button>
                    <Button 
                      variant={"outline" as const} 
                      size={"sm" as const} 
                      className="w-full justify-start"
                      onClick={() => setViewMode('library')}
                    >
                      <Download className="w-4 h-4 mr-2" />
                      위젯 라이브러리
                    </Button>
                    <Button 
                      variant={"outline" as const} 
                      size={"sm" as const} 
                      className="w-full justify-start"
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      영역 설정
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* List View */}
        <TabsContent value="list" className="space-y-6">
          {/* Filters */}
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="위젯 검색..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
            </div>
            <Select value={selectedPosition} onValueChange={(value: string) => setSelectedPosition(value as WidgetPosition | 'all')}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="위치 선택" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 위치</SelectItem>
                <SelectItem value="footer-1">푸터 1</SelectItem>
                <SelectItem value="footer-2">푸터 2</SelectItem>
                <SelectItem value="footer-3">푸터 3</SelectItem>
                <SelectItem value="footer-4">푸터 4</SelectItem>
                <SelectItem value="sidebar-main">메인 사이드바</SelectItem>
                <SelectItem value="sidebar-shop">쇼핑 사이드바</SelectItem>
                <SelectItem value="header-top">헤더 상단</SelectItem>
                <SelectItem value="header-bottom">헤더 하단</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Widget List */}
          <div className="grid gap-4">
            {filteredWidgets.map((widget: any) => (
              <Card key={widget.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">{widget.title}</h3>
                          <Badge variant={"outline" as const} className="text-xs">
                            {getWidgetTypeDisplayName(widget.type)}
                          </Badge>
                          {!widget.isActive && (
                            <Badge variant="secondary" className="text-xs">
                              비활성
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          {getPositionDisplayName(widget.position)} • 순서: {widget.order}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size={"sm" as const}
                        variant={"outline" as const}
                        onClick={() => handleEdit(widget)}
                      >
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button
                        size={"sm" as const}
                        variant={"outline" as const}
                        onClick={() => handleToggleActive(widget)}
                      >
                        {widget.isActive ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        size={"sm" as const}
                        variant={"outline" as const}
                        onClick={() => handleDelete(widget)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredWidgets.length === 0 && (
            <div className="text-center py-12">
              <Layout className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">위젯이 없습니다</h3>
              <p className="text-gray-600 mb-4">새로운 위젯을 추가해보세요</p>
              <Button
                onClick={() => {
                  setEditingWidget(null)
                  setIsBuilderOpen(true)
                }}
              >
                <Plus className="w-4 h-4 mr-2" />
                위젯 추가
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Widget Library */}
        <TabsContent value="library">
          <WidgetLibrary onApplyTemplate={() => {
            queryClient.invalidateQueries({ queryKey: ['widgets'] })
            setViewMode('builder')
          }} />
        </TabsContent>
      </Tabs>

      {/* Widget Builder Dialog */}
      {isBuilderOpen && (
        <WidgetBuilder
          widget={editingWidget}
          onSave={() => {
            setIsBuilderOpen(false)
            setEditingWidget(null)
            queryClient.invalidateQueries({ queryKey: ['widgets'] })
          }}
          onCancel={() => {
            setIsBuilderOpen(false)
            setEditingWidget(null)
          }}
        />
      )}
    </div>
  )
}

export default WidgetManager