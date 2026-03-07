/**
 * Neture Admin Category Management Page
 *
 * WO-O4O-NETURE-CATEGORY-PRODUCTMASTER-STRUCTURE-V1
 *
 * 상품 카테고리 트리 관리 (4단계 계층)
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { authClient } from '@o4o/auth-client';

interface Category {
  id: string;
  name: string;
  slug: string;
  parentId: string | null;
  depth: number;
  sortOrder: number;
  isActive: boolean;
  children?: Category[];
}

async function fetchCategories(): Promise<{ data: Category[] }> {
  const response = await authClient.api.get('/api/v1/neture/admin/categories');
  return response.data;
}

async function createCategory(data: { name: string; slug: string; parentId?: string; sortOrder?: number }): Promise<{ data: Category }> {
  const response = await authClient.api.post('/api/v1/neture/admin/categories', data);
  return response.data;
}

async function updateCategory(id: string, data: Partial<Category>): Promise<{ data: Category }> {
  const response = await authClient.api.patch(`/api/v1/neture/admin/categories/${id}`, data);
  return response.data;
}

async function deleteCategory(id: string): Promise<void> {
  await authClient.api.delete(`/api/v1/neture/admin/categories/${id}`);
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const CategoryListPage: React.FC = () => {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [formParentId, setFormParentId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formSlug, setFormSlug] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['neture', 'admin', 'categories'],
    queryFn: fetchCategories,
  });

  const createMutation = useMutation({
    mutationFn: (newCat: { name: string; slug: string; parentId?: string }) => createCategory(newCat),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'categories'] });
      setShowForm(false);
      setFormName('');
      setFormSlug('');
      setFormParentId(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'categories'] });
    },
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => updateCategory(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['neture', 'admin', 'categories'] });
    },
  });

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    const slug = formSlug || slugify(formName);
    createMutation.mutate({
      name: formName,
      slug,
      parentId: formParentId || undefined,
    });
  };

  const handleAddChild = (parentId: string) => {
    setFormParentId(parentId);
    setShowForm(true);
    setFormName('');
    setFormSlug('');
  };

  const handleDelete = (cat: Category) => {
    if (window.confirm(`"${cat.name}" 카테고리를 삭제하시겠습니까?`)) {
      deleteMutation.mutate(cat.id);
    }
  };

  const categories = data?.data || [];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Link to="/neture/products" className="text-blue-600 hover:underline text-sm">
            ← 상품 목록으로
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-2">카테고리 관리</h1>
          <p className="text-gray-500 mt-1">상품 분류 체계 (최대 4단계)</p>
        </div>
        <button
          onClick={() => { setShowForm(true); setFormParentId(null); setFormName(''); setFormSlug(''); }}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          + 대분류 추가
        </button>
      </div>

      {/* Create Form */}
      {showForm && (
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3">
            {formParentId ? '하위 카테고리 추가' : '대분류 추가'}
          </h3>
          <form onSubmit={handleCreate} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">이름</label>
              <input
                type="text"
                value={formName}
                onChange={(e) => { setFormName(e.target.value); setFormSlug(slugify(e.target.value)); }}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="카테고리명"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-gray-500 mb-1">Slug</label>
              <input
                type="text"
                value={formSlug}
                onChange={(e) => setFormSlug(e.target.value)}
                required
                className="w-full px-3 py-2 border rounded-lg text-sm"
                placeholder="url-slug"
              />
            </div>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              {createMutation.isPending ? '생성 중...' : '생성'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50"
            >
              취소
            </button>
          </form>
          {createMutation.isError && (
            <p className="text-red-600 text-xs mt-2">생성에 실패했습니다.</p>
          )}
        </div>
      )}

      {/* Category Tree */}
      <div className="bg-white rounded-lg shadow-sm">
        {isLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : categories.length > 0 ? (
          <div className="divide-y">
            {categories.map((cat) => (
              <CategoryNode
                key={cat.id}
                category={cat}
                onAddChild={handleAddChild}
                onDelete={handleDelete}
                onToggle={(id, isActive) => toggleMutation.mutate({ id, isActive })}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-gray-500">
            등록된 카테고리가 없습니다.
          </div>
        )}
      </div>
    </div>
  );
};

function CategoryNode({
  category,
  onAddChild,
  onDelete,
  onToggle,
  depth = 0,
}: {
  category: Category;
  onAddChild: (parentId: string) => void;
  onDelete: (cat: Category) => void;
  onToggle: (id: string, isActive: boolean) => void;
  depth?: number;
}) {
  return (
    <div>
      <div
        className="flex items-center justify-between px-4 py-3 hover:bg-gray-50"
        style={{ paddingLeft: `${16 + depth * 24}px` }}
      >
        <div className="flex items-center gap-2">
          {depth > 0 && <span className="text-gray-300">└</span>}
          <span className={`text-sm ${!category.isActive ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
            {category.name}
          </span>
          <span className="text-xs text-gray-400">({category.slug})</span>
          <span className="text-xs text-gray-300">L{category.depth}</span>
        </div>
        <div className="flex items-center gap-2">
          {depth < 3 && (
            <button
              onClick={() => onAddChild(category.id)}
              className="text-xs text-blue-600 hover:underline"
            >
              + 하위
            </button>
          )}
          <button
            onClick={() => onToggle(category.id, !category.isActive)}
            className={`text-xs ${category.isActive ? 'text-amber-600' : 'text-green-600'} hover:underline`}
          >
            {category.isActive ? '비활성화' : '활성화'}
          </button>
          <button
            onClick={() => onDelete(category)}
            className="text-xs text-red-600 hover:underline"
          >
            삭제
          </button>
        </div>
      </div>
      {category.children?.map((child) => (
        <CategoryNode
          key={child.id}
          category={child}
          onAddChild={onAddChild}
          onDelete={onDelete}
          onToggle={onToggle}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

export default CategoryListPage;
