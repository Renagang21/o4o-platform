/**
 * ForumManagementPage - 포럼 카테고리 요청 관리 + 활성 포럼 목록
 *
 * WO-O4O-KPA-A-FORUM-ALIGNMENT-V1
 * WO-KPA-A-OPERATOR-FORUM-DIRECT-SOFT-DELETE-V1
 * WO-O4O-OPERATOR-LIST-TABLE-STANDARD-V3-PHASE3B-2:
 *   Raw HTML table → DataTable + ActionPolicy 표준 전환.
 *
 * 공통 /api/v1/forum/operator/* API 사용 (forumOperatorApi)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  FileCheck,
  Search,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  ChevronDown,
  Loader2,
  Trash2,
  AlertTriangle,
  List,
  AlertOctagon,
  Play,
  RefreshCw,
  Loader2 as Spinner,
  X,
  Pencil,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RowActionMenu } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { forumOperatorApi } from '../../api/forum';

type TabType = 'requests' | 'categories';
type CategoryRequestStatus =
  | 'pending'
  | 'revision_requested'
  | 'approved'
  | 'creating'
  | 'completed'
  | 'failed'
  | 'rejected';

interface CategoryData {
  id: string;
  name: string;
  description?: string;
  slug: string;
  isActive: boolean;
  postCount: number;
  forumType: string;
  tags?: string[];
  createdBy?: string;
  creatorName?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RequestData {
  id: string;
  name: string;
  description: string;
  reason?: string;
  forumType?: string;
  tags?: string[];
  status: CategoryRequestStatus;
  serviceCode: string;
  requesterId: string;
  requesterName: string;
  requesterEmail?: string;
  reviewerId?: string;
  reviewerName?: string;
  reviewComment?: string;
  reviewedAt?: string;
  createdCategoryId?: string;
  createdCategorySlug?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
}

const statusConfig: Record<CategoryRequestStatus, { label: string; color: string; bgColor: string }> = {
  pending: { label: '대기 중', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  revision_requested: { label: '보완 요청', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  approved: { label: '승인됨 (생성 전)', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  creating: { label: '생성 중', color: 'text-indigo-700', bgColor: 'bg-indigo-100' },
  completed: { label: '생성 완료', color: 'text-green-700', bgColor: 'bg-green-100' },
  failed: { label: '생성 실패', color: 'text-red-700', bgColor: 'bg-red-100' },
  rejected: { label: '거절됨', color: 'text-slate-600', bgColor: 'bg-slate-100' },
};

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function isReviewable(status: string): boolean {
  return status === 'pending' || status === 'revision_requested';
}

function canCreateForum(status: string): boolean {
  return status === 'approved';
}

function canRecreateForum(status: string): boolean {
  return status === 'failed';
}

// ─── Action Policies ───

const forumRequestPolicy = defineActionPolicy<RequestData>('kpa:forum:requests', {
  rules: [
    {
      key: 'createForum',
      label: '포럼 생성',
      visible: (row) => canCreateForum(row.status),
    },
    {
      key: 'recreateForum',
      label: '재생성',
      variant: 'warning',
      visible: (row) => canRecreateForum(row.status),
    },
    {
      key: 'review',
      label: '상세보기',
    },
  ],
});

const REQUEST_ACTION_ICONS: Record<string, React.ReactNode> = {
  createForum: <Play className="w-4 h-4" />,
  recreateForum: <RefreshCw className="w-4 h-4" />,
  review: <Eye className="w-4 h-4" />,
};

const forumCategoryPolicy = defineActionPolicy<CategoryData>('kpa:forum:categories', {
  rules: [
    {
      key: 'editTags',
      label: '태그 수정',
    },
    {
      key: 'deactivate',
      label: '비활성화',
      variant: 'warning',
      visible: (row) => row.isActive,
    },
    {
      key: 'hardDelete',
      label: '완전 삭제',
      variant: 'danger',
      visible: (row) => !row.isActive,
    },
  ],
});

const CATEGORY_ACTION_ICONS: Record<string, React.ReactNode> = {
  editTags: <Pencil className="w-4 h-4" />,
  deactivate: <Trash2 className="w-4 h-4" />,
  hardDelete: <AlertOctagon className="w-4 h-4" />,
};

// ─── Component ───

export default function ForumManagementPage() {
  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<TabType>('requests');

  // ── Forum creation requests state ──
  const [requests, setRequests] = useState<RequestData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<CategoryRequestStatus | 'all'>('all');
  const [selectedRequest, setSelectedRequest] = useState<RequestData | null>(null);
  const [reviewComment, setReviewComment] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [creatingRequestId, setCreatingRequestId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string>('');

  // ── Active forum categories state (WO-KPA-A-OPERATOR-FORUM-DIRECT-SOFT-DELETE-V1) ──
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isCatsLoading, setIsCatsLoading] = useState(false);
  const [catSearch, setCatSearch] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deactivateTarget, setDeactivateTarget] = useState<CategoryData | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  // ── Selection (DataTable selectable) ──
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);

  // ── Hard delete 모달 (WO-KPA-A-OPERATOR-FORUM-HARD-DELETE-SAFE-GUARD-V1) ──
  interface DeleteCheckData {
    postCount: number;
    memberCount: number;
    generalMemberCount: number;
    ownerCount: number;
    hardDeleteAllowed: boolean;
    blockedReasons: string[];
    warnings: string[];
    normalPostCount?: number;
    orphanPostCount?: number;
  }
  const [hardDeleteTarget, setHardDeleteTarget] = useState<CategoryData | null>(null);
  const [hardDeleteCheck, setHardDeleteCheck] = useState<DeleteCheckData | null>(null);
  const [isCheckLoading, setIsCheckLoading] = useState(false);
  const [hardDeleteReason, setHardDeleteReason] = useState('');
  const [isHardDeleting, setIsHardDeleting] = useState(false);

  // ── Tag edit modal state ──
  const [tagEditTarget, setTagEditTarget] = useState<CategoryData | null>(null);
  const [tagEditTags, setTagEditTags] = useState<string[]>([]);
  const [tagEditInput, setTagEditInput] = useState('');
  const [isTagSaving, setIsTagSaving] = useState(false);

  useEffect(() => {
    loadRequests();
  }, [statusFilter]);

  useEffect(() => {
    if (activeTab === 'categories') loadCategories();
  }, [activeTab]);

  const loadRequests = async () => {
    setIsLoading(true);
    try {
      const result = await forumOperatorApi.getRequests({
        status: statusFilter !== 'all' ? statusFilter : undefined,
      });
      setRequests(result.data || []);
    } catch {
      setRequests([]);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCategories = async () => {
    setIsCatsLoading(true);
    try {
      const result = await forumOperatorApi.getCategories();
      setCategories(result.data || []);
    } catch {
      setCategories([]);
    } finally {
      setIsCatsLoading(false);
    }
  };

  const handleDirectDeactivate = async () => {
    if (!deactivateTarget || !deactivateReason.trim()) return;
    setIsDeactivating(true);
    try {
      const result = await forumOperatorApi.directDeactivate(deactivateTarget.id, {
        reason: deactivateReason.trim(),
      });
      if (result.success) {
        toast.success(`'${deactivateTarget.name}' 포럼이 비활성화되었습니다`);
        setDeactivateTarget(null);
        setDeactivateReason('');
        loadCategories();
      } else {
        toast.error(result.error || '비활성화 실패');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '오류가 발생했습니다');
    } finally {
      setIsDeactivating(false);
    }
  };

  const openHardDeleteModal = async (cat: CategoryData) => {
    setHardDeleteTarget(cat);
    setHardDeleteCheck(null);
    setHardDeleteReason('');
    setIsCheckLoading(true);
    try {
      const result = await forumOperatorApi.getDeleteCheck(cat.id);
      setHardDeleteCheck(result.data);
    } catch {
      toast.error('삭제 가능 여부를 확인할 수 없습니다');
      setHardDeleteTarget(null);
    } finally {
      setIsCheckLoading(false);
    }
  };

  const handleHardDelete = async () => {
    if (!hardDeleteTarget || !hardDeleteReason.trim()) return;
    setIsHardDeleting(true);
    try {
      const result = await forumOperatorApi.hardDelete(hardDeleteTarget.id, { reason: hardDeleteReason.trim() });
      if (result.success) {
        toast.success(`'${hardDeleteTarget.name}' 포럼이 영구 삭제되었습니다`);
        setHardDeleteTarget(null);
        setHardDeleteCheck(null);
        setHardDeleteReason('');
        loadCategories();
      } else {
        toast.error(result.error || '영구 삭제 실패');
      }
    } catch (err: any) {
      const msg = err?.response?.data?.error || '오류가 발생했습니다';
      const reasons = err?.response?.data?.data?.blockedReasons;
      toast.error(reasons ? `삭제 불가: ${reasons.join(', ')}` : msg);
    } finally {
      setIsHardDeleting(false);
    }
  };

  // ── Tag edit handlers ──
  const openTagEditModal = (cat: CategoryData) => {
    setTagEditTarget(cat);
    setTagEditTags([...(cat.tags || [])]);
    setTagEditInput('');
  };

  const addEditTag = (value: string) => {
    const tag = value.trim().replace(/^#/, '');
    if (!tag || tag.length > 30 || tagEditTags.includes(tag)) return;
    setTagEditTags((prev) => [...prev, tag]);
    setTagEditInput('');
  };

  const removeEditTag = (tag: string) => {
    setTagEditTags((prev) => prev.filter((t) => t !== tag));
  };

  const handleTagEditSave = async () => {
    if (!tagEditTarget) return;
    setIsTagSaving(true);
    try {
      const result = await forumOperatorApi.updateCategory(tagEditTarget.id, { tags: tagEditTags });
      if (result.success) {
        toast.success(`'${tagEditTarget.name}' 태그가 수정되었습니다`);
        setTagEditTarget(null);
        loadCategories();
      } else {
        toast.error(result.error || '태그 수정 실패');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '태그 수정 중 오류가 발생했습니다');
    } finally {
      setIsTagSaving(false);
    }
  };

  const filteredCategories = useMemo(() => categories.filter((c) => {
    const q = catSearch.toLowerCase();
    const matchesSearch = c.name.toLowerCase().includes(q) || (c.creatorName || '').toLowerCase().includes(q);
    const matchesStatus = catStatusFilter === 'all'
      || (catStatusFilter === 'active' && c.isActive)
      || (catStatusFilter === 'inactive' && !c.isActive);
    return matchesSearch && matchesStatus;
  }), [categories, catSearch, catStatusFilter]);

  // Reset selection on filter change
  useEffect(() => { setSelectedCatIds(new Set()); }, [catSearch, catStatusFilter]);

  // ── Bulk soft delete (비활성화): 선택된 활성 포럼만 대상 ──
  const handleBulkSoftDelete = async () => {
    const targets = filteredCategories.filter((c) => selectedCatIds.has(c.id) && c.isActive);
    if (targets.length === 0) {
      toast.error('비활성화할 수 있는 활성 포럼이 없습니다');
      return;
    }
    const reason = prompt(`선택한 ${targets.length}개 활성 포럼을 비활성화합니다.\n사유를 입력하세요:`);
    if (!reason?.trim()) return;
    if (!confirm(`${targets.length}개 포럼을 비활성화합니다. 진행하시겠습니까?`)) return;

    setIsBulkProcessing(true);
    let success = 0;
    let failed = 0;
    const failedNames: string[] = [];

    for (const cat of targets) {
      try {
        const result = await forumOperatorApi.directDeactivate(cat.id, { reason: reason.trim() });
        if (result.success) success++;
        else { failed++; failedNames.push(cat.name); }
      } catch {
        failed++; failedNames.push(cat.name);
      }
    }

    if (failed === 0) {
      toast.success(`${success}개 포럼 비활성화 완료`);
    } else {
      toast.error(`${success}건 성공, ${failed}건 실패${failedNames.length > 0 ? ` (${failedNames.join(', ')})` : ''}`);
    }
    setSelectedCatIds(new Set());
    loadCategories();
    setIsBulkProcessing(false);
  };

  // ── Bulk hard delete (완전 삭제): 선택된 비활성 포럼만 대상 ──
  const handleBulkHardDelete = async () => {
    const targets = filteredCategories.filter((c) => selectedCatIds.has(c.id) && !c.isActive);
    if (targets.length === 0) {
      toast.error('완전 삭제할 수 있는 비활성 포럼이 없습니다');
      return;
    }
    const reason = prompt(`선택한 ${targets.length}개 비활성 포럼을 완전 삭제합니다.\n삭제 사유를 입력하세요 (복구 불가):`);
    if (!reason?.trim()) return;
    if (!confirm(`${targets.length}개 포럼을 영구 삭제합니다.\n이 작업은 복구할 수 없습니다. 진행하시겠습니까?`)) return;

    setIsBulkProcessing(true);
    let success = 0;
    let blocked = 0;
    let failed = 0;
    const blockedItems: Array<{ name: string; reasons: string[] }> = [];

    for (const cat of targets) {
      try {
        // 1) delete-check
        const check = await forumOperatorApi.getDeleteCheck(cat.id);
        if (!check.data?.hardDeleteAllowed) {
          blocked++;
          blockedItems.push({ name: cat.name, reasons: check.data?.blockedReasons || ['삭제 불가'] });
          continue;
        }
        // 2) hard delete
        const result = await forumOperatorApi.hardDelete(cat.id, { reason: reason.trim() });
        if (result.success) success++;
        else { failed++; }
      } catch {
        failed++;
      }
    }

    if (success > 0 && blocked === 0 && failed === 0) {
      toast.success(`${success}개 포럼 영구 삭제 완료`);
    } else {
      const parts: string[] = [];
      if (success > 0) parts.push(`${success}건 삭제`);
      if (blocked > 0) parts.push(`${blocked}건 차단`);
      if (failed > 0) parts.push(`${failed}건 실패`);
      if (blocked > 0) {
        const detail = blockedItems.map((b) => `${b.name}: ${b.reasons.join(', ')}`).join('\n');
        alert(`처리 결과: ${parts.join(', ')}\n\n차단 사유 (정상 게시글 잔존):\n${detail}`);
      }
      toast.error(parts.join(', '));
    }
    setSelectedCatIds(new Set());
    loadCategories();
    setIsBulkProcessing(false);
  };

  const selectedActiveCount = useMemo(() =>
    filteredCategories.filter((c) => selectedCatIds.has(c.id) && c.isActive).length,
    [filteredCategories, selectedCatIds],
  );
  const selectedInactiveCount = useMemo(() =>
    filteredCategories.filter((c) => selectedCatIds.has(c.id) && !c.isActive).length,
    [filteredCategories, selectedCatIds],
  );

  const filteredRequests = requests.filter((r) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = r.name.toLowerCase().includes(q) || r.requesterName.toLowerCase().includes(q);
    const tq = tagFilter.toLowerCase();
    const matchesTag = !tq || (r.tags || []).some((t) => t.toLowerCase().includes(tq));
    return matchesSearch && matchesTag;
  });

  const pendingCount = requests.filter((r) => isReviewable(r.status)).length;

  const handleReview = async (action: 'approve' | 'reject' | 'revision') => {
    if (!selectedRequest) return;
    setIsProcessing(true);
    try {
      const result = await forumOperatorApi.review(selectedRequest.id, {
        action,
        reviewComment: reviewComment || undefined,
      });
      if (result.success) {
        toast.success(action === 'approve' ? '승인되었습니다 — 포럼 생성 버튼을 눌러 포럼을 생성하세요' : action === 'reject' ? '거절되었습니다' : '보완 요청되었습니다');
        setSelectedRequest(null);
        setReviewComment('');
        loadRequests();
      } else {
        toast.error(result.error || '처리 실패');
      }
    } catch {
      toast.error('처리 중 오류가 발생했습니다.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleCreateForum = async (request: RequestData, isRecreate = false) => {
    setCreatingRequestId(request.id);
    try {
      const result = isRecreate
        ? await forumOperatorApi.recreateForum(request.id)
        : await forumOperatorApi.createForum(request.id);
      if (result.success) {
        toast.success(`'${request.name}' 포럼이 생성되었습니다`);
        loadRequests();
        if (selectedRequest?.id === request.id) setSelectedRequest(null);
      } else {
        toast.error(result.error || '포럼 생성 실패');
        loadRequests();
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '포럼 생성 중 오류가 발생했습니다');
      loadRequests();
    } finally {
      setCreatingRequestId(null);
    }
  };

  // ── Tab 1: Column definitions ──
  const requestColumns: ListColumnDef<RequestData>[] = [
    {
      key: 'name',
      header: '포럼명',
      render: (_v, row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium text-slate-800">{row.name}</span>
            {row.forumType === 'closed' ? (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">비공개</span>
            ) : (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-600">공개</span>
            )}
          </div>
          <div className="text-sm text-slate-500 line-clamp-1">{row.description}</div>
          {row.tags && row.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1.5">
              {row.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">
                  {tag}
                </span>
              ))}
              {row.tags.length > 2 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">
                  +{row.tags.length - 2}
                </span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'requesterName',
      header: '신청자',
      render: (_v, row) => (
        <div>
          <div className="text-slate-800">{row.requesterName}</div>
          {row.requesterEmail && (
            <div className="text-sm text-slate-500">{row.requesterEmail}</div>
          )}
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: '신청일',
      render: (value) => <span className="text-sm text-slate-600">{formatDate(value)}</span>,
    },
    {
      key: 'status',
      header: '상태',
      render: (value) => {
        const sc = statusConfig[value as CategoryRequestStatus] || statusConfig.pending;
        return (
          <span className={`px-3 py-1 text-xs font-medium rounded-full ${sc.bgColor} ${sc.color}`}>
            {sc.label}
          </span>
        );
      },
    },
    {
      key: '_actions',
      header: '작업',
      align: 'center' as const,
      width: '120px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(forumRequestPolicy, row, {
            createForum: () => handleCreateForum(row),
            recreateForum: () => handleCreateForum(row, true),
            review: () => { setSelectedRequest(row); setReviewComment(''); },
          }, {
            icons: REQUEST_ACTION_ICONS,
            loading: {
              createForum: creatingRequestId === row.id,
              recreateForum: creatingRequestId === row.id,
            },
          })}
        />
      ),
    },
  ];

  // ── Tab 2: Column definitions ──
  const categoryColumns: ListColumnDef<CategoryData>[] = [
    {
      key: 'name',
      header: '포럼명',
      render: (_v, row) => (
        <div>
          <div className="flex items-center gap-2">
            <span className={`font-medium ${row.isActive ? 'text-slate-800' : 'text-slate-500'}`}>{row.name}</span>
            {row.forumType === 'closed' ? (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">비공개</span>
            ) : (
              <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-600">공개</span>
            )}
          </div>
          {row.description && (
            <div className="text-sm text-slate-400 line-clamp-1 mt-0.5">{row.description}</div>
          )}
          {row.tags && row.tags.length > 0 && (
            <div className="flex items-center gap-1 mt-1">
              {row.tags.slice(0, 2).map((tag) => (
                <span key={tag} className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-600">{tag}</span>
              ))}
              {row.tags.length > 2 && (
                <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 text-slate-500">+{row.tags.length - 2}</span>
              )}
            </div>
          )}
        </div>
      ),
    },
    {
      key: 'creatorName',
      header: '개설자',
      render: (value) => <span className="text-sm text-slate-600">{value || '-'}</span>,
    },
    {
      key: 'postCount',
      header: '게시글',
      render: (value) => <span className="text-sm text-slate-600">{value}</span>,
    },
    {
      key: 'isActive',
      header: '상태',
      render: (value) => value
        ? <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">활성</span>
        : <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500">비활성</span>,
    },
    {
      key: 'createdAt',
      header: '생성일',
      render: (value) => <span className="text-sm text-slate-500">{formatDate(value)}</span>,
    },
    {
      key: '_actions',
      header: '작업',
      align: 'center' as const,
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(forumCategoryPolicy, row, {
            editTags: () => openTagEditModal(row),
            deactivate: () => { setDeactivateTarget(row); setDeactivateReason(''); },
            hardDelete: () => openHardDeleteModal(row),
          }, {
            icons: CATEGORY_ACTION_ICONS,
          })}
        />
      ),
    },
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileCheck className="w-7 h-7 text-blue-600" />
            포럼 관리
          </h1>
          <p className="text-slate-500 mt-1">
            포럼 생성 요청 심사 및 활성 포럼 관리
          </p>
        </div>
        {pendingCount > 0 && activeTab === 'requests' && (
          <div className="flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-lg">
            <Clock className="w-5 h-5" />
            <span className="font-medium">{pendingCount}건 심사 대기</span>
          </div>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'requests'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          신청 관리
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === 'categories'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <List className="w-4 h-4" />
          포럼 목록
        </button>
      </div>

      {/* ── Tab: 신청 관리 ── */}
      {activeTab === 'requests' && (
        <>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="포럼명 또는 신청자 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as CategoryRequestStatus | 'all')}
                className="pl-4 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="all">모든 상태</option>
                <option value="pending">대기 중</option>
                <option value="revision_requested">보완 요청</option>
                <option value="approved">승인됨 (생성 전)</option>
                <option value="creating">생성 중</option>
                <option value="completed">생성 완료</option>
                <option value="failed">생성 실패</option>
                <option value="rejected">거절됨</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            <input
              type="text"
              placeholder="태그 검색..."
              value={tagFilter}
              onChange={(e) => setTagFilter(e.target.value)}
              className="pl-4 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-sm w-40"
            />
          </div>

          {/* DataTable */}
          <DataTable<RequestData>
            columns={requestColumns}
            data={filteredRequests}
            rowKey="id"
            loading={isLoading}
            emptyMessage="신청 내역이 없습니다"
            tableId="kpa-forum-requests"
          />

          {/* Review Modal */}
          {selectedRequest && (
            <>
              <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setSelectedRequest(null)} />
              <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-lg bg-white rounded-xl shadow-xl z-50 overflow-hidden flex flex-col max-h-[90vh]">
                <div className="px-6 py-4 border-b border-slate-200">
                  <h2 className="text-lg font-semibold text-slate-800">포럼 신청 상세</h2>
                </div>
                <div className="p-6 overflow-y-auto flex-1 space-y-4">
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-1">포럼 이름</h4>
                    <p className="text-slate-800 font-medium">{selectedRequest.name}</p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-1">포럼 유형</h4>
                    <p className="text-slate-800">
                      {selectedRequest.forumType === 'closed' ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg bg-slate-100 text-slate-700">비공개 포럼</span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm font-medium rounded-lg bg-blue-50 text-blue-700">공개 포럼</span>
                      )}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium text-slate-500 mb-1">포럼 설명</h4>
                    <p className="text-slate-800">{selectedRequest.description}</p>
                  </div>
                  {selectedRequest.tags && selectedRequest.tags.length > 0 && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-2">태그</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {selectedRequest.tags.map((tag) => (
                          <span key={tag} className="px-2.5 py-1 text-xs font-medium rounded-full bg-blue-50 text-blue-700">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {selectedRequest.reason && (
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">신청 사유</h4>
                      <p className="text-slate-800">{selectedRequest.reason}</p>
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">신청자</h4>
                      <p className="text-slate-800">{selectedRequest.requesterName}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-slate-500 mb-1">신청일</h4>
                      <p className="text-slate-800">{formatDate(selectedRequest.createdAt)}</p>
                    </div>
                  </div>

                  {isReviewable(selectedRequest.status) && (
                    <div className="pt-4 border-t border-slate-200">
                      <label className="block text-sm font-medium text-slate-700 mb-2">검토 의견</label>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="승인/거절/보완 요청 사유를 입력하세요 (선택)"
                        rows={3}
                        className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                  )}

                  {!isReviewable(selectedRequest.status) && selectedRequest.reviewComment && (
                    <div className={`p-4 rounded-lg ${
                      ['approved', 'creating', 'completed'].includes(selectedRequest.status) ? 'bg-green-50' : 'bg-red-50'
                    }`}>
                      <h4 className={`text-sm font-medium mb-1 ${
                        ['approved', 'creating', 'completed'].includes(selectedRequest.status) ? 'text-green-700' : 'text-red-700'
                      }`}>
                        검토 의견
                      </h4>
                      <p className={['approved', 'creating', 'completed'].includes(selectedRequest.status) ? 'text-green-600' : 'text-red-600'}>
                        {selectedRequest.reviewComment}
                      </p>
                      {selectedRequest.reviewedAt && (
                        <p className="text-xs text-slate-500 mt-2">
                          {selectedRequest.reviewerName} | {formatDate(selectedRequest.reviewedAt)}
                        </p>
                      )}
                    </div>
                  )}

                  {selectedRequest.status === 'failed' && selectedRequest.errorMessage && (
                    <div className="p-4 rounded-lg bg-red-50 border border-red-200">
                      <h4 className="text-sm font-medium text-red-700 mb-1">생성 오류</h4>
                      <p className="text-sm text-red-600 font-mono break-all">{selectedRequest.errorMessage}</p>
                    </div>
                  )}

                  {selectedRequest.status === 'completed' && selectedRequest.createdCategorySlug && (
                    <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                      <h4 className="text-sm font-medium text-green-700 mb-1">생성된 포럼</h4>
                      <p className="text-sm text-green-600">슬러그: <span className="font-mono">{selectedRequest.createdCategorySlug}</span></p>
                    </div>
                  )}
                </div>

                <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                  >
                    닫기
                  </button>
                  {isReviewable(selectedRequest.status) && (
                    <>
                      <button
                        onClick={() => handleReview('reject')}
                        disabled={isProcessing}
                        className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        <XCircle className="w-4 h-4" />
                        거절
                      </button>
                      <button
                        onClick={() => handleReview('revision')}
                        disabled={isProcessing}
                        className="px-4 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                      >
                        <RotateCcw className="w-4 h-4" />
                        보완
                      </button>
                      <button
                        onClick={() => handleReview('approve')}
                        disabled={isProcessing}
                        className="px-4 py-2 text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                      >
                        {isProcessing ? (
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <CheckCircle className="w-4 h-4" />
                        )}
                        승인
                      </button>
                    </>
                  )}
                  {canCreateForum(selectedRequest.status) && (
                    <button
                      onClick={() => handleCreateForum(selectedRequest)}
                      disabled={creatingRequestId === selectedRequest.id}
                      className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2"
                    >
                      {creatingRequestId === selectedRequest.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <Play className="w-4 h-4" />}
                      포럼 생성
                    </button>
                  )}
                  {canRecreateForum(selectedRequest.status) && (
                    <button
                      onClick={() => handleCreateForum(selectedRequest, true)}
                      disabled={creatingRequestId === selectedRequest.id}
                      className="px-4 py-2 text-white bg-orange-500 rounded-lg hover:bg-orange-600 disabled:opacity-50 flex items-center gap-2"
                    >
                      {creatingRequestId === selectedRequest.id
                        ? <Loader2 className="w-4 h-4 animate-spin" />
                        : <RefreshCw className="w-4 h-4" />}
                      재생성
                    </button>
                  )}
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* ── Tab: 포럼 목록 ── */}
      {activeTab === 'categories' && (
        <>
          {/* 검색 + 상태 필터 */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
              <input
                type="text"
                placeholder="포럼명 또는 개설자 검색..."
                value={catSearch}
                onChange={(e) => setCatSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="relative">
              <select
                value={catStatusFilter}
                onChange={(e) => setCatStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="pl-4 pr-8 py-2 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white text-sm"
              >
                <option value="all">모든 상태</option>
                <option value="active">활성</option>
                <option value="inactive">비활성</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Bulk Action Bar */}
          {selectedCatIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-lg">
              <span className="text-sm text-blue-700 font-medium">{selectedCatIds.size}개 선택</span>
              <div className="h-4 w-px bg-blue-200" />
              {selectedActiveCount > 0 && (
                <button
                  onClick={handleBulkSoftDelete}
                  disabled={isBulkProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-amber-600 hover:bg-amber-700 rounded disabled:opacity-50 transition-colors"
                >
                  {isBulkProcessing ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                  비활성화 ({selectedActiveCount})
                </button>
              )}
              {selectedInactiveCount > 0 && (
                <button
                  onClick={handleBulkHardDelete}
                  disabled={isBulkProcessing}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-white bg-rose-600 hover:bg-rose-700 rounded disabled:opacity-50 transition-colors"
                >
                  {isBulkProcessing ? <Spinner className="w-3.5 h-3.5 animate-spin" /> : <AlertOctagon className="w-3.5 h-3.5" />}
                  완전 삭제 ({selectedInactiveCount})
                </button>
              )}
              <button
                onClick={() => setSelectedCatIds(new Set())}
                className="ml-auto text-sm text-slate-500 hover:text-slate-700"
              >
                선택 해제
              </button>
            </div>
          )}

          {/* DataTable (selectable) */}
          <DataTable<CategoryData>
            columns={categoryColumns}
            data={filteredCategories}
            rowKey="id"
            loading={isCatsLoading}
            emptyMessage={catStatusFilter !== 'all' ? '조건에 맞는 포럼이 없습니다' : '승인된 포럼이 여기에 표시됩니다'}
            tableId="kpa-forum-categories"
            selectable
            selectedKeys={selectedCatIds}
            onSelectionChange={setSelectedCatIds}
          />

          {/* 목록 하단 요약 */}
          <div className="flex items-center justify-between text-sm text-slate-500">
            <span>총 {filteredCategories.length}개 포럼</span>
            <span>
              활성 {categories.filter((c) => c.isActive).length} /
              비활성 {categories.filter((c) => !c.isActive).length}
            </span>
          </div>
        </>
      )}

      {/* ── 비활성화 확인 모달 (WO-KPA-A-OPERATOR-FORUM-DIRECT-SOFT-DELETE-V1) ── */}
      {deactivateTarget && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => { setDeactivateTarget(null); setDeactivateReason(''); }} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-800">포럼 비활성화</h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-800">{deactivateTarget.name}</p>
                {deactivateTarget.creatorName && (
                  <p className="text-sm text-slate-500 mt-0.5">개설자: {deactivateTarget.creatorName}</p>
                )}
              </div>

              <div className="space-y-1.5 text-sm text-slate-600">
                <p>• 비활성화 후 일반 사용자에게 노출되지 않습니다.</p>
                <p>• 기존 게시글/댓글 데이터는 삭제되지 않습니다.</p>
                <p>• 이 작업은 soft delete(비활성화)입니다.</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  비활성화 사유 <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={deactivateReason}
                  onChange={(e) => setDeactivateReason(e.target.value)}
                  placeholder="예: 테스트 포럼 정리, 중복 포럼 제거 등"
                  rows={3}
                  className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-red-400 resize-none text-sm"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => { setDeactivateTarget(null); setDeactivateReason(''); }}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDirectDeactivate}
                disabled={!deactivateReason.trim() || isDeactivating}
                className="px-6 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
              >
                {isDeactivating ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-4 h-4" />
                )}
                비활성화
              </button>
            </div>
          </div>
        </>
      )}
      {/* ── 태그 수정 모달 (WO-FORUM-TAG-POLICY-ALIGNMENT-PHASE2-V1) ── */}
      {tagEditTarget && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40" onClick={() => setTagEditTarget(null)} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">태그 수정</h2>
              <p className="text-sm text-slate-500 mt-0.5">{tagEditTarget.name}</p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">태그</label>
                <div className="flex flex-wrap gap-2 items-center px-3 py-2 rounded-lg border border-slate-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent bg-white min-h-[44px]">
                  {tagEditTags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-medium"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeEditTag(tag)}
                        className="ml-0.5 hover:text-blue-900 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                  <input
                    type="text"
                    value={tagEditInput}
                    onChange={(e) => setTagEditInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        addEditTag(tagEditInput);
                      }
                    }}
                    onBlur={() => { if (tagEditInput.trim()) addEditTag(tagEditInput); }}
                    placeholder={tagEditTags.length === 0 ? '태그 입력 (Enter/쉼표)' : ''}
                    className="flex-1 min-w-[120px] py-1 text-sm outline-none bg-transparent"
                  />
                </div>
                <p className="text-xs text-slate-400 mt-1.5">Enter 또는 쉼표로 태그를 추가합니다. 30자 이내.</p>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => setTagEditTarget(null)}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleTagEditSave}
                disabled={isTagSaving}
                className="px-6 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
              >
                {isTagSaving ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                저장
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── Hard Delete 모달 (WO-KPA-A-OPERATOR-FORUM-HARD-DELETE-SAFE-GUARD-V1) ── */}
      {hardDeleteTarget && (
        <>
          <div className="fixed inset-0 bg-black/60 z-40" onClick={() => { setHardDeleteTarget(null); setHardDeleteCheck(null); }} />
          <div className="fixed inset-4 md:inset-auto md:top-1/2 md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:w-full md:max-w-md bg-white rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="px-6 py-4 border-b border-rose-200 bg-rose-50 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
                <AlertOctagon className="w-5 h-5 text-rose-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-rose-900">영구 삭제</h2>
                <p className="text-xs text-rose-600">이 작업은 복구할 수 없습니다</p>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-medium text-slate-800">{hardDeleteTarget.name}</p>
                {hardDeleteTarget.creatorName && (
                  <p className="text-sm text-slate-500 mt-0.5">개설자: {hardDeleteTarget.creatorName}</p>
                )}
              </div>

              {isCheckLoading && (
                <div className="flex items-center justify-center py-4 gap-2 text-slate-500">
                  <Spinner className="w-5 h-5 animate-spin" />
                  <span className="text-sm">삭제 가능 여부 확인 중...</span>
                </div>
              )}

              {hardDeleteCheck && (
                <>
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div className="p-3 rounded-lg bg-slate-50 text-center">
                      <p className="text-2xl font-bold text-slate-800">{hardDeleteCheck.postCount}</p>
                      <p className="text-slate-500 mt-0.5">게시글</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 text-center">
                      <p className="text-2xl font-bold text-slate-800">{hardDeleteCheck.generalMemberCount ?? 0}</p>
                      <p className="text-slate-500 mt-0.5">일반 멤버</p>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 text-center">
                      <p className="text-2xl font-bold text-slate-800">{hardDeleteCheck.ownerCount ?? 0}</p>
                      <p className="text-slate-500 mt-0.5">개설자</p>
                    </div>
                  </div>

                  {hardDeleteCheck.hardDeleteAllowed ? (
                    <>
                      {hardDeleteCheck.warnings?.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                          {hardDeleteCheck.warnings.map((w, i) => (
                            <p key={i} className="text-sm text-amber-700">&#9888; {w}</p>
                          ))}
                        </div>
                      )}
                      <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">
                        운영자 권한으로 영구 삭제가 가능합니다.
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">
                          삭제 사유 <span className="text-red-500">*</span>
                        </label>
                        <textarea
                          value={hardDeleteReason}
                          onChange={(e) => setHardDeleteReason(e.target.value)}
                          placeholder="예: 테스트 포럼 영구 정리, 오등록 포럼 제거 등"
                          rows={3}
                          className="w-full px-4 py-3 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none text-sm"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg space-y-1.5">
                        <p className="text-sm font-medium text-rose-700">영구 삭제 불가</p>
                        {hardDeleteCheck.blockedReasons.map((r: string, i: number) => (
                          <p key={i} className="text-sm text-rose-600">&#8226; {r}</p>
                        ))}
                        <p className="text-xs text-rose-500 mt-2">정상 게시글을 먼저 삭제한 뒤 다시 시도하세요.</p>
                      </div>
                      {(hardDeleteCheck.orphanPostCount ?? 0) > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-xs text-amber-700">&#8226; 고아 게시글 {hardDeleteCheck.orphanPostCount}건 감지 (작성자 계정 없음) — 정상 게시글 정리 후 재시도 시 자동 처리됩니다</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="px-6 py-4 border-t border-slate-200 flex gap-3">
              <button
                onClick={() => { setHardDeleteTarget(null); setHardDeleteCheck(null); setHardDeleteReason(''); }}
                className="flex-1 px-4 py-2 text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
              >
                취소
              </button>
              {hardDeleteCheck?.hardDeleteAllowed && (
                <button
                  onClick={handleHardDelete}
                  disabled={!hardDeleteReason.trim() || isHardDeleting}
                  className="px-6 py-2 text-white bg-rose-600 rounded-lg hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-colors"
                >
                  {isHardDeleting ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <AlertOctagon className="w-4 h-4" />
                  )}
                  영구 삭제
                </button>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
