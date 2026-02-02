import { FC, FormEvent, useState } from 'react';
import { Plus, Edit, Trash2, GripVertical } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import toast from 'react-hot-toast';
import OrganizationBadge from '../components/OrganizationBadge';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  active: boolean;
  order: number;
  organizationId?: string | null;
  isOrganizationExclusive?: boolean;
}

interface CategoryFormData {
  name: string;
  slug: string;
  description: string;
  active: boolean;
}

const ForumCategories: FC = () => {
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ForumCategory | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    active: true
  });

  // Fetch categories
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['forum-categories'],
    queryFn: async () => {
      const response = await authClient.api.get('/forum/categories');
      return response.data.data;
    }
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const response = await authClient.api.post('/forum/categories', data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('카테고리가 생성되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forum-categories'] });
      handleCloseDialog();
    }
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: CategoryFormData }) => {
      const response = await authClient.api.put(`/forum/categories/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success('카테고리가 수정되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forum-categories'] });
      handleCloseDialog();
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authClient.api.delete(`/forum/categories/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success('카테고리가 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forum-categories'] });
    }
  });

  // Reorder mutation (commented out for future implementation)
  // const reorderMutation = useMutation({
  //   mutationFn: async (orderedIds: string[]) => {
  //     const response = await authClient.api.post('/forum/categories/reorder', { orderedIds });
  //     return response.data;
  //   },
  //   onSuccess: () => {
  //     toast.success('카테고리 순서가 변경되었습니다');
  //     queryClient.invalidateQueries({ queryKey: ['forum-categories'] });
  //   }
  // });

  const handleOpenDialog = (category?: ForumCategory) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        name: category.name,
        slug: category.slug,
        description: category.description,
        active: category.active
      });
    } else {
      setEditingCategory(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        active: true
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      active: true
    });
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('카테고리 이름을 입력하세요');
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (category: ForumCategory) => {
    if (category.postCount > 0) {
      toast.error('게시글이 있는 카테고리는 삭제할 수 없습니다');
      return;
    }

    if (confirm(`"${category.name}" 카테고리를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-modern-text-primary">포럼 카테고리</h2>
          <p className="text-modern-text-secondary mt-1">포럼 카테고리를 관리하세요.</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          새 카테고리
        </Button>
      </div>

      {/* Categories List */}
      <div className="wp-card">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-modern-bg-tertiary border-b border-modern-border-primary">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  순서
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  이름
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  설명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  조직
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  게시글 수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-modern-text-secondary uppercase tracking-wider">
                  작업
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-modern-border-primary">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
                    </div>
                  </td>
                </tr>
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-modern-text-secondary">
                    카테고리가 없습니다.
                  </td>
                </tr>
              ) : (
                categories.map((category: ForumCategory) => (
                  <tr key={category.id} className="hover:bg-modern-bg-hover">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <GripVertical className="w-5 h-5 text-modern-text-tertiary cursor-move" />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <p className="text-sm font-medium text-modern-text-primary">{category.name}</p>
                        <p className="text-xs text-modern-text-secondary">/{category.slug}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-sm text-modern-text-secondary truncate max-w-xs">
                        {category.description || '-'}
                      </p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <OrganizationBadge
                        organizationId={category.organizationId}
                        isOrganizationExclusive={category.isOrganizationExclusive}
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-modern-text-primary">
                      {category.postCount}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        category.active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {category.active ? '활성' : '비활성'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <Button
                          variant={"ghost" as const}
                          size={"sm" as const}
                          onClick={() => handleOpenDialog(category)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant={"ghost" as const}
                          size={"sm" as const}
                          onClick={() => handleDelete(category)}
                          disabled={category.postCount > 0}
                        >
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Category Form Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? '카테고리 수정' : '새 카테고리'}
              </DialogTitle>
              <DialogDescription>
                포럼 카테고리 정보를 입력하세요.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="name">이름 *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e: any) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      name: e.target.value,
                      slug: editingCategory ? prev.slug : generateSlug(e.target.value)
                    }));
                  }}
                  placeholder="예: 일반 토론"
                  required
                />
              </div>
              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e: any) => setFormData((prev: any) => ({ ...prev, slug: e.target.value }))}
                  placeholder="예: general-discussion"
                />
              </div>
              <div>
                <Label htmlFor="description">설명</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e: any) => setFormData((prev: any) => ({ ...prev, description: e.target.value }))}
                  placeholder="카테고리에 대한 설명을 입력하세요..."
                  rows={3}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="active">활성화</Label>
                  <p className="text-sm text-modern-text-secondary">
                    비활성화 시 게시글 작성이 불가능합니다
                  </p>
                </div>
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked: boolean) => setFormData((prev: any) => ({ ...prev, active: checked }))}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant={"outline" as const} onClick={handleCloseDialog}>
                취소
              </Button>
              <Button 
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingCategory ? '수정' : '생성'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ForumCategories;