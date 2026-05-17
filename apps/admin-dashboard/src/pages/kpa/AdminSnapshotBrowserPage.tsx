/**
 * AdminSnapshotBrowserPage — 공급 자산(Snapshot) 전체 조회
 *
 * WO-O4O-KPA-ADMIN-SNAPSHOT-BROWSE-V1
 * WO-O4O-KPA-OPERATOR-LEGACY-TABLE-CANONICAL-MIGRATION-V1:
 *   shadcn <Table> → @o4o/ui BaseTable 으로 정렬.
 *   기존 검색/필터/페이지네이션/행 클릭 Dialog/Force navigate 흐름은 그대로 유지.
 *   selection / bulk action 은 본 WO scope 외 (LEGACY-SHADCN → PARTIAL 승격).
 *
 * 경로: /operator/kpa/snapshots
 * 기능:
 *   - 전체 o4o_asset_snapshots 조회
 *   - 제목 검색 / assetType 필터 / 조직 필터
 *   - 페이지네이션
 *   - 행 클릭 → 상세 Dialog (snapshot 메타 + force 통계)
 *   - "강제 배포" 버튼 → /operator/kpa/force-assets 로 이동
 *
 * API: GET /api/v1/kpa/admin/force-assets/snapshots
 *      GET /api/v1/kpa/organizations
 *
 * Forced Content와 무관 — kpa_store_asset_controls 기반 Force Asset만 다룸.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { BaseTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, RefreshCw, Zap, X } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';

// ── Types ────────────────────────────────────────────────────────────────────

interface SnapshotRow {
  id: string;
  title: string;
  assetType: string;
  sourceService: string;
  sourceAssetId: string;
  organizationId: string;
  organizationName: string | null;
  createdBy: string;
  createdAt: string;
  totalControls: number;
  forcedControls: number;
}

interface OrgItem {
  id: string;
  name: string;
}

// ── API ──────────────────────────────────────────────────────────────────────

const SNAP_API = '/api/v1/kpa/admin/force-assets/snapshots';

async function fetchSnapshots(params: {
  search: string;
  type: string;
  organizationId: string;
  page: number;
}): Promise<{ items: SnapshotRow[]; total: number; page: number; limit: number }> {
  const q: Record<string, any> = { page: params.page, limit: 20 };
  if (params.search) q.search = params.search;
  if (params.type) q.type = params.type;
  if (params.organizationId) q.organizationId = params.organizationId;
  const res = await authClient.api.get<{ success: boolean; data: any }>(SNAP_API, { params: q });
  return res.data.data;
}

async function fetchOrgs(): Promise<OrgItem[]> {
  const res = await authClient.api.get<{ success: boolean; data: OrgItem[] }>('/api/v1/kpa/organizations');
  return res.data.data ?? [];
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(s: string): string {
  return new Date(s).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

const TYPE_COLORS: Record<string, string> = {
  cms:      'bg-blue-50 text-blue-700',
  signage:  'bg-purple-50 text-purple-700',
  content:  'bg-teal-50 text-teal-700',
  resource: 'bg-orange-50 text-orange-700',
  lesson:   'bg-green-50 text-green-700',
};

function TypeBadge({ type }: { type: string }) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium ${TYPE_COLORS[type] ?? 'bg-gray-100 text-gray-700'}`}>
      {type}
    </span>
  );
}

// ── Detail Dialog ─────────────────────────────────────────────────────────────

function SnapshotDetailDialog({
  snapshot,
  open,
  onOpenChange,
  onForce,
}: {
  snapshot: SnapshotRow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onForce: (snapshot: SnapshotRow) => void;
}) {
  if (!snapshot) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-start gap-2">
            <TypeBadge type={snapshot.assetType} />
            <span className="flex-1 leading-tight">{snapshot.title}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3 text-sm">
          {/* IDs */}
          <div className="grid grid-cols-[120px_1fr] gap-y-2">
            <span className="text-muted-foreground">Snapshot ID</span>
            <span className="font-mono text-xs break-all">{snapshot.id}</span>

            <span className="text-muted-foreground">Source Service</span>
            <span>{snapshot.sourceService}</span>

            <span className="text-muted-foreground">Source Asset ID</span>
            <span className="font-mono text-xs break-all">{snapshot.sourceAssetId}</span>

            <span className="text-muted-foreground">출처 조직</span>
            <span>{snapshot.organizationName ?? <span className="text-muted-foreground">—</span>}</span>

            <span className="text-muted-foreground">생성일</span>
            <span>{fmtDate(snapshot.createdAt)}</span>
          </div>

          {/* Force 통계 */}
          <div className="border-t pt-3">
            <p className="text-xs text-muted-foreground mb-2 font-medium uppercase tracking-wide">Force Asset 통계</p>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border p-3 text-center">
                <div className="text-2xl font-bold">{snapshot.totalControls}</div>
                <div className="text-xs text-muted-foreground mt-0.5">전체 배포 수</div>
              </div>
              <div className="rounded-lg border p-3 text-center">
                <div className={`text-2xl font-bold ${snapshot.forcedControls > 0 ? 'text-amber-600' : 'text-muted-foreground'}`}>
                  {snapshot.forcedControls}
                </div>
                <div className="text-xs text-muted-foreground mt-0.5">강제 배포 중</div>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-between pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4 mr-2" />
            닫기
          </Button>
          <Button onClick={() => { onOpenChange(false); onForce(snapshot); }}>
            <Zap className="h-4 w-4 mr-2" />
            강제 배포
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function AdminSnapshotBrowserPage() {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [orgFilter, setOrgFilter] = useState('');
  const [page, setPage] = useState(1);
  const [detailSnapshot, setDetailSnapshot] = useState<SnapshotRow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 350);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin-snapshots-browse', debouncedSearch, typeFilter, orgFilter, page],
    queryFn: () => fetchSnapshots({ search: debouncedSearch, type: typeFilter, organizationId: orgFilter, page }),
  });

  const { data: orgs = [] } = useQuery({
    queryKey: ['kpa-orgs'],
    queryFn: fetchOrgs,
    staleTime: 60_000,
  });

  const items = data?.items ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / 20));

  const handleRowClick = (row: SnapshotRow) => {
    setDetailSnapshot(row);
    setDetailOpen(true);
  };

  // WO-O4O-KPA-OPERATOR-LEGACY-TABLE-CANONICAL-MIGRATION-V1:
  //   shadcn <Table> → BaseTable. 행 클릭 → 상세 Dialog, "강제 배포" 버튼은 system:'last' 컬럼.
  const snapshotColumns: O4OColumn<SnapshotRow>[] = [
    {
      key: 'title',
      header: '제목',
      render: (_v, row) => <span className="font-medium text-sm">{row.title}</span>,
    },
    {
      key: 'assetType',
      header: '타입',
      width: 100,
      render: (_v, row) => <TypeBadge type={row.assetType} />,
    },
    {
      key: 'organizationName',
      header: '출처 조직',
      render: (_v, row) => (
        <span className="text-sm text-muted-foreground">{row.organizationName ?? '—'}</span>
      ),
    },
    {
      key: 'totalControls',
      header: '배포 수',
      width: 90,
      align: 'center',
      render: (_v, row) => <span className="text-sm">{row.totalControls}</span>,
    },
    {
      key: 'forcedControls',
      header: '강제 배포 중',
      width: 110,
      align: 'center',
      render: (_v, row) => row.forcedControls > 0 ? (
        <Badge variant="default" className="bg-amber-500 hover:bg-amber-500">
          {row.forcedControls}
        </Badge>
      ) : (
        <span className="text-muted-foreground text-sm">—</span>
      ),
    },
    {
      key: 'createdAt',
      header: '생성일',
      width: 130,
      render: (_v, row) => <span className="text-sm">{fmtDate(row.createdAt)}</span>,
    },
    {
      key: '_actions',
      header: '',
      width: 110,
      system: 'last',
      // row click → 상세 Dialog 와 충돌 방지: cell 클릭 핸들러로 전파 차단.
      onCellClick: () => {},
      render: (_v, row) => (
        <Button
          size="sm"
          variant="outline"
          onClick={(e) => { e.stopPropagation(); handleForce(row); }}
          title="강제 배포 화면으로 이동"
        >
          <Zap className="h-3.5 w-3.5 mr-1" />
          강제 배포
        </Button>
      ),
    },
  ];

  const handleForce = (snapshot: SnapshotRow) => {
    // Navigate to force-assets page with snapshot pre-selected via location state
    navigate('/operator/kpa/force-assets', {
      state: {
        preselectedSnapshot: {
          id: snapshot.id,
          title: snapshot.title,
          assetType: snapshot.assetType,
          organizationName: snapshot.organizationName,
        },
      },
    });
  };

  return (
    <div className="p-6 space-y-6">
      <PageHeader
        title="공급 자산 조회"
        subtitle="전체 Asset Snapshot을 조회하고 강제 배포를 관리합니다."
      />

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="제목 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {/* Asset Type */}
        <Select value={typeFilter || 'all'} onValueChange={(v) => { setTypeFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="전체 타입" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 타입</SelectItem>
            <SelectItem value="cms">cms</SelectItem>
            <SelectItem value="signage">signage</SelectItem>
            <SelectItem value="content">content</SelectItem>
            <SelectItem value="resource">resource</SelectItem>
            <SelectItem value="lesson">lesson</SelectItem>
          </SelectContent>
        </Select>

        {/* Organization */}
        <Select value={orgFilter || 'all'} onValueChange={(v) => { setOrgFilter(v === 'all' ? '' : v); setPage(1); }}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="전체 조직" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체 조직</SelectItem>
            {orgs.map((o) => (
              <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Button variant="outline" size="icon" onClick={() => refetch()} title="새로고침">
          <RefreshCw className="h-4 w-4" />
        </Button>
      </div>

      {/* Stats bar */}
      {!isLoading && !isError && (
        <p className="text-sm text-muted-foreground">
          총 <strong>{total}</strong>개의 Snapshot
          {typeFilter && <> · <TypeBadge type={typeFilter} /></>}
          {orgFilter && orgs.find(o => o.id === orgFilter) && (
            <> · {orgs.find(o => o.id === orgFilter)?.name}</>
          )}
        </p>
      )}

      {/* Table — WO-O4O-KPA-OPERATOR-LEGACY-TABLE-CANONICAL-MIGRATION-V1:
          shadcn <Table> → BaseTable. row click → onRowClick. */}
      {isLoading ? (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-11 w-full" />)}
        </div>
      ) : isError ? (
        <div className="text-center py-12 text-destructive text-sm">데이터를 불러오지 못했습니다.</div>
      ) : (
        <BaseTable<SnapshotRow>
          columns={snapshotColumns}
          data={items}
          rowKey={(row) => row.id}
          onRowClick={handleRowClick}
          emptyMessage="조건에 맞는 Snapshot이 없습니다."
        />
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

      {/* Detail Dialog */}
      <SnapshotDetailDialog
        snapshot={detailSnapshot}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onForce={handleForce}
      />
    </div>
  );
}
