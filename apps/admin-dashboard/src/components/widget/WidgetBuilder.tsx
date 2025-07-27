import { FC } from 'react';
import {
  X,
  Save,
  Settings,
  Eye,
  Type,
  Image,
  Menu,
  FileText,
  Hash,
  Search,
  Share2,
  Mail,
  Phone,
  Code
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Slider } from '@/components/ui/slider'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useMutation } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { 
  Widget,
  WidgetType,
  WidgetPosition,
  CreateWidgetDto,
  UpdateWidgetDto,
  WidgetSettings
} from '@o4o/types'
import toast from 'react-hot-toast'

interface WidgetBuilderProps {
  widget?: Widget | null
  onSave: () => void
  onCancel: () => void
}

interface WidgetTypeDefinition {
  type: WidgetType
  name: string
  description: string
  icon: React.ReactNode
  category: string
  defaultContent: Record<string, unknown>
}

const widgetTypes: WidgetTypeDefinition[] = [
  {
    type: 'text',
    name: '텍스트',
    description: '일반 텍스트 콘텐츠',
    icon: <Type className="w-5 h-5" />,
    category: 'content',
    defaultContent: { text: '', autoP: true }
  },
  {
    type: 'html',
    name: 'HTML',
    description: '커스텀 HTML 코드',
    icon: <Code className="w-5 h-5" />,
    category: 'advanced',
    defaultContent: { html: '' }
  },
  {
    type: 'image',
    name: '이미지',
    description: '단일 이미지',
    icon: <Image className="w-5 h-5" />,
    category: 'media',
    defaultContent: { url: '', alt: '', size: 'medium' }
  },
  {
    type: 'menu',
    name: '메뉴',
    description: '네비게이션 메뉴',
    icon: <Menu className="w-5 h-5" />,
    category: 'navigation',
    defaultContent: { menuId: '', showHierarchy: true, maxDepth: 3 }
  },
  {
    type: 'recent-posts',
    name: '최근 게시글',
    description: '최신 게시글 목록',
    icon: <FileText className="w-5 h-5" />,
    category: 'content',
    defaultContent: { count: 5, showDate: true, showExcerpt: false, excerptLength: 100 }
  },
  {
    type: 'categories',
    name: '카테고리',
    description: '게시글 카테고리 목록',
    icon: <Hash className="w-5 h-5" />,
    category: 'navigation',
    defaultContent: { showPostCount: true, showHierarchy: true, hideEmpty: true }
  },
  {
    type: 'search',
    name: '검색',
    description: '검색 폼',
    icon: <Search className="w-5 h-5" />,
    category: 'forms',
    defaultContent: { placeholder: '검색...', buttonText: '검색', searchCategories: false }
  },
  {
    type: 'social-links',
    name: '소셜 링크',
    description: '소셜 미디어 링크',
    icon: <Share2 className="w-5 h-5" />,
    category: 'social',
    defaultContent: { 
      links: [], 
      style: 'icons', 
      size: 'medium', 
      openInNewTab: true 
    }
  },
  {
    type: 'contact-info',
    name: '연락처 정보',
    description: '연락처 및 주소 정보',
    icon: <Phone className="w-5 h-5" />,
    category: 'content',
    defaultContent: { 
      address: '', 
      phone: '', 
      email: '', 
      showMap: false 
    }
  },
  {
    type: 'newsletter',
    name: '뉴스레터',
    description: '이메일 구독 폼',
    icon: <Mail className="w-5 h-5" />,
    category: 'forms',
    defaultContent: {
      title: '뉴스레터 구독',
      description: '최신 소식을 받아보세요',
      placeholder: '이메일 주소',
      buttonText: '구독하기',
      successMessage: '구독해주셔서 감사합니다!',
      provider: 'custom'
    }
  }
]

const WidgetBuilder: FC<WidgetBuilderProps> = ({
  widget,
  onSave,
  onCancel
}) => {
  const [selectedType, setSelectedType] = useState<WidgetType>(widget?.type || 'text')
  const [formData, setFormData] = useState({
    title: widget?.title || '',
    position: widget?.position || 'footer-1' as WidgetPosition,
    content: widget?.content || {},
    settings: widget?.settings || getDefaultSettings()
  })

  const isEditing = Boolean(widget)
  const selectedTypeDefinition = widgetTypes.find(t => t.type === selectedType)

  // Initialize content when type changes
  useEffect(() => {
    if (!isEditing && selectedTypeDefinition) {
      setFormData(prev => ({
        ...prev,
        content: selectedTypeDefinition.defaultContent
      }))
    }
  }, [selectedType, selectedTypeDefinition, isEditing])

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateWidgetDto) => {
      return authClient.api.post('/widgets', data)
    },
    onSuccess: () => {
      toast.success('위젯이 생성되었습니다')
      onSave()
    },
    onError: () => {
      toast.error('생성에 실패했습니다')
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateWidgetDto) => {
      return authClient.api.put(`/widgets/${widget!.id}`, data)
    },
    onSuccess: () => {
      toast.success('위젯이 수정되었습니다')
      onSave()
    },
    onError: () => {
      toast.error('수정에 실패했습니다')
    }
  })

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error('위젯 제목을 입력하세요')
      return
    }

    if (isEditing) {
      updateMutation.mutate({
        title: formData.title,
        content: formData.content,
        settings: formData.settings,
        position: formData.position
      })
    } else {
      createMutation.mutate({
        type: selectedType,
        title: formData.title,
        content: formData.content,
        position: formData.position,
        settings: formData.settings
      })
    }
  }

  const updateContent = (key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      content: {
        ...prev.content,
        [key]: value
      }
    }))
  }

  const updateSettings = (key: keyof WidgetSettings, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [key]: value
      }
    }))
  }

  const updateNestedSettings = (category: string, key: string, value: unknown) => {
    setFormData(prev => ({
      ...prev,
      settings: {
        ...prev.settings,
        [category]: {
          ...((prev.settings as unknown as Record<string, unknown>)[category] as Record<string, unknown> || {}),
          [key]: value
        }
      }
    }))
  }

  const renderContentEditor = () => {
    switch (selectedType) {
      case 'text':
        return (
          <div className="space-y-4">
            <div>
              <Label>텍스트 내용</Label>
              <Textarea
                value={formData.content.text || ''}
                onChange={(e: any) => updateContent('text', e.target.value)}
                placeholder="텍스트 내용을 입력하세요"
                rows={6}
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.content.autoP || false}
                onCheckedChange={(checked) => updateContent('autoP', checked)}
              />
              <Label>자동 단락 나누기</Label>
            </div>
          </div>
        )

      case 'html':
        return (
          <div>
            <Label>HTML 코드</Label>
            <Textarea
              value={formData.content.html || ''}
              onChange={(e: any) => updateContent('html', e.target.value)}
              placeholder="HTML 코드를 입력하세요"
              rows={8}
              className="font-mono text-sm"
            />
          </div>
        )

      case 'image':
        return (
          <div className="space-y-4">
            <div>
              <Label>이미지 URL</Label>
              <Input
                value={formData.content.url || ''}
                onChange={(e: any) => updateContent('url', e.target.value)}
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <Label>대체 텍스트</Label>
              <Input
                value={formData.content.alt || ''}
                onChange={(e: any) => updateContent('alt', e.target.value)}
                placeholder="이미지 설명"
              />
            </div>
            <div>
              <Label>링크 URL (선택사항)</Label>
              <Input
                value={formData.content.link || ''}
                onChange={(e: any) => updateContent('link', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div>
              <Label>이미지 크기</Label>
              <Select
                value={formData.content.size || 'medium'}
                onValueChange={(value) => updateContent('size', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="thumbnail">썸네일</SelectItem>
                  <SelectItem value="medium">중간</SelectItem>
                  <SelectItem value="large">큰</SelectItem>
                  <SelectItem value="full">전체</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )

      case 'recent-posts':
        return (
          <div className="space-y-4">
            <div>
              <Label>표시할 게시글 수</Label>
              <Input
                type="number"
                value={formData.content.count || 5}
                onChange={(e: any) => updateContent('count', parseInt(e.target.value) || 5)}
                min="1"
                max="20"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.content.showDate || false}
                onCheckedChange={(checked) => updateContent('showDate', checked)}
              />
              <Label>날짜 표시</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.content.showExcerpt || false}
                onCheckedChange={(checked) => updateContent('showExcerpt', checked)}
              />
              <Label>요약 표시</Label>
            </div>
            {formData.content.showExcerpt && (
              <div>
                <Label>요약 길이</Label>
                <Input
                  type="number"
                  value={formData.content.excerptLength || 100}
                  onChange={(e: any) => updateContent('excerptLength', parseInt(e.target.value) || 100)}
                  min="50"
                  max="300"
                />
              </div>
            )}
          </div>
        )

      case 'search':
        return (
          <div className="space-y-4">
            <div>
              <Label>플레이스홀더</Label>
              <Input
                value={formData.content.placeholder || ''}
                onChange={(e: any) => updateContent('placeholder', e.target.value)}
                placeholder="검색..."
              />
            </div>
            <div>
              <Label>버튼 텍스트</Label>
              <Input
                value={formData.content.buttonText || ''}
                onChange={(e: any) => updateContent('buttonText', e.target.value)}
                placeholder="검색"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.content.searchCategories || false}
                onCheckedChange={(checked) => updateContent('searchCategories', checked)}
              />
              <Label>카테고리 검색 포함</Label>
            </div>
          </div>
        )

      case 'social-links':
        return (
          <div className="space-y-4">
            <div>
              <Label>표시 스타일</Label>
              <Select
                value={formData.content.style || 'icons'}
                onValueChange={(value) => updateContent('style', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="icons">아이콘만</SelectItem>
                  <SelectItem value="buttons">버튼</SelectItem>
                  <SelectItem value="text">텍스트</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>크기</Label>
              <Select
                value={formData.content.size || 'medium'}
                onValueChange={(value) => updateContent('size', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="small">작음</SelectItem>
                  <SelectItem value="medium">중간</SelectItem>
                  <SelectItem value="large">큼</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.content.openInNewTab || true}
                onCheckedChange={(checked) => updateContent('openInNewTab', checked)}
              />
              <Label>새 탭에서 열기</Label>
            </div>
            
            {/* Social Links Editor */}
            <div>
              <Label>소셜 링크</Label>
              <div className="space-y-2 mt-2">
                {(formData.content.links || []).map((link: Record<string, unknown>, index: number) => (
                  <div key={index} className="flex gap-2">
                    <Select
                      value={String(link.platform || '')}
                      onValueChange={(value) => {
                        const newLinks = [...(formData.content.links || [])]
                        newLinks[index] = { ...link, platform: value }
                        updateContent('links', newLinks)
                      }}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="facebook">Facebook</SelectItem>
                        <SelectItem value="twitter">Twitter</SelectItem>
                        <SelectItem value="instagram">Instagram</SelectItem>
                        <SelectItem value="youtube">YouTube</SelectItem>
                        <SelectItem value="linkedin">LinkedIn</SelectItem>
                      </SelectContent>
                    </Select>
                    <Input
                      value={String(link.url || '')}
                      onChange={(e: any) => {
                        const newLinks = [...(formData.content.links || [])]
                        newLinks[index] = { ...link, url: e.target.value }
                        updateContent('links', newLinks)
                      }}
                      placeholder="URL"
                      className="flex-1"
                    />
                    <Button
                      size={"sm" as const}
                      variant={"outline" as const}
                      onClick={() => {
                        const newLinks = (formData.content.links || []).filter((_: unknown, i: number) => i !== index)
                        updateContent('links', newLinks)
                      }}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  size={"sm" as const}
                  variant={"outline" as const}
                  onClick={() => {
                    const newLinks = [...(formData.content.links || []), { platform: 'facebook', url: '' }]
                    updateContent('links', newLinks)
                  }}
                >
                  링크 추가
                </Button>
              </div>
            </div>
          </div>
        )

      case 'contact-info':
        return (
          <div className="space-y-4">
            <div>
              <Label>주소</Label>
              <Textarea
                value={formData.content.address || ''}
                onChange={(e: any) => updateContent('address', e.target.value)}
                placeholder="주소를 입력하세요"
                rows={2}
              />
            </div>
            <div>
              <Label>전화번호</Label>
              <Input
                value={formData.content.phone || ''}
                onChange={(e: any) => updateContent('phone', e.target.value)}
                placeholder="02-1234-5678"
              />
            </div>
            <div>
              <Label>이메일</Label>
              <Input
                value={formData.content.email || ''}
                onChange={(e: any) => updateContent('email', e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            <div>
              <Label>웹사이트</Label>
              <Input
                value={formData.content.website || ''}
                onChange={(e: any) => updateContent('website', e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Switch
                checked={formData.content.showMap || false}
                onCheckedChange={(checked) => updateContent('showMap', checked)}
              />
              <Label>지도 표시</Label>
            </div>
          </div>
        )

      case 'newsletter':
        return (
          <div className="space-y-4">
            <div>
              <Label>제목</Label>
              <Input
                value={formData.content.title || ''}
                onChange={(e: any) => updateContent('title', e.target.value)}
                placeholder="뉴스레터 구독"
              />
            </div>
            <div>
              <Label>설명</Label>
              <Textarea
                value={formData.content.description || ''}
                onChange={(e: any) => updateContent('description', e.target.value)}
                placeholder="최신 소식을 받아보세요"
                rows={2}
              />
            </div>
            <div>
              <Label>플레이스홀더</Label>
              <Input
                value={formData.content.placeholder || ''}
                onChange={(e: any) => updateContent('placeholder', e.target.value)}
                placeholder="이메일 주소"
              />
            </div>
            <div>
              <Label>버튼 텍스트</Label>
              <Input
                value={formData.content.buttonText || ''}
                onChange={(e: any) => updateContent('buttonText', e.target.value)}
                placeholder="구독하기"
              />
            </div>
            <div>
              <Label>성공 메시지</Label>
              <Input
                value={formData.content.successMessage || ''}
                onChange={(e: any) => updateContent('successMessage', e.target.value)}
                placeholder="구독해주셔서 감사합니다!"
              />
            </div>
          </div>
        )

      default:
        return (
          <div className="text-center py-8 text-gray-500">
            <Settings className="w-8 h-8 mx-auto mb-2" />
            <p>이 위젯 타입에 대한 편집기가 준비 중입니다.</p>
          </div>
        )
    }
  }

  const renderSettingsEditor = () => (
    <div className="space-y-6">
      {/* Visibility Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">표시 설정</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm">데스크톱에서 표시</Label>
            <Switch
              checked={formData.settings.visibility?.desktop !== false}
              onCheckedChange={(checked) => updateNestedSettings('visibility', 'desktop', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">태블릿에서 표시</Label>
            <Switch
              checked={formData.settings.visibility?.tablet !== false}
              onCheckedChange={(checked) => updateNestedSettings('visibility', 'tablet', checked)}
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-sm">모바일에서 표시</Label>
            <Switch
              checked={formData.settings.visibility?.mobile !== false}
              onCheckedChange={(checked) => updateNestedSettings('visibility', 'mobile', checked)}
            />
          </div>
        </CardContent>
      </Card>

      {/* Animation Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">애니메이션</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label className="text-sm">타입</Label>
            <Select
              value={formData.settings.animation?.type || 'none'}
              onValueChange={(value) => updateNestedSettings('animation', 'type', value)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">없음</SelectItem>
                <SelectItem value="fade">페이드</SelectItem>
                <SelectItem value="slide">슬라이드</SelectItem>
                <SelectItem value="bounce">바운스</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {formData.settings.animation?.type !== 'none' && (
            <>
              <div>
                <Label className="text-sm">지속시간 (ms)</Label>
                <Slider
                  value={[formData.settings.animation?.duration || 300]}
                  onValueChange={([value]: number[]) => updateNestedSettings('animation', 'duration', value)}
                  max={2000}
                  min={100}
                  step={100}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.settings.animation?.duration || 300}ms
                </div>
              </div>

              <div>
                <Label className="text-sm">지연시간 (ms)</Label>
                <Slider
                  value={[formData.settings.animation?.delay || 0]}
                  onValueChange={([value]: number[]) => updateNestedSettings('animation', 'delay', value)}
                  max={1000}
                  min={0}
                  step={100}
                />
                <div className="text-xs text-gray-500 mt-1">
                  {formData.settings.animation?.delay || 0}ms
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Custom CSS */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">커스텀 CSS</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={formData.settings.customCSS || ''}
            onChange={(e: any) => updateSettings('customCSS', e.target.value)}
            placeholder=".my-widget { color: red; }"
            rows={4}
            className="font-mono text-sm"
          />
        </CardContent>
      </Card>
    </div>
  )

  return (
    <Dialog open onOpenChange={onCancel}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? '위젯 편집' : '새 위젯 추가'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
            {/* Left Panel - Widget Type & Basic Settings */}
            <div className="space-y-6">
              {!isEditing && (
                <div>
                  <Label>위젯 타입</Label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {widgetTypes.map((type) => (
                      <Button
                        key={type.type}
                        variant={selectedType === type.type ? 'default' : 'outline'}
                        size={"sm" as const}
                        onClick={() => setSelectedType(type.type)}
                        className="flex flex-col h-auto p-3"
                      >
                        {type.icon}
                        <span className="text-xs mt-1">{type.name}</span>
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <Label>위젯 제목</Label>
                  <Input
                    value={formData.title}
                    onChange={(e: any) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="위젯 제목"
                  />
                </div>

                <div>
                  <Label>위치</Label>
                  <Select
                    value={formData.position}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, position: value as WidgetPosition }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
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

                <div className="flex items-center space-x-2">
                  <Switch
                    checked={formData.settings.showTitle}
                    onCheckedChange={(checked) => updateSettings('showTitle', checked)}
                  />
                  <Label>제목 표시</Label>
                </div>
              </div>
            </div>

            {/* Right Panel - Content & Settings */}
            <div className="lg:col-span-2 overflow-y-auto">
              <Tabs defaultValue="content" className="h-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">내용</TabsTrigger>
                  <TabsTrigger value="settings">설정</TabsTrigger>
                  <TabsTrigger value="preview">미리보기</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="space-y-4 mt-4">
                  {renderContentEditor()}
                </TabsContent>

                <TabsContent value="settings" className="mt-4">
                  {renderSettingsEditor()}
                </TabsContent>

                <TabsContent value="preview" className="mt-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        미리보기
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="border rounded-lg p-4 bg-gray-50">
                        <div className="text-center text-gray-500">
                          <p>위젯 미리보기</p>
                          <p className="text-sm mt-1">실제 사이트에서의 모습을 확인할 수 있습니다</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant={"outline" as const} onClick={onCancel}>
            취소
          </Button>
          <Button 
            onClick={handleSave}
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditing ? '수정' : '생성'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function getDefaultSettings(): WidgetSettings {
  return {
    showTitle: true,
    visibility: {
      desktop: true,
      tablet: true,
      mobile: true
    },
    animation: {
      type: 'none',
      duration: 300,
      delay: 0
    },
    spacing: {
      margin: { top: '0', right: '0', bottom: '1rem', left: '0' },
      padding: { top: '1rem', right: '1rem', bottom: '1rem', left: '1rem' }
    },
    styling: {
      textAlign: 'left'
    }
  }
}

export default WidgetBuilder