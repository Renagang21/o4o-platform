import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Save, Eye, Calendar, Image as ImageIcon } from 'lucide-react'
import { useAutoSave } from '@/hooks/useAutoSave'
import AutoSaveIndicator from '@/components/AutoSaveIndicator'
import RecoveryNotice from '@/components/RecoveryNotice'
import { eventBus, EVENTS } from '@/lib/eventBus'
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
import { Switch } from '@/components/ui/switch'
import GutenbergEditor from '@/components/editor/GutenbergEditor'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { CreatePostDto, UpdatePostDto, PostStatus, PostVisibility, PostType, Category, Tag } from '@o4o/types'
import toast from 'react-hot-toast'
// import { format } from 'date-fns'
// import { ko } from 'date-fns/locale'

const PostForm = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEditMode = !!id

  // Form state
  const [formData, setFormData] = useState<{
    title: string;
    content: string;
    excerpt: string;
    type: PostType;
    status: PostStatus;
    visibility: PostVisibility;
    categoryIds: string[];
    tagIds: string[];
    password?: string;
    slug?: string;
    featuredImageId?: string;
    featuredImage?: any;
    meta: {
      seoTitle: string;
      seoDescription: string;
      seoKeywords: string[];
    };
  }>({
    title: '',
    content: '',
    excerpt: '',
    type: 'post',
    status: 'draft',
    visibility: 'public',
    categoryIds: [],
    tagIds: [],
    meta: {
      seoTitle: '',
      seoDescription: '',
      seoKeywords: []
    }
  })

  const [selectedCategories, setSelectedCategories] = useState<any[]>([])
  const [selectedTags, setSelectedTags] = useState<any[]>([])
  const [isScheduled, setIsScheduled] = useState(false)
  const [scheduledDate, setScheduledDate] = useState('')
  const [scheduledTime, setScheduledTime] = useState('')
  const [showRecoveryNotice, setShowRecoveryNotice] = useState(false)
  const [recoveryData, setRecoveryData] = useState<{ data: any; timestamp: Date } | null>(null)

  // 게시글 조회 (수정 모드)
  const { data: post, isLoading: isLoadingPost } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/posts/${id}`)
      return response.data
    },
    enabled: isEditMode
  })

  // 카테고리 목록 조회
  const { data: categories = [] } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/categories')
      return response.data
    }
  })

  // 태그 목록 조회
  const { data: tags = [] } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await authClient.api.get('/tags')
      return response.data
    }
  })

  // 자동 저장 훅
  const {
    isSaving,
    lastSaved,
    hasUnsavedChanges,
    savedInLocalStorage,
    recoverFromLocalStorage,
    clearLocalStorage
  } = useAutoSave(formData, {
    postId: id,
    postType: 'post',
    interval: 30000, // 30초
    onSaveSuccess: () => {
      // 자동 저장 성공 시 처리
    }
  });

  // 페이지 로드 시 복구 데이터 확인
  useEffect(() => {
    const checkRecovery = async () => {
      const recovered = await recoverFromLocalStorage();
      if (recovered && !id) { // 새 게시글일 때만 복구 제안
        setRecoveryData({
          data: recovered,
          timestamp: new Date()
        });
        setShowRecoveryNotice(true);
      }
    };
    checkRecovery();
  }, [id, recoverFromLocalStorage]);

  // 복구 처리
  const handleRecover = () => {
    if (recoveryData) {
      setFormData(recoveryData.data);
      if (recoveryData.data.categoryIds) {
        setSelectedCategories(recoveryData.data.categoryIds);
      }
      if (recoveryData.data.tagIds) {
        setSelectedTags(recoveryData.data.tagIds);
      }
      clearLocalStorage();
      setShowRecoveryNotice(false);
      toast.success('임시 저장된 내용이 복구되었습니다');
    }
  };

  // 복구 취소
  const handleDiscardRecovery = () => {
    clearLocalStorage();
    setShowRecoveryNotice(false);
  };

  // 게시글 생성
  const createMutation = useMutation({
    mutationFn: async (data: CreatePostDto) => {
      const response = await authClient.api.post('/posts', data)
      return response.data
    },
    onSuccess: (data) => {
      toast.success('게시글이 저장되었습니다')
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      clearLocalStorage() // 자동 저장 데이터 정리
      // Emit event to refresh Loop blocks
      eventBus.emit(EVENTS.POST_CREATED, { postType: 'post', id: data.id })
      navigate(`/content/posts/${data.id}/edit`)
    },
    onError: () => {
      toast.error('게시글 저장에 실패했습니다')
    }
  })

  // 게시글 수정
  const updateMutation = useMutation({
    mutationFn: async (data: UpdatePostDto) => {
      const response = await authClient.api.put(`/posts/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('게시글이 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['posts'] })
      queryClient.invalidateQueries({ queryKey: ['post', id] })
      clearLocalStorage() // 자동 저장 데이터 정리
      // Emit event to refresh Loop blocks
      eventBus.emit(EVENTS.POST_UPDATED, { postType: 'post', id })
    },
    onError: () => {
      toast.error('게시글 수정에 실패했습니다')
    }
  })

  // 게시글 데이터 로드 (수정 모드)
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title,
        content: post.content,
        excerpt: post.excerpt || '',
        type: post.type,
        status: post.status,
        visibility: post.visibility,
        password: post.password,
        categoryIds: post.categoryIds || [],
        tagIds: post.tagIds || [],
        featuredImageId: post.featuredImageId,
        meta: post.meta || {
          seoTitle: '',
          seoDescription: '',
          seoKeywords: []
        }
      })
      setSelectedCategories(post.categoryIds || [])
      setSelectedTags(post.tagIds || [])
      
      if (post.scheduledAt) {
        setIsScheduled(true)
        // const date = new Date(post.scheduledAt)
        setScheduledDate('/* date removed */')
        setScheduledTime('/* date removed */')
      }
    }
  }, [post])

  // 폼 제출
  const handleSubmit = (status: PostStatus = 'draft') => {
    const submitData = {
      ...formData,
      status,
      categoryIds: selectedCategories,
      tagIds: selectedTags,
      scheduledAt: isScheduled && scheduledDate && scheduledTime
        ? new Date(`${scheduledDate}T${scheduledTime}`)
        : undefined
    }

    if (isEditMode) {
      updateMutation.mutate({ id: id!, ...submitData } as UpdatePostDto)
    } else {
      createMutation.mutate(submitData as CreatePostDto)
    }
  }

  if (isEditMode && isLoadingPost) {
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
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => navigate('/content/posts')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          게시글 목록
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? '게시글 수정' : '새 게시글 작성'}
        </h1>
        <AutoSaveIndicator
          isSaving={isSaving}
          lastSaved={lastSaved}
          hasUnsavedChanges={hasUnsavedChanges}
          savedInLocalStorage={savedInLocalStorage}
        />
      </div>

      {/* 복구 알림 */}
      {showRecoveryNotice && recoveryData && (
        <RecoveryNotice
          onRecover={handleRecover}
          onDiscard={handleDiscardRecovery}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 메인 콘텐츠 영역 */}
        <div className="lg:col-span-2 space-y-6">
          {/* 제목 */}
          <div className="wp-card">
            <div className="wp-card-body">
              <Label htmlFor="title">제목</Label>
              <Input
                id="title"
                placeholder="게시글 제목을 입력하세요"
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
                <GutenbergEditor
                  content={formData.content}
                  onContentChange={(content) => setFormData({ ...formData, content })}
                />
              </div>
            </div>
          </div>

          {/* 추가 설정 탭 */}
          <div className="wp-card">
            <div className="wp-card-body">
              <Tabs defaultValue="excerpt">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="excerpt">요약</TabsTrigger>
                  <TabsTrigger value="seo">SEO</TabsTrigger>
                  <TabsTrigger value="advanced">고급</TabsTrigger>
                </TabsList>
                
                <TabsContent value="excerpt" className="space-y-4">
                  <div>
                    <Label htmlFor="excerpt">요약</Label>
                    <Textarea
                      id="excerpt"
                      placeholder="게시글 요약을 입력하세요 (선택사항)"
                      value={formData.excerpt}
                      onChange={(e: any) => setFormData({ ...formData, excerpt: e.target.value })}
                      className="mt-2"
                      rows={3}
                    />
                    <p className="text-sm text-gray-500 mt-1">
                      요약은 목록에서 게시글 미리보기로 표시됩니다
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
                  onValueChange={(value: string) => setFormData({ ...formData, visibility: value as PostVisibility })}
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

              <div className="flex items-center justify-between">
                <Label htmlFor="schedule" className="text-sm">예약 게시</Label>
                <Switch
                  id="schedule"
                  checked={isScheduled}
                  onCheckedChange={setIsScheduled}
                />
              </div>

              {isScheduled && (
                <div className="space-y-2">
                  <Input
                    type="date"
                    value={scheduledDate}
                    onChange={(e: any) => setScheduledDate(e.target.value)}
                  />
                  <Input
                    type="time"
                    value={scheduledTime}
                    onChange={(e: any) => setScheduledTime(e.target.value)}
                  />
                </div>
              )}

              <div className="flex gap-2 pt-4 border-t">
                <Button
                  variant={"outline" as const}
                  className="flex-1"
                  onClick={() => handleSubmit('draft')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  <Save className="w-4 h-4 mr-2" />
                  임시저장
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => handleSubmit(isScheduled ? 'scheduled' : 'published')}
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {isScheduled ? (
                    <>
                      <Calendar className="w-4 h-4 mr-2" />
                      예약
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      게시
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* 카테고리 */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="font-medium">카테고리</h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {categories.map((category: Category) => (
                  <label key={category.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedCategories.includes(category.id)}
                      onChange={(e: any) => {
                        if (e.target.checked) {
                          setSelectedCategories([...selectedCategories, category.id])
                        } else {
                          setSelectedCategories(selectedCategories.filter((id: any) => id !== category.id))
                        }
                      }}
                    />
                    <span className="text-sm">{category.name}</span>
                  </label>
                ))}
              </div>
              {categories.length === 0 && (
                <p className="text-sm text-gray-500">카테고리가 없습니다</p>
              )}
            </div>
          </div>

          {/* 태그 */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="font-medium">태그</h3>
            </div>
            <div className="wp-card-body">
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {tags.map((tag: Tag) => (
                  <label key={tag.id} className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      className="rounded border-gray-300"
                      checked={selectedTags.includes(tag.id)}
                      onChange={(e: any) => {
                        if (e.target.checked) {
                          setSelectedTags([...selectedTags, tag.id])
                        } else {
                          setSelectedTags(selectedTags.filter((id: any) => id !== tag.id))
                        }
                      }}
                    />
                    <span className="text-sm">{tag.name}</span>
                  </label>
                ))}
              </div>
              {tags.length === 0 && (
                <p className="text-sm text-gray-500">태그가 없습니다</p>
              )}
            </div>
          </div>

          {/* 대표 이미지 */}
          <div className="wp-card">
            <div className="wp-card-header">
              <h3 className="font-medium">대표 이미지</h3>
            </div>
            <div className="wp-card-body">
              {formData.featuredImage ? (
                <div className="relative">
                  <img
                    src={formData.featuredImage.url}
                    alt={formData.featuredImage.alt || ''}
                    className="w-full h-32 object-cover rounded"
                  />
                  <Button
                    variant="destructive"
                    size={"sm" as const}
                    className="absolute top-2 right-2"
                    onClick={() => setFormData({ ...formData, featuredImageId: undefined, featuredImage: undefined })}
                  >
                    제거
                  </Button>
                </div>
              ) : (
                <Button variant={"outline" as const} className="w-full">
                  <ImageIcon className="w-4 h-4 mr-2" />
                  이미지 선택
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default PostForm