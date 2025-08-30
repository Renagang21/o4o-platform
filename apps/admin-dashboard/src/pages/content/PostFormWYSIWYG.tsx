import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import GutenbergBlockEditor from '@/components/editor/GutenbergBlockEditor';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import type { CreatePostDto, UpdatePostDto, PostStatus, PostVisibility } from '@o4o/types';

interface Block {
  id: string;
  type: string;
  content: any;
  attributes?: any;
}

interface FormData extends CreatePostDto {
  menu_order?: number;
}

const PostFormWYSIWYG = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  // Form state with menu_order added
  const [formData, setFormData] = useState<FormData>({
    title: '',
    content: '',
    excerpt: '',
    type: 'post',
    status: 'draft',
    visibility: 'public',
    menu_order: 0,
    slug: '',
    meta: {
      seoTitle: '',
      seoDescription: '',
      seoKeywords: []
    }
  });

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [isDirty, setIsDirty] = useState(false);

  // Fetch post data if editing
  const { data: post, isLoading } = useQuery({
    queryKey: ['post', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/posts/${id}`);
      return response.data;
    },
    enabled: isEditMode
  });

  // Initialize form with post data
  useEffect(() => {
    if (post) {
      setFormData({
        title: post.title || '',
        content: post.content || '',
        excerpt: post.excerpt || '',
        type: post.type || 'post',
        status: post.status || 'draft',
        visibility: post.visibility || 'public',
        menu_order: post.menu_order || 0,
        slug: post.slug || '',
        password: post.password,
        meta: post.meta || {
          seoTitle: '',
          seoDescription: '',
          seoKeywords: []
        }
      });
      
      if (post.blocks) {
        setBlocks(post.blocks);
      } else if (post.content) {
        // Convert legacy content to blocks
        setBlocks([{ id: '1', type: 'paragraph', content: post.content, attributes: {} }]);
      }
    }
  }, [post]);

  // Create post mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreatePostDto) => {
      const response = await authClient.api.post('/posts', data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success('게시글이 저장되었습니다');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      navigate(`/content/${data.id}/edit`);
      setIsDirty(false);
    },
    onError: () => {
      toast.error('게시글 저장에 실패했습니다');
    }
  });

  // Update post mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdatePostDto }) => {
      const response = await authClient.api.put(`/posts/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('게시글이 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['posts'] });
      queryClient.invalidateQueries({ queryKey: ['post', id] });
      setIsDirty(false);
    },
    onError: () => {
      toast.error('게시글 수정에 실패했습니다');
    }
  });

  // Handle blocks change
  const handleBlocksChange = (newBlocks: Block[]) => {
    setBlocks(newBlocks);
    // Convert blocks to HTML content for backward compatibility
    const htmlContent = newBlocks.map(block => {
      if (block.type === 'paragraph') return `<p>${block.content}</p>`;
      if (block.type === 'heading') {
        const level = block.attributes?.level || 2;
        return `<h${level}>${block.content}</h${level}>`;
      }
      if (block.type === 'list') {
        const items = block.attributes?.items || [];
        const listItems = items.map((item: any) => `<li>${item.content}</li>`).join('');
        return block.attributes?.type === 'ordered' ? `<ol>${listItems}</ol>` : `<ul>${listItems}</ul>`;
      }
      if (block.type === 'image' && block.attributes?.url) {
        return `<img src="${block.attributes.url}" alt="${block.attributes.alt || ''}" />`;
      }
      if (block.type === 'button' && block.attributes?.text) {
        return `<a href="${block.attributes.url || '#'}" class="button">${block.attributes.text}</a>`;
      }
      return '';
    }).join('\n');
    
    setFormData(prev => ({ ...prev, content: htmlContent }));
    setIsDirty(true);
  };

  // Submit handler
  const handleSubmit = (status: PostStatus = 'draft') => {
    const submitData = {
      ...formData,
      status,
      blocks
    };

    if (isEditMode && id) {
      const updateData: UpdatePostDto = {
        ...submitData,
        id
      };
      updateMutation.mutate({ id, data: updateData });
    } else {
      createMutation.mutate(submitData);
    }
  };

  // Prevent accidental navigation
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/content')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          게시글 목록
        </Button>
        <h1 className="text-2xl font-bold">
          {isEditMode ? '게시글 수정' : '새 게시글 작성'}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* Title */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <Label htmlFor="title">제목</Label>
            <Input
              id="title"
              placeholder="게시글 제목을 입력하세요"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                setIsDirty(true);
              }}
              className="mt-2"
            />
            <p className="text-sm text-gray-500 mt-1">
              제목은 게시글의 가장 중요한 부분입니다. 명확하고 흥미로운 제목을 작성하세요.
            </p>
          </div>

          {/* Editor */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <Label>내용</Label>
            <div className="mt-2">
              <GutenbergBlockEditor
                initialBlocks={blocks}
                onChange={handleBlocksChange}
              />
            </div>
            <p className="text-sm text-gray-500 mt-2">
              블록 에디터를 사용하여 다양한 콘텐츠를 추가할 수 있습니다.
            </p>
          </div>

          {/* Additional Settings Tabs */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            <Tabs defaultValue="excerpt">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="excerpt">요약</TabsTrigger>
                <TabsTrigger value="seo">SEO 설정</TabsTrigger>
                <TabsTrigger value="advanced">고급 설정</TabsTrigger>
              </TabsList>
              
              <TabsContent value="excerpt" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="excerpt">요약</Label>
                  <Textarea
                    id="excerpt"
                    placeholder="게시글 요약을 입력하세요 (선택사항)"
                    value={formData.excerpt}
                    onChange={(e) => {
                      setFormData({ ...formData, excerpt: e.target.value });
                      setIsDirty(true);
                    }}
                    className="mt-2"
                    rows={3}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    요약은 목록에서 게시글 미리보기로 표시됩니다. 비워두면 본문 내용의 일부가 자동으로 사용됩니다.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="seo" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="seoTitle">SEO 제목</Label>
                  <Input
                    id="seoTitle"
                    placeholder="검색 결과에 표시될 제목"
                    value={formData.meta?.seoTitle}
                    onChange={(e) => setFormData({
                      ...formData,
                      meta: { ...formData.meta, seoTitle: e.target.value }
                    })}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    검색 엔진에 표시될 제목입니다. 60자 이내로 작성하세요.
                  </p>
                </div>
                <div>
                  <Label htmlFor="seoDescription">SEO 설명</Label>
                  <Textarea
                    id="seoDescription"
                    placeholder="검색 결과에 표시될 설명"
                    value={formData.meta?.seoDescription}
                    onChange={(e) => setFormData({
                      ...formData,
                      meta: { ...formData.meta, seoDescription: e.target.value }
                    })}
                    className="mt-2"
                    rows={3}
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    검색 엔진에 표시될 설명입니다. 160자 이내로 작성하세요.
                  </p>
                </div>
                <div>
                  <Label htmlFor="seoKeywords">SEO 키워드</Label>
                  <Input
                    id="seoKeywords"
                    placeholder="키워드를 쉼표로 구분하여 입력"
                    value={formData.meta?.seoKeywords?.join(', ')}
                    onChange={(e) => setFormData({
                      ...formData,
                      meta: {
                        ...formData.meta,
                        seoKeywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
                      }
                    })}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    관련 키워드를 입력하면 검색 노출에 도움이 됩니다.
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="advanced" className="space-y-4 mt-4">
                <div>
                  <Label htmlFor="slug">슬러그</Label>
                  <Input
                    id="slug"
                    placeholder="url-friendly-slug"
                    value={formData.slug}
                    onChange={(e) => {
                      setFormData({ ...formData, slug: e.target.value });
                      setIsDirty(true);
                    }}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    URL에 사용될 주소입니다. 비워두면 제목에서 자동 생성됩니다.
                  </p>
                </div>
                <div>
                  <Label htmlFor="menu_order">표시 순서</Label>
                  <Input
                    id="menu_order"
                    type="number"
                    placeholder="0"
                    value={formData.menu_order || ''}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        menu_order: parseInt(e.target.value) || 0
                      });
                      setIsDirty(true);
                    }}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    목록에서의 표시 순서를 지정합니다. 낮은 숫자가 먼저 표시됩니다.
                  </p>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Publish Settings */}
          <div className="bg-white rounded-lg shadow-sm">
            <div className="p-4 border-b">
              <h3 className="font-medium">게시 설정</h3>
            </div>
            <div className="p-4 space-y-4">
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
                  onValueChange={(value: PostVisibility) => {
                    setFormData({ ...formData, visibility: value });
                    setIsDirty(true);
                  }}
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
                    onChange={(e) => {
                      setFormData({ ...formData, password: e.target.value });
                      setIsDirty(true);
                    }}
                    className="mt-2"
                  />
                  <p className="text-sm text-gray-500 mt-1">
                    이 게시글을 보려면 비밀번호가 필요합니다.
                  </p>
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
        </div>
      </div>
    </div>
  );
};

export default PostFormWYSIWYG;