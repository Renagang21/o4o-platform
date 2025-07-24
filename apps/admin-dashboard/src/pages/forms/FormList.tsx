import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Copy,
  Eye,
  Download,
  BarChart,
  FileText,
  MoreVertical,
  Calendar,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Form } from '@o4o/types';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

const FormList: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  // Fetch forms
  const { data, isLoading } = useQuery({
    queryKey: ['forms', { search, status: statusFilter, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const response = await authClient.api.get(`/forms?${params}`);
      return response.data;
    }
  });

  // Delete form mutation
  const deleteMutation = useMutation({
    mutationFn: async (formId: string) => {
      await authClient.api.delete(`/forms/${formId}`);
    },
    onSuccess: () => {
      toast.success('양식이 삭제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: () => {
      toast.error('삭제에 실패했습니다');
    }
  });

  // Duplicate form mutation
  const duplicateMutation = useMutation({
    mutationFn: async (formId: string) => {
      const response = await authClient.api.get(`/forms/${formId}`);
      const form = response.data;
      
      // Create new form with copied data
      const newForm = {
        ...form,
        name: `${form.name}_copy`,
        title: `${form.title} (복사본)`,
        id: undefined,
        createdAt: undefined,
        updatedAt: undefined,
        submissionCount: 0,
        lastSubmission: null
      };
      
      await authClient.api.post('/forms', newForm);
    },
    onSuccess: () => {
      toast.success('양식이 복제되었습니다');
      queryClient.invalidateQueries({ queryKey: ['forms'] });
    },
    onError: () => {
      toast.error('복제에 실패했습니다');
    }
  });

  const handleDelete = (formId: string) => {
    if (confirm('정말 이 양식을 삭제하시겠습니까? 모든 제출 데이터도 함께 삭제됩니다.')) {
      deleteMutation.mutate(formId);
    }
  };

  const getStatusBadge = (status: Form['status']) => {
    const config = {
      active: { label: '활성', variant: 'default' as const, icon: CheckCircle },
      inactive: { label: '비활성', variant: 'secondary' as const, icon: Clock },
      draft: { label: '초안', variant: 'outline' as const, icon: AlertCircle }
    };
    
    const { label, variant, icon: Icon } = config[status];
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">양식 관리</h1>
          <p className="text-gray-600 mt-1">Formidable 스타일의 양식 빌더로 다양한 양식을 만들고 관리하세요</p>
        </div>
        <Button onClick={() => navigate('/forms/new')}>
          <Plus className="w-4 h-4 mr-2" />
          새 양식
        </Button>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="양식 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="active">활성</SelectItem>
                <SelectItem value="inactive">비활성</SelectItem>
                <SelectItem value="draft">초안</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Forms Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
        </div>
      ) : data?.forms.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">양식이 없습니다</h3>
            <p className="text-gray-600 mb-4">첫 양식을 만들어보세요</p>
            <Button onClick={() => navigate('/forms/new')}>
              <Plus className="w-4 h-4 mr-2" />
              양식 만들기
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.forms.map((form: Form) => (
            <Card key={form.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 pr-2">
                    <CardTitle className="text-lg mb-1">{form.title}</CardTitle>
                    <p className="text-sm text-gray-500">/{form.name}</p>
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreVertical className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => navigate(`/forms/edit/${form.id}`)}>
                        <Edit3 className="w-4 h-4 mr-2" />
                        편집
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/submissions`)}>
                        <Eye className="w-4 h-4 mr-2" />
                        제출 보기
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate(`/forms/${form.id}/report`)}>
                        <BarChart className="w-4 h-4 mr-2" />
                        리포트
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => duplicateMutation.mutate(form.id)}>
                        <Copy className="w-4 h-4 mr-2" />
                        복제
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        내보내기
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => handleDelete(form.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <div className="mt-3">
                  {getStatusBadge(form.status)}
                </div>
              </CardHeader>
              
              <CardContent>
                {form.description && (
                  <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                    {form.description}
                  </p>
                )}
                
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">필드</span>
                    <span className="font-medium">{form.fields.length}개</span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">제출</span>
                    <span className="font-medium">{form.submissionCount || 0}건</span>
                  </div>
                  
                  {form.lastSubmission && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-500">마지막 제출</span>
                      <span className="font-medium">
                        {format(new Date(form.lastSubmission), 'MM/dd HH:mm', { locale: ko })}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="mt-4 pt-4 border-t flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span className="text-xs text-gray-500">
                      {format(new Date(form.createdAt), 'yyyy.MM.dd', { locale: ko })}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/forms/${form.id}/submissions`)}
                    >
                      <Users className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => navigate(`/forms/${form.id}/report`)}
                    >
                      <BarChart className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        navigator.clipboard.writeText(form.shortcode || `[form name="${form.name}"]`);
                        toast.success('숏코드가 복사되었습니다');
                      }}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {page} / {data.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === data.totalPages}
          >
            다음
          </Button>
        </div>
      )}
    </div>
  );
};

export default FormList;