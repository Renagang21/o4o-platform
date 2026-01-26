import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Copy, Trash2, Eye, EyeOff, Layout, PanelTop, PanelBottom } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const areaIcons = {
  header: PanelTop,
  footer: PanelBottom,
  sidebar: Layout,
  general: Layout
};

const areaLabels = {
  header: '헤더',
  footer: '푸터',
  sidebar: '사이드바',
  general: '일반'
};

export default function TemplateParts() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('all');

  // Fetch template parts
  const { data: templateParts = [], isLoading } = useQuery({
    queryKey: ['template-parts', activeTab],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (activeTab !== 'all') {
        params.append('area', activeTab);
      }
      const response = await authClient.api.get(`/public/template-parts?${params}`);
      // Handle both old and new API response structures
      const data = response.data;
      if (data && typeof data === 'object' && 'success' in data) {
        // New structure: {success: true, data: [...], count: N}
        if (data.success) {
          return data.data || [];
        } else {
          throw new Error(data.error || 'Failed to fetch template parts');
        }
      } else if (Array.isArray(data)) {
        // Old structure: direct array
        return data;
      } else {
        // Fallback for other structures
        return [];
      }
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authClient.api.delete(`/template-parts/${id}`);
      // Handle both old and new API response structures
      const data = response.data;
      if (data && typeof data === 'object' && 'success' in data) {
        // New structure: {success: true/false, error?: string}
        if (!data.success) {
          throw new Error(data.error || 'Failed to delete template part');
        }
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('템플릿 파트가 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['template-parts'] });
      setDeleteId(null);
    },
    onError: (error: any) => {
      toast.error(error.message || '템플릿 파트 삭제에 실패했습니다');
    }
  });

  // Toggle active status
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const response = await authClient.api.put(`/template-parts/${id}`, { isActive });
      // Handle both old and new API response structures
      const data = response.data;
      if (data && typeof data === 'object' && 'success' in data) {
        // New structure: {success: true/false, error?: string}
        if (!data.success) {
          throw new Error(data.error || 'Failed to update template part');
        }
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('상태가 변경되었습니다');
      queryClient.invalidateQueries({ queryKey: ['template-parts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || '상태 변경에 실패했습니다');
    }
  });

  // Duplicate template part
  const duplicateMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await authClient.api.post(`/template-parts/${id}/duplicate`);
      // Handle both old and new API response structures
      const data = response.data;
      if (data && typeof data === 'object' && 'success' in data) {
        // New structure: {success: true/false, error?: string}
        if (!data.success) {
          throw new Error(data.error || 'Failed to duplicate template part');
        }
      }
      return response.data;
    },
    onSuccess: () => {
      toast.success('템플릿 파트가 복제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['template-parts'] });
    },
    onError: (error: any) => {
      toast.error(error.message || '템플릿 파트 복제에 실패했습니다');
    }
  });

  const handleDelete = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteMutation.mutate(deleteId);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">템플릿 파트</h1>
          <p className="text-gray-600 mt-1">사이트의 헤더, 푸터, 사이드바 등을 관리합니다</p>
        </div>
        <Button onClick={() => navigate('/appearance/template-parts/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 템플릿 파트
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">전체</TabsTrigger>
          <TabsTrigger value="header">헤더</TabsTrigger>
          <TabsTrigger value="footer">푸터</TabsTrigger>
          <TabsTrigger value="sidebar">사이드바</TabsTrigger>
          <TabsTrigger value="general">일반</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            </div>
          ) : templateParts.length === 0 ? (
            <div className="text-center py-12">
              <Layout className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">
                템플릿 파트가 없습니다
              </h3>
              <p className="mt-1 text-sm text-gray-500">
                새 템플릿 파트를 만들어 사이트를 커스터마이즈하세요.
              </p>
              <div className="mt-6">
                <Button onClick={() => navigate('/appearance/template-parts/new')}>
                  <Plus className="w-4 h-4 mr-2" />
                  새 템플릿 파트 만들기
                </Button>
              </div>
            </div>
          ) : (
            <div className="grid gap-4">
              {templateParts.map((part: any) => {
                const Icon = areaIcons[part.area as keyof typeof areaIcons];
                
                return (
                  <div
                    key={part.id}
                    className="o4o-card hover:shadow-md transition-shadow"
                  >
                    <div className="o4o-card-body">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <Icon className="w-8 h-8 text-gray-400" />
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-lg">{part.name}</h3>
                              {part.isDefault && (
                                <Badge variant="secondary">기본</Badge>
                              )}
                              <Badge variant={part.isActive ? 'default' : 'secondary'}>
                                {part.isActive ? '활성' : '비활성'}
                              </Badge>
                            </div>
                            <p className="text-sm text-gray-600 mt-1">
                              {part.description || `${areaLabels[part.area as keyof typeof areaLabels]} 영역`}
                            </p>
                            <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                              <span>우선순위: {part.priority}</span>
                              {part.conditions && (
                                <span>조건부 표시 설정됨</span>
                              )}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleActiveMutation.mutate({ 
                              id: part.id, 
                              isActive: !part.isActive 
                            })}
                          >
                            {part.isActive ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => navigate(`/appearance/template-parts/${part.id}/edit`)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => duplicateMutation.mutate(part.id)}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                          
                          {!part.isDefault && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleDelete(part.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>템플릿 파트 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              이 템플릿 파트를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}