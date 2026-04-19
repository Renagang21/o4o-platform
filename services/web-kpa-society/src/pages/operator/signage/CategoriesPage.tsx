/**
 * Operator Signage Category Management Page — KPA Society
 * WO-O4O-SIGNAGE-REGISTRATION-AND-CATEGORY-REFINE-V1 Phase 4
 * WO-O4O-TABLE-STANDARD-V2 — DataTable 표준 전환
 *
 * Operators can create, reorder, and deactivate signage categories.
 * No hard delete — isActive=false hides from community dropdowns.
 * API: /api/signage/kpa-society/categories (requireSignageOperator)
 */

import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../../../contexts/AuthContext';
import { Tag, Plus, RefreshCw } from 'lucide-react';
import { EditableNumberCell, ToggleCell } from '@o4o/ui';
import { DataTable } from '@o4o/operator-ux-core';
import type { ListColumnDef } from '@o4o/operator-ux-core';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';
const SERVICE_KEY = 'kpa-society';
const CATEGORIES_URL = `${API_BASE}/api/signage/${SERVICE_KEY}/categories`;

interface Category {
  id: string;
  serviceKey: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
}

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<string | null>(null);

  // Create form
  const [showForm, setShowForm] = useState(false);
  const [formName, setFormName] = useState('');
  const [formSortOrder, setFormSortOrder] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(CATEGORIES_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const list: Category[] = (json.data || json).sort(
        (a: Category, b: Category) => a.sortOrder - b.sortOrder
      );
      setCategories(list);
    } catch {
      setError('카테고리 목록을 불러오지 못했습니다.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) return;
    setIsCreating(true);
    setCreateError(null);
    try {
      const token = getAccessToken();
      const res = await fetch(CATEGORIES_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formName.trim(),
          sortOrder: formSortOrder ? parseInt(formSortOrder) : undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${res.status}`);
      }
      setFormName('');
      setFormSortOrder('');
      setShowForm(false);
      await load();
    } catch (e: any) {
      setCreateError(e.message || '카테고리 생성에 실패했습니다.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleToggleActive = async (cat: Category) => {
    setIsSaving(cat.id);
    try {
      const token = getAccessToken();
      const res = await fetch(`${CATEGORIES_URL}/${cat.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !cat.isActive }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCategories((prev) =>
        prev.map((c) => (c.id === cat.id ? { ...c, isActive: !cat.isActive } : c))
      );
    } catch {
      alert('상태 변경에 실패했습니다.');
    } finally {
      setIsSaving(null);
    }
  };

  const handleUpdateSortOrder = async (cat: Category, newOrder: number) => {
    if (isNaN(newOrder)) return;
    setIsSaving(cat.id);
    try {
      const token = getAccessToken();
      const res = await fetch(`${CATEGORIES_URL}/${cat.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ sortOrder: newOrder }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setCategories((prev) =>
        prev
          .map((c) => (c.id === cat.id ? { ...c, sortOrder: newOrder } : c))
          .sort((a, b) => a.sortOrder - b.sortOrder)
      );
    } catch {
      alert('순서 변경에 실패했습니다.');
    } finally {
      setIsSaving(null);
    }
  };

  // ─── Column Definitions ───

  const columns: ListColumnDef<Category>[] = [
    {
      key: 'name',
      header: '카테고리명',
      render: (_v, row) => (
        <span className={`font-medium ${row.isActive ? 'text-slate-800' : 'text-slate-400'}`}>
          {row.name}
        </span>
      ),
    },
    {
      key: 'sortOrder',
      header: '정렬',
      align: 'center',
      width: '100px',
      sortable: true,
      sortAccessor: (row) => row.sortOrder,
      render: (_v, row) => (
        <EditableNumberCell
          value={row.sortOrder}
          min={0}
          onSave={async (newOrder) => {
            await handleUpdateSortOrder(row, newOrder);
          }}
        />
      ),
    },
    {
      key: 'isActive',
      header: '상태',
      align: 'center',
      width: '100px',
      render: (_v, row) => (
        <ToggleCell
          value={row.isActive}
          onChange={async () => {
            await handleToggleActive(row);
          }}
          labelOn="활성"
          labelOff="비활성"
          disabled={isSaving === row.id}
        />
      ),
    },
  ];

  return (
    <div className="p-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Tag className="w-5 h-5 text-blue-600" />
          <h1 className="text-xl font-semibold text-slate-900">사이니지 카테고리 관리</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
          >
            <RefreshCw className="w-3.5 h-3.5" /> 새로고침
          </button>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-3.5 h-3.5" /> 카테고리 추가
          </button>
        </div>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl space-y-3"
        >
          <h2 className="text-sm font-medium text-blue-900">새 카테고리</h2>
          <div className="flex gap-3">
            <div className="flex-1">
              <label className="block text-xs text-slate-600 mb-1">이름 *</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="예: 건강정보"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div className="w-28">
              <label className="block text-xs text-slate-600 mb-1">정렬 순서</label>
              <input
                type="number"
                value={formSortOrder}
                onChange={(e) => setFormSortOrder(e.target.value)}
                placeholder="예: 10"
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          {createError && <p className="text-xs text-red-600">{createError}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => { setShowForm(false); setCreateError(null); }}
              className="px-3 py-1.5 text-sm text-slate-600 border border-slate-300 rounded-lg hover:bg-slate-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isCreating || !formName.trim()}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isCreating ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      )}

      {/* Error */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* DataTable */}
      <DataTable<Category>
        columns={columns}
        data={categories}
        rowKey="id"
        loading={isLoading}
        emptyMessage="등록된 카테고리가 없습니다."
        tableId="kpa-signage-categories"
      />

      <p className="mt-4 text-xs text-slate-400">
        * 비활성화된 카테고리는 커뮤니티 등록 드롭다운에서 숨겨집니다. 삭제는 지원하지 않습니다.
      </p>
    </div>
  );
}
