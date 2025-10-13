/**
 * CPT Content Editor Component
 * Unified content editor for CPT posts
 */

import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Save, 
  ArrowLeft, 
  Eye, 
  FileText,
  Image,
  Settings,
  Calendar,
  User,
  Globe
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cptApi, cptPostApi } from '@/features/cpt-acf/services/cpt.api';
import { acfGroupApi } from '@/features/cpt-acf/services/acf.api';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { CustomPost, CreatePostDto, UpdatePostDto, PostStatus } from '@/features/cpt-acf/types/cpt.types';

interface CPTContentEditorProps {
  cptSlug: string;
  postId?: string;
  onSave?: (post: CustomPost) => void;
  onCancel?: () => void;
}

const CPTContentEditor: React.FC<CPTContentEditorProps> = ({ 
  cptSlug, 
  postId,
  onSave,
  onCancel
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotice } = useAdminNotices();
  
  // Form state
  const [formData, setFormData] = useState<Partial<CreatePostDto>>({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft' as any,
    slug: '',
    featuredImage: undefined,
    metadata: {},
    acfFields: {}
  });

  const [activeTab, setActiveTab] = useState('content');

  // Fetch CPT type details
  const { data: cptType } = useQuery({
    queryKey: ['cpt-type', cptSlug],
    queryFn: async () => {
      const response = await cptApi.getTypeBySlug(cptSlug);
      return response.data;
    }
  });

  // Fetch ACF field groups for this CPT
  const { data: fieldGroups } = useQuery({
    queryKey: ['acf-groups', cptSlug],
    queryFn: async () => {
      const response = await acfGroupApi.getAllGroups();
      // Filter field groups that apply to this post type
      const allGroups = response.data || [];
      return allGroups.filter(group => {
        if (!group.location) return false;
        // location is FieldLocation[][] (OR groups of AND rules)
        return group.location.some(ruleGroup =>
          ruleGroup.some(rule =>
            rule.param === 'post_type' && rule.value === cptSlug
          )
        );
      });
    }
  });

  // Fetch existing post if editing
  const { data: existingPost, isLoading: isLoadingPost } = useQuery({
    queryKey: ['cpt-post', cptSlug, postId],
    queryFn: async () => {
      if (!postId) return null;
      const response = await cptPostApi.getPost(cptSlug, postId);
      return response.data;
    },
    enabled: !!postId
  });

  // Load existing post data
  useEffect(() => {
    if (existingPost) {
      setFormData({
        title: existingPost.title,
        content: existingPost.content || '',
        excerpt: existingPost.excerpt || '',
        status: existingPost.status,
        slug: existingPost.slug,
        featuredImage: existingPost.featuredImage,
        metadata: existingPost.metadata || {},
        acfFields: existingPost.acfFields || {}
      });
    }
  }, [existingPost]);

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePostDto) => {
      return await cptPostApi.createPost(cptSlug, data);
    },
    onSuccess: (response) => {
      addNotice({
        type: 'success',
        message: `${cptType?.singularLabel || '콘텐츠'}가 생성되었습니다.`
      });
      queryClient.invalidateQueries({ queryKey: ['cpt-posts', cptSlug] });
      onSave?.(response.data);
      navigate(`/cpt-engine/content/${cptSlug}/${response.data.id}/edit`);
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `생성 실패: ${error.message}`
      });
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: UpdatePostDto) => {
      if (!postId) throw new Error('Post ID is required');
      return await cptPostApi.updatePost(cptSlug, postId, data);
    },
    onSuccess: (response) => {
      addNotice({
        type: 'success',
        message: `${cptType?.singularLabel || '콘텐츠'}가 업데이트되었습니다.`
      });
      queryClient.invalidateQueries({ queryKey: ['cpt-posts', cptSlug] });
      queryClient.invalidateQueries({ queryKey: ['cpt-post', cptSlug, postId] });
      onSave?.(response.data);
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `업데이트 실패: ${error.message}`
      });
    }
  });

  // Handle form changes
  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle ACF field changes
  const handleACFChange = (fieldName: string, value: any) => {
    setFormData(prev => ({
      ...prev,
      acfFields: {
        ...prev.acfFields,
        [fieldName]: value
      }
    }));
  };

  // Handle save
  const handleSave = async (status?: string) => {
    const dataToSave = {
      ...formData,
      status: (status || formData.status || 'draft') as any
    };

    if (postId) {
      await updateMutation.mutate(dataToSave as UpdatePostDto);
    } else {
      await createMutation.mutate(dataToSave as CreatePostDto);
    }
  };

  // Generate slug from title
  const generateSlug = () => {
    if (!formData.title) return;
    const slug = formData.title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    handleInputChange('slug', slug);
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || isLoadingPost;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onCancel ? onCancel() : navigate(`/cpt-engine/content/${cptSlug}`)}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h2 className="text-2xl font-bold">
              {postId ? '편집' : '새로 만들기'}: {cptType?.singularLabel || '콘텐츠'}
            </h2>
            <p className="text-muted-foreground">
              {cptType?.description || `${cptType?.label} 콘텐츠를 관리합니다`}
            </p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleSave('draft')}
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-2" />
            임시 저장
          </Button>
          <Button
            onClick={() => handleSave('publish')}
            disabled={isLoading}
          >
            <Eye className="h-4 w-4 mr-2" />
            발행
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Editor Area */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardContent className="pt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="content">콘텐츠</TabsTrigger>
                  <TabsTrigger value="fields">
                    추가 필드
                    {fieldGroups && fieldGroups.length > 0 && (
                      <Badge variant="secondary" className="ml-2">
                        {fieldGroups.reduce((acc, group) => acc + group.fields.length, 0)}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4">
                  {/* Title */}
                  <div className="grid gap-2">
                    <Label htmlFor="title">제목</Label>
                    <Input
                      id="title"
                      value={formData.title || ''}
                      onChange={(e) => handleInputChange('title', e.target.value)}
                      placeholder={`${cptType?.singularLabel || '콘텐츠'} 제목을 입력하세요`}
                    />
                  </div>

                  {/* Slug */}
                  <div className="grid gap-2">
                    <Label htmlFor="slug">슬러그</Label>
                    <div className="flex gap-2">
                      <Input
                        id="slug"
                        value={formData.slug || ''}
                        onChange={(e) => handleInputChange('slug', e.target.value)}
                        placeholder="url-friendly-slug"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        onClick={generateSlug}
                        disabled={!formData.title}
                      >
                        자동 생성
                      </Button>
                    </div>
                  </div>

                  {/* Content Editor */}
                  {(Array.isArray(cptType?.supports) ? cptType?.supports?.includes('editor') : cptType?.supports?.editor) && (
                    <div className="grid gap-2">
                      <Label htmlFor="content">내용</Label>
                      <Textarea
                        id="content"
                        value={formData.content || ''}
                        onChange={(e) => handleInputChange('content', e.target.value)}
                        placeholder="콘텐츠 내용을 입력하세요..."
                        rows={10}
                      />
                    </div>
                  )}

                  {/* Excerpt */}
                  {(Array.isArray(cptType?.supports) ? cptType?.supports?.includes('excerpt') : cptType?.supports?.excerpt) && (
                    <div className="grid gap-2">
                      <Label htmlFor="excerpt">요약</Label>
                      <Textarea
                        id="excerpt"
                        value={formData.excerpt || ''}
                        onChange={(e) => handleInputChange('excerpt', e.target.value)}
                        placeholder="간단한 요약을 입력하세요"
                        rows={3}
                      />
                    </div>
                  )}
                </TabsContent>

                {/* ACF Fields Tab */}
                <TabsContent value="fields" className="space-y-4">
                  {fieldGroups && fieldGroups.length > 0 ? (
                    fieldGroups.map(group => (
                      <Card key={group.id}>
                        <CardHeader>
                          <CardTitle className="text-lg">{group.title}</CardTitle>
                          {group.description && (
                            <CardDescription>{group.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            {group.fields.map((field: any) => (
                              <div key={field.id} className="grid gap-2">
                                <Label htmlFor={field.name}>{field.label}</Label>
                                {field.type === 'text' ? (
                                  <Input
                                    id={field.name}
                                    value={formData.acfFields?.[field.name] || ''}
                                    onChange={(e) => handleACFChange(field.name, e.target.value)}
                                    placeholder={field.placeholder}
                                  />
                                ) : field.type === 'textarea' ? (
                                  <Textarea
                                    id={field.name}
                                    value={formData.acfFields?.[field.name] || ''}
                                    onChange={(e) => handleACFChange(field.name, e.target.value)}
                                    placeholder={field.placeholder}
                                    rows={4}
                                  />
                                ) : field.type === 'select' ? (
                                  <Select
                                    value={formData.acfFields?.[field.name] || ''}
                                    onValueChange={(value) => handleACFChange(field.name, value)}
                                  >
                                    <SelectTrigger id={field.name}>
                                      <SelectValue placeholder={field.placeholder || '선택...'} />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {field.options?.choices?.map((choice: string) => (
                                        <SelectItem key={choice} value={choice}>
                                          {choice}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Input
                                    id={field.name}
                                    value={formData.acfFields?.[field.name] || ''}
                                    onChange={(e) => handleACFChange(field.name, e.target.value)}
                                    placeholder={field.placeholder}
                                  />
                                )}
                                {field.description && (
                                  <p className="text-xs text-muted-foreground">{field.description}</p>
                                )}
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      </Card>
                    ))
                  ) : (
                    <Card>
                      <CardContent className="flex flex-col items-center justify-center h-64 text-center">
                        <Settings className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          이 콘텐츠 타입에 대한 추가 필드가 없습니다.
                        </p>
                        <Button
                          variant="link"
                          onClick={() => navigate(`/cpt-engine/fields?type=${cptSlug}`)}
                          className="mt-2"
                        >
                          필드 추가하기
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">발행 설정</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="status">상태</Label>
                <Select
                  value={formData.status || 'draft'}
                  onValueChange={(value) => handleInputChange('status', value as PostStatus)}
                >
                  <SelectTrigger id="status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">임시 저장</SelectItem>
                    <SelectItem value="publish">발행됨</SelectItem>
                    <SelectItem value="private">비공개</SelectItem>
                    <SelectItem value="trash">휴지통</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {existingPost && (
                <>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>생성: {new Date(existingPost.createdAt).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <User className="h-4 w-4" />
                    <span>작성자: {existingPost.author?.name || '알 수 없음'}</span>
                  </div>
                </>
              )}

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const baseUrl = window.location.origin.replace('admin.', '');
                  const previewUrl = `${baseUrl}/${cptSlug}/${formData.slug || 'preview'}`;
                  window.open(previewUrl, '_blank');
                }}
                disabled={!formData.slug}
              >
                <Globe className="h-4 w-4 mr-2" />
                미리보기
              </Button>
            </CardContent>
          </Card>

          {/* Featured Image Card */}
          {(Array.isArray(cptType?.supports) ? cptType?.supports?.includes('thumbnail') : cptType?.supports?.thumbnail) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">대표 이미지</CardTitle>
              </CardHeader>
              <CardContent>
                {formData.featuredImage ? (
                  <div className="space-y-2">
                    <img 
                      src={formData.featuredImage} 
                      alt="Featured" 
                      className="w-full rounded-md"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleInputChange('featuredImage', undefined)}
                    >
                      이미지 제거
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-md p-4 text-center">
                    <Image className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                    <p className="text-sm text-muted-foreground">
                      클릭하여 이미지 선택
                    </p>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          // Handle file upload
                          // This would typically upload to your server
                          const reader = new FileReader();
                          reader.onloadend = () => {
                            handleInputChange('featuredImage', reader.result);
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Metadata Card */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">메타데이터</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="metaTitle">메타 제목</Label>
                <Input
                  id="metaTitle"
                  value={formData.metadata?.title || ''}
                  onChange={(e) => handleInputChange('metadata', {
                    ...formData.metadata,
                    title: e.target.value
                  })}
                  placeholder="검색 결과에 표시될 제목"
                />
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="metaDescription">메타 설명</Label>
                <Textarea
                  id="metaDescription"
                  value={formData.metadata?.description || ''}
                  onChange={(e) => handleInputChange('metadata', {
                    ...formData.metadata,
                    description: e.target.value
                  })}
                  placeholder="검색 결과에 표시될 설명"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CPTContentEditor;