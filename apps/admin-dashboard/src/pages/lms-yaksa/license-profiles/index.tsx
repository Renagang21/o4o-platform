/**
 * License Profiles Management Page
 *
 * Manage pharmacist license profiles and renewal status
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
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
  Search,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Award,
  Calendar,
  User,
} from 'lucide-react';
import { licenseProfilesApi, creditsApi, LicenseProfile, CreditSummary } from '@/lib/api/lmsYaksa';
import { CreditBadge, UserSearch } from '@/components/lms-yaksa';

export default function LicenseProfilesPage() {
  const [profiles, setProfiles] = useState<LicenseProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<LicenseProfile | null>(null);
  const [creditSummary, setCreditSummary] = useState<CreditSummary | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Search for profile by user ID
  const handleSearch = useCallback(async (query: string) => {
    if (!query.trim()) {
      setProfiles([]);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const response = await licenseProfilesApi.getByUserId(query.trim());
      if (response.success && response.data) {
        setProfiles([response.data]);
      } else {
        setProfiles([]);
        setError('해당 사용자의 면허 프로필을 찾을 수 없습니다.');
      }
    } catch (err) {
      setError('면허 프로필 검색 중 오류가 발생했습니다.');
      console.error('Search error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // View profile details with credit summary
  const handleViewDetail = async (profile: LicenseProfile) => {
    setSelectedProfile(profile);
    setIsDetailOpen(true);

    try {
      const summaryResponse = await creditsApi.getSummary(profile.userId);
      if (summaryResponse.success && summaryResponse.data) {
        setCreditSummary(summaryResponse.data);
      }
    } catch (err) {
      console.error('Credit summary fetch error:', err);
    }
  };

  // Recalculate credits
  const handleRecalculate = async (profile: LicenseProfile) => {
    try {
      const response = await licenseProfilesApi.recalculateCredits(profile.id);
      if (response.success) {
        // Refresh the profile
        handleSearch(profile.userId);
      }
    } catch (err) {
      setError('평점 재계산 중 오류가 발생했습니다.');
      console.error('Recalculate error:', err);
    }
  };

  // Check renewal requirement
  const handleCheckRenewal = async (profile: LicenseProfile) => {
    try {
      const response = await licenseProfilesApi.checkRenewal(profile.id);
      if (response.success) {
        // Refresh the profile
        handleSearch(profile.userId);
      }
    } catch (err) {
      setError('갱신 필요 여부 확인 중 오류가 발생했습니다.');
      console.error('Check renewal error:', err);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">면허 프로필 관리</h1>
          <p className="text-muted-foreground">
            약사 면허 정보 및 갱신 상태를 관리합니다.
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          새 프로필
        </Button>
      </div>

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">프로필 검색</CardTitle>
          <CardDescription>사용자 ID로 면허 프로필을 검색합니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <UserSearch
            onSearch={handleSearch}
            placeholder="사용자 ID 입력..."
            showButton={true}
          />
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>오류</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Results */}
      {isLoading ? (
        <ProfileListSkeleton />
      ) : profiles.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>검색 결과</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>사용자 ID</TableHead>
                  <TableHead>면허 번호</TableHead>
                  <TableHead>총 평점</TableHead>
                  <TableHead>당해 평점</TableHead>
                  <TableHead>갱신 필요</TableHead>
                  <TableHead>면허 만료일</TableHead>
                  <TableHead className="text-right">작업</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profiles.map((profile) => (
                  <TableRow key={profile.id}>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        {profile.userId.substring(0, 8)}...
                      </div>
                    </TableCell>
                    <TableCell>{profile.licenseNumber || '-'}</TableCell>
                    <TableCell>
                      <CreditBadge credits={profile.totalCredits} size="sm" />
                    </TableCell>
                    <TableCell>
                      <CreditBadge credits={profile.currentYearCredits} size="sm" />
                    </TableCell>
                    <TableCell>
                      {profile.isRenewalRequired ? (
                        <Badge variant="destructive" className="flex items-center gap-1 w-fit">
                          <AlertTriangle className="h-3 w-3" />
                          필요
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="flex items-center gap-1 w-fit text-green-600">
                          <CheckCircle className="h-3 w-3" />
                          완료
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {profile.licenseExpiresAt ? (
                        <div className="flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {new Date(profile.licenseExpiresAt).toLocaleDateString('ko-KR')}
                        </div>
                      ) : (
                        '-'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetail(profile)}
                        >
                          상세
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedProfile(profile);
                            setIsEditOpen(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRecalculate(profile)}
                          title="평점 재계산"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : searchQuery && !isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground">검색 결과가 없습니다.</p>
          </CardContent>
        </Card>
      ) : null}

      {/* Profile Detail Dialog */}
      <ProfileDetailDialog
        profile={selectedProfile}
        creditSummary={creditSummary}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedProfile(null);
          setCreditSummary(null);
        }}
        onCheckRenewal={handleCheckRenewal}
        onRecalculate={handleRecalculate}
      />

      {/* Edit Profile Dialog */}
      <EditProfileDialog
        profile={selectedProfile}
        isOpen={isEditOpen}
        onClose={() => {
          setIsEditOpen(false);
          setSelectedProfile(null);
        }}
        onSave={async (data) => {
          if (!selectedProfile) return;
          try {
            await licenseProfilesApi.update(selectedProfile.id, data);
            handleSearch(selectedProfile.userId);
            setIsEditOpen(false);
          } catch (err) {
            setError('프로필 업데이트 중 오류가 발생했습니다.');
          }
        }}
      />

      {/* Create Profile Dialog */}
      <CreateProfileDialog
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onCreate={async (data) => {
          try {
            const response = await licenseProfilesApi.create(data);
            if (response.success && response.data) {
              setProfiles([response.data]);
              setIsCreateOpen(false);
            }
          } catch (err) {
            setError('프로필 생성 중 오류가 발생했습니다.');
          }
        }}
      />
    </div>
  );
}

// Profile Detail Dialog Component
interface ProfileDetailDialogProps {
  profile: LicenseProfile | null;
  creditSummary: CreditSummary | null;
  isOpen: boolean;
  onClose: () => void;
  onCheckRenewal: (profile: LicenseProfile) => void;
  onRecalculate: (profile: LicenseProfile) => void;
}

function ProfileDetailDialog({
  profile,
  creditSummary,
  isOpen,
  onClose,
  onCheckRenewal,
  onRecalculate,
}: ProfileDetailDialogProps) {
  if (!profile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>면허 프로필 상세</DialogTitle>
          <DialogDescription>
            사용자 ID: {profile.userId}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label className="text-muted-foreground">면허 번호</Label>
              <p className="font-medium">{profile.licenseNumber || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">조직 ID</Label>
              <p className="font-medium">{profile.organizationId || '-'}</p>
            </div>
            <div>
              <Label className="text-muted-foreground">면허 발급일</Label>
              <p className="font-medium">
                {profile.licenseIssuedAt
                  ? new Date(profile.licenseIssuedAt).toLocaleDateString('ko-KR')
                  : '-'}
              </p>
            </div>
            <div>
              <Label className="text-muted-foreground">면허 만료일</Label>
              <p className="font-medium">
                {profile.licenseExpiresAt
                  ? new Date(profile.licenseExpiresAt).toLocaleDateString('ko-KR')
                  : '-'}
              </p>
            </div>
          </div>

          {/* Credit Info */}
          <div className="p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-4 flex items-center gap-2">
              <Award className="h-4 w-4" />
              평점 현황
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-muted-foreground">총 누적 평점</Label>
                <CreditBadge credits={profile.totalCredits} size="lg" />
              </div>
              <div>
                <Label className="text-muted-foreground">당해년도 평점</Label>
                <CreditBadge credits={profile.currentYearCredits} size="lg" />
              </div>
            </div>

            {creditSummary && (
              <div className="mt-4 pt-4 border-t">
                <Label className="text-muted-foreground mb-2 block">연도별 평점</Label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(creditSummary.byYear).map(([year, credits]) => (
                    <Badge key={year} variant="outline">
                      {year}: {credits.toFixed(1)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Renewal Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <Label className="text-muted-foreground">갱신 필요 여부</Label>
              <div className="mt-1">
                {profile.isRenewalRequired ? (
                  <Badge variant="destructive">갱신 필요</Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600">
                    갱신 불필요
                  </Badge>
                )}
              </div>
            </div>
            <div className="space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => onCheckRenewal(profile)}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                갱신 확인
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onRecalculate(profile)}
              >
                <Award className="h-4 w-4 mr-2" />
                평점 재계산
              </Button>
            </div>
          </div>

          {/* Timestamps */}
          <div className="text-sm text-muted-foreground">
            <p>생성: {new Date(profile.createdAt).toLocaleString('ko-KR')}</p>
            <p>수정: {new Date(profile.updatedAt).toLocaleString('ko-KR')}</p>
            {profile.lastVerifiedAt && (
              <p>마지막 검증: {new Date(profile.lastVerifiedAt).toLocaleString('ko-KR')}</p>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            닫기
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Edit Profile Dialog Component
interface EditProfileDialogProps {
  profile: LicenseProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<LicenseProfile>) => Promise<void>;
}

function EditProfileDialog({ profile, isOpen, onClose, onSave }: EditProfileDialogProps) {
  const [formData, setFormData] = useState<Partial<LicenseProfile>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData({
        licenseNumber: profile.licenseNumber,
        licenseIssuedAt: profile.licenseIssuedAt,
        licenseExpiresAt: profile.licenseExpiresAt,
        organizationId: profile.organizationId,
      });
    }
  }, [profile]);

  const handleSubmit = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  if (!profile) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>프로필 수정</DialogTitle>
          <DialogDescription>면허 프로필 정보를 수정합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="licenseNumber">면허 번호</Label>
            <Input
              id="licenseNumber"
              value={formData.licenseNumber || ''}
              onChange={(e) =>
                setFormData({ ...formData, licenseNumber: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="organizationId">조직 ID</Label>
            <Input
              id="organizationId"
              value={formData.organizationId || ''}
              onChange={(e) =>
                setFormData({ ...formData, organizationId: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="licenseIssuedAt">면허 발급일</Label>
            <Input
              id="licenseIssuedAt"
              type="date"
              value={formData.licenseIssuedAt?.split('T')[0] || ''}
              onChange={(e) =>
                setFormData({ ...formData, licenseIssuedAt: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="licenseExpiresAt">면허 만료일</Label>
            <Input
              id="licenseExpiresAt"
              type="date"
              value={formData.licenseExpiresAt?.split('T')[0] || ''}
              onChange={(e) =>
                setFormData({ ...formData, licenseExpiresAt: e.target.value })
              }
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

// Create Profile Dialog Component
interface CreateProfileDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: Partial<LicenseProfile>) => Promise<void>;
}

function CreateProfileDialog({ isOpen, onClose, onCreate }: CreateProfileDialogProps) {
  const [formData, setFormData] = useState<Partial<LicenseProfile>>({});
  const [isCreating, setIsCreating] = useState(false);

  const handleSubmit = async () => {
    if (!formData.userId) return;
    setIsCreating(true);
    try {
      await onCreate(formData);
      setFormData({});
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>새 프로필 생성</DialogTitle>
          <DialogDescription>새로운 면허 프로필을 생성합니다.</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="userId">사용자 ID *</Label>
            <Input
              id="userId"
              value={formData.userId || ''}
              onChange={(e) => setFormData({ ...formData, userId: e.target.value })}
              placeholder="사용자 ID를 입력하세요"
            />
          </div>
          <div>
            <Label htmlFor="newLicenseNumber">면허 번호</Label>
            <Input
              id="newLicenseNumber"
              value={formData.licenseNumber || ''}
              onChange={(e) =>
                setFormData({ ...formData, licenseNumber: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="newOrganizationId">조직 ID</Label>
            <Input
              id="newOrganizationId"
              value={formData.organizationId || ''}
              onChange={(e) =>
                setFormData({ ...formData, organizationId: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="newLicenseIssuedAt">면허 발급일</Label>
            <Input
              id="newLicenseIssuedAt"
              type="date"
              value={formData.licenseIssuedAt || ''}
              onChange={(e) =>
                setFormData({ ...formData, licenseIssuedAt: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="newLicenseExpiresAt">면허 만료일</Label>
            <Input
              id="newLicenseExpiresAt"
              type="date"
              value={formData.licenseExpiresAt || ''}
              onChange={(e) =>
                setFormData({ ...formData, licenseExpiresAt: e.target.value })
              }
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            취소
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isCreating || !formData.userId}
          >
            {isCreating ? '생성 중...' : '생성'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProfileListSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-32" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
