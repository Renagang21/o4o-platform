/**
 * CategoryManagementPage — 운영자 카테고리 관리
 * WO-NETURE-CATEGORY-MANAGEMENT-V1
 *
 * 카테고리 트리 CRUD (생성/수정/삭제)
 * isRegulated 토글 — 건강기능식품 등 규제 카테고리 구분
 */

import { useState, useEffect, useCallback } from 'react';
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, X, Loader2, Shield } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { operatorCategoryApi, type CategoryNode } from '../../lib/api/operatorCategory';

interface FormData {
  name: string;
  parentId: string | null;
  isRegulated: boolean;
}

const emptyForm: FormData = { name: '', parentId: null, isRegulated: false };

/** 트리를 flat 리스트로 변환 (indent 레벨 포함) */
function flattenTree(nodes: CategoryNode[], level = 0): { node: CategoryNode; level: number }[] {
  const result: { node: CategoryNode; level: number }[] = [];
  for (const n of nodes) {
    result.push({ node: n, level });
    if (n.children?.length) {
      result.push(...flattenTree(n.children, level + 1));
    }
  }
  return result;
}

/** 부모 선택용 flat 리스트 (depth < 3 만) */
function getParentOptions(nodes: CategoryNode[], level = 0): { id: string; name: string; level: number }[] {
  const result: { id: string; name: string; level: number }[] = [];
  for (const n of nodes) {
    if (n.depth < 3) {
      result.push({ id: n.id, name: n.name, level });
    }
    if (n.children?.length) {
      result.push(...getParentOptions(n.children, level + 1));
    }
  }
  return result;
}

export default function CategoryManagementPage() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const loadCategories = useCallback(async () => {
    setLoading(true);
    const data = await operatorCategoryApi.getCategories();
    setTree(data);
    // 기본: 루트 카테고리 전부 펼침
    const rootIds = new Set(data.map(n => n.id));
    setExpanded(rootIds);
    setLoading(false);
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const openCreate = (parentId: string | null = null) => {
    setEditId(null);
    setForm({ ...emptyForm, parentId });
    setShowModal(true);
  };

  const openEdit = (node: CategoryNode) => {
    setEditId(node.id);
    setForm({ name: node.name, parentId: node.parentId, isRegulated: node.isRegulated });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast.error('카테고리 이름을 입력하세요');
      return;
    }
    setSaving(true);
    try {
      if (editId) {
        const res = await operatorCategoryApi.updateCategory(editId, {
          name: form.name.trim(),
          isRegulated: form.isRegulated,
        });
        if (!res.success) throw new Error(res.error);
        toast.success('카테고리가 수정되었습니다');
      } else {
        const res = await operatorCategoryApi.createCategory({
          name: form.name.trim(),
          parentId: form.parentId,
          isRegulated: form.isRegulated,
        });
        if (!res.success) throw new Error(res.error);
        toast.success('카테고리가 생성되었습니다');
      }
      setShowModal(false);
      loadCategories();
    } catch (err: any) {
      const msg = err?.message || '저장 실패';
      toast.error(msg === 'MAX_CATEGORY_DEPTH_EXCEEDED' ? '최대 4단계까지만 가능합니다' : msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" 카테고리를 삭제하시겠습니까?`)) return;
    const res = await operatorCategoryApi.deleteCategory(id);
    if (res.success) {
      toast.success('삭제되었습니다');
      loadCategories();
    } else {
      toast.error(res.error || '삭제 실패');
    }
  };

  const handleToggleRegulated = async (node: CategoryNode) => {
    const res = await operatorCategoryApi.updateCategory(node.id, {
      isRegulated: !node.isRegulated,
    });
    if (res.success) {
      toast.success(`규제 설정이 ${!node.isRegulated ? '활성화' : '비활성화'}되었습니다`);
      loadCategories();
    } else {
      toast.error('변경 실패');
    }
  };

  const flat = flattenTree(tree);
  const parentOptions = getParentOptions(tree);

  // 펼침 상태 기준으로 보이는 행만 필터
  const visibleRows = flat.filter(({ node, level }) => {
    if (level === 0) return true;
    // 부모 체인이 모두 expanded 인지 확인
    let current = node;
    // flat 에서 부모 찾기
    const findParent = (pid: string | null) => flat.find(f => f.node.id === pid);
    let parent = findParent(current.parentId);
    while (parent) {
      if (!expanded.has(parent.node.id)) return false;
      parent = findParent(parent.node.parentId);
    }
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">카테고리 관리</h1>
        <button
          onClick={() => openCreate(null)}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
        >
          <Plus className="w-4 h-4" />
          루트 카테고리 추가
        </button>
      </div>

      {/* Tree Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-medium text-slate-600">카테고리</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-24">규제</th>
              <th className="px-4 py-3 text-center text-sm font-medium text-slate-600 w-20">상태</th>
              <th className="px-4 py-3 text-right text-sm font-medium text-slate-600 w-36">작업</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {visibleRows.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                  카테고리가 없습니다. 위의 버튼을 눌러 추가하세요.
                </td>
              </tr>
            )}
            {visibleRows.map(({ node, level }) => {
              const hasChildren = node.children?.length > 0;
              const isExpanded = expanded.has(node.id);

              return (
                <tr key={node.id} className="hover:bg-slate-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center" style={{ paddingLeft: `${level * 24}px` }}>
                      {hasChildren ? (
                        <button
                          onClick={() => toggleExpand(node.id)}
                          className="p-0.5 mr-1 text-slate-400 hover:text-slate-600"
                        >
                          {isExpanded
                            ? <ChevronDown className="w-4 h-4" />
                            : <ChevronRight className="w-4 h-4" />}
                        </button>
                      ) : (
                        <span className="w-5 mr-1" />
                      )}
                      <span className={`text-sm font-medium ${node.isActive ? 'text-slate-800' : 'text-slate-400 line-through'}`}>
                        {node.name}
                      </span>
                      {node.depth === 0 && (
                        <span className="ml-2 text-xs text-slate-400">depth {node.depth}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <button
                      onClick={() => handleToggleRegulated(node)}
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                        node.isRegulated
                          ? 'bg-red-100 text-red-700 hover:bg-red-200'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                      title={node.isRegulated ? '규제 카테고리 (클릭하여 해제)' : '일반 카테고리 (클릭하여 규제 설정)'}
                    >
                      <Shield className="w-3 h-3" />
                      {node.isRegulated ? '규제' : '일반'}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`text-xs font-medium ${node.isActive ? 'text-green-600' : 'text-slate-400'}`}>
                      {node.isActive ? '활성' : '비활성'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {node.depth < 3 && (
                        <button
                          onClick={() => openCreate(node.id)}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded"
                          title="하위 카테고리 추가"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => openEdit(node)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded"
                        title="수정"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(node.id, node.name)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded"
                        title="삭제"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
              <h2 className="text-lg font-semibold text-slate-800">
                {editId ? '카테고리 수정' : '카테고리 생성'}
              </h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">카테고리 이름 *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="예: 건강기능식품"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  autoFocus
                />
              </div>

              {/* Parent (생성 시만) */}
              {!editId && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">상위 카테고리</label>
                  <select
                    value={form.parentId || ''}
                    onChange={e => setForm(f => ({ ...f, parentId: e.target.value || null }))}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">없음 (루트)</option>
                    {parentOptions.map(p => (
                      <option key={p.id} value={p.id}>
                        {'─'.repeat(p.level)} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* isRegulated */}
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isRegulated}
                  onChange={e => setForm(f => ({ ...f, isRegulated: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <div>
                  <span className="text-sm font-medium text-slate-700">규제 카테고리</span>
                  <p className="text-xs text-slate-500">건강기능식품 등 MFDS 필드 필수 카테고리</p>
                </div>
              </label>
            </div>
            <div className="flex gap-3 px-6 py-4 border-t border-slate-200">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 px-4 py-2 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                취소
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
              >
                {saving ? '저장 중...' : editId ? '수정' : '생성'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
