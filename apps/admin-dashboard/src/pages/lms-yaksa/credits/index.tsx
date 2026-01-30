/**
 * Credit Records Management Page
 *
 * Manage pharmacist credit records and verification
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  XCircle,
  Award,
  Calendar,
  FileText,
  Trash2,
  Edit,
  ShieldCheck,
  Clock,
} from 'lucide-react';
import { creditsApi, adminApi, CreditRecord, CreditSummary } from '@/lib/api/lmsYaksa';
import { CreditBadge, UserSearch } from '@/components/lms-yaksa';
import { useAuth } from '@o4o/auth-context';

type CreditType = 'course_completion' | 'attendance' | 'external' | 'manual_adjustment';

const creditTypeLabels: Record<CreditType, string> = {
  course_completion: '강좌 이수',
  attendance: '출석',
  external: '외부 교육',
  manual_adjustment: '수동 조정',
};

export default function CreditsPage() {
  const { user } = useAuth();
  const [credits, setCredits] = useState<CreditRecord[]>([]);
  const [unverifiedCredits, setUnverifiedCredits] = useState<CreditRecord[]>([]);
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchUserId, setSearchUserId] = useState('');
  const [yearFilter, setYearFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<CreditType | 'all'>('all');
  const [isAddCreditOpen, setIsAddCreditOpen] = useState(false);
  const [isAddExternalOpen, setIsAddExternalOpen] = useState(false);
  const [isAddManualOpen, setIsAddManualOpen] = useState(false);
  const [selectedCredit, setSelectedCredit] = useState<CreditRecord | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);

  // Fetch unverified credits
  const fetchUnverified = useCallback(async () => {
    try {
      const response = await adminApi.getUnverifiedCredits();
      if (response.success && response.data) {
        setUnverifiedCredits(response.data);
      }
    } catch (err) {
      console.error('Fetch unverified error:', err);
    }
  }, []);

  useEffect(() => {
    fetchUnverified();
  }, [fetchUnverified]);

  // Search credits by user ID
  const handleSearch = useCallback(async (userId: string) => {
    if (!userId.trim()) {
      setCredits([]);
      setCreditSummary(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    setSearchUserId(userId.trim());

    try {
      const [creditsRes, summaryRes] = await Promise.all([
        creditsApi.getByUserId(userId.trim()),
        creditsApi.getSummary(userId.trim()),
      ]);

      if (creditsRes.success && creditsRes.data) {
        setCredits(creditsRes.data);
      } else {
        setCredits([]);
        setError('평점 기록을 찾을 수 없습니다.');
      }

      if (summaryRes.success && summaryRes.data) {
        setCreditSummary(summaryRes.data);
      }
    } catch (err) {
      setError('평점 기록을 불러오는데 실패했습니다.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Verify credit
  const handleVerify = async (credit: CreditRecord) => {
    try {
      await creditsApi.verify(credit.id, String(user?.id || 'admin'));
      if (searchUserId) {
        handleSearch(searchUserId);
      }
      fetchUnverified();
    } catch (err) {
      setError('평점 검증 중 오류가 발생했습니다.');
      console.error('Verify error:', err);
    }
  };

  // Reject credit
  const handleReject = async (credit: CreditRecord, note: string) => {
    try {
      await creditsApi.reject(credit.id, note);
      if (searchUserId) {
        handleSearch(searchUserId);
      }
      fetchUnverified();
    } catch (err) {
      setError('평점 거부 중 오류가 발생했습니다.');
      console.error('Reject error:', err);
    }
  };

  // Delete credit
  const handleDelete = async (credit: CreditRecord) => {
    try {
      await creditsApi.delete(credit.id);
      if (searchUserId) {
        handleSearch(searchUserId);
      }
      fetchUnverified();
    } catch (err) {
      setError('평점 삭제 중 오류가 발생했습니다.');
      console.error('Delete error:', err);
    }
  };

  // Filter credits
  const filteredCredits = credits.filter((c) => {
    if (yearFilter !== 'all' && c.creditYear !== parseInt(yearFilter)) return false;
    if (typeFilter !== 'all' && c.creditType !== typeFilter) return false;
    return true;
  });

  // Get unique years from credits
  const years = [...new Set(credits.map((c) => c.creditYear))].sort((a, b) => b - a);

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">평점 기록 관리</h1>
          <p className="text-muted-foreground">
            연수 평점 기록 조회 및 검증을 수행합니다.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsAddExternalOpen(true)}>
            <FileText className="h-4 w-4 mr-2" />
            외부 평점
          </Button>
          <Button variant="outline" onClick={() => setIsAddManualOpen(true)}>
            <Edit className="h-4 w-4 mr-2" />
            수동 조정
          </Button>
          <Button onClick={() => setIsAddCreditOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            평점 추가
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

      {/* Unverified Alert */}
      {unverifiedCredits.length > 0 && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertTitle>검증 대기</AlertTitle>
          <AlertDescription>
            {unverifiedCredits.length}건의 평점이 검증 대기 중입니다.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="search" className="space-y-4">
        <TabsList>
          <TabsTrigger value="search">사용자 검색</TabsTrigger>
          <TabsTrigger value="unverified" className="flex items-center gap-2">
            검증 대기
            {unverifiedCredits.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unverifiedCredits.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="search" className="space-y-4">
          {/* Search */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">평점 검색</CardTitle>
              <CardDescription>사용자 ID로 평점 기록을 검색합니다.</CardDescription>
            </CardHeader>
            <CardContent>
              <UserSearch
                onSearch={handleSearch}
                placeholder="사용자 ID 입력..."
                showButton={true}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          {creditSummary && (
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">총 누적 평점</p>
                      <p className="text-2xl font-bold text-green-600">
                        {creditSummary.totalCredits.toFixed(1)}
                      </p>
                    </div>
                    <Award className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">당해년도 평점</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {creditSummary.currentYearCredits.toFixed(1)}
                      </p>
                    </div>
                    <Calendar className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">미검증 평점</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        {creditSummary.unverifiedCredits.toFixed(1)}
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-yellow-600" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div>
                    <p className="text-sm text-muted-foreground mb-2">유형별 평점</p>
                    <div className="flex flex-wrap gap-1">
                      {Object.entries(creditSummary.byType).map(([type, amount]) => (
                        <Badge key={type} variant="outline" className="text-xs">
                          {creditTypeLabels[type as CreditType] || type}: {amount.toFixed(1)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters & Results */}
          {isLoading ? (
            <CreditListSkeleton />
          ) : credits.length > 0 ? (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>평점 기록</CardTitle>
                  <div className="flex gap-2">
                    <Select
                      value={yearFilter}
                      onValueChange={setYearFilter}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="연도" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 연도</SelectItem>
                        {years.map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}년
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Select
                      value={typeFilter}
                      onValueChange={(v) => setTypeFilter(v as CreditType | 'all')}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue placeholder="유형" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">전체 유형</SelectItem>
                        {Object.entries(creditTypeLabels).map(([key, label]) => (
                          <SelectItem key={key} value={key}>
                            {label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <CreditTable
                  credits={filteredCredits}
                  onVerify={handleVerify}
                  onReject={handleReject}
                  onDelete={handleDelete}
                  onEdit={(credit) => {
                    setSelectedCredit(credit);
                    setIsEditOpen(true);
                  }}
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

        <TabsContent value="unverified">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                검증 대기 평점
              </CardTitle>
              <CardDescription>
                검증이 필요한 평점 기록입니다. 검증 또는 거부할 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {unverifiedCredits.length > 0 ? (
                <CreditTable
                  credits={unverifiedCredits}
                  onVerify={handleVerify}
                  onReject={handleReject}
                  onDelete={handleDelete}
                  onEdit={(credit) => {
                    setSelectedCredit(credit);
                    setIsEditOpen(true);
                  }}
                  showUserId
                />
              ) : (
                <p className="text-center py-8 text-muted-foreground">
                  검증 대기 중인 평점이 없습니다.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Credit Dialog */}
      <AddCreditDialog
        isOpen={isAddCreditOpen}
        onClose={() => setIsAddCreditOpen(false)}
        onAdd={async (data) => {
          try {
            await creditsApi.add(data);
            if (searchUserId) {
              handleSearch(searchUserId);
            }
            fetchUnverified();
            setIsAddCreditOpen(false);
          } catch (err) {
            setError('평점 추가 중 오류가 발생했습니다.');
          }
        }}
        defaultUserId={searchUserId}
      />

      {/* Add External Credit Dialog */}
      <AddExternalCreditDialog
        isOpen={isAddExternalOpen}
        onClose={() => setIsAddExternalOpen(false)}
        onAdd={async (data) => {
          try {
            await creditsApi.addExternal(data);
            if (searchUserId) {
              handleSearch(searchUserId);
            }
            fetchUnverified();
            setIsAddExternalOpen(false);
          } catch (err) {
            setError('외부 평점 추가 중 오류가 발생했습니다.');
          }
        }}
        defaultUserId={searchUserId}
      />

      {/* Add Manual Adjustment Dialog */}
      <AddManualAdjustmentDialog
        isOpen={isAddManualOpen}
        onClose={() => setIsAddManualOpen(false)}
        onAdd={async (data) => {
          try {
            await creditsApi.addManualAdjustment({
              ...data,
              verifiedBy: String(user?.id || 'admin'),
            });
            if (searchUserId) {
              handleSearch(searchUserId);
            }
            fetchUnverified();
            setIsAddManualOpen(false);
          } catch (err) {
            setError('수동 조정 추가 중 오류가 발생했습니다.');
          }
        }}
        defaultUserId={searchUserId}
      />

      {/* Edit Credit Dialog */}
      <EditCreditDialog
        credit={selectedCredit}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedCredit(null);
        }}
        onSave={async (data) => {
          if (!selectedCredit) return;
          try {
            await creditsApi.update(selectedCredit.id, data);
            if (searchUserId) {
              handleSearch(searchUserId);
            }
            fetchUnverified();
            setIsEditOpen(false);
            setSelectedCredit(null);
          } catch (err) {
            setError('평점 수정 중 오류가 발생했습니다.');
          }
        }}
      />
    </div>
  );
}

// Credit Table Component
interface CreditTableProps {
  credits: CreditRecord[];
  onVerify: (credit: CreditRecord) => void;
  onReject: (credit: CreditRecord, note: string) => void;
  onDelete: (credit: CreditRecord) => void;
  onEdit: (credit: CreditRecord) => void;
  showUserId?: boolean;
}

function CreditTable({
  credits,
  onVerify,
  onReject,
  onDelete,
  onEdit,
  showUserId,
}: CreditTableProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState('');

  const handleRejectSubmit = (credit: CreditRecord) => {
    onReject(credit, rejectNote);
    setRejectingId(null);
    setRejectNote('');
  };

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showUserId && <TableHead>사용자 ID</TableHead>}
          <TableHead>유형</TableHead>
          <TableHead>평점</TableHead>
          <TableHead>강좌/내용</TableHead>
          <TableHead>획득일</TableHead>
          <TableHead>연도</TableHead>
          <TableHead>검증</TableHead>
          <TableHead className="text-right">작업</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {credits.map((credit) => (
          <TableRow key={credit.id}>
            {showUserId && (
              <TableCell className="font-mono text-sm">
                {credit.userId.substring(0, 8)}...
              </TableCell>
            )}
            <TableCell>
              <Badge variant="outline">
                {creditTypeLabels[credit.creditType as CreditType] || credit.creditType}
              </Badge>
            </TableCell>
            <TableCell>
              <CreditBadge credits={credit.creditsEarned} size="sm" />
            </TableCell>
            <TableCell className="max-w-[200px] truncate">
              {credit.courseTitle || credit.note || '-'}
            </TableCell>
            <TableCell>
              {new Date(credit.earnedAt).toLocaleDateString('ko-KR')}
            </TableCell>
            <TableCell>{credit.creditYear}</TableCell>
            <TableCell>
              {credit.isVerified ? (
                <Badge variant="outline" className="text-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  검증됨
                </Badge>
              ) : (
                <Badge variant="secondary">
                  <Clock className="h-3 w-3 mr-1" />
                  대기
                </Badge>
              )}
            </TableCell>
            <TableCell className="text-right">
              {rejectingId === credit.id ? (
                <div className="flex items-center gap-2">
                  <Input
                    value={rejectNote}
                    onChange={(e) => setRejectNote(e.target.value)}
                    placeholder="거부 사유..."
                    className="w-32"
                  />
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleRejectSubmit(credit)}
                  >
                    확인
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setRejectingId(null);
                      setRejectNote('');
                    }}
                  >
                    취소
                  </Button>
                </div>
              ) : (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {!credit.isVerified && (
                      <>
                        <DropdownMenuItem onClick={() => onVerify(credit)}>
                          <ShieldCheck className="h-4 w-4 mr-2" />
                          검증
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => setRejectingId(credit.id)}>
                          <XCircle className="h-4 w-4 mr-2" />
                          거부
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuItem onClick={() => onEdit(credit)}>
                      <Edit className="h-4 w-4 mr-2" />
                      수정
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => onDelete(credit)}
                      className="text-red-600"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      삭제
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

// Add Credit Dialog
interface AddCreditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    userId: string;
    credits: number;
    courseId?: string;
    courseTitle?: string;
    creditType?: string;
    earnedAt?: string;
    note?: string;
  }) => Promise<void>;
  defaultUserId?: string;
}

function AddCreditDialog({ isOpen, onClose, onAdd, defaultUserId }: AddCreditDialogProps) {
  const [formData, setFormData] = useState({
    userId: defaultUserId || '',
    credits: 0,
    courseTitle: '',
    creditType: 'course_completion',
    earnedAt: new Date().toISOString().split('T')[0],
    note: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (defaultUserId) {
      setFormData((prev) => ({ ...prev, userId: defaultUserId }));
    }
  }, [defaultUserId]);

  const handleSubmit = async () => {
    if (!formData.userId || formData.credits <= 0) return;
    setIsAdding(true);
    try {
      await onAdd(formData);
      setFormData({
        userId: defaultUserId || '',
        credits: 0,
        courseTitle: '',
        creditType: 'course_completion',
        earnedAt: new Date().toISOString().split('T')[0],
        note: '',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>평점 추가</DialogTitle>
          <DialogDescription>새로운 평점 기록을 추가합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="addUserId">사용자 ID *</Label>
            <Input
              id="addUserId"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              placeholder="사용자 ID를 입력하세요"
            />
          </div>
          <div>
            <Label htmlFor="addCredits">평점 *</Label>
            <Input
              id="addCredits"
              type="number"
              step="0.5"
              min="0"
              value={formData.credits}
              onChange={(e) =>
                setFormData({ ...formData, credits: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label htmlFor="addCreditType">유형</Label>
            <Select
              value={formData.creditType}
              onValueChange={(v) => setFormData({ ...formData, creditType: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(creditTypeLabels).map(([key, label]) => (
                  <SelectItem key={key} value={key}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="addCourseTitle">강좌명</Label>
            <Input
              id="addCourseTitle"
              value={formData.courseTitle}
              onChange={(e) =>
                setFormData({ ...formData, courseTitle: e.target.value })
              }
              placeholder="강좌명을 입력하세요"
            />
          </div>
          <div>
            <Label htmlFor="addEarnedAt">획득일</Label>
            <Input
              id="addEarnedAt"
              type="date"
              value={formData.earnedAt}
              onChange={(e) => setFormData({ ...formData, earnedAt: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="addNote">메모</Label>
            <Textarea
              id="addNote"
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
            disabled={isAdding || !formData.userId || formData.credits <= 0}
          >
            {isAdding ? '추가 중...' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add External Credit Dialog
interface AddExternalCreditDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    userId: string;
    credits: number;
    note: string;
  }) => Promise<void>;
  defaultUserId?: string;
}

function AddExternalCreditDialog({
  isOpen,
  onClose,
  onAdd,
  defaultUserId,
}: AddExternalCreditDialogProps) {
  const [formData, setFormData] = useState({
    userId: defaultUserId || '',
    credits: 0,
    note: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (defaultUserId) {
      setFormData((prev) => ({ ...prev, userId: defaultUserId }));
    }
  }, [defaultUserId]);

  const handleSubmit = async () => {
    if (!formData.userId || formData.credits <= 0 || !formData.note) return;
    setIsAdding(true);
    try {
      await onAdd(formData);
      setFormData({
        userId: defaultUserId || '',
        credits: 0,
        note: '',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>외부 교육 평점 추가</DialogTitle>
          <DialogDescription>
            외부 교육 이수로 획득한 평점을 추가합니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="extUserId">사용자 ID *</Label>
            <Input
              id="extUserId"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              placeholder="사용자 ID를 입력하세요"
            />
          </div>
          <div>
            <Label htmlFor="extCredits">평점 *</Label>
            <Input
              id="extCredits"
              type="number"
              step="0.5"
              min="0"
              value={formData.credits}
              onChange={(e) =>
                setFormData({ ...formData, credits: parseFloat(e.target.value) || 0 })
              }
            />
          </div>
          <div>
            <Label htmlFor="extNote">교육 내용 *</Label>
            <Textarea
              id="extNote"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="외부 교육 내용을 상세히 기록하세요..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isAdding || !formData.userId || formData.credits <= 0 || !formData.note}
          >
            {isAdding ? '추가 중...' : '추가'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Add Manual Adjustment Dialog
interface AddManualAdjustmentDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    userId: string;
    credits: number;
    note: string;
  }) => Promise<void>;
  defaultUserId?: string;
}

function AddManualAdjustmentDialog({
  isOpen,
  onClose,
  onAdd,
  defaultUserId,
}: AddManualAdjustmentDialogProps) {
  const [formData, setFormData] = useState({
    userId: defaultUserId || '',
    credits: 0,
    note: '',
  });
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (defaultUserId) {
      setFormData((prev) => ({ ...prev, userId: defaultUserId }));
    }
  }, [defaultUserId]);

  const handleSubmit = async () => {
    if (!formData.userId || formData.credits === 0 || !formData.note) return;
    setIsAdding(true);
    try {
      await onAdd(formData);
      setFormData({
        userId: defaultUserId || '',
        credits: 0,
        note: '',
      });
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>수동 평점 조정</DialogTitle>
          <DialogDescription>
            평점을 수동으로 증감합니다. 음수 값으로 평점을 차감할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="manUserId">사용자 ID *</Label>
            <Input
              id="manUserId"
              value={formData.userId}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              placeholder="사용자 ID를 입력하세요"
            />
          </div>
          <div>
            <Label htmlFor="manCredits">조정 평점 *</Label>
            <Input
              id="manCredits"
              type="number"
              step="0.5"
              value={formData.credits}
              onChange={(e) =>
                setFormData({ ...formData, credits: parseFloat(e.target.value) || 0 })
              }
            />
            <p className="text-xs text-muted-foreground mt-1">
              양수: 평점 추가 / 음수: 평점 차감
            </p>
          </div>
          <div>
            <Label htmlFor="manNote">조정 사유 *</Label>
            <Textarea
              id="manNote"
              value={formData.note}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              placeholder="조정 사유를 상세히 기록하세요..."
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isAdding || !formData.userId || formData.credits === 0 || !formData.note}
          >
            {isAdding ? '조정 중...' : '조정'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Credit Dialog
interface EditCreditDialogProps {
  credit: CreditRecord | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<CreditRecord>) => Promise<void>;
}

function EditCreditDialog({ credit, isOpen, onClose, onSave }: EditCreditDialogProps) {
  const [formData, setFormData] = useState<Partial<CreditRecord>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (credit) {
      setFormData({
        creditsEarned: credit.creditsEarned,
        earnedAt: credit.earnedAt,
        courseTitle: credit.courseTitle,
        note: credit.note,
      });
    }
  }, [credit]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (!credit) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>평점 수정</DialogTitle>
          <DialogDescription>평점 기록을 수정합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="editCredits">평점</Label>
            <Input
              id="editCredits"
              type="number"
              step="0.5"
              min="0"
              value={formData.creditsEarned || 0}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  creditsEarned: parseFloat(e.target.value) || 0,
                })
              }
            />
          </div>
          <div>
            <Label htmlFor="editEarnedAt">획득일</Label>
            <Input
              id="editEarnedAt"
              type="date"
              value={formData.earnedAt?.split('T')[0] || ''}
              onChange={(e) => setFormData({ ...formData, earnedAt: e.target.value })}
            />
          </div>
          <div>
            <Label htmlFor="editCourseTitle">강좌명</Label>
            <Input
              id="editCourseTitle"
              value={formData.courseTitle || ''}
              onChange={(e) =>
                setFormData({ ...formData, courseTitle: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="editNote">메모</Label>
            <Textarea
              id="editNote"
              value={formData.note || ''}
              onChange={(e) => setFormData({ ...formData, note: e.target.value })}
              rows={2}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button onClick={handleSubmit} disabled={isSaving}>
            {isSaving ? '저장 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function CreditListSkeleton() {
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
