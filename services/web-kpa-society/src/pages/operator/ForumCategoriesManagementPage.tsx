/**
 * ForumCategoriesManagementPage - 활성 포럼(카테고리) 목록 관리
 *
 * WO-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1:
 *   기존 ForumManagementPage(1449L, 신청+포럼목록 2탭 결합)의 "포럼 목록" 탭을
 *   단독 화면으로 분리. 기능은 그대로 보존 (구조 분해 작업, 기능 변경 아님).
 *   IR-O4O-KPA-FORUM-MANAGEMENT-TAB-DECOMPOSITION-V1 판정 D — KPA 고유 기능으로 별도 유지.
 *   delete-check hard delete 안전 가드 / 활성·비활성 / 태그 수정 등 전부 보존.
 *
 * 원본 WO 계보:
 *   WO-KPA-A-OPERATOR-FORUM-DIRECT-SOFT-DELETE-V1 / WO-KPA-A-OPERATOR-FORUM-HARD-DELETE-SAFE-GUARD-V1
 *   WO-FORUM-TAG-POLICY-ALIGNMENT-PHASE2-V1 / WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1
 *
 * 공통 /api/v1/forum/operator/* API 사용 (forumOperatorApi)
 */

import { useState, useEffect, useMemo } from 'react';
import {
  Search,
  CheckCircle,
  ChevronDown,
  Trash2,
  AlertTriangle,
  List,
  AlertOctagon,
  Loader2 as Spinner,
  X,
  Pencil,
} from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { RowActionMenu, ActionBar, BulkResultModal, BaseDetailDrawer } from '@o4o/ui';
import { DataTable, defineActionPolicy, buildRowActions, useBatchAction } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import { forumOperatorApi } from '../../api/forum';

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

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ─── Action Policy ───

const forumCategoryPolicy = defineActionPolicy<CategoryData>('kpa:forum:categories', {
  rules: [
    {
      key: 'editTags',
      label: '태그 수정',
    },
    {
      key: 'activate',
      label: '활성화',
      visible: (row) => !row.isActive,
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
  activate: <CheckCircle className="w-4 h-4" />,
  deactivate: <Trash2 className="w-4 h-4" />,
  hardDelete: <AlertOctagon className="w-4 h-4" />,
};

// ─── Component ───

export default function ForumCategoriesManagementPage() {
  // ── Active forum categories state (WO-KPA-A-OPERATOR-FORUM-DIRECT-SOFT-DELETE-V1) ──
  const [categories, setCategories] = useState<CategoryData[]>([]);
  const [isCatsLoading, setIsCatsLoading] = useState(true);
  const [catSearch, setCatSearch] = useState('');
  const [catStatusFilter, setCatStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [deactivateTarget, setDeactivateTarget] = useState<CategoryData | null>(null);
  const [deactivateReason, setDeactivateReason] = useState('');
  const [isDeactivating, setIsDeactivating] = useState(false);

  // ── Selection (DataTable selectable) ──
  const [selectedCatIds, setSelectedCatIds] = useState<Set<string>>(new Set());

  const batch = useBatchAction();

  // ── Category detail drawer ──
  const [selectedCategory, setSelectedCategory] = useState<CategoryData | null>(null);

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
    loadCategories();
  }, []);

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

  const handleActivate = async (cat: CategoryData) => {
    if (!confirm(`'${cat.name}' 포럼을 활성화하시겠습니까?\n활성화하면 사용자에게 다시 노출됩니다.`)) return;
    try {
      const result = await forumOperatorApi.activate(cat.id);
      if (result.success) {
        toast.success(`'${cat.name}' 포럼이 활성화되었습니다`);
        loadCategories();
      } else {
        toast.error(result.error || '활성화 실패');
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.error || '오류가 발생했습니다');
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

  // ── Bulk handlers (WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1) ──

  // 비활성화: 활성 포럼만 대상
  const handleBulkSoftDelete = async () => {
    const targets = filteredCategories.filter((c) => selectedCatIds.has(c.id) && c.isActive);
    if (targets.length === 0) {
      toast.error('비활성화할 수 있는 활성 포럼이 없습니다');
      return;
    }
    const reason = prompt(`선택한 ${targets.length}개 활성 포럼을 비활성화합니다.\n사유를 입력하세요:`);
    if (!reason?.trim()) return;
    const reasonText = reason.trim();
    const targetIds = targets.map((t) => t.id);

    const result = await batch.executeBatch(async (ids) => {
      const settled = await Promise.allSettled(
        ids.map((id) => forumOperatorApi.directDeactivate(id, { reason: reasonText })),
      );
      return {
        data: {
          results: settled.map((r, i) => ({
            id: ids[i],
            status: (r.status === 'fulfilled' && (r.value as any)?.success !== false)
              ? ('success' as const)
              : ('failed' as const),
            error: r.status === 'rejected'
              ? String((r as PromiseRejectedResult).reason?.message ?? r.reason)
              : (r.status === 'fulfilled' && (r.value as any)?.success === false
                  ? ((r.value as any)?.error || '처리 실패')
                  : undefined),
          })),
        },
      };
    }, targetIds);

    if (result.successCount > 0) setSelectedCatIds(new Set());
  };

  // 활성화: 비활성 포럼만 대상
  const handleBulkActivate = async () => {
    const targets = filteredCategories.filter((c) => selectedCatIds.has(c.id) && !c.isActive);
    if (targets.length === 0) {
      toast.error('활성화할 수 있는 비활성 포럼이 없습니다');
      return;
    }
    const targetIds = targets.map((t) => t.id);

    const result = await batch.executeBatch(async (ids) => {
      const settled = await Promise.allSettled(
        ids.map((id) => forumOperatorApi.activate(id)),
      );
      return {
        data: {
          results: settled.map((r, i) => ({
            id: ids[i],
            status: (r.status === 'fulfilled' && (r.value as any)?.success !== false)
              ? ('success' as const)
              : ('failed' as const),
            error: r.status === 'rejected'
              ? String((r as PromiseRejectedResult).reason?.message ?? r.reason)
              : (r.status === 'fulfilled' && (r.value as any)?.success === false
                  ? ((r.value as any)?.error || '처리 실패')
                  : undefined),
          })),
        },
      };
    }, targetIds);

    if (result.successCount > 0) setSelectedCatIds(new Set());
  };

  // 완전 삭제: 비활성 포럼 + delete-check 통과 항목만 success, 차단 항목은 skipped.
  const handleBulkHardDelete = async () => {
    const targets = filteredCategories.filter((c) => selectedCatIds.has(c.id) && !c.isActive);
    if (targets.length === 0) {
      toast.error('완전 삭제할 수 있는 비활성 포럼이 없습니다');
      return;
    }
    const reason = prompt(`선택한 ${targets.length}개 비활성 포럼을 완전 삭제합니다.\n삭제 사유를 입력하세요 (복구 불가):`);
    if (!reason?.trim()) return;
    if (!confirm(`${targets.length}개 포럼을 영구 삭제합니다.\n이 작업은 복구할 수 없습니다. 진행하시겠습니까?`)) return;
    const reasonText = reason.trim();
    const targetIds = targets.map((t) => t.id);

    const result = await batch.executeBatch(async (ids) => {
      // delete-check 후 hard delete — 직렬 처리 유지 (기존 안전 동작 보존).
      const results: Array<{ id: string; status: 'success' | 'failed' | 'skipped'; error?: string }> = [];
      for (const id of ids) {
        try {
          const check = await forumOperatorApi.getDeleteCheck(id);
          if (!check.data?.hardDeleteAllowed) {
            results.push({
              id,
              status: 'skipped',
              error: (check.data?.blockedReasons || ['삭제 불가']).join(', '),
            });
            continue;
          }
          const r = await forumOperatorApi.hardDelete(id, { reason: reasonText });
          results.push({
            id,
            status: r.success ? 'success' : 'failed',
            error: r.success ? undefined : (r.error || '처리 실패'),
          });
        } catch (e: any) {
          results.push({ id, status: 'failed', error: e?.message ?? String(e) });
        }
      }
      return { data: { results } };
    }, targetIds);

    if (result.successCount > 0) setSelectedCatIds(new Set());
  };

  const selectedActiveCount = useMemo(() =>
    filteredCategories.filter((c) => selectedCatIds.has(c.id) && c.isActive).length,
    [filteredCategories, selectedCatIds],
  );
  const selectedInactiveCount = useMemo(() =>
    filteredCategories.filter((c) => selectedCatIds.has(c.id) && !c.isActive).length,
    [filteredCategories, selectedCatIds],
  );

  // ── Column definitions ──
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
            activate: () => handleActivate(row),
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
      {/* WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1: BulkResultModal */}
      <BulkResultModal
        open={batch.showResult}
        onClose={() => {
          batch.clearResult();
          loadCategories();
        }}
        result={batch.result}
        onRetry={() => batch.retryFailed()}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <List className="w-7 h-7 text-blue-600" />
            포럼 목록 관리
          </h1>
          <p className="text-slate-500 mt-1">
            활성 포럼 관리 (활성화 / 비활성화 / 태그 / 완전 삭제)
          </p>
        </div>
      </div>

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

      {/* WO-O4O-KPA-OPERATOR-PARTIAL-CANONICAL-ALIGN-V1: canonical ActionBar */}
      <ActionBar
        selectedCount={selectedCatIds.size}
        onClearSelection={() => setSelectedCatIds(new Set())}
        actions={[
          {
            key: 'soft-delete',
            label: `비활성화 (${selectedActiveCount})`,
            onClick: handleBulkSoftDelete,
            variant: 'warning' as const,
            icon: <Trash2 size={14} />,
            loading: batch.loading,
            visible: selectedActiveCount > 0,
          },
          {
            key: 'activate',
            label: `활성화 (${selectedInactiveCount})`,
            onClick: handleBulkActivate,
            variant: 'primary' as const,
            icon: <CheckCircle size={14} />,
            loading: batch.loading,
            visible: selectedInactiveCount > 0,
          },
          {
            key: 'hard-delete',
            label: `완전 삭제 (${selectedInactiveCount})`,
            onClick: handleBulkHardDelete,
            variant: 'danger' as const,
            icon: <AlertOctagon size={14} />,
            loading: batch.loading,
            visible: selectedInactiveCount > 0,
            group: 'danger',
          },
        ]}
      />

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
        onRowClick={(row) => setSelectedCategory(row)}
      />

      {/* 목록 하단 요약 */}
      <div className="flex items-center justify-between text-sm text-slate-500">
        <span>총 {filteredCategories.length}개 포럼</span>
        <span>
          활성 {categories.filter((c) => c.isActive).length} /
          비활성 {categories.filter((c) => !c.isActive).length}
        </span>
      </div>

      {/* 포럼 카테고리 상세 Drawer */}
      <BaseDetailDrawer
        open={!!selectedCategory}
        onClose={() => setSelectedCategory(null)}
        title={selectedCategory?.name ?? ''}
        width={480}
      >
        {selectedCategory && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              {selectedCategory.isActive
                ? <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-green-100 text-green-700">활성</span>
                : <span className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-500">비활성</span>}
              {selectedCategory.forumType === 'closed'
                ? <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-slate-100 text-slate-600">비공개</span>
                : <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-blue-50 text-blue-600">공개</span>}
            </div>
            {selectedCategory.description && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">설명</p>
                <p className="text-sm text-slate-800">{selectedCategory.description}</p>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">개설자</p>
                <p className="text-slate-800">{selectedCategory.creatorName || '-'}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500 mb-1">게시글</p>
                <p className="text-slate-800">{selectedCategory.postCount}개</p>
              </div>
            </div>
            {selectedCategory.tags && selectedCategory.tags.length > 0 && (
              <div>
                <p className="text-sm font-medium text-slate-500 mb-2">태그</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedCategory.tags.map((tag) => (
                    <span key={tag} className="px-2.5 py-1 text-xs font-medium rounded-full bg-slate-100 text-slate-600">{tag}</span>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-500 mb-1">생성일</p>
              <p className="text-sm text-slate-800">{formatDate(selectedCategory.createdAt)}</p>
            </div>
          </div>
        )}
      </BaseDetailDrawer>

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

              {deactivateTarget.postCount > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
                  이 포럼에는 <strong>{deactivateTarget.postCount}개</strong>의 게시글이 있습니다.
                </div>
              )}

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
