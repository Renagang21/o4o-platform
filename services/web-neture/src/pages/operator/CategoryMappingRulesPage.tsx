/**
 * CategoryMappingRulesPage — 카테고리 자동 매핑 규칙 관리
 * WO-NETURE-CATEGORY-MAPPING-RULE-SYSTEM-V1
 *
 * 키워드 → 카테고리 매핑 규칙 CRUD + 테스트
 */

import { useState, useEffect, useCallback } from 'react';
import { toast } from '@o4o/error-handling';
import {
  operatorCategoryMappingApi,
  type CategoryMappingRule,
  type CategorySuggestion,
} from '../../lib/api/operatorCategoryMapping';
import { operatorCategoryApi, type CategoryNode } from '../../lib/api/operatorCategory';

// ─── 카테고리 트리를 flat list로 변환 ────────────────────────────────────────
function flattenCategories(nodes: CategoryNode[], prefix = ''): { id: string; label: string }[] {
  const result: { id: string; label: string }[] = [];
  for (const n of nodes) {
    const label = prefix ? `${prefix} > ${n.name}` : n.name;
    result.push({ id: n.id, label });
    if (n.children?.length) {
      result.push(...flattenCategories(n.children, label));
    }
  }
  return result;
}

export default function CategoryMappingRulesPage() {
  const [rules, setRules] = useState<CategoryMappingRule[]>([]);
  const [categories, setCategories] = useState<{ id: string; label: string }[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form
  const [newKeyword, setNewKeyword] = useState('');
  const [newCategoryId, setNewCategoryId] = useState('');
  const [newPriority, setNewPriority] = useState(5);
  const [creating, setCreating] = useState(false);

  // Edit state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editKeyword, setEditKeyword] = useState('');
  const [editCategoryId, setEditCategoryId] = useState('');
  const [editPriority, setEditPriority] = useState(5);

  // Test
  const [testName, setTestName] = useState('');
  const [testResult, setTestResult] = useState<CategorySuggestion | null>(null);
  const [testing, setTesting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    const [rulesData, catTree] = await Promise.all([
      operatorCategoryMappingApi.listRules(),
      operatorCategoryApi.getCategories(),
    ]);
    setRules(rulesData);
    setCategories(flattenCategories(catTree));
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ─── Create ──────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    if (!newKeyword.trim() || !newCategoryId) {
      toast.error('키워드와 카테고리를 입력해주세요');
      return;
    }
    setCreating(true);
    const res = await operatorCategoryMappingApi.createRule({
      keyword: newKeyword.trim(),
      categoryId: newCategoryId,
      priority: newPriority,
    });
    setCreating(false);
    if (res.success) {
      toast.success(`"${newKeyword}" 규칙 추가됨`);
      setNewKeyword('');
      setNewCategoryId('');
      setNewPriority(5);
      loadData();
    } else {
      toast.error(res.error || '추가 실패');
    }
  };

  // ─── Edit ────────────────────────────────────────────────────────────────
  const startEdit = (rule: CategoryMappingRule) => {
    setEditingId(rule.id);
    setEditKeyword(rule.keyword);
    setEditCategoryId(rule.categoryId);
    setEditPriority(rule.priority);
  };

  const cancelEdit = () => setEditingId(null);

  const saveEdit = async () => {
    if (!editingId) return;
    const res = await operatorCategoryMappingApi.updateRule(editingId, {
      keyword: editKeyword.trim(),
      categoryId: editCategoryId,
      priority: editPriority,
    });
    if (res.success) {
      toast.success('수정됨');
      setEditingId(null);
      loadData();
    } else {
      toast.error(res.error || '수정 실패');
    }
  };

  // ─── Toggle active ───────────────────────────────────────────────────────
  const toggleActive = async (rule: CategoryMappingRule) => {
    const res = await operatorCategoryMappingApi.updateRule(rule.id, { isActive: !rule.isActive });
    if (res.success) loadData();
  };

  // ─── Delete ──────────────────────────────────────────────────────────────
  const handleDelete = async (rule: CategoryMappingRule) => {
    if (!confirm(`"${rule.keyword}" 규칙을 삭제하시겠습니까?`)) return;
    const res = await operatorCategoryMappingApi.deleteRule(rule.id);
    if (res.success) {
      toast.success('삭제됨');
      loadData();
    } else {
      toast.error(res.error || '삭제 실패');
    }
  };

  // ─── Test suggest ────────────────────────────────────────────────────────
  const handleTest = async () => {
    if (!testName.trim()) return;
    setTesting(true);
    setTestResult(null);
    const res = await operatorCategoryMappingApi.testSuggest(testName.trim());
    setTesting(false);
    if (res.success && res.data) {
      setTestResult(res.data);
    } else {
      setTestResult({ categoryId: '', categoryName: '', matchedKeyword: '', confidence: 'none' });
    }
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────
  const getCategoryLabel = (catId: string) =>
    categories.find((c) => c.id === catId)?.label || catId.slice(0, 8);

  const sortedRules = [...rules].sort((a, b) => b.priority - a.priority || a.keyword.localeCompare(b.keyword));

  // ─── Render ──────────────────────────────────────────────────────────────
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">카테고리 매핑 규칙</h1>
        <p className="text-sm text-gray-500 mt-1">상품명 키워드 → 카테고리 자동 추천 규칙 관리</p>
      </div>

      {/* ═══ Test Section ═══ */}
      <section className="bg-blue-50 rounded-xl p-4">
        <h2 className="text-sm font-semibold text-blue-800 mb-2">추천 테스트</h2>
        <div className="flex gap-2">
          <input
            type="text"
            value={testName}
            onChange={(e) => setTestName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleTest()}
            placeholder="상품명 입력 (예: 리브레 CGM 센서)"
            className="flex-1 px-3 py-2 border rounded-lg text-sm"
          />
          <button
            onClick={handleTest}
            disabled={testing || !testName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {testing ? '검색중...' : '테스트'}
          </button>
        </div>
        {testResult && (
          <div className="mt-2 text-sm">
            {testResult.confidence === 'none' ? (
              <span className="text-gray-500">매칭 결과 없음</span>
            ) : (
              <span className="text-blue-700">
                추천: <strong>{testResult.categoryName}</strong>
                {' '}(키워드: "{testResult.matchedKeyword}", 신뢰도: {testResult.confidence === 'high' ? '높음' : '낮음'})
              </span>
            )}
          </div>
        )}
      </section>

      {/* ═══ Create Section ═══ */}
      <section className="bg-white rounded-xl border p-4">
        <h2 className="text-sm font-semibold text-gray-700 mb-3">규칙 추가</h2>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-gray-500 mb-1">키워드</label>
            <input
              type="text"
              value={newKeyword}
              onChange={(e) => setNewKeyword(e.target.value)}
              placeholder="혈당, CGM, 비타민..."
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs text-gray-500 mb-1">카테고리</label>
            <select
              value={newCategoryId}
              onChange={(e) => setNewCategoryId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            >
              <option value="">카테고리 선택</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.label}</option>
              ))}
            </select>
          </div>
          <div className="w-20">
            <label className="block text-xs text-gray-500 mb-1">우선순위</label>
            <input
              type="number"
              min={0}
              max={10}
              value={newPriority}
              onChange={(e) => setNewPriority(Number(e.target.value))}
              className="w-full px-3 py-2 border rounded-lg text-sm"
            />
          </div>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {creating ? '추가중...' : '추가'}
          </button>
        </div>
      </section>

      {/* ═══ Rules Table ═══ */}
      <section className="bg-white rounded-xl border overflow-hidden">
        <div className="px-4 py-3 border-b flex justify-between items-center">
          <h2 className="text-sm font-semibold text-gray-700">규칙 목록 ({rules.length}건)</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-gray-400">로딩 중...</div>
        ) : sortedRules.length === 0 ? (
          <div className="p-8 text-center text-gray-400">규칙이 없습니다</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-4 py-2 text-left">키워드</th>
                  <th className="px-4 py-2 text-left">카테고리</th>
                  <th className="px-4 py-2 text-center w-20">우선순위</th>
                  <th className="px-4 py-2 text-center w-20">상태</th>
                  <th className="px-4 py-2 text-right w-32">작업</th>
                </tr>
              </thead>
              <tbody>
                {sortedRules.map((rule) => (
                  <tr key={rule.id} className="border-t border-gray-100 hover:bg-gray-50">
                    {editingId === rule.id ? (
                      <>
                        <td className="px-4 py-2">
                          <input
                            type="text"
                            value={editKeyword}
                            onChange={(e) => setEditKeyword(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          />
                        </td>
                        <td className="px-4 py-2">
                          <select
                            value={editCategoryId}
                            onChange={(e) => setEditCategoryId(e.target.value)}
                            className="w-full px-2 py-1 border rounded text-sm"
                          >
                            {categories.map((c) => (
                              <option key={c.id} value={c.id}>{c.label}</option>
                            ))}
                          </select>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            max={10}
                            value={editPriority}
                            onChange={(e) => setEditPriority(Number(e.target.value))}
                            className="w-16 px-2 py-1 border rounded text-sm text-center"
                          />
                        </td>
                        <td />
                        <td className="px-4 py-2 text-right space-x-1">
                          <button onClick={saveEdit} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">저장</button>
                          <button onClick={cancelEdit} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded">취소</button>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2 font-medium text-gray-900">{rule.keyword}</td>
                        <td className="px-4 py-2 text-gray-600">{rule.categoryName || getCategoryLabel(rule.categoryId)}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${
                            rule.priority >= 8 ? 'bg-red-100 text-red-700' :
                            rule.priority >= 5 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {rule.priority}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => toggleActive(rule)}
                            className={`text-xs px-2 py-0.5 rounded ${
                              rule.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-400'
                            }`}
                          >
                            {rule.isActive ? '활성' : '비활성'}
                          </button>
                        </td>
                        <td className="px-4 py-2 text-right space-x-1">
                          <button onClick={() => startEdit(rule)} className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded">수정</button>
                          <button onClick={() => handleDelete(rule)} className="px-2 py-1 text-xs text-red-500 hover:bg-red-50 rounded">삭제</button>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
