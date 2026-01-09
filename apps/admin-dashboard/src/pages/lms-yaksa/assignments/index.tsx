/**
 * Course Assignments Management Page
 *
 * Manage course assignments for pharmacist members
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  BookOpen,
  Users,
  Calendar,
  PlayCircle,
  Ban,
  Trash2,
  Link2,
  TrendingUp,
} from 'lucide-react';
import { assignmentsApi, CourseAssignment, adminApi } from '@/lib/api/lmsYaksa';
import { AssignmentStatusTag, UserSearch, CoursePicker } from '@/components/lms-yaksa';
import { useAuth } from '@o4o/auth-context';

type AssignmentStatus = 'pending' | 'in_progress' | 'completed' | 'expired' | 'cancelled';

export default function AssignmentsPage() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<CourseAssignment[]>([]);
  const [overdueAssignments, setOverdueAssignments] = useState<CourseAssignment[]>([]);
  const [statistics, setStatistics] = useState<{
    total: number;
    completed: number;
    inProgress: number;
    pending: number;
    expired: number;
    cancelled: number;
    overdue: number;
    completionRate: number;
  } | null>(null);
  const [selectedAssignment, setSelectedAssignment] = useState<CourseAssignment | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchUserId, setSearchUserId] = useState('');
  const [statusFilter, setStatusFilter] = useState<AssignmentStatus | 'all'>('all');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isBulkCreateOpen, setIsBulkCreateOpen] = useState(false);
  const [isUpdateProgressOpen, setIsUpdateProgressOpen] = useState(false);

  // TODO: Get organization ID from user context or route params
  const organizationId = user?.organizationId || 'default-org';

  // Fetch overdue assignments
  const fetchOverdue = useCallback(async () => {
    try {
      const response = await adminApi.getOverdueAssignments(organizationId);
      if (response.success && response.data) {
        setOverdueAssignments(response.data);
      }
    } catch (err) {
      console.error('Fetch overdue error:', err);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchOverdue();
  }, [fetchOverdue]);

  // Search assignments by user ID
  const handleSearch = useCallback(async (userId: string) => {
    if (!userId.trim()) {
      setAssignments([]);
      setStatistics(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchUserId(userId.trim());

    try {
      const [assignmentsRes, statsRes] = await Promise.all([
        assignmentsApi.getByUserId(userId.trim()),
        assignmentsApi.getUserStatistics(userId.trim()),
      ]);

      if (assignmentsRes.success && assignmentsRes.data) {
        setAssignments(assignmentsRes.data);
      } else {
        setAssignments([]);
        setError('배정 목록을 찾을 수 없습니다.');
      }

      if (statsRes.success && statsRes.data) {
        setStatistics(statsRes.data);
      }
    } catch (err) {
      setError('배정 목록을 불러오는데 실패했습니다.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Mark assignment as complete
  const handleMarkComplete = async (assignment: CourseAssignment) => {
    try {
      await assignmentsApi.markComplete(assignment.id);
      handleSearch(searchUserId);
      fetchOverdue();
    } catch (err) {
      setError('완료 처리 중 오류가 발생했습니다.');
      console.error('Mark complete error:', err);
    }
  };

  // Cancel assignment
  const handleCancel = async (assignment: CourseAssignment) => {
    try {
      await assignmentsApi.cancel(assignment.id);
      handleSearch(searchUserId);
      fetchOverdue();
    } catch (err) {
      setError('취소 처리 중 오류가 발생했습니다.');
      console.error('Cancel error:', err);
    }
  };

  // Delete assignment
  const handleDelete = async (assignment: CourseAssignment) => {
    try {
      await assignmentsApi.delete(assignment.id);
      handleSearch(searchUserId);
      fetchOverdue();
    } catch (err) {
      setError('삭제 중 오류가 발생했습니다.');
      console.error('Delete error:', err);
    }
  };

  // Filter assignments by status
  const filteredAssignments = assignments.filter((a) =>
    statusFilter === 'all' ? true : a.status === statusFilter
  );

  // Check if assignment is overdue
  const isOverdue = (assignment: CourseAssignment) => {
    return (
      assignment.dueDate &&
      new Date(assignment.dueDate) < new Date() &&
      !assignment.isCompleted
    );
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">강좌 배정 관리</h1>
          <p className="text-muted-foreground">
            회원별 필수 강좌 배정 및 완료 현황을 관리합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBulkCreateOpen(true)}>
            <Users className="h-4 w-4 mr-2" />
            일괄 배정
          </Button>
          <Button onClick={() => setIsCreateOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            새 배정
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Overdue Alert */}
      {overdueAssignments.length > 0 && (
        <Alert variant="destructive">
          <Clock className="h-4 w-4" />
          <AlertTitle>기한 초과 배정</AlertTitle>
          <AlertDescription>
            {overdueAssignments.length}건의 배정이 기한을 초과했습니다. 확인이 필요합니다.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">사용자 검색</TabsTrigger>
          <TabsTrigger value="overdue" className="flex items-center gap-2">
            기한 초과
            {overdueAssignments.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {overdueAssignments.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">배정 검색</CardTitle>
              <CardDescription>사용자 ID로 배정 현황을 검색합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserSearch
                onSearch={handleSearch}
                placeholder="사용자 ID 입력..."
                showButton={true}
              />
            </CardContent>
          </Card>

          {/* Statistics */}
          {statistics && (
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                title="전체 배정"
                value={statistics.total}
                icon={BookOpen}
              />
              <StatCard
                title="완료"
                value={statistics.completed}
                icon={CheckCircle}
                color="text-green-600"
              />
              <StatCard
                title="진행 중"
                value={statistics.inProgress}
                icon={PlayCircle}
                color="text-blue-600"
              />
              <StatCard
                title="기한 초과"
                value={statistics.overdue}
                icon={AlertTriangle}
                color="text-red-600"
              />
            </div>
          )}

          {/* Filter & Results */}
          {isLoading ? (
            <AssignmentListSkeleton />
          ) : assignments.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>배정 목록</CardTitle>
                  <Select
                    value={statusFilter}
                    onValueChange={(v) => setStatusFilter(v as AssignmentStatus | 'all')}
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="상태 필터" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">전체</SelectItem>
                      <SelectItem value="pending">대기</SelectItem>
                      <SelectItem value="in_progress">진행중</SelectItem>
                      <SelectItem value="completed">완료</SelectItem>
                      <SelectItem value="expired">만료</SelectItem>
                      <SelectItem value="cancelled">취소</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <AssignmentTable
                  assignments={filteredAssignments}
                  onMarkComplete={handleMarkComplete}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                  onUpdateProgress={(a) => {
                    setSelectedAssignment(a);
                    setIsUpdateProgressOpen(true);
                  }}
                  isOverdue={isOverdue}
                />
              </CardContent>
            </Card>
          ) : searchUserId && !isLoading ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">검색 결과가 없습니다.</p>
              </CardContent>
            </Card>
          ) : null}
        </TabsContent>

        <TabsContent value="overdue">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Clock className="h-5 w-5" />
                기한 초과 배정
              </CardTitle>
              <CardDescription>
                마감일이 지났지만 완료되지 않은 배정 목록입니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {overdueAssignments.length > 0 ? (
                <AssignmentTable
                  assignments={overdueAssignments}
                  onMarkComplete={handleMarkComplete}
                  onCancel={handleCancel}
                  onDelete={handleDelete}
                  onUpdateProgress={(a) => {
                    setSelectedAssignment(a);
                    setIsUpdateProgressOpen(true);
                  }}
                  isOverdue={() => true}
                  showUserId
                />
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  기한 초과 배정이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create Assignment Dialog */}
      <CreateAssignmentDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={async (data) => {
          try {
            await assignmentsApi.assign(data);
            if (searchUserId) {
              handleSearch(searchUserId);
            }
            fetchOverdue();
            setIsCreateOpen(false);
          } catch (err) {
            setError('배정 생성 중 오류가 발생했습니다.');
          }
        }}
        organizationId={organizationId}
      />

      {/* Bulk Create Dialog */}
      <BulkAssignmentDialog
        isOpen={isBulkCreateOpen}
        onClose={() => setIsBulkCreateOpen(false)}
        onBulkCreate={async (data) => {
          try {
            await assignmentsApi.bulkAssign(data);
            if (searchUserId) {
              handleSearch(searchUserId);
            }
            fetchOverdue();
            setIsBulkCreateOpen(false);
          } catch (err) {
            setError('일괄 배정 중 오류가 발생했습니다.');
          }
        }}
        organizationId={organizationId}
      />

      {/* Update Progress Dialog */}
      <UpdateProgressDialog
        assignment={selectedAssignment}
        isOpen={isUpdateProgressOpen}
        onClose={() => {
          setIsUpdateProgressOpen(false);
          setSelectedAssignment(null);
        }}
        onUpdate={async (progress) => {
          if (!selectedAssignment) return;
          try {
            await assignmentsApi.updateProgress(selectedAssignment.id, progress);
            if (searchUserId) {
              handleSearch(searchUserId);
            }
            fetchOverdue();
            setIsUpdateProgressOpen(false);
            setSelectedAssignment(null);
          } catch (err) {
            setError('진행률 업데이트 중 오류가 발생했습니다.');
          }
        }}
      />
    </div>
  );
}

// Sub-components

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color?: string;
}

function StatCard({ title, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className={`text-2xl font-bold ${color || ''}`}>{value}</p>
          </div>
          <Icon className={`h-8 w-8 ${color || 'text-muted-foreground'}`} />
        </div>
      </CardContent>
    </Card>
  );
}

interface AssignmentTableProps {
  assignments: CourseAssignment[];
  onMarkComplete: (a: CourseAssignment) => void;
  onCancel: (a: CourseAssignment) => void;
  onDelete: (a: CourseAssignment) => void;
  onUpdateProgress: (a: CourseAssignment) => void;
  isOverdue: (a: CourseAssignment) => boolean;
  showUserId?: boolean;
}

function AssignmentTable({
  assignments,
  onMarkComplete,
  onCancel,
  onDelete,
  onUpdateProgress,
  isOverdue,
  showUserId,
}: AssignmentTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showUserId && <TableHead>사용자 ID</TableHead>}
          <TableHead>강좌 ID</TableHead>
          <TableHead>상태</TableHead>
          <TableHead>진행률</TableHead>
          <TableHead>마감일</TableHead>
          <TableHead>필수</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {assignments.map((assignment) => (
          <TableRow key={assignment.id}>
            {showUserId && (
              <TableCell className="font-mono text-sm">
                {assignment.userId.substring(0, 8)}...
              </TableCell>
            )}
            <TableCell className="font-mono text-sm">
              {assignment.courseId.substring(0, 8)}...
            </TableCell>
            <TableCell>
              <AssignmentStatusTag
                status={assignment.status}
                isOverdue={isOverdue(assignment)}
                size="sm"
              />
            </TableCell>
            <TableCell>
              <div className="flex items-center gap-2">
                <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-500 transition-all"
                    style={{ width: `${assignment.progressPercent}%` }}
                  />
                </div>
                <span className="text-sm">{assignment.progressPercent}%</span>
              </div>
            </TableCell>
            <TableCell>
              {assignment.dueDate ? (
                <div className="flex items-center gap-1 text-sm">
                  <Calendar className="h-3 w-3" />
                  {new Date(assignment.dueDate).toLocaleDateString('ko-KR')}
                </div>
              ) : (
                '-'
              )}
            </TableCell>
            <TableCell>
              {assignment.isMandatory ? (
                <Badge variant="destructive" className="text-xs">필수</Badge>
              ) : (
                <Badge variant="outline" className="text-xs">선택</Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {assignment.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => onMarkComplete(assignment)}>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      완료 처리
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => onUpdateProgress(assignment)}>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    진행률 수정
                  </DropdownMenuItem>
                  {assignment.status !== 'cancelled' && assignment.status !== 'completed' && (
                    <DropdownMenuItem onClick={() => onCancel(assignment)}>
                      <Ban className="h-4 w-4 mr-2" />
                      취소
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem
                    onClick={() => onDelete(assignment)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    삭제
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Create Assignment Dialog
interface CreateAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    userId: string;
    organizationId: string;
    courseId: string;
    dueDate?: string;
    isMandatory?: boolean;
    priority?: number;
    note?: string;
  }) => Promise<void>;
  organizationId: string;
}

function CreateAssignmentDialog({
  isOpen,
  onClose,
  onCreate,
  organizationId,
}: CreateAssignmentDialogProps) {
  const [formData, setFormData] = useState({
    userId: '',
    courseId: '',
    dueDate: '',
    isMandatory: true,
    priority: 0,
    note: '',
  });
  const [isCreating, setIsCreating] = useState(false);

  // Courses - empty until LMS API integration
  const courses: Array<{ id: string; title: string; credits: number; category: string }> = [];

  const handleSubmit = async () => {
    if (!formData.userId || !formData.courseId) return;
    setIsCreating(true);
    try {
      await onCreate({
        ...formData,
        organizationId,
        dueDate: formData.dueDate || undefined,
      });
      setFormData({
        userId: '',
        courseId: '',
        dueDate: '',
        isMandatory: true,
        priority: 0,
        note: '',
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 강좌 배정</DialogTitle>
          <DialogDescription>회원에게 강좌를 배정합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="userId">사용자 ID *</Label>
            <Input
              id="userId"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              placeholder="사용자 ID를 입력하세요"
            />
          </div>

          <div>
            <Label>강좌 선택 *</Label>
            <CoursePicker
              courses={courses}
              selectedIds={formData.courseId ? [formData.courseId] : []}
              onSelect={(courseId) => setFormData({ ...formData, courseId })}
              placeholder="강좌를 선택하세요..."
            />
          </div>

          <div>
            <Label htmlFor="dueDate">마감일</Label>
            <Input
              id="dueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="isMandatory"
              checked={formData.isMandatory}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isMandatory: checked as boolean })
              }
            />
            <Label htmlFor="isMandatory">필수 강좌</Label>
          </div>

          <div>
            <Label htmlFor="note">메모</Label>
            <Textarea
              id="note"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="메모를 입력하세요..."
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || !formData.userId || !formData.courseId}
          >
            {isCreating ? '배정 중...' : '배정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Bulk Assignment Dialog
interface BulkAssignmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onBulkCreate: (data: {
    userIds: string[];
    organizationId: string;
    courseId: string;
    dueDate?: string;
    isMandatory?: boolean;
  }) => Promise<void>;
  organizationId: string;
}

function BulkAssignmentDialog({
  isOpen,
  onClose,
  onBulkCreate,
  organizationId,
}: BulkAssignmentDialogProps) {
  const [formData, setFormData] = useState({
    userIdsText: '',
    courseId: '',
    dueDate: '',
    isMandatory: true,
  });
  const [isCreating, setIsCreating] = useState(false);

  // Courses - empty until LMS API integration
  const bulkCourses: Array<{ id: string; title: string; credits: number; category: string }> = [];

  const parseUserIds = (text: string): string[] => {
    return text
      .split(/[\n,;]+/)
      .map((id) => id.trim())
      .filter((id) => id.length > 0);
  };

  const handleSubmit = async () => {
    const userIds = parseUserIds(formData.userIdsText);
    if (userIds.length === 0 || !formData.courseId) return;

    setIsCreating(true);
    try {
      await onBulkCreate({
        userIds,
        organizationId,
        courseId: formData.courseId,
        dueDate: formData.dueDate || undefined,
        isMandatory: formData.isMandatory,
      });
      setFormData({
        userIdsText: '',
        courseId: '',
        dueDate: '',
        isMandatory: true,
      });
    } finally {
      setIsCreating(false);
    }
  };

  const userIds = parseUserIds(formData.userIdsText);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>일괄 강좌 배정</DialogTitle>
          <DialogDescription>
            여러 회원에게 동일한 강좌를 일괄 배정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="userIdsText">사용자 ID 목록 *</Label>
            <Textarea
              id="userIdsText"
              value={formData.userIdsText}
              onChange={(e) =>
                setFormData({ ...formData, userIdsText: e.target.value })
              }
              placeholder="사용자 ID를 입력하세요 (줄바꿈, 쉼표, 세미콜론으로 구분)"
              rows={4}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {userIds.length}명의 사용자가 입력되었습니다.
            </p>
          </div>

          <div>
            <Label>강좌 선택 *</Label>
            <CoursePicker
              courses={bulkCourses}
              selectedIds={formData.courseId ? [formData.courseId] : []}
              onSelect={(courseId) => setFormData({ ...formData, courseId })}
              placeholder="강좌를 선택하세요..."
            />
          </div>

          <div>
            <Label htmlFor="bulkDueDate">마감일</Label>
            <Input
              id="bulkDueDate"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
            />
          </div>

          <div className="flex items-center gap-2">
            <Checkbox
              id="bulkIsMandatory"
              checked={formData.isMandatory}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isMandatory: checked as boolean })
              }
            />
            <Label htmlFor="bulkIsMandatory">필수 강좌</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || userIds.length === 0 || !formData.courseId}
          >
            {isCreating ? '배정 중...' : `${userIds.length}명에게 배정`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Update Progress Dialog
interface UpdateProgressDialogProps {
  assignment: CourseAssignment | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (progress: number) => Promise<void>;
}

function UpdateProgressDialog({
  assignment,
  isOpen,
  onClose,
  onUpdate,
}: UpdateProgressDialogProps) {
  const [progress, setProgress] = useState(0);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    if (assignment) {
      setProgress(assignment.progressPercent);
    }
  }, [assignment]);

  const handleSubmit = async () => {
    setIsUpdating(true);
    try {
      await onUpdate(progress);
    } finally {
      setIsUpdating(false);
    }
  };

  if (!assignment) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>진행률 수정</DialogTitle>
          <DialogDescription>강좌 이수 진행률을 수정합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="progress">진행률 (%)</Label>
            <Input
              id="progress"
              type="number"
              min="0"
              max="100"
              value={progress}
              onChange={(e) => setProgress(parseInt(e.target.value) || 0)}
            />
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-500 transition-all"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isUpdating}>
            {isUpdating ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AssignmentListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
