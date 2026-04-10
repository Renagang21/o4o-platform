/**
 * Operator Signage Category Management Page — KPA Society
 * WO-O4O-SIGNAGE-REGISTRATION-AND-CATEGORY-REFINE-V1 Phase 4
 *
 * Operators can create, reorder, and deactivate signage categories.
 * No hard delete — isActive=false hides from community dropdowns.
 * API: /api/signage/kpa-society/categories (requireSignageOperator)
 */

import { useState, useEffect, useCallback } from 'react';
import { getAccessToken } from '../../../contexts/AuthContext';
import { Tag, Plus, Eye, EyeOff, RefreshCw, GripVertical } from 'lucide-react';

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
    } catch (e) {
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

      {/* Loading */}
      {isLoading ? (
        <div className="text-center py-12 text-slate-400 text-sm">불러오는 중...</div>
      ) : categories.length === 0 ? (
        <div className="text-center py-12 text-slate-400 text-sm">등록된 카테고리가 없습니다.</div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-600 w-8">
                  <GripVertical className="w-4 h-4 text-slate-400" />
                </th>
                <th className="text-left px-4 py-3 font-medium text-slate-600">카테고리명</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 w-24">정렬</th>
                <th className="text-center px-4 py-3 font-medium text-slate-600 w-20">상태</th>
                <th className="text-right px-4 py-3 font-medium text-slate-600 w-20">관리</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((cat) => (
                <tr
                  key={cat.id}
                  className={`border-b border-slate-100 last:border-0 ${
                    !cat.isActive ? 'opacity-50' : ''
                  }`}
                >
                  <td className="px-4 py-3 text-slate-400">
                    <GripVertical className="w-4 h-4" />
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{cat.name}</td>
                  <td className="px-4 py-3 text-center">
                    <input
                      type="number"
                      defaultValue={cat.sortOrder}
                      onBlur={(e) => handleUpdateSortOrder(cat, parseInt(e.target.value))}
                      disabled={isSaving === cat.id}
                      className="w-16 px-2 py-1 text-center text-sm border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-blue-400 disabled:opacity-50"
                    />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        cat.isActive
                          ? 'bg-green-100 text-green-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {cat.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => handleToggleActive(cat)}
                      disabled={isSaving === cat.id}
                      title={cat.isActive ? '비활성화' : '활성화'}
                      className="p-1.5 text-slate-400 hover:text-slate-700 rounded disabled:opacity-50"
                    >
                      {cat.isActive ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-slate-400">
        * 비활성화된 카테고리는 커뮤니티 등록 드롭다운에서 숨겨집니다. 삭제는 지원하지 않습니다.
      </p>
    </div>
  );
}
