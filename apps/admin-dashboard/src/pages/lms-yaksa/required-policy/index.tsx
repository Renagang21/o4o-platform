/**
 * Required Course Policy Management Page
 *
 * Manage organization-specific required course policies
 *
 * @variant default - Original UI implementation
 * @variant design-core-v1 - Design Core v1.0 UI (Phase 4-B)
 */

import { useEffect, useState, useCallback } from 'react';

// ViewVariant type definition for Design Core transition
type ViewVariant = 'default' | 'design-core-v1';

// Design Core v1.0 Variant
import RequiredPolicyDesignCoreV1 from './RequiredPolicyDesignCoreV1';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Plus,
  Edit,
  Trash2,
  MoreHorizontal,
  AlertTriangle,
  CheckCircle,
  XCircle,
  FileText,
  BookOpen,
  Calendar,
  Award,
} from 'lucide-react';
import { policiesApi, RequiredCoursePolicy } from '@/lib/api/lmsYaksa';
import { CoursePicker } from '@/components/lms-yaksa';
import { useAuth } from '@o4o/auth-context';

// Props interface with variant support
interface RequiredPolicyPageProps {
  variant?: ViewVariant;
}

export default function RequiredPolicyPage({ variant = 'default' }: RequiredPolicyPageProps) {
  // Design Core v1.0 Variant branching
  if (variant === 'design-core-v1') {
    return <RequiredPolicyDesignCoreV1 />;
  }

  // Default variant continues below
  return <RequiredPolicyDefault />;
}

// Original (default) implementation
function RequiredPolicyDefault() {
  const { user } = useAuth();
  const [policies, setPolicies] = useState<RequiredCoursePolicy[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<RequiredCoursePolicy | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // TODO: Get organization ID from user context or route params
  const organizationId = user?.organizationId || 'default-org';

  // Fetch policies
  const fetchPolicies = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await policiesApi.getAll(organizationId);
      if (response.success && response.data) {
        setPolicies(response.data);
      } else {
        setError(response.error || '정책 목록을 불러오는데 실패했습니다.');
      }
    } catch (err) {
      setError('정책 목록을 불러오는데 실패했습니다.');
      console.error('Fetch policies error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  // Toggle policy activation
  const handleToggleActive = async (policy: RequiredCoursePolicy) => {
    try {
      if (policy.isActive) {
        await policiesApi.deactivate(policy.id);
      } else {
        await policiesApi.activate(policy.id);
      }
      fetchPolicies();
    } catch (err) {
      setError('정책 상태 변경 중 오류가 발생했습니다.');
      console.error('Toggle active error:', err);
    }
  };

  // Delete policy
  const handleDelete = async () => {
    if (!selectedPolicy) return;
    try {
      await policiesApi.delete(selectedPolicy.id);
      fetchPolicies();
      setIsDeleteConfirmOpen(false);
      setSelectedPolicy(null);
    } catch (err) {
      setError('정책 삭제 중 오류가 발생했습니다.');
      console.error('Delete error:', err);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">필수 교육 정책 관리</h1>
          <p className="text-muted-foreground">
            조직별 필수 교육 강좌 및 평점 요건을 관리합니다.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          새 정책
        </Button>
      </div>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Policy List */}
      {isLoading ? (
        <PolicyListSkeleton />
      ) : policies.length > 0 ? (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <PolicyCard
              key={policy.id}
              policy={policy}
              onToggleActive={() => handleToggleActive(policy)}
              onEdit={() => {
                setSelectedPolicy(policy);
                setIsEditOpen(true);
              }}
              onDelete={() => {
                setSelectedPolicy(policy);
                setIsDeleteConfirmOpen(true);
              }}
            />
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-8 text-center">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground mb-4">등록된 정책이 없습니다.</p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              첫 정책 만들기
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Edit Policy Dialog */}
      <PolicyFormDialog
        policy={selectedPolicy}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedPolicy(null);
        }}
        onSave={async (data) => {
          if (!selectedPolicy) return;
          try {
            await policiesApi.update(selectedPolicy.id, data);
            fetchPolicies();
            setIsEditOpen(false);
            setSelectedPolicy(null);
          } catch (err) {
            setError('정책 업데이트 중 오류가 발생했습니다.');
          }
        }}
        organizationId={organizationId}
      />

      {/* Create Policy Dialog */}
      <PolicyFormDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSave={async (data) => {
          try {
            await policiesApi.create({ ...data, organizationId });
            fetchPolicies();
            setIsCreateOpen(false);
          } catch (err) {
            setError('정책 생성 중 오류가 발생했습니다.');
          }
        }}
        organizationId={organizationId}
      />

      {/* Delete Confirm Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>정책 삭제</DialogTitle>
            <DialogDescription>
              정말로 이 정책을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {selectedPolicy && (
              <div className="p-4 bg-muted rounded-lg">
                <p className="font-medium">{selectedPolicy.name}</p>
                <p className="text-sm text-muted-foreground">
                  필수 강좌: {selectedPolicy.requiredCourseIds.length}개 /
                  필요 평점: {selectedPolicy.requiredCredits}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteConfirmOpen(false)}>
              취소
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              삭제
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Policy Card Component
interface PolicyCardProps {
  policy: RequiredCoursePolicy;
  onToggleActive: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function PolicyCard({ policy, onToggleActive, onEdit, onDelete }: PolicyCardProps) {
  const isExpired = policy.validUntil && new Date(policy.validUntil) < new Date();
  const isNotYetValid = policy.validFrom && new Date(policy.validFrom) > new Date();

  return (
    <Card className={!policy.isActive ? 'opacity-60' : undefined}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <CardTitle className="text-lg">{policy.name}</CardTitle>
              {policy.isActive ? (
                <Badge variant="default" className="bg-green-600">활성</Badge>
              ) : (
                <Badge variant="secondary">비활성</Badge>
              )}
              {isExpired && (
                <Badge variant="destructive">만료됨</Badge>
              )}
              {isNotYetValid && (
                <Badge variant="outline">시작 전</Badge>
              )}
            </div>
            {policy.description && (
              <CardDescription>{policy.description}</CardDescription>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={policy.isActive}
              onCheckedChange={onToggleActive}
            />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={onEdit}>
                  <Edit className="h-4 w-4 mr-2" />
                  수정
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onDelete} className="text-red-600">
                  <Trash2 className="h-4 w-4 mr-2" />
                  삭제
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
          <div className="flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">필수 강좌</p>
              <p className="font-medium">{policy.requiredCourseIds.length}개</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">필요 평점</p>
              <p className="font-medium">{policy.requiredCredits}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">유효 기간</p>
              <p className="font-medium text-sm">
                {policy.validFrom
                  ? new Date(policy.validFrom).toLocaleDateString('ko-KR')
                  : '시작일 없음'}{' '}
                ~{' '}
                {policy.validUntil
                  ? new Date(policy.validUntil).toLocaleDateString('ko-KR')
                  : '종료일 없음'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm text-muted-foreground">우선순위</p>
              <p className="font-medium">{policy.priority}</p>
            </div>
          </div>
        </div>

        {/* Target Member Types */}
        {policy.targetMemberTypes && policy.targetMemberTypes.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">적용 대상 회원 유형</p>
            <div className="flex flex-wrap gap-2">
              {policy.targetMemberTypes.map((type) => (
                <Badge key={type} variant="outline">
                  {type}
                </Badge>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Policy Form Dialog Component
interface PolicyFormDialogProps {
  policy?: RequiredCoursePolicy | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<RequiredCoursePolicy>) => Promise<void>;
  organizationId: string;
}

function PolicyFormDialog({
  policy,
  isOpen,
  onClose,
  onSave,
  organizationId,
}: PolicyFormDialogProps) {
  const [formData, setFormData] = useState<Partial<RequiredCoursePolicy>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [memberTypeInput, setMemberTypeInput] = useState('');

  // Mock courses for picker - In real app, fetch from LMS API
  const mockCourses = [
    { id: 'course-1', title: '약사 보수교육 기초', credits: 2, category: '기초' },
    { id: 'course-2', title: '의약품 관리', credits: 3, category: '전문' },
    { id: 'course-3', title: '환자 상담 기법', credits: 2, category: '실무' },
    { id: 'course-4', title: '약물 상호작용', credits: 4, category: '전문' },
    { id: 'course-5', title: '법규 및 윤리', credits: 2, category: '기초' },
  ];

  useEffect(() => {
    if (policy) {
      setFormData({
        name: policy.name,
        description: policy.description,
        requiredCourseIds: policy.requiredCourseIds || [],
        requiredCredits: policy.requiredCredits,
        targetMemberTypes: policy.targetMemberTypes || [],
        validFrom: policy.validFrom,
        validUntil: policy.validUntil,
        priority: policy.priority,
      });
    } else {
      setFormData({
        name: '',
        description: '',
        requiredCourseIds: [],
        requiredCredits: 0,
        targetMemberTypes: [],
        priority: 0,
      });
    }
  }, [policy]);

  const handleSubmit = async () => {
    if (!formData.name) return;
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddMemberType = () => {
    if (memberTypeInput.trim() && !formData.targetMemberTypes?.includes(memberTypeInput.trim())) {
      setFormData({
        ...formData,
        targetMemberTypes: [...(formData.targetMemberTypes || []), memberTypeInput.trim()],
      });
      setMemberTypeInput('');
    }
  };

  const handleRemoveMemberType = (type: string) => {
    setFormData({
      ...formData,
      targetMemberTypes: formData.targetMemberTypes?.filter((t) => t !== type) || [],
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{policy ? '정책 수정' : '새 정책 생성'}</DialogTitle>
          <DialogDescription>
            필수 교육 정책의 세부 정보를 설정합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Name */}
          <div>
            <Label htmlFor="name">정책 이름 *</Label>
            <Input
              id="name"
              value={formData.name || ''}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="정책 이름을 입력하세요"
            />
          </div>

          {/* Description */}
          <div>
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              value={formData.description || ''}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              placeholder="정책에 대한 설명을 입력하세요"
              rows={3}
            />
          </div>

          {/* Required Courses */}
          <div>
            <Label>필수 강좌</Label>
            <CoursePicker
              courses={mockCourses}
              selectedIds={formData.requiredCourseIds || []}
              onSelect={(courseId) =>
                setFormData({
                  ...formData,
                  requiredCourseIds: [...(formData.requiredCourseIds || []), courseId],
                })
              }
              onDeselect={(courseId) =>
                setFormData({
                  ...formData,
                  requiredCourseIds: formData.requiredCourseIds?.filter(
                    (id) => id !== courseId
                  ) || [],
                })
              }
              multiple={true}
              placeholder="필수 강좌를 선택하세요..."
            />
          </div>

          {/* Required Credits */}
          <div>
            <Label htmlFor="requiredCredits">필요 평점</Label>
            <Input
              id="requiredCredits"
              type="number"
              step="0.5"
              min="0"
              value={formData.requiredCredits || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  requiredCredits: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>

          {/* Priority */}
          <div>
            <Label htmlFor="priority">우선순위</Label>
            <Input
              id="priority"
              type="number"
              min="0"
              value={formData.priority || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  priority: parseInt(e.target.value) || 0,
                })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              숫자가 높을수록 우선 적용됩니다.
            </p>
          </div>

          {/* Valid Period */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="validFrom">유효 시작일</Label>
              <Input
                id="validFrom"
                type="date"
                value={formData.validFrom?.split('T')[0] || ''}
                onChange={(e) =>
                  setFormData({ ...formData, validFrom: e.target.value })
                }
              />
            </div>
            <div>
              <Label htmlFor="validUntil">유효 종료일</Label>
              <Input
                id="validUntil"
                type="date"
                value={formData.validUntil?.split('T')[0] || ''}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
              />
            </div>
          </div>

          {/* Target Member Types */}
          <div>
            <Label>적용 대상 회원 유형</Label>
            <div className="flex gap-2">
              <Input
                value={memberTypeInput}
                onChange={(e) => setMemberTypeInput(e.target.value)}
                placeholder="회원 유형 입력..."
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddMemberType();
                  }
                }}
              />
              <Button type="button" variant="outline" onClick={handleAddMemberType}>
                추가
              </Button>
            </div>
            {formData.targetMemberTypes && formData.targetMemberTypes.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {formData.targetMemberTypes.map((type) => (
                  <Badge key={type} variant="secondary" className="pr-1">
                    {type}
                    <button
                      type="button"
                      onClick={() => handleRemoveMemberType(type)}
                      className="ml-1 rounded-full p-0.5 hover:bg-gray-300"
                    >
                      <XCircle className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              비워두면 모든 회원에게 적용됩니다.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving || !formData.name}>
            {isSaving ? '저장 중...' : policy ? '수정' : '생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function PolicyListSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(3)].map((_, i) => (
        <Card key={i}>
          <CardHeader>
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-64" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, j) => (
                <Skeleton key={j} className="h-12 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
