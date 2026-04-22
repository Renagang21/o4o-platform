/**
 * Signage Templates Page — Signage Console (KPA Society)
 * WO-O4O-SIGNAGE-CONSOLE-V1
 * WO-KPA-SOCIETY-DIGITAL-SIGNAGE-TEMPLATE-CRUD-UI-V1: CRUD 확장
 * WO-O4O-OPERATOR-LIST-TABLE-STANDARD-V2: O4O 표준 테이블 전환
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LayoutTemplate, RefreshCw, Plus, Trash2, Eye } from 'lucide-react';
import { ActionBar, BulkResultModal, RowActionMenu } from '@o4o/ui';
import { DataTable, useBatchAction, defineActionPolicy, buildRowActions } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';
import {
  fetchTemplates as apiFetchTemplates,
  createTemplate,
  deleteTemplate,
  type SignageTemplateItem,
  type CreateTemplatePayload,
} from '../../../api/signageTemplate';

const statusConfig: Record<string, { text: string; cls: string }> = {
  draft: { text: '초안', cls: 'bg-slate-100 text-slate-600' },
  active: { text: '활성', cls: 'bg-green-100 text-green-700' },
  inactive: { text: '비활성', cls: 'bg-amber-100 text-amber-600' },
};

const templateActionPolicy = defineActionPolicy<SignageTemplateItem>('kpa:signage:templates', {
  rules: [
    {
      key: 'view',
      label: '상세 보기',
    },
    {
      key: 'delete',
      label: '삭제',
      variant: 'danger',
      divider: true,
      confirm: (row) => ({
        title: '템플릿 삭제',
        message: `"${row.name}" 템플릿을 삭제하시겠습니까?`,
        variant: 'danger' as const,
        confirmText: '삭제',
      }),
    },
  ],
});

const TEMPLATE_ACTION_ICONS: Record<string, React.ReactNode> = {
  view: <Eye className="w-4 h-4" />,
  delete: <Trash2 className="w-4 h-4" />,
};

export default function TemplatesPage() {
  const navigate = useNavigate();

  const [templates, setTemplates] = useState<SignageTemplateItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const batch = useBatchAction();

  // Create form state
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formWidth, setFormWidth] = useState('1920');
  const [formHeight, setFormHeight] = useState('1080');
  const [formOrientation, setFormOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [formCategory, setFormCategory] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'active'>('draft');
  const [formIsPublic, setFormIsPublic] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  const loadTemplates = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiFetchTemplates();
      setTemplates(res.items);
    } catch (err: any) {
      setError(err?.message || '템플릿을 불러올 수 없습니다');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const handleCreate = async () => {
    const w = Number(formWidth);
    const h = Number(formHeight);
    if (!formName.trim() || w <= 0 || h <= 0) return;
    setIsCreating(true);
    setError(null);
    try {
      const payload: CreateTemplatePayload = {
        name: formName.trim(),
        layoutConfig: { width: w, height: h, orientation: formOrientation },
        status: formStatus,
        isPublic: formIsPublic,
      };
      if (formDescription.trim()) payload.description = formDescription.trim();
      if (formCategory.trim()) payload.category = formCategory.trim();
      await createTemplate(payload);
      setFormName(''); setFormDescription(''); setFormWidth('1920'); setFormHeight('1080');
      setFormOrientation('landscape'); setFormCategory(''); setFormStatus('draft'); setFormIsPublic(false);
      setShowForm(false);
      loadTemplates();
    } catch (err: any) {
      setError(err?.message || '템플릿 생성에 실패했습니다');
    } finally {
      setIsCreating(false);
    }
  };

  const deleteOne = useCallback(async (id: string) => {
    await deleteTemplate(id);
  }, []);

  const handleBulkDelete = async () => {
    const targetIds = [...selectedIds];
    await batch.executeBatch(
      async (ids) => {
        const results: Array<{ id: string; status: 'success' | 'failed'; error?: string }> = [];
        for (const id of ids) {
          try {
            await deleteOne(id);
            results.push({ id, status: 'success' });
          } catch (err: any) {
            results.push({ id, status: 'failed', error: err?.message || '삭제 실패' });
          }
        }
        return { data: { results } };
      },
      targetIds,
    );
    setSelectedIds(new Set());
    loadTemplates();
  };

  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' }); }
    catch { return '-'; }
  };

  const stats = {
    total: templates.length,
    active: templates.filter(t => t.status === 'active').length,
    draft: templates.filter(t => t.status === 'draft').length,
    inactive: templates.filter(t => t.status === 'inactive').length,
  };

  const columns: ListColumnDef<SignageTemplateItem>[] = [
    {
      key: 'name',
      header: '이름',
      render: (value, row) => (
        <div>
          <p className="font-medium text-slate-800 text-sm">{value}</p>
          {row.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{row.description}</p>}
        </div>
      ),
    },
    {
      key: 'category',
      header: '카테고리',
      render: (value) => <span className="text-sm text-slate-600">{value || '-'}</span>,
    },
    {
      key: 'isPublic',
      header: '공개',
      align: 'center',
      render: (value) => <span className="text-sm">{value ? 'O' : '-'}</span>,
    },
    {
      key: 'isSystem',
      header: '시스템',
      align: 'center',
      render: (value) => <span className="text-sm">{value ? 'O' : '-'}</span>,
    },
    {
      key: 'status',
      header: '상태',
      align: 'center',
      render: (value) => {
        const sc = statusConfig[value] || { text: value, cls: 'bg-slate-100 text-slate-600' };
        return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${sc.cls}`}>{sc.text}</span>;
      },
    },
    {
      key: 'createdAt',
      header: '생성일',
      render: (value) => <span className="text-sm text-slate-500">{formatDate(value)}</span>,
    },
    {
      key: '_actions',
      header: '액션',
      align: 'center',
      width: '60px',
      system: true,
      onCellClick: () => {},
      render: (_v, row) => (
        <RowActionMenu
          actions={buildRowActions(templateActionPolicy, row, {
            view: () => navigate(`/operator/signage/templates/${row.id}`),
            delete: () => deleteOne(row.id).then(loadTemplates).catch((err: any) => setError(err?.message || '삭제 실패')),
          }, { icons: TEMPLATE_ACTION_ICONS })}
        />
      ),
    },
  ];

  const bulkActions = [
    {
      key: 'delete',
      label: `삭제 (${selectedIds.size})`,
      onClick: handleBulkDelete,
      variant: 'danger' as const,
      icon: <Trash2 size={14} />,
      loading: batch.loading,
      group: 'danger',
      tooltip: '선택된 템플릿을 일괄 삭제합니다',
      visible: selectedIds.size > 0,
      confirm: {
        title: '일괄 삭제 확인',
        message: `${selectedIds.size}개의 템플릿을 삭제합니다. 이 작업은 되돌릴 수 없습니다.`,
        variant: 'danger' as const,
        confirmText: '삭제',
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-blue-600" /> 사이니지 템플릿
          </h1>
          <p className="text-slate-500 text-sm mt-1">디스플레이 레이아웃 템플릿</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" /> 새 템플릿
          </button>
          <button onClick={loadTemplates} disabled={isLoading} className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} /> 새로고침
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-800">{error}</div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: '전체', value: stats.total, color: 'text-slate-800' },
          { label: '활성', value: stats.active, color: 'text-green-600' },
          { label: '초안', value: stats.draft, color: 'text-slate-500' },
          { label: '비활성', value: stats.inactive, color: 'text-amber-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-4 border border-blue-100">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-blue-100 p-6">
          <h2 className="text-lg font-semibold text-slate-800 mb-4">새 템플릿</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">이름 *</label>
              <input type="text" value={formName} onChange={e => setFormName(e.target.value)} placeholder="템플릿 이름" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" autoFocus />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">설명</label>
              <input type="text" value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="템플릿 설명" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">너비 (px) *</label>
              <input type="number" value={formWidth} onChange={e => setFormWidth(e.target.value)} min={1} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">높이 (px) *</label>
              <input type="number" value={formHeight} onChange={e => setFormHeight(e.target.value)} min={1} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">방향</label>
              <select value={formOrientation} onChange={e => setFormOrientation(e.target.value as 'landscape' | 'portrait')} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="landscape">가로 (Landscape)</option>
                <option value="portrait">세로 (Portrait)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">카테고리</label>
              <input type="text" value={formCategory} onChange={e => setFormCategory(e.target.value)} placeholder="예: pharmacy, retail" className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">상태</label>
              <select value={formStatus} onChange={e => setFormStatus(e.target.value as 'draft' | 'active')} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="draft">초안</option>
                <option value="active">활성</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">공개 여부</label>
              <select value={formIsPublic ? 'true' : 'false'} onChange={e => setFormIsPublic(e.target.value === 'true')} className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="false">비공개</option>
                <option value="true">공개</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-slate-200 rounded-lg text-sm hover:bg-slate-50">취소</button>
            <button onClick={handleCreate} disabled={isCreating || !formName.trim() || Number(formWidth) <= 0 || Number(formHeight) <= 0} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50">
              {isCreating ? '생성 중...' : '생성'}
            </button>
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      <ActionBar
        selectedCount={selectedIds.size}
        onClearSelection={() => setSelectedIds(new Set())}
        actions={bulkActions}
      />

      <BulkResultModal
        open={batch.showResult}
        onClose={() => { batch.clearResult(); loadTemplates(); }}
        result={batch.result}
        onRetry={() => { batch.retryFailed(); }}
      />

      {/* Table */}
      <DataTable<SignageTemplateItem>
        columns={columns}
        data={templates}
        rowKey="id"
        loading={isLoading}
        onRowClick={record => navigate(`/operator/signage/templates/${record.id}`)}
        emptyMessage="템플릿이 없습니다"
        tableId="kpa-signage-templates"
        selectable
        selectedKeys={selectedIds}
        onSelectionChange={setSelectedIds}
      />
    </div>
  );
}
