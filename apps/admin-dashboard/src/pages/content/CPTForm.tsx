import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom'
import { 
  ArrowLeft, 
  Save, 
  Plus,
  Settings
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { authClient } from '@o4o/auth-client'
import type { CreateCustomPostTypeDto, UpdateCustomPostTypeDto } from '@o4o/types'
import toast from 'react-hot-toast'

// Icon options for CPT
const iconOptions = [
  { value: '📄', label: '문서' },
  { value: '📝', label: '글쓰기' },
  { value: '📊', label: '차트' },
  { value: '🎨', label: '디자인' },
  { value: '🛍️', label: '쇼핑' },
  { value: '📸', label: '사진' },
  { value: '🎬', label: '비디오' },
  { value: '🎵', label: '음악' },
  { value: '📅', label: '캘린더' },
  { value: '👥', label: '사람' },
  { value: '💼', label: '비즈니스' },
  { value: '🏢', label: '회사' },
  { value: '🎯', label: '목표' },
  { value: '💡', label: '아이디어' },
  { value: '🔧', label: '도구' },
]

const CPTForm: FC = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const queryClient = useQueryClient()
  const isEditMode = !!id

  // Form state
  const [formData, setFormData] = useState<CreateCustomPostTypeDto>({
    name: '',
    singularName: '',
    pluralName: '',
    slug: '',
    description: '',
    icon: '📄',
    menuPosition: 5,
    isPublic: true,
    showInMenu: true,
    showInAdminBar: true,
    hasArchive: true,
    supports: {
      title: true,
      editor: true,
      excerpt: true,
      thumbnail: true,
      customFields: true,
      comments: false,
      revisions: true,
      author: true,
      pageAttributes: false,
    },
    labels: {},
    taxonomies: [],
  })

  const [selectedTaxonomies, setSelectedTaxonomies] = useState<string[]>([])

  // Fetch CPT data (edit mode)
  const { data: cpt, isLoading: isLoadingCPT } = useQuery({
    queryKey: ['custom-post-type', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/v1/custom-post-types/${id}`)
      return response.data
    },
    enabled: isEditMode
  })

  // Fetch available taxonomies
  const { data: taxonomies = [] } = useQuery({
    queryKey: ['taxonomies'],
    queryFn: async () => {
      // This would fetch both default and custom taxonomies
      return [
        { id: 'category', name: '카테고리', slug: 'category' },
        { id: 'tag', name: '태그', slug: 'tag' },
      ]
    }
  })

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateCustomPostTypeDto) => {
      const response = await authClient.api.post('/v1/custom-post-types', data)
      return response.data
    },
    onSuccess: () => {
      toast.success('사용자 정의 게시물 유형이 생성되었습니다')
      queryClient.invalidateQueries({ queryKey: ['custom-post-types'] })
      navigate('/cpt')
    },
    onError: () => {
      toast.error('생성에 실패했습니다')
    }
  })

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdateCustomPostTypeDto) => {
      const response = await authClient.api.put(`/v1/custom-post-types/${id}`, data)
      return response.data
    },
    onSuccess: () => {
      toast.success('사용자 정의 게시물 유형이 수정되었습니다')
      queryClient.invalidateQueries({ queryKey: ['custom-post-types'] })
      queryClient.invalidateQueries({ queryKey: ['custom-post-type', id] })
    },
    onError: () => {
      toast.error('수정에 실패했습니다')
    }
  })

  // Load CPT data in edit mode
  useEffect(() => {
    if (cpt) {
      setFormData({
        name: cpt.name,
        singularName: cpt.singularName,
        pluralName: cpt.pluralName,
        slug: cpt.slug,
        description: cpt.description,
        icon: cpt.icon,
        menuPosition: cpt.menuPosition,
        isPublic: cpt.isPublic,
        showInMenu: cpt.showInMenu,
        showInAdminBar: cpt.showInAdminBar,
        hasArchive: cpt.hasArchive,
        supports: cpt.supports,
        labels: cpt.labels,
        taxonomies: cpt.taxonomies,
      })
      setSelectedTaxonomies(cpt.taxonomies || [])
    }
  }, [cpt])

  // Generate slug from name
  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '_')
      .replace(/^_+|_+$/g, '')
  }

  // Handle name change and auto-generate other fields
  const handleNameChange = (name: string) => {
    if (!isEditMode) {
      setFormData({
        ...formData,
        name,
        singularName: name,
        pluralName: name,
        slug: generateSlug(name),
      })
    } else {
      setFormData({ ...formData, name })
    }
  }

  // Handle form submission
  const handleSubmit = () => {
    const submitData = {
      ...formData,
      taxonomies: selectedTaxonomies,
    }

    if (isEditMode) {
      updateMutation.mutate({ id, ...submitData })
    } else {
      createMutation.mutate(submitData)
    }
  }

  if (isEditMode && isLoadingCPT) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/content/cpt')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          CPT 목록
        </Button>
        <h1 className="text-2xl font-bold text-gray-900">
          {isEditMode ? 'CPT 수정' : '새 사용자 정의 게시물 유형'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>기본 정보</CardTitle>
              <CardDescription>
                게시물 유형의 기본 정보를 입력하세요
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="icon">아이콘</Label>
                  <Select
                    value={formData.icon}
                    onValueChange={(value) => setFormData({ ...formData, icon: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {iconOptions.map(option => (
                        <SelectItem key={option.value} value={option.value}>
                          <span className="flex items-center gap-2">
                            <span className="text-xl">{option.value}</span>
                            <span>{option.label}</span>
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="menuPosition">메뉴 위치</Label>
                  <Input
                    id="menuPosition"
                    type="number"
                    value={formData.menuPosition}
                    onChange={(e: any) => setFormData({ ...formData, menuPosition: parseInt(e.target.value) || 5 })}
                    className="mt-2"
                  />
                  <p className="text-xs text-gray-500 mt-1">숫자가 작을수록 상단에 표시</p>
                </div>
              </div>

              <div>
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: any) => handleNameChange(e.target.value)}
                  placeholder="예: 제품"
                  className="mt-2"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="singularName">단수형 이름</Label>
                  <Input
                    id="singularName"
                    value={formData.singularName}
                    onChange={(e: any) => setFormData({ ...formData, singularName: e.target.value })}
                    placeholder="예: 제품"
                    className="mt-2"
                  />
                </div>
                <div>
                  <Label htmlFor="pluralName">복수형 이름</Label>
                  <Input
                    id="pluralName"
                    value={formData.pluralName}
                    onChange={(e: any) => setFormData({ ...formData, pluralName: e.target.value })}
                    placeholder="예: 제품들"
                    className="mt-2"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="slug">슬러그 (URL)</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e: any) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="예: product"
                  className="mt-2"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">URL에 사용될 고유 식별자</p>
              </div>

              <div>
                <Label htmlFor="description">설명 (선택)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: any) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="이 게시물 유형에 대한 설명"
                  rows={3}
                  className="mt-2"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>기능 지원</CardTitle>
              <CardDescription>
                이 게시물 유형에서 사용할 기능을 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.supports?.title}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      supports: { ...formData.supports!, title: !!checked }
                    })}
                  />
                  <span>제목</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.supports?.editor}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      supports: { ...formData.supports!, editor: !!checked }
                    })}
                  />
                  <span>에디터</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.supports?.excerpt}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      supports: { ...formData.supports!, excerpt: !!checked }
                    })}
                  />
                  <span>요약</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.supports?.thumbnail}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      supports: { ...formData.supports!, thumbnail: !!checked }
                    })}
                  />
                  <span>대표 이미지</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.supports?.customFields}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      supports: { ...formData.supports!, customFields: !!checked }
                    })}
                  />
                  <span>커스텀 필드</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.supports?.comments}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      supports: { ...formData.supports!, comments: !!checked }
                    })}
                  />
                  <span>댓글</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.supports?.revisions}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      supports: { ...formData.supports!, revisions: !!checked }
                    })}
                  />
                  <span>리비전</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.supports?.author}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      supports: { ...formData.supports!, author: !!checked }
                    })}
                  />
                  <span>작성자</span>
                </label>
                <label className="flex items-center space-x-2">
                  <Checkbox
                    checked={formData.supports?.pageAttributes}
                    onCheckedChange={(checked) => setFormData({
                      ...formData,
                      supports: { ...formData.supports!, pageAttributes: !!checked }
                    })}
                  />
                  <span>페이지 속성</span>
                </label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>분류 체계</CardTitle>
              <CardDescription>
                이 게시물 유형에서 사용할 분류 체계를 선택하세요
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {taxonomies.map((taxonomy: any) => (
                  <label key={taxonomy.id} className="flex items-center space-x-2">
                    <Checkbox
                      checked={selectedTaxonomies.includes(taxonomy.id)}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSelectedTaxonomies([...selectedTaxonomies, taxonomy.id])
                        } else {
                          setSelectedTaxonomies(selectedTaxonomies.filter(id => id !== taxonomy.id))
                        }
                      }}
                    />
                    <span>{taxonomy.name}</span>
                    <Badge variant="outline" className="text-xs">
                      {taxonomy.slug}
                    </Badge>
                  </label>
                ))}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-4"
                onClick={() => navigate('/content/taxonomies/new')}
              >
                <Plus className="w-4 h-4 mr-2" />
                새 분류 체계 추가
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>공개 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="isPublic">공개</Label>
                  <p className="text-xs text-gray-500">
                    사용자에게 표시
                  </p>
                </div>
                <Switch
                  id="isPublic"
                  checked={formData.isPublic}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPublic: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="showInMenu">메뉴에 표시</Label>
                  <p className="text-xs text-gray-500">
                    관리자 메뉴에 표시
                  </p>
                </div>
                <Switch
                  id="showInMenu"
                  checked={formData.showInMenu}
                  onCheckedChange={(checked) => setFormData({ ...formData, showInMenu: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="showInAdminBar">관리 막대에 표시</Label>
                  <p className="text-xs text-gray-500">
                    상단 관리 막대에 표시
                  </p>
                </div>
                <Switch
                  id="showInAdminBar"
                  checked={formData.showInAdminBar}
                  onCheckedChange={(checked) => setFormData({ ...formData, showInAdminBar: checked })}
                />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <Label htmlFor="hasArchive">아카이브 페이지</Label>
                  <p className="text-xs text-gray-500">
                    목록 페이지 생성
                  </p>
                </div>
                <Switch
                  id="hasArchive"
                  checked={formData.hasArchive}
                  onCheckedChange={(checked) => setFormData({ ...formData, hasArchive: checked })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>작업</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                onClick={handleSubmit}
                className="w-full"
                disabled={!formData.name || !formData.slug || createMutation.isPending || updateMutation.isPending}
              >
                <Save className="w-4 h-4 mr-2" />
                {isEditMode ? 'CPT 수정' : 'CPT 생성'}
              </Button>

              {isEditMode && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => navigate(`/content/cpt/${id}/fields`)}
                >
                  <Settings className="w-4 h-4 mr-2" />
                  커스텀 필드 관리
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Preview */}
          <Card>
            <CardHeader>
              <CardTitle>미리보기</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{formData.icon}</span>
                  <span className="font-medium">{formData.pluralName || '새 게시물 유형'}</span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>슬러그: <code className="bg-gray-100 px-1">{formData.slug || 'slug'}</code></p>
                  <p>URL: <code className="bg-gray-100 px-1">/content/{formData.slug || 'slug'}</code></p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default CPTForm