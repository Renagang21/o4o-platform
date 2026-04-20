/**
 * ResourcesPage — 자료실 목록
 * WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1
 * WO-O4O-SELECTION-TABLE-DETAIL-DRAWER-V1: HTML table → SelectionTable 교체
 *
 * 자유 자료 저장소 + 다중 선택 → 작업바구니 담기
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, ShoppingBasket, FileText, Link, Check } from 'lucide-react';
import { getAccessToken } from '../../../contexts/AuthContext';
import { useWorkBasket, type WorkItem } from '../../../contexts/WorkBasketContext';
import { toast } from '@o4o/error-handling';
import { SelectionTable } from '@o4o/ui';
import type { O4OColumn } from '@o4o/ui';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

interface ResourceItem {
  id: string;
  title: string;
  content: string | null;
  file_url: string | null;
  external_url: string | null;
  type: 'FILE' | 'TEXT';
  tags: string[];
  role: string | null;
  memo: string | null;
  created_at: string;
}

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const token = getAccessToken();
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers,
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body?.error?.message || body?.error || `API error ${res.status}`);
  return body;
}

export default function ResourcesPage() {
  const navigate = useNavigate();
  const basket = useWorkBasket();

  const [items, setItems] = useState<ResourceItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const LIMIT = 20;

  const fetchItems = useCallback(async (p: number, s: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(p), limit: String(LIMIT) });
      if (s) params.set('search', s);
      const result = await apiFetch<{ success: boolean; data: { items: ResourceItem[]; total: number; totalPages: number } }>(
        `/api/v1/kpa/resources?${params}`
      );
      setItems(result.data.items);
      setTotal(result.data.total);
      setTotalPages(result.data.totalPages);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems(page, search);
  }, [fetchItems, page, search]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
    setSelectedKeys(new Set());
  };

  // SelectionTable onSubmit — 선택된 row 배열 전달
  const handleAddToBasket = (selectedRows: ResourceItem[]) => {
    const toAdd: WorkItem[] = selectedRows.map(i => ({
      id: i.id,
      title: i.title,
      content: i.content,
      file_url: i.file_url,
      external_url: i.external_url,
      role: i.role,
      memo: i.memo,
    }));
    basket.addMany(toAdd);
    toast.success(`${toAdd.length}개 자료를 작업바구니에 담았습니다`);
    setSelectedKeys(new Set());
  };

  const handleDelete = async (id: string) => {
    setIsDeleting(true);
    try {
      await apiFetch(`/api/v1/kpa/resources/${id}`, { method: 'DELETE' });
      toast.success('자료가 삭제되었습니다');
      setDeleteTargetId(null);
      fetchItems(page, search);
    } catch (e: any) {
      toast.error(e.message || '삭제 실패');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  // ─── 컬럼 정의 ───
  const columns = useMemo<O4OColumn<ResourceItem>[]>(() => [
    {
      key: 'title',
      header: '제목',
      render: (_val, row) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            {basket.has(row.id) && (
              <span title="바구니에 담김"><Check size={13} color="#7c3aed" /></span>
            )}
            <span
              onClick={() => navigate(`/operator/resources/${row.id}/edit`)}
              style={{ cursor: 'pointer', fontWeight: 500, color: '#111827' }}
            >
              {row.title}
            </span>
          </div>
          {row.role && <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>역할: {row.role}</div>}
        </div>
      ),
    },
    {
      key: 'type',
      header: '유형',
      width: 80,
      align: 'center',
      render: (_val, row) => (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 4,
          padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500,
          background: row.type === 'FILE' ? '#dbeafe' : '#f0fdf4',
          color: row.type === 'FILE' ? '#1d4ed8' : '#16a34a',
        }}>
          {row.type === 'FILE' ? <FileText size={11} /> : <Link size={11} />}
          {row.type === 'FILE' ? '파일' : '텍스트'}
        </span>
      ),
    },
    {
      key: 'tags',
      header: '태그',
      render: (_val, row) => (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {row.tags.slice(0, 4).map(tag => (
            <span key={tag} style={{
              padding: '1px 7px', borderRadius: 10,
              background: '#f3f4f6', color: '#374151', fontSize: 12,
            }}>#{tag}</span>
          ))}
          {row.tags.length > 4 && (
            <span style={{ fontSize: 12, color: '#9ca3af' }}>+{row.tags.length - 4}</span>
          )}
        </div>
      ),
    },
    {
      key: 'created_at',
      header: '등록일',
      width: 100,
      align: 'center',
      render: (_val, row) => (
        <span style={{ fontSize: 13, color: '#6b7280' }}>{formatDate(row.created_at)}</span>
      ),
    },
    {
      key: '_actions',
      header: '관리',
      width: 100,
      align: 'center',
      render: (_val, row) => (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/operator/resources/${row.id}/edit`); }}
            style={{
              padding: '4px 10px', borderRadius: 6, fontSize: 12,
              background: '#f3f4f6', color: '#374151', border: 'none', cursor: 'pointer',
            }}
          >
            수정
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); setDeleteTargetId(row.id); }}
            style={{
              padding: '4px 8px', borderRadius: 6,
              background: 'transparent', color: '#dc2626',
              border: '1px solid #fca5a5', cursor: 'pointer',
            }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      ),
    },
  ], [basket, navigate]);

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>자료실</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>자료를 저장하고 작업바구니에 담아 AI로 전달하세요</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => navigate('/operator/resources/basket')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: basket.items.length > 0 ? '#7c3aed' : '#f3f4f6',
              color: basket.items.length > 0 ? '#fff' : '#374151',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}
          >
            <ShoppingBasket size={16} />
            작업바구니
            {basket.items.length > 0 && (
              <span style={{
                background: '#fff', color: '#7c3aed', borderRadius: '50%',
                width: 20, height: 20, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 12, fontWeight: 700,
              }}>
                {basket.items.length}
              </span>
            )}
          </button>
          <button
            onClick={() => navigate('/operator/resources/new')}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 8,
              background: '#2563eb', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 500,
            }}
          >
            <Plus size={16} />
            자료 추가
          </button>
        </div>
      </div>

      {/* Search bar */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="제목 또는 메모 검색"
            style={{
              width: '100%', padding: '8px 12px 8px 36px',
              border: '1px solid #d1d5db', borderRadius: 8,
              fontSize: 14, outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>
        <button
          type="submit"
          style={{
            padding: '8px 16px', borderRadius: 8,
            background: '#374151', color: '#fff',
            border: 'none', cursor: 'pointer', fontSize: 14,
          }}
        >
          검색
        </button>
      </form>

      {error && (
        <div style={{ padding: '12px 16px', background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, color: '#dc2626', marginBottom: 12, fontSize: 14 }}>
          {error}
        </div>
      )}

      {/* SelectionTable */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        <SelectionTable<ResourceItem>
          columns={columns}
          data={items}
          rowKey="id"
          selectedKeys={selectedKeys}
          onSelectionChange={setSelectedKeys}
          submitLabel="작업에 담기"
          onSubmit={handleAddToBasket}
          loading={isLoading}
          emptyMessage={
            <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
              <FileText size={40} style={{ margin: '0 auto 12px', display: 'block', color: '#d1d5db' }} />
              <p style={{ margin: 0 }}>자료가 없습니다</p>
              <button
                onClick={() => navigate('/operator/resources/new')}
                style={{ marginTop: 16, padding: '8px 20px', borderRadius: 8, background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer' }}
              >
                첫 번째 자료 추가하기
              </button>
            </div>
          }
          dense
        />
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', cursor: page === 1 ? 'not-allowed' : 'pointer', background: '#fff' }}
          >
            이전
          </button>
          <span style={{ lineHeight: '34px', fontSize: 14, color: '#374151' }}>
            {page} / {totalPages} ({total}건)
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => Math.min(totalPages, p + 1))}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid #d1d5db', cursor: page >= totalPages ? 'not-allowed' : 'pointer', background: '#fff' }}
          >
            다음
          </button>
        </div>
      )}

      {/* Delete confirm modal */}
      {deleteTargetId && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 28, maxWidth: 360, width: '90%' }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>자료 삭제</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>선택한 자료를 삭제하시겠습니까?</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setDeleteTargetId(null)}
                style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', cursor: 'pointer' }}
              >
                취소
              </button>
              <button
                onClick={() => handleDelete(deleteTargetId)}
                disabled={isDeleting}
                style={{ padding: '8px 16px', borderRadius: 8, background: '#dc2626', color: '#fff', border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer' }}
              >
                {isDeleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
