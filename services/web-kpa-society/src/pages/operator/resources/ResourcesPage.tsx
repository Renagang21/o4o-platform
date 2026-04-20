/**
 * ResourcesPage — 자료실 목록
 * WO-KPA-RESOURCE-LIBRARY-AI-WORKFLOW-V1
 *
 * 자유 자료 저장소 + 다중 선택 → 작업바구니 담기
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Trash2, ShoppingBasket, FileText, Link, Check } from 'lucide-react';
import { getAccessToken } from '../../../contexts/AuthContext';
import { useWorkBasket, type WorkItem } from '../../../contexts/WorkBasketContext';
import { toast } from '@o4o/error-handling';

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
  const [selected, setSelected] = useState<Set<string>>(new Set());
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
    setSelected(new Set());
  };

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selected.size === items.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(items.map(i => i.id)));
    }
  };

  const handleAddToBasket = () => {
    const toAdd: WorkItem[] = items
      .filter(i => selected.has(i.id))
      .map(i => ({
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
    setSelected(new Set());
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

  return (
    <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a', margin: 0 }}>자료실</h1>
          <p style={{ fontSize: 13, color: '#6b7280', marginTop: 4 }}>자료를 저장하고 작업바구니에 담아 AI로 전달하세요</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {/* 작업바구니 버튼 */}
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
              fontSize: 14, outline: 'none',
              boxSizing: 'border-box',
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

      {/* 선택 액션 바 */}
      {selected.size > 0 && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '10px 16px', background: '#ede9fe',
          border: '1px solid #c4b5fd', borderRadius: 8, marginBottom: 12,
        }}>
          <span style={{ fontSize: 14, color: '#5b21b6', fontWeight: 500 }}>
            {selected.size}개 선택됨
          </span>
          <button
            onClick={handleAddToBasket}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '6px 14px', borderRadius: 6,
              background: '#7c3aed', color: '#fff',
              border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 500,
            }}
          >
            <ShoppingBasket size={14} />
            작업에 담기
          </button>
          <button
            onClick={() => setSelected(new Set())}
            style={{
              padding: '6px 12px', borderRadius: 6,
              background: 'transparent', color: '#6b7280',
              border: '1px solid #d1d5db', cursor: 'pointer', fontSize: 13,
            }}
          >
            선택 해제
          </button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        {isLoading ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>불러오는 중...</div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#dc2626' }}>{error}</div>
        ) : items.length === 0 ? (
          <div style={{ padding: 60, textAlign: 'center', color: '#6b7280' }}>
            <FileText size={40} style={{ margin: '0 auto 12px', display: 'block', color: '#d1d5db' }} />
            <p style={{ margin: 0 }}>자료가 없습니다</p>
            <button
              onClick={() => navigate('/operator/resources/new')}
              style={{
                marginTop: 16, padding: '8px 20px', borderRadius: 8,
                background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer',
              }}
            >
              첫 번째 자료 추가하기
            </button>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                <th style={{ width: 44, padding: '10px 16px', textAlign: 'center' }}>
                  <input
                    type="checkbox"
                    checked={selected.size === items.length && items.length > 0}
                    onChange={toggleAll}
                    style={{ cursor: 'pointer' }}
                  />
                </th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>제목</th>
                <th style={{ width: 70, padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>유형</th>
                <th style={{ padding: '10px 16px', textAlign: 'left', fontSize: 13, fontWeight: 600, color: '#374151' }}>태그</th>
                <th style={{ width: 100, padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>등록일</th>
                <th style={{ width: 100, padding: '10px 12px', textAlign: 'center', fontSize: 13, fontWeight: 600, color: '#374151' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: idx < items.length - 1 ? '1px solid #f3f4f6' : 'none',
                    background: selected.has(item.id) ? '#faf5ff' : '#fff',
                  }}
                >
                  <td style={{ padding: '10px 16px', textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      {basket.has(item.id) && (
                        <span title="바구니에 담김">
                          <Check size={14} color="#7c3aed" />
                        </span>
                      )}
                      <span
                        onClick={() => navigate(`/operator/resources/${item.id}/edit`)}
                        style={{ fontSize: 14, color: '#1a1a1a', cursor: 'pointer', fontWeight: 500 }}
                      >
                        {item.title}
                      </span>
                    </div>
                    {item.role && (
                      <span style={{ fontSize: 12, color: '#6b7280', display: 'block', marginTop: 2 }}>
                        역할: {item.role}
                      </span>
                    )}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      padding: '2px 8px', borderRadius: 12, fontSize: 12, fontWeight: 500,
                      background: item.type === 'FILE' ? '#dbeafe' : '#f0fdf4',
                      color: item.type === 'FILE' ? '#1d4ed8' : '#16a34a',
                    }}>
                      {item.type === 'FILE' ? <FileText size={11} /> : <Link size={11} />}
                      {item.type === 'FILE' ? '파일' : '텍스트'}
                    </span>
                  </td>
                  <td style={{ padding: '10px 16px' }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {item.tags.slice(0, 4).map(tag => (
                        <span key={tag} style={{
                          padding: '1px 7px', borderRadius: 10,
                          background: '#f3f4f6', color: '#374151', fontSize: 12,
                        }}>
                          #{tag}
                        </span>
                      ))}
                      {item.tags.length > 4 && (
                        <span style={{ fontSize: 12, color: '#9ca3af' }}>+{item.tags.length - 4}</span>
                      )}
                    </div>
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: 13, color: '#6b7280' }}>
                    {formatDate(item.created_at)}
                  </td>
                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                      <button
                        onClick={() => navigate(`/operator/resources/${item.id}/edit`)}
                        style={{
                          padding: '4px 10px', borderRadius: 6, fontSize: 12,
                          background: '#f3f4f6', color: '#374151',
                          border: 'none', cursor: 'pointer',
                        }}
                      >
                        수정
                      </button>
                      <button
                        onClick={() => setDeleteTargetId(item.id)}
                        style={{
                          padding: '4px 8px', borderRadius: 6,
                          background: 'transparent', color: '#dc2626',
                          border: '1px solid #fca5a5', cursor: 'pointer',
                        }}
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
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
          <div style={{
            background: '#fff', borderRadius: 12, padding: 28, maxWidth: 360, width: '90%',
          }}>
            <h3 style={{ margin: '0 0 12px', fontSize: 16, fontWeight: 700 }}>자료 삭제</h3>
            <p style={{ margin: '0 0 20px', fontSize: 14, color: '#6b7280' }}>
              선택한 자료를 삭제하시겠습니까?
            </p>
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
                style={{
                  padding: '8px 16px', borderRadius: 8,
                  background: '#dc2626', color: '#fff',
                  border: 'none', cursor: isDeleting ? 'not-allowed' : 'pointer',
                }}
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
