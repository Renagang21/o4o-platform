import { useState, useEffect, FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Eye, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs'
import PostEditor from '@/components/editor/PostEditor'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { CreatePostDto, UpdatePostDto, PostStatus, PostVisibility } from '@o4o/types'
import toast from 'react-hot-toast'

// 페이지 템플릿 목록
const pageTemplates = [
  { value: 'default', label: '기본 템플릿' },
  { value: 'full-width', label: '전체 너비' },
  { value: 'sidebar-left', label: '왼쪽 사이드바' },
  { value: 'sidebar-right', label: '오른쪽 사이드바' },
  { value: 'landing', label: '랜딩 페이지' },
  { value: 'contact', label: '연락처' },
  { value: 'about', label: '회사 소개' },
]

const PageForm: React.FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEditMode = !!id

  // Form state
  const [formData, setFormData] = useState<CreatePostDto & { template?: string; parentId?: string }>({
    title: '',
    content: '',
    excerpt: '',
    type: 'page',
    status: 'draft',
    visibility: 'public',
    template: 'default',
    meta: {
      seoTitle: '',
      seoDescription: '',
      seoKeywords: []
    }
  })

  // 페이지 조회 (수정 모드)
  const { data: page, isLoading: isLoadingPage } = useQuery({
    queryKey: ['page', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/posts/${id}`)
      return response.data
    },
    enabled: isEditMode
  })

  // 다른 페이지 목록 조회 (부모 페이지 선택용)
  const { data: pages = [] } = useQuery({
    queryKey: ['all-pages'],
    queryFn: async () => {
      const response = await authClient.api.get('/posts?type=page&status=published')
      return response.data.posts || []
    }
  })

  // 페이지 생성
  const createMutation = useMutation({
    mutationFn: async (data: CreatePostDto) => {
      const response = await authClient.api.post('/posts', data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('페이지가 저장되었습니다')
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      navigate(`/content/pages/${data.id}/edit`)
    },
    onError: () => {
      toast.error('페이지 저장에 실패했습니다')
    }
  })

  // 페이지 수정
  const updateMutation = useMutation({
    mutationFn: async (data: UpdatePostDto) => {
      const response = await authClient.api.put(`/posts/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('페이지가 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['pages'] })
      queryClient.invalidateQueries({ queryKey: ['page', id] })
    },
    onError: () => {
      toast.error('페이지 수정에 실패했습니다')
    }
  })

  // 페이지 데이터 로드 (수정 모드)
  useEffect(() => {
    if (page) {
      setFormData({
        title: page.title,
        content: page.content,
        excerpt: page.excerpt || '',
        type: page.type,
        status: page.status,
        visibility: page.visibility,
        password: page.password,
        template: page.template || 'default',
        parentId: page.parentId,
        meta: page.meta || {
          seoTitle: '',
          seoDescription: '',
          seoKeywords: []
        }
      })
    }
  }, [page])

  // 폼 제출
  const handleSubmit = (status: PostStatus = 'draft') => {
    const submitData = {
      ...formData,
      status
    }

    if (isEditMode) {
      updateMutation.mutate({ id, ...submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  if (isEditMode && isLoadingPage) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/content/pages')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          페이지 목록
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? '페이지 수정' : '새 페이지 만들기'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 콘텐츠 영역 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 제목 */}
          <div className="wp-card">
            <div className="wp-card-body">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="페이지 제목을 입력하세요"
                value={formData.title}
                onChange={(e: any) => setFormData({ ...formData, title: e.target.value })}
                className="mt-2"
              />
            </div>
          </div>

          {/* 에디터 */}
          <div className="wp-card">
            <div className="wp-card-body">
              <Label>내용</Label>
              <div className="mt-2">
                <PostEditor
                  content={formData.content}
                  onChange={(content) => setFormData({ ...formData, content })}
                />
              </div>
            </div>
          </div>

          {/* 추가 설정 탭 */}
          <div className="wp-card">
            <div className="wp-card-body">
              <Tabs defaultValue="page-attributes">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="page-attributes">페이지 속성</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                  <TabsTrigger value="advanced">고급</TabsTrigger>
                </TabsList>
                
                <TabsContent value="page-attributes" className="space-y-4">
                  <div>
                    <Label htmlFor="template">템플릿</Label>
                    <Select
                      value={formData.template}
                      onValueChange={(value) => setFormData({ ...formData, template: value })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {pageTemplates.map((template) => (
                          <SelectItem key={template.value} value={template.value}>
                            {template.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-1">
                      페이지의 레이아웃을 결정합니다
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="parent">부모 페이지</Label>
                    <Select
                      value={formData.parentId || 'none'}
                      onValueChange={(value) => setFormData({ 
                        ...formData, 
                        parentId: value === 'none' ? undefined : value 
                      })}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">(부모 없음)</SelectItem>
                        {pages
                          .filter((p: any) => p.id !== id)
                          .map((p: any) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.title}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-gray-500 mt-1">
                      계층 구조를 만들 수 있습니다
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="order">순서</Label>
                    <Input
                      id="order"
                      type="number"
                      placeholder="0"
                      value={formData.order || ''}
                      onChange={(e: any) => setFormData({ 
                        ...formData, 
                        order: e.target.value ? parseInt(e.target.value) : undefined 
                      })}
                      className="mt-2"
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      메뉴에서의 표시 순서를 지정합니다
                    </p>
                  </div>
                </TabsContent>

                <TabsContent value="seo" className="space-y-4">
                  <div>
                    <Label htmlFor="seoTitle">SEO 제목</Label>
                    <Input
                      id="seoTitle"
                      placeholder="검색 결과에 표시될 제목"
                      value={formData.meta?.seoTitle}
                      onChange={(e: any) => setFormData({
                        ...formData,
                        meta: { ...formData.meta, seoTitle: e.target.value }
                      })}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <Label htmlFor="seoDescription">SEO 설명</Label>
                    <Textarea
                      id="seoDescription"
                      placeholder="검색 결과에 표시될 설명"
                      value={formData.meta?.seoDescription}
                      onChange={(e: any) => setFormData({
                        ...formData,
                        meta: { ...formData.meta, seoDescription: e.target.value }
                      })}
                      className="mt-2"
                      rows={3}
                    />
                  </div>
                  <div>
                    <Label htmlFor="seoKeywords">SEO 키워드</Label>
                    <Input
                      id="seoKeywords"
                      placeholder="키워드를 쉼표로 구분하여 입력"
                      value={formData.meta?.seoKeywords?.join(', ')}
                      onChange={(e: any) => setFormData({
                        ...formData,
                        meta: {
                          ...formData.meta,
                          seoKeywords: e.target.value.split(',').map((k: any) => k.trim()).filter(Boolean)
                        }
                      })}
                      className="mt-2"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="advanced" className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="slug">슬러그</Label>
                      <Input
                        id="slug"
                        placeholder="url-friendly-slug"
                        value={formData.slug || ''}
                        onChange={(e: any) => setFormData({ ...formData, slug: e.target.value })}
                        className="mt-2"
                      />
                      <p className="text-sm text-gray-500 mt-1">
                        URL에 사용될 주소입니다. 비워두면 제목에서 자동 생성됩니다
                      </p>
                    </div>
                    <div>
                      <Label htmlFor="excerpt">요약</Label>
                      <Textarea
                        id="excerpt"
                        placeholder="페이지 요약을 입력하세요 (선택사항)"
                        value={formData.excerpt}
                        onChange={(e: any) => setFormData({ ...formData, excerpt: e.target.value })}
                        className="mt-2"
                        rows={3}
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        </div>

        {/* 사이드바 */}
        <div className="space-y-6">
          {/* 게시 설정 */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="font-medium">게시</h3>
            </div>
            <div className="wp-card-body space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm">상태:</span>
                <Badge variant={formData.status === 'published' ? 'default' : 'secondary'}>
                  {formData.status === 'draft' && '임시저장'}
                  {formData.status === 'published' && '게시됨'}
                  {formData.status === 'scheduled' && '예약됨'}
                </Badge>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-sm">공개 설정:</span>
                <Select
                  value={formData.visibility}
                  onValueChange={(value) => setFormData({ ...formData, visibility: value as PostVisibility })}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="public">공개</SelectItem>
                    <SelectItem value="private">비공개</SelectItem>
                    <SelectItem value="password">비밀번호</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.visibility === 'password' && (
                <div>
                  <Label htmlFor="password">비밀번호</Label>
                  <Input
                    id="password"
                    type="password"
                    value={formData.password || ''}
                    onChange={(e: any) => setFormData({ ...formData, password: e.target.value })}
                    className="mt-2"
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => handleSubmit('draft')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  임시저장
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleSubmit('published')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  게시
                </Button>
              </div>
            </div>
          </div>

          {/* 페이지 속성 요약 */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="font-medium flex items-center gap-2">
                <FileText className="w-4 h-4" />
                페이지 속성
              </h3>
            </div>
            <div className="wp-card-body space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">템플릿:</span>
                <span className="font-medium">
                  {pageTemplates.find(t => t.value === formData.template)?.label || '기본 템플릿'}
                </span>
              </div>
              {formData.parentId && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">부모 페이지:</span>
                  <span className="font-medium">
                    {pages.find((p: any) => p.id === formData.parentId)?.title || '-'}
                  </span>
                </div>
              )}
              {formData.order && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">순서:</span>
                  <span className="font-medium">{formData.order}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PageForm