import { useState } from 'react';
import { Plus, Edit2, Trash2, Tag, FolderOpen, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/api/client';
import toast from 'react-hot-toast';

interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string;
  parentId?: string;
  parentName?: string;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

interface Tag {
  id: string;
  name: string;
  slug: string;
  description?: string;
  postCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function Categories() {
  const [selectedTab, setSelectedTab] = useState<'categories' | 'tags'>('categories');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Category | Tag | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parentId: ''
  });

  const queryClient = useQueryClient();

  // Fetch categories
  const { data: categories, isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await apiClient.get('/api/categories');
      return response.data.data || [];
    },
    enabled: selectedTab === 'categories'
  });

  // Fetch tags
  const { data: tags, isLoading: tagsLoading } = useQuery({
    queryKey: ['tags'],
    queryFn: async () => {
      const response = await apiClient.get('/api/tags');
      return response.data.data || [];
    },
    enabled: selectedTab === 'tags'
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<Category | Tag>) => {
      const endpoint = selectedTab === 'categories' ? '/api/categories' : '/api/tags';
      if (editingItem) {
        return apiClient.put(`${endpoint}/${editingItem.id}`, data);
      }
      return apiClient.post(endpoint, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [selectedTab] });
      toast.success(editingItem ? '수정되었습니다' : '생성되었습니다');
      handleCloseDialog();
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || '오류가 발생했습니다');
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const endpoint = selectedTab === 'categories' ? '/api/categories' : '/api/tags';
      return apiClient.delete(`${endpoint}/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [selectedTab] });
      toast.success('삭제되었습니다');
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || '삭제 중 오류가 발생했습니다');
    }
  });

  const handleOpenDialog = (item?: Category | Tag) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        name: item.name,
        slug: item.slug,
        description: item.description || '',
        parentId: (item as Category).parentId || ''
      });
    } else {
      setEditingItem(null);
      setFormData({
        name: '',
        slug: '',
        description: '',
        parentId: ''
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingItem(null);
    setFormData({
      name: '',
      slug: '',
      description: '',
      parentId: ''
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const dataToSave = selectedTab === 'categories' ? formData : {
      name: formData.name,
      slug: formData.slug,
      description: formData.description
    };
    saveMutation.mutate(dataToSave);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      deleteMutation.mutate(id);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣]+/g, '-')
      .replace(/^-+|-+$/g, '');
  };

  const isLoading = selectedTab === 'categories' ? categoriesLoading : tagsLoading;
  const items = selectedTab === 'categories' ? categories : tags;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">카테고리 & 태그</h1>
          <p className="text-gray-500 mt-1">게시물 분류를 위한 카테고리와 태그를 관리합니다</p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          {selectedTab === 'categories' ? '카테고리 추가' : '태그 추가'}
        </Button>
      </div>

      <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
        <button
          onClick={() => setSelectedTab('categories')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            selectedTab === 'categories'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <FolderOpen className="w-4 h-4 inline-block mr-2" />
          카테고리
        </button>
        <button
          onClick={() => setSelectedTab('tags')}
          className={`px-4 py-2 rounded-md font-medium transition-colors ${
            selectedTab === 'tags'
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-600 hover:text-gray-900'
          }`}
        >
          <Tag className="w-4 h-4 inline-block mr-2" />
          태그
        </button>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : items && items.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {items.map((item: Category | Tag) => (
            <Card key={item.id}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="space-y-1">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <p className="text-sm text-gray-500">/{item.slug}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenDialog(item)}>
                        <Edit2 className="w-4 h-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        onClick={() => handleDelete(item.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent>
                {item.description && (
                  <p className="text-sm text-gray-600 mb-3">{item.description}</p>
                )}
                {'parentName' in item && item.parentName && (
                  <Badge variant="outline" className="mb-3">
                    상위: {item.parentName}
                  </Badge>
                )}
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>{item.postCount}개 게시물</span>
                  <span>{new Date(item.createdAt).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <p className="text-gray-500">
              {selectedTab === 'categories' ? '카테고리가 없습니다' : '태그가 없습니다'}
            </p>
            <Button 
              variant="outline" 
              className="mt-4"
              onClick={() => handleOpenDialog()}
            >
              <Plus className="w-4 h-4 mr-2" />
              첫 {selectedTab === 'categories' ? '카테고리' : '태그'} 만들기
            </Button>
          </CardContent>
        </Card>
      )}

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>
                {editingItem 
                  ? `${selectedTab === 'categories' ? '카테고리' : '태그'} 수정` 
                  : `새 ${selectedTab === 'categories' ? '카테고리' : '태그'}`}
              </DialogTitle>
              <DialogDescription>
                {selectedTab === 'categories' 
                  ? '게시물을 분류할 카테고리를 만들어보세요'
                  : '게시물에 사용할 태그를 만들어보세요'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">이름</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value)
                    });
                  }}
                  placeholder={selectedTab === 'categories' ? '예: 공지사항' : '예: React'}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="slug">슬러그</Label>
                <Input
                  id="slug"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="notice"
                  required
                />
                <p className="text-xs text-gray-500">URL에 사용되는 고유 식별자입니다</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">설명 (선택)</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="이 카테고리/태그에 대한 설명을 입력하세요"
                  rows={3}
                />
              </div>
              {selectedTab === 'categories' && categories && categories.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="parent">상위 카테고리 (선택)</Label>
                  <Select
                    value={formData.parentId}
                    onValueChange={(value) => setFormData({ ...formData, parentId: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="상위 카테고리 선택" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">없음</SelectItem>
                      {categories
                        .filter((cat: Category) => cat.id !== editingItem?.id)
                        .map((cat: Category) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            {cat.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={handleCloseDialog}>
                취소
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}