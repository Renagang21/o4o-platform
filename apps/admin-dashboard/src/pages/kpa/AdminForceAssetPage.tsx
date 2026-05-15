/**
 * AdminForceAssetPage — Force Asset 강제 배포 관리
 *
 * WO-O4O-ADMIN-FORCE-ASSET-CONSOLE-V1
 *
 * 경로: /operator/kpa/force-assets
 * 기능:
 *   - 강제 배포 목록 조회
 *   - Force 생성 (snapshot 선택 + 대상 org + 기간)
 *   - 기간/publishStatus 수정
 *   - 강제 해제 (DELETE → is_forced=false)
 *
 * API: /api/v1/kpa/admin/force-assets  (GET/POST/PATCH/DELETE)
 *      /api/v1/kpa/admin/snapshots      (GET — snapshot 선택)
 *      /api/v1/kpa/organizations        (GET — 대상 org 선택)
 */

import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Search, Plus, MoreVertical, Edit, Trash2, RefreshCw, Lock, Unlock } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

interface ForceAssetItem {
  controlId: string;
  snapshotId: string;
  organizationId: string;
  publishStatus: string;
  channelMap: Record<string, boolean>;
  isForced: boolean;
  forcedByAdminId: string | null;
  forcedStartAt: string | null;
  forcedEndAt: string | null;
  isLocked: boolean;
  snapshotType: string;
  lifecycleStatus: string;
  createdAt: string;
  updatedAt: string;
  snapshotTitle: string | null;
  assetType: string | null;
  sourceService: string | null;
  organizationName: string | null;
}

interface SnapshotItem {
  id: string;
  title: string;
  assetType: string;
  sourceService: string;
  organizationId: string;
  organizationName: string | null;
  createdAt: string;
}

interface OrgItem {
  id: string;
  name: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

const BASE = '/api/v1/kpa/admin/force-assets';

async function fetchForceAssets(page: number, orgFilter?: string): Promise<{ items: ForceAssetItem[]; total: number; page: number; limit: number }> {
  const params: Record<string, any> = { page, limit: 20 };
  if (orgFilter) params.organizationId = orgFilter;
  const res = await authClient.api.get<{ success: boolean; data: any }>(BASE, { params });
  return res.data.data;
}

async function fetchSnapshots(search: string, type: string): Promise<SnapshotItem[]> {
  const params: Record<string, any> = { limit: 30 };
  if (search) params.search = search;
  if (type) params.type = type;
  const res = await authClient.api.get<{ success: boolean; data: { items: SnapshotItem[] } }>(
    `${BASE}/snapshots`, { params },
  );
  return res.data.data.items ?? [];
}

async function fetchOrgs(): Promise<OrgItem[]> {
  const res = await authClient.api.get<{ success: boolean; data: OrgItem[] }>('/api/v1/kpa/organizations');
  return res.data.data ?? [];
}

async function createForceAsset(body: {
  snapshotId: string;
  organizationId: string;
  forcedStartAt?: string;
  forcedEndAt?: string;
  channelMap?: Record<string, boolean>;
}): Promise<void> {
  await authClient.api.post(BASE, body);
}

async function updateForceAsset(controlId: string, body: {
  forcedStartAt?: string | null;
  forcedEndAt?: string | null;
  publishStatus?: string;
}): Promise<void> {
  await authClient.api.patch(`${BASE}/${controlId}`, body);
}

async function releaseForceAsset(controlId: string): Promise<void> {
  await authClient.api.delete(`${BASE}/${controlId}`);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string | null): string {
  if (!s) return '—';
  return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

function toDatetimeLocal(s: string | null): string {
  if (!s) return '';
  return new Date(s).toISOString().slice(0, 16);
}

const ASSET_TYPE_COLORS: Record<string, string> = {
  cms: 'bg-blue-50 text-blue-700',
  signage: 'bg-purple-50 text-purple-700',
  content: 'bg-teal-50 text-teal-700',
  resource: 'bg-orange-50 text-orange-700',
  lesson: 'bg-green-50 text-green-700',
};

// ── Snapshot Selector Dialog ─────────────────────────────────────────────────

function SnapshotSelectorDialog({
  open,
  onOpenChange,
  onSelect,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSelect: (snapshot: SnapshotItem) => void;
}) {
  const [search, setSearch] = useState('');
  const [type, setType] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  const { data: snapshots = [], isLoading } = useQuery({
    queryKey: ['admin-snapshots', debouncedSearch, type],
    queryFn: () => fetchSnapshots(debouncedSearch, type),
    enabled: open,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Snapshot 선택</DialogTitle>
          <DialogDescription>강제 배포할 Asset Snapshot을 선택하세요.</DialogDescription>
        </DialogHeader>
        <div className="flex gap-2 mb-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="제목 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={type || 'all'} onValueChange={(v) => setType(v === 'all' ? '' : v)}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="타입" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">전체</SelectItem>
              <SelectItem value="cms">cms</SelectItem>
              <SelectItem value="signage">signage</SelectItem>
              <SelectItem value="content">content</SelectItem>
              <SelectItem value="resource">resource</SelectItem>
              <SelectItem value="lesson">lesson</SelectItem>
            </SelectContent>
          </Select>
        </div>
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => <Skeleton key={i} className="h-10 w-full" />)}
          </div>
        ) : snapshots.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">검색 결과가 없습니다.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>제목</TableHead>
                <TableHead>타입</TableHead>
                <TableHead>출처 조직</TableHead>
                <TableHead>생성일</TableHead>
                <TableHead className="w-16"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snapshots.map((s) => (
                <TableRow key={s.id} className="cursor-pointer hover:bg-muted/50">
                  <TableCell className="font-medium">{s.title}</TableCell>
                  <TableCell>
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ASSET_TYPE_COLORS[s.assetType] ?? 'bg-gray-100 text-gray-700'}`}>
                      {s.assetType}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{s.organizationName ?? '—'}</TableCell>
                  <TableCell className="text-sm">{fmtDate(s.createdAt)}</TableCell>
                  <TableCell>
                    <Button size="sm" variant="outline" onClick={() => { onSelect(s); onOpenChange(false); }}>
                      선택
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ── Create Dialog ─────────────────────────────────────────────────────────────

function CreateForceAssetDialog({
  open,
  onOpenChange,
  orgs,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  orgs: OrgItem[];
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [snapshotSelectorOpen, setSnapshotSelectorOpen] = useState(false);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotItem | null>(null);
  const [organizationId, setOrganizationId] = useState('');
  const [forcedStartAt, setForcedStartAt] = useState('');
  const [forcedEndAt, setForcedEndAt] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      setSelectedSnapshot(null);
      setOrganizationId('');
      setForcedStartAt('');
      setForcedEndAt('');
    }
  }, [open]);

  const handleSubmit = async () => {
    if (!selectedSnapshot || !organizationId) return;
    setIsSubmitting(true);
    try {
      await createForceAsset({
        snapshotId: selectedSnapshot.id,
        organizationId,
        forcedStartAt: forcedStartAt || undefined,
        forcedEndAt: forcedEndAt || undefined,
      });
      toast({ title: '성공', description: '강제 배포가 생성되었습니다.' });
      onOpenChange(false);
      onSave();
    } catch {
      toast({ title: '오류', description: '강제 배포 생성에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Force Asset 생성</DialogTitle>
            <DialogDescription>특정 매장에 Asset을 강제 배포합니다.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {/* Snapshot */}
            <div className="space-y-1.5">
              <Label>Snapshot</Label>
              {selectedSnapshot ? (
                <div className="flex items-center gap-2 p-2 border rounded-lg bg-muted/30">
                  <span className={`text-xs px-2 py-0.5 rounded font-medium ${ASSET_TYPE_COLORS[selectedSnapshot.assetType] ?? 'bg-gray-100 text-gray-700'}`}>
                    {selectedSnapshot.assetType}
                  </span>
                  <span className="text-sm font-medium flex-1 truncate">{selectedSnapshot.title}</span>
                  <Button size="sm" variant="ghost" onClick={() => setSnapshotSelectorOpen(true)}>변경</Button>
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setSnapshotSelectorOpen(true)}>
                  <Search className="h-4 w-4 mr-2" />
                  Snapshot 선택
                </Button>
              )}
            </div>

            {/* Organization */}
            <div className="space-y-1.5">
              <Label>대상 매장 (Organization)</Label>
              <Select value={organizationId} onValueChange={setOrganizationId}>
                <SelectTrigger>
                  <SelectValue placeholder="매장을 선택하세요" />
                </SelectTrigger>
                <SelectContent>
                  {orgs.map((o) => (
                    <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Dates */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>시작일</Label>
                <Input type="datetime-local" value={forcedStartAt} onChange={(e) => setForcedStartAt(e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>종료일</Label>
                <Input type="datetime-local" value={forcedEndAt} onChange={(e) => setForcedEndAt(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
            <Button onClick={handleSubmit} disabled={isSubmitting || !selectedSnapshot || !organizationId}>
              {isSubmitting ? '처리 중...' : '강제 배포'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SnapshotSelectorDialog
        open={snapshotSelectorOpen}
        onOpenChange={setSnapshotSelectorOpen}
        onSelect={setSelectedSnapshot}
      />
    </>
  );
}

// ── Edit Dialog ───────────────────────────────────────────────────────────────

function EditForceAssetDialog({
  item,
  open,
  onOpenChange,
  onSave,
}: {
  item: ForceAssetItem | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: () => void;
}) {
  const { toast } = useToast();
  const [forcedStartAt, setForcedStartAt] = useState('');
  const [forcedEndAt, setForcedEndAt] = useState('');
  const [publishStatus, setPublishStatus] = useState('published');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (item) {
      setForcedStartAt(toDatetimeLocal(item.forcedStartAt));
      setForcedEndAt(toDatetimeLocal(item.forcedEndAt));
      setPublishStatus(item.publishStatus);
    }
  }, [item]);

  const handleSubmit = async () => {
    if (!item) return;
    setIsSubmitting(true);
    try {
      await updateForceAsset(item.controlId, {
        forcedStartAt: forcedStartAt || null,
        forcedEndAt: forcedEndAt || null,
        publishStatus,
      });
      toast({ title: '성공', description: '수정되었습니다.' });
      onOpenChange(false);
      onSave();
    } catch {
      toast({ title: '오류', description: '수정에 실패했습니다.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Force Asset 수정</DialogTitle>
          <DialogDescription>{item?.snapshotTitle ?? item?.snapshotId}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label>시작일</Label>
              <Input type="datetime-local" value={forcedStartAt} onChange={(e) => setForcedStartAt(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>종료일</Label>
              <Input type="datetime-local" value={forcedEndAt} onChange={(e) => setForcedEndAt(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label>Publish Status</Label>
            <Select value={publishStatus} onValueChange={setPublishStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="published">published</SelectItem>
                <SelectItem value="draft">draft</SelectItem>
                <SelectItem value="hidden">hidden</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>취소</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? '처리 중...' : '저장'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminForceAssetPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [orgFilter, setOrgFilter] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<ForceAssetItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-force-assets', page, orgFilter],
    queryFn: () => fetchForceAssets(page, orgFilter || undefined),
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ['kpa-orgs'],
    queryFn: fetchOrgs,
    staleTime: 60_000,
  });

  const releaseMutation = useMutation({
    mutationFn: releaseForceAsset,
    onSuccess: () => {
      toast({ title: '해제 완료', description: '강제 배포가 해제되었습니다.' });
      queryClient.invalidateQueries({ queryKey: ['admin-force-assets'] });
    },
    onError: () => {
      toast({ title: '오류', description: '강제 해제에 실패했습니다.', variant: 'destructive' });
    },
  });

  const handleRelease = useCallback((item: ForceAssetItem) => {
    if (!confirm(`강제 배포를 해제합니까?\n"${item.snapshotTitle ?? item.snapshotId}"`)) return;
    releaseMutation.mutate(item.controlId);
  }, [releaseMutation]);

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="Force Asset 관리"
        subtitle="특정 매장에 Asset을 강제 배포하고 관리합니다."
      />

      {/* Filters */}
      <div className="flex items-center gap-3">
        <Select value={orgFilter || 'all'} onValueChange={(v) => { setOrgFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="전체 매장" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 매장</SelectItem>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="flex-1" />

        <Button variant="outline" size="icon" onClick={() => refetch()} title="새로고침">
          <RefreshCw className="h-4 w-4" />
        </Button>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          강제 배포 생성
        </Button>
      </div>

      {/* Table */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-destructive text-sm">데이터를 불러오지 못했습니다.</div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground text-sm">강제 배포된 Asset이 없습니다.</div>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Snapshot</TableHead>
              <TableHead>타입</TableHead>
              <TableHead>대상 매장</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>시작</TableHead>
              <TableHead>종료</TableHead>
              <TableHead>잠금</TableHead>
              <TableHead>생성일</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.controlId}>
                <TableCell>
                  <div className="font-medium text-sm">{item.snapshotTitle ?? '(제목 없음)'}</div>
                  <div className="text-xs text-muted-foreground">{item.snapshotId.slice(0, 8)}…</div>
                </TableCell>
                <TableCell>
                  {item.assetType && (
                    <span className={`text-xs px-2 py-0.5 rounded font-medium ${ASSET_TYPE_COLORS[item.assetType] ?? 'bg-gray-100 text-gray-700'}`}>
                      {item.assetType}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-sm">{item.organizationName ?? '—'}</TableCell>
                <TableCell>
                  <Badge variant={item.publishStatus === 'published' ? 'default' : 'secondary'}>
                    {item.publishStatus}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">{fmtDate(item.forcedStartAt)}</TableCell>
                <TableCell className="text-sm">{fmtDate(item.forcedEndAt)}</TableCell>
                <TableCell>
                  {item.isLocked
                    ? <Lock className="h-4 w-4 text-amber-500" />
                    : <Unlock className="h-4 w-4 text-muted-foreground" />}
                </TableCell>
                <TableCell className="text-sm">{fmtDate(item.createdAt)}</TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => { setEditItem(item); setEditOpen(true); }}>
                        <Edit className="h-4 w-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleRelease(item)}
                        className="text-destructive"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        강제 해제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>총 {total}건</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>이전</Button>
            <span className="px-3 py-1.5">{page} / {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>다음</Button>
          </div>
        </div>
      )}

      {/* Dialogs */}
      <CreateForceAssetDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        orgs={orgs}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['admin-force-assets'] })}
      />
      <EditForceAssetDialog
        item={editItem}
        open={editOpen}
        onOpenChange={setEditOpen}
        onSave={() => queryClient.invalidateQueries({ queryKey: ['admin-force-assets'] })}
      />
    </div>
  );
}
