/**
 * CPT Content List Component
 * Content listing with filtering, sorting, and bulk actions
 */

import { useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  FileText,
  Calendar,
  User,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { cptPostApi } from '@/features/cpt-acf/services/cpt.api';
import { useAdminNotices } from '@/hooks/useAdminNotices';
import { CustomPost, CustomPostType, PostStatus, CPTListOptions } from '@/features/cpt-acf/types/cpt.types';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';
import { authClient } from '@o4o/auth-client';

interface CPTContentListProps {
  selectedType?: string | null;
  onTypeSelect?: (slug: string) => void;
  cptTypes?: CustomPostType[];
}

const CPTContentList: React.FC<CPTContentListProps> = ({
  selectedType,
  onTypeSelect,
  cptTypes
}) => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addNotice } = useAdminNotices();
  const { cptSlug } = useParams<{ cptSlug: string }>();

  // Use URL parameter if selectedType prop is not provided
  const effectiveType = selectedType || cptSlug || null;

  // Load CPT types if not provided via props
  const { data: loadedCPTTypes } = useQuery({
    queryKey: ['cpt-types'],
    queryFn: async () => {
      const response = await authClient.api.get('/public/cpt/types');
      const result = response.data?.data || response.data || [];
      return Array.isArray(result) ? result : [];
    },
    enabled: !cptTypes, // Only load if not provided via props
    staleTime: 5 * 60 * 1000,
  });

  // Use provided cptTypes or loaded ones
  const effectiveCPTTypes = cptTypes || loadedCPTTypes || [];

  // State
  const [selectedPosts, setSelectedPosts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<PostStatus | 'all'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);

  // Current CPT type
  const currentCPT = effectiveCPTTypes?.find((cpt: CustomPostType) => cpt.slug === effectiveType);

  // Query options
  const queryOptions: CPTListOptions = useMemo(() => ({
    page: currentPage,
    limit: itemsPerPage,
    search: searchQuery,
    status: statusFilter === 'all' ? undefined : statusFilter,
    orderBy: 'updatedAt',
    order: 'desc'
  }), [currentPage, itemsPerPage, searchQuery, statusFilter]);

  // Fetch posts
  const { data: postsResponse, isLoading, refetch } = useQuery({
    queryKey: ['cpt-posts', effectiveType, queryOptions],
    queryFn: async () => {
      if (!effectiveType) return null;
      const response = await cptPostApi.getPostsByType(effectiveType, queryOptions);
      return response.data;
    },
    enabled: !!effectiveType
  });

  const posts = postsResponse || [];

  // Bulk action mutation
  const bulkActionMutation = useMutation({
    mutationFn: async ({ action, ids }: { action: string; ids: string[] }) => {
      if (!selectedType) throw new Error('No CPT type selected');
      return await cptPostApi.bulkAction(
        selectedType,
        action as any,
        ids
      );
    },
    onSuccess: (_, variables) => {
      const actionMessages: Record<string, string> = {
        trash: '휴지통으로 이동했습니다',
        restore: '복원했습니다',
        delete: '영구 삭제했습니다',
        publish: '발행했습니다',
        draft: '임시 저장으로 변경했습니다'
      };
      
      addNotice({
        type: 'success',
        message: `${variables.ids.length}개 항목을 ${actionMessages[variables.action] || '처리했습니다'}.`
      });
      
      queryClient.invalidateQueries({ queryKey: ['cpt-posts', selectedType] });
      setSelectedPosts([]);
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `작업 실패: ${error.message}`
      });
    }
  });

  // Delete single post mutation
  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      if (!selectedType) throw new Error('No CPT type selected');
      return await cptPostApi.deletePost(selectedType, postId);
    },
    onSuccess: () => {
      addNotice({
        type: 'success',
        message: '콘텐츠가 삭제되었습니다.'
      });
      queryClient.invalidateQueries({ queryKey: ['cpt-posts', selectedType] });
    },
    onError: (error: any) => {
      addNotice({
        type: 'error',
        message: `삭제 실패: ${error.message}`
      });
    }
  });

  // Handle select all
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedPosts(posts.map(p => p.id));
    } else {
      setSelectedPosts([]);
    }
  };

  // Handle single select
  const handleSelectPost = (postId: string, checked: boolean) => {
    if (checked) {
      setSelectedPosts([...selectedPosts, postId]);
    } else {
      setSelectedPosts(selectedPosts.filter(id => id !== postId));
    }
  };

  // Handle bulk action
  const handleBulkAction = (action: string) => {
    if (selectedPosts.length === 0) {
      addNotice({
        type: 'warning',
        message: '선택된 항목이 없습니다.'
      });
      return;
    }

    if (action === 'delete' && !window.confirm('선택한 항목을 영구 삭제하시겠습니까?')) {
      return;
    }

    bulkActionMutation.mutate({ action, ids: selectedPosts });
  };

  // Get status badge variant
  const getStatusBadge = (status: PostStatus): { label: string; variant: "secondary" | "success" | "default" | "warning" | "destructive" | "outline" } => {
    const variants: Partial<Record<PostStatus, { label: string; variant: "secondary" | "success" | "default" | "warning" | "destructive" | "outline" }>> = {
      published: { label: '발행됨', variant: 'default' },
      draft: { label: '임시저장', variant: 'secondary' },
      private: { label: '비공개', variant: 'outline' },
      trash: { label: '휴지통', variant: 'destructive' }
    };

    return variants[status] || { label: status, variant: 'secondary' as const };
  };

  if (!effectiveType) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center h-96 text-center">
          <FileText className="h-16 w-16 text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">콘텐츠 타입 선택</h3>
          <p className="text-muted-foreground mb-4">
            관리할 콘텐츠 타입을 선택하세요
          </p>
          <Select value="" onValueChange={(slug) => {
            if (onTypeSelect) {
              onTypeSelect(slug);
            } else {
              navigate(`/cpt-engine/content/${slug}`);
            }
          }}>
            <SelectTrigger className="w-64">
              <SelectValue placeholder="콘텐츠 타입 선택..." />
            </SelectTrigger>
            <SelectContent>
              {effectiveCPTTypes?.map((cpt: CustomPostType) => (
                <SelectItem key={cpt.slug} value={cpt.slug}>
                  {cpt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{currentCPT?.label || effectiveType} 콘텐츠</CardTitle>
              <CardDescription>
                {currentCPT?.description || `${effectiveType} 타입의 모든 콘텐츠를 관리합니다`}
              </CardDescription>
            </div>
            <Button
              onClick={() => navigate(`/cpt-engine/content/${effectiveType}/new`)}
            >
              <Plus className="h-4 w-4 mr-2" />
              새 {currentCPT?.singularLabel || '콘텐츠'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="검색..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Status Filter */}
            <Select
              value={statusFilter}
              onValueChange={(value) => setStatusFilter(value as any)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="publish">발행됨</SelectItem>
                <SelectItem value="draft">임시저장</SelectItem>
                <SelectItem value="private">비공개</SelectItem>
                <SelectItem value="trash">휴지통</SelectItem>
              </SelectContent>
            </Select>

            {/* CPT Type Selector - only show when onTypeSelect callback is provided */}
            {onTypeSelect && (
              <Select value={effectiveType || ''} onValueChange={(slug) => {
                if (onTypeSelect) {
                  onTypeSelect(slug);
                } else {
                  navigate(`/cpt-engine/content/${slug}`);
                }
              }}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {effectiveCPTTypes?.map((cpt: CustomPostType) => (
                    <SelectItem key={cpt.slug} value={cpt.slug}>
                      {cpt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Bulk Actions */}
          {selectedPosts.length > 0 && (
            <div className="flex items-center gap-4 mt-4 p-3 bg-accent rounded-md">
              <span className="text-sm font-medium">
                {selectedPosts.length}개 선택됨
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('publish')}
                >
                  발행
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('draft')}
                >
                  임시저장
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleBulkAction('trash')}
                >
                  휴지통
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleBulkAction('delete')}
                >
                  영구 삭제
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">
                  <Checkbox
                    checked={posts.length > 0 && selectedPosts.length === posts.length}
                    onCheckedChange={handleSelectAll}
                  />
                </TableHead>
                <TableHead>제목</TableHead>
                <TableHead>상태</TableHead>
                <TableHead>작성자</TableHead>
                <TableHead>날짜</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="flex justify-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : posts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8">
                    <div className="text-muted-foreground">
                      {searchQuery || statusFilter !== 'all' 
                        ? '검색 결과가 없습니다'
                        : '아직 콘텐츠가 없습니다'}
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                posts.map((post) => {
                  const statusBadge = getStatusBadge(post.status);
                  
                  return (
                    <TableRow key={post.id}>
                      <TableCell>
                        <Checkbox
                          checked={selectedPosts.includes(post.id)}
                          onCheckedChange={(checked) => handleSelectPost(post.id, checked as boolean)}
                        />
                      </TableCell>
                      <TableCell>
                        <div>
                          <button
                            className="font-medium hover:underline text-left"
                            onClick={() => navigate(`/cpt-engine/content/${selectedType}/${post.id}/edit`)}
                          >
                            {post.title || '(제목 없음)'}
                          </button>
                          {post.slug && (
                            <div className="text-xs text-muted-foreground">
                              /{post.slug}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusBadge.variant}>
                          {statusBadge.label}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-3 w-3 text-muted-foreground" />
                          <span className="text-sm">
                            {post.author?.name || '알 수 없음'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(new Date(post.updatedAt), 'PPP', { locale: ko })}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(new Date(post.updatedAt), 'p', { locale: ko })}
                        </div>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>작업</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => navigate(`/cpt-engine/content/${selectedType}/${post.id}/edit`)}
                            >
                              <Edit className="h-4 w-4 mr-2" />
                              편집
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const baseUrl = window.location.origin.replace('admin.', '');
                                window.open(`${baseUrl}/${selectedType}/${post.slug}`, '_blank');
                              }}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              보기
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                // Clone post logic
                                addNotice({
                                  type: 'info',
                                  message: '복제 기능은 준비 중입니다.'
                                });
                              }}
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              복제
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => {
                                if (window.confirm('이 콘텐츠를 삭제하시겠습니까?')) {
                                  deletePostMutation.mutate(post.id);
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              삭제
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Pagination */}
      {posts.length > 0 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {posts.length}개 항목
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center px-3">
              <span className="text-sm">페이지 {currentPage}</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentPage(p => p + 1)}
              disabled={posts.length < itemsPerPage}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CPTContentList;