import { useState, FC } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { 
  ArrowLeft,
  Download,
  Trash2,
  Star,
  Eye,
  Search,
  MoreVertical,
  CheckCircle,
  AlertCircle,
  XCircle,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useQuery, useMutation } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import type { Form, FormSubmission } from '@o4o/types';
import toast from 'react-hot-toast';
// import { format } from 'date-fns';

const FormSubmissions: FC = () => {
  const navigate = useNavigate();
  const { formId } = useParams();
  
  const [selectedSubmissions, setSelectedSubmissions] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [starredFilter, setStarredFilter] = useState<boolean | null>(null);
  const [page, setPage] = useState(1);
  const [viewingSubmission, setViewingSubmission] = useState<FormSubmission | null>(null);
  const limit = 50;

  // Fetch form
  const { data: form } = useQuery({
    queryKey: ['form', formId],
    queryFn: async () => {
      const response = await authClient.api.get(`/forms/${formId}`);
      return response.data as Form;
    }
  });

  // Fetch submissions
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['submissions', formId, { search, status: statusFilter, starred: starredFilter, page, limit }],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (starredFilter !== null) params.append('starred', String(starredFilter));
      params.append('page', String(page));
      params.append('limit', String(limit));
      
      const response = await authClient.api.get(`/forms/${formId}/submissions?${params}`);
      return response.data;
    }
  });

  // Update submission mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      await authClient.api.put(`/forms/submissions/${id}`, updates);
    },
    onSuccess: () => {
      toast.success('제출이 업데이트되었습니다');
      refetch();
    },
    onError: () => {
      toast.error('업데이트에 실패했습니다');
    }
  });

  // Delete submission mutation
  const deleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      await Promise.all(ids.map((id: any) => authClient.api.delete(`/forms/submissions/${id}`)));
    },
    onSuccess: () => {
      toast.success('제출이 삭제되었습니다');
      setSelectedSubmissions([]);
      refetch();
    },
    onError: () => {
      toast.error('삭제에 실패했습니다');
    }
  });

  // Export submissions
  const handleExport = async () => {
    try {
      const response = await authClient.api.get(`/forms/${formId}/submissions/export`, {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `submissions-${form?.name}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      toast.success('제출 데이터를 내보냈습니다');
    } catch (error: any) {
      toast.error('내보내기에 실패했습니다');
    }
  };

  const handleSelectAll = () => {
    if (selectedSubmissions.length === data?.submissions.length) {
      setSelectedSubmissions([]);
    } else {
      setSelectedSubmissions(data?.submissions.map((s: FormSubmission) => s.id) || []);
    }
  };

  const handleToggleStar = (submission: FormSubmission) => {
    updateMutation.mutate({
      id: submission.id,
      updates: { starred: !submission.starred }
    });
  };

  const handleUpdateStatus = (submission: FormSubmission, status: FormSubmission['status']) => {
    updateMutation.mutate({
      id: submission.id,
      updates: { status }
    });
  };

  const handleDeleteSelected = () => {
    if (confirm(`정말 ${selectedSubmissions.length}개의 제출을 삭제하시겠습니까?`)) {
      deleteMutation.mutate(selectedSubmissions);
    }
  };

  const getStatusBadge = (status: FormSubmission['status']) => {
    const config = {
      pending: { label: '대기중', variant: 'outline' as const, icon: AlertCircle },
      approved: { label: '승인됨', variant: 'default' as const, icon: CheckCircle },
      spam: { label: '스팸', variant: 'destructive' as const, icon: XCircle },
      trash: { label: '휴지통', variant: 'secondary' as const, icon: Trash2 }
    };
    
    const { label, variant, icon: Icon } = config[status];
    
    return (
      <Badge variant={variant} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </Badge>
    );
  };

  const getDeviceIcon = (deviceType?: string) => {
    switch (deviceType) {
      case 'mobile':
        return <Smartphone className="w-4 h-4" />;
      case 'tablet':
        return <Tablet className="w-4 h-4" />;
      default:
        return <Monitor className="w-4 h-4" />;
    }
  };

  if (!form) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button
            variant={"ghost" as const}
            size={"sm" as const}
            onClick={() => navigate('/forms')}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            양식 목록
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{form.title} - 제출</h1>
            <p className="text-gray-600 mt-1">총 {data?.total || 0}개의 제출</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {selectedSubmissions.length > 0 && (
            <>
              <span className="text-sm text-gray-600">
                {selectedSubmissions.length}개 선택됨
              </span>
              <Button
                variant={"outline" as const}
                size={"sm" as const}
                onClick={handleDeleteSelected}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                삭제
              </Button>
            </>
          )}
          <Button
            variant={"outline" as const}
            onClick={handleExport}
          >
            <Download className="w-4 h-4 mr-2" />
            내보내기
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="제출 검0색..."
                value={search}
                onChange={(e: any) => setSearch(e.target.value)}
                className="w-full pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 상태</SelectItem>
                <SelectItem value="pending">대기중</SelectItem>
                <SelectItem value="approved">승인됨</SelectItem>
                <SelectItem value="spam">스팸</SelectItem>
                <SelectItem value="trash">휴지통</SelectItem>
              </SelectContent>
            </Select>
            <Select 
              value={starredFilter === null ? 'all' : String(starredFilter)} 
              onValueChange={(v) => setStarredFilter(v === 'all' ? null : v === 'true')}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="별표 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">모든 제출</SelectItem>
                <SelectItem value="true">별표 있음</SelectItem>
                <SelectItem value="false">별표 없음</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Submissions Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : data?.submissions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500">제출된 데이터가 없습니다</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedSubmissions.length === data?.submissions.length}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead className="w-12"></TableHead>
                  <TableHead>제출 ID</TableHead>
                  <TableHead>상태</TableHead>
                  <TableHead>제출자</TableHead>
                  <TableHead>기기</TableHead>
                  <TableHead>제출일시</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data?.submissions.map((submission: FormSubmission) => (
                  <TableRow 
                    key={submission.id}
                    className={submission.read ? '' : 'bg-blue-50'}
                  >
                    <TableCell>
                      <Checkbox
                        checked={selectedSubmissions.includes(submission.id)}
                        onCheckedChange={(checked: boolean) => {
                          if (checked) {
                            setSelectedSubmissions([...selectedSubmissions, submission.id]);
                          } else {
                            setSelectedSubmissions(selectedSubmissions.filter((id: any) => id !== submission.id));
                          }
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => handleToggleStar(submission)}
                        className="p-1 hover:bg-gray-100 rounded"
                      >
                        <Star 
                          className={`w-4 h-4 ${submission.starred ? 'fill-yellow-400 text-yellow-400' : 'text-gray-400'}`} 
                        />
                      </button>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {submission.id.slice(0, 8)}...
                    </TableCell>
                    <TableCell>{getStatusBadge(submission.status)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{submission.userName || '익명'}</div>
                        <div className="text-sm text-gray-500">{submission.userEmail}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2 text-gray-500">
                        {getDeviceIcon(submission.deviceType)}
                        <span className="text-xs">{submission.browser}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">
                        {'/* date removed */'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {'/* date removed */'}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger>
                          <Button variant={"ghost" as const} size={"sm" as const}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setViewingSubmission(submission)}>
                            <Eye className="w-4 h-4 mr-2" />
                            상세 보기
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleUpdateStatus(submission, 'approved')}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            승인
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleUpdateStatus(submission, 'spam')}>
                            <XCircle className="w-4 h-4 mr-2" />
                            스팸 표시
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => deleteMutation.mutate([submission.id])}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            삭제
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <Button
            variant={"outline" as const}
            size={"sm" as const}
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            이전
          </Button>
          <span className="text-sm text-gray-600">
            {page} / {data.totalPages}
          </span>
          <Button
            variant={"outline" as const}
            size={"sm" as const}
            onClick={() => setPage(page + 1)}
            disabled={page === data.totalPages}
          >
            다음
          </Button>
        </div>
      )}

      {/* Submission Detail Dialog */}
      {viewingSubmission && (
        <Dialog open={!!viewingSubmission} onOpenChange={() => setViewingSubmission(null)}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>제출 상세</DialogTitle>
              <DialogDescription>
                제출 ID: {viewingSubmission.id}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Submission Info */}
              <div>
                <h3 className="font-semibold mb-3">제출 정보</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">제출일시:</span>
                    <span className="ml-2">
                      {'/* date removed */'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-500">상태:</span>
                    <span className="ml-2">{getStatusBadge(viewingSubmission.status)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">IP 주소:</span>
                    <span className="ml-2 font-mono">{viewingSubmission.ipAddress}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">참조 페이지:</span>
                    <span className="ml-2">{viewingSubmission.referrer || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Form Data */}
              <div>
                <h3 className="font-semibold mb-3">양식 데이터</h3>
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  {Object.entries(viewingSubmission.data).map(([key, value]) => {
                    const field = form.fields.find((f: any) => f.name === key);
                    return (
                      <div key={key}>
                        <div className="font-medium text-sm text-gray-700">
                          {field?.label || key}
                        </div>
                        <div className="mt-1">
                          {Array.isArray(value) ? (
                            <div className="flex flex-wrap gap-2">
                              {value.map((v, i) => (
                                <Badge key={i} variant="secondary">{v}</Badge>
                              ))}
                            </div>
                          ) : (
                            <div className="text-gray-900">
                              {String(value) || '-'}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Device Info */}
              <div>
                <h3 className="font-semibold mb-3">기기 정보</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">기기:</span>
                    <span className="ml-2">{viewingSubmission.deviceType || 'desktop'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">브라우저:</span>
                    <span className="ml-2">{viewingSubmission.browser}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">OS:</span>
                    <span className="ml-2">{viewingSubmission.os}</span>
                  </div>
                  {viewingSubmission.geoLocation && (
                    <div>
                      <span className="text-gray-500">위치:</span>
                      <span className="ml-2">
                        {[
                          viewingSubmission.geoLocation.city,
                          viewingSubmission.geoLocation.region,
                          viewingSubmission.geoLocation.country
                        ].filter(Boolean).join(', ')}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};

export default FormSubmissions;