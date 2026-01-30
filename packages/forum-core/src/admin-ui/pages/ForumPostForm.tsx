import { FC, FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { RichTextEditor } from '@o4o/content-editor';
import { htmlToBlocks, blocksToHtml } from '../../utils/htmlToBlocks';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import toast from 'react-hot-toast';

interface ForumPostFormData {
  title: string;
  content: any; // Block[] or HTML string
  categoryId: string;
  status: 'published' | 'draft';
  isPinned: boolean;
  isLocked: boolean;
}

const ForumPostForm: FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const queryClient = useQueryClient();
  const isEditMode = !!id;

  const [formData, setFormData] = useState<ForumPostFormData>({
    title: '',
    content: '',
    categoryId: '',
    status: 'published',
    isPinned: false,
    isLocked: false
  });

  // Editor state for HTML content
  const [editorHtml, setEditorHtml] = useState('');

  // Fetch categories
  const { data: categoriesData } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/forum/categories');
      return response.data;
    }
  });
  const categories = categoriesData?.data || [];

  // Fetch post data for edit mode
  const { data: post, isLoading } = useQuery({
    queryKey: ['forum-post', id],
    queryFn: async () => {
      const response = await authClient.api.get(`/forum/posts/${id}`);
      return response.data.data;
    },
    enabled: isEditMode
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: ForumPostFormData) => {
      const response = await authClient.api.post('/forum/posts', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('게시글이 작성되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      navigate('/forum');
    },
    onError: () => {
      toast.error('게시글 작성에 실패했습니다');
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: ForumPostFormData) => {
      const response = await authClient.api.put(`/forum/posts/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('게시글이 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forum-posts'] });
      queryClient.invalidateQueries({ queryKey: ['forum-post', id] });
      navigate('/forum');
    },
    onError: () => {
      toast.error('게시글 수정에 실패했습니다');
    }
  });

  // Load post data in edit mode
  useEffect(() => {
    if (post) {
      // Convert Block[] to HTML for editor
      const htmlContent = Array.isArray(post.content)
        ? blocksToHtml(post.content)
        : (typeof post.content === 'string' ? post.content : '');

      setEditorHtml(htmlContent);
      setFormData({
        title: post.title,
        content: post.content,
        categoryId: post.category.id,
        status: post.status,
        isPinned: post.isPinned,
        isLocked: post.isLocked
      });
    }
  }, [post]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('제목을 입력하세요');
      return;
    }

    if (!editorHtml.trim()) {
      toast.error('내용을 입력하세요');
      return;
    }

    if (!formData.categoryId) {
      toast.error('카테고리를 선택하세요');
      return;
    }

    // Convert HTML to Block[] for API
    const blocks = htmlToBlocks(editorHtml);
    const submitData = {
      ...formData,
      content: blocks,
    };

    if (isEditMode) {
      updateMutation.mutate(submitData);
    } else {
      createMutation.mutate(submitData);
    }
  };

  const handleChange = (field: keyof ForumPostFormData, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }));
  };

  if (isEditMode && isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant={"ghost" as const}
          size={"sm" as const}
          onClick={() => navigate('/forum')}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          게시판 목록
        </Button>
        <h1 className="text-2xl font-bold text-modern-text-primary">
          {isEditMode ? '게시글 수정' : '새 게시글 작성'}
        </h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle>게시글 정보</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="title">제목 *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e: any) => handleChange('title', e.target.value)}
                  placeholder="게시글 제목을 입력하세요"
                  required
                />
              </div>

              <div>
                <Label htmlFor="category">카테고리 *</Label>
                <Select
                  value={formData.categoryId}
                  onValueChange={(value: string) => handleChange('categoryId', value)}
                >
                  <SelectTrigger>
                      <SelectValue 
                        placeholder="카테고리를 선택하세요"
                      getDisplayValue={(categoryId) => {
                        const category = categories.find((c: any) => c.id === categoryId);
                        return category?.name || categoryId;
                      }}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category: any) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="content">내용 *</Label>
                <RichTextEditor
                  value={editorHtml}
                  onChange={(content) => {
                    setEditorHtml(content.html);
                  }}
                  placeholder="게시글 내용을 입력하세요..."
                  minHeight="400px"
                />
              </div>
            </CardContent>
          </Card>

          {/* Publishing Options */}
          <Card>
            <CardHeader>
              <CardTitle>게시 옵션</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="status">상태</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value: string) => handleChange('status', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="published">게시</SelectItem>
                    <SelectItem value="draft">초안</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isPinned">상단 고정</Label>
                  <p className="text-sm text-modern-text-secondary">
                    게시글을 목록 상단에 고정합니다
                  </p>
                </div>
                <Switch
                  id="isPinned"
                  checked={formData.isPinned}
                  onCheckedChange={(checked: boolean) => handleChange('isPinned', checked)}
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="isLocked">댓글 잠금</Label>
                  <p className="text-sm text-modern-text-secondary">
                    새 댓글 작성을 차단합니다
                  </p>
                </div>
                <Switch
                  id="isLocked"
                  checked={formData.isLocked}
                  onCheckedChange={(checked: boolean) => handleChange('isLocked', checked)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 mt-6">
          <Button
            type="button"
            variant={"outline" as const}
            onClick={() => navigate('/forum')}
          >
            취소
          </Button>
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
          >
            <Save className="w-4 h-4 mr-2" />
            {isEditMode ? '수정하기' : '작성하기'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default ForumPostForm;
