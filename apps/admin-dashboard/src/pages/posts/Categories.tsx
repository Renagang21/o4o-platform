import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronDown,
  Settings,
  Eye,
  Edit2,
  Trash2,
  Copy,
  MoreVertical
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { useAuthStore } from '@/stores/authStore';
import { hasPermission, hasAnyPermission } from '@/utils/permissions';
import { authClient } from '@o4o/auth-client';

interface Category {
  id: string;
  name: string;
  description: string;
  slug: string;
  count: number;
  date: string;
}

const Categories = () => {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [categories, setCategories] = useState<Category[]>([]);
  // WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1: 조회 실패 ≠ 카테고리 0건
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(new Set());
  const [hoveredRow, setHoveredRow] = useState<string | null>(null);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [showScreenOptions, setShowScreenOptions] = useState(false);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);
  const [selectedBulkAction, setSelectedBulkAction] = useState<string>('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    parent: ''
  });
  
  // Admin dashboard users have all permissions
  const canCreateCategory = true;
  const canEditCategory = true;
  const canDeleteCategory = true;
  
  // Screen Options state - load from localStorage
  const [visibleColumns, setVisibleColumns] = useState(() => {
    const saved = localStorage.getItem('categories-visible-columns');
    return saved ? JSON.parse(saved) : {
      description: true,
      slug: true,
      count: true
    };
  });
  
  // Save visible columns to localStorage when they change
  useEffect(() => {
    localStorage.setItem('categories-visible-columns', JSON.stringify(visibleColumns));
  }, [visibleColumns]);

  // Load categories from API
  //
  // WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1
  //   종전에는 실패 시 아무 표시 없이 `setCategories([])` 만 했다. 화면에는 "0 items" 인 빈 표만
  //   남아 카테고리가 하나도 없는 것처럼 보였다 — 실패를 0건으로 위장한 것이다.
  const loadCategories = async () => {
      try {
        setLoadError(null);
        const response = await authClient.api.get('/content/categories');

        const result = response.data;

        // 200 인데 실패를 실은 응답을 성공으로 오인하지 않는다.
        if (result?.success === false) {
          throw new Error(result?.error || result?.message || '카테고리 조회에 실패했습니다.');
        }

        const categoriesData = result.data || result.categories || [];

        // 예상과 다른 응답 형태를 "0건" 으로 흘려보내지 않는다.
        if (!Array.isArray(categoriesData)) {
          throw new Error('카테고리 목록 응답 형식이 올바르지 않습니다.');
        }

        // Transform API data to match our Category interface
        const transformedCategories = categoriesData.map((cat: any) => ({
          id: cat.id || cat._id, // Handle both id and _id fields
          name: cat.name || cat.title,
          description: cat.description || '',
          slug: cat.slug || '',
          count: cat.postCount || cat.count || 0,
          date: cat.createdAt ? new Date(cat.createdAt).toLocaleDateString('ko-KR') : '-'
        })).filter((cat: any) => cat.id); // Filter out items without ID

        setCategories(transformedCategories);
      } catch (error: any) {
        // 기존 목록은 유지한다 — 비우면 "카테고리 0건" 과 구분되지 않는다.
        setLoadError(
          error?.response?.data?.error ||
            error?.response?.data?.message ||
            error?.message ||
            '카테고리 목록을 불러오지 못했습니다.',
        );
      }
  };

  useEffect(() => {
    loadCategories();
  }, []);
  
  const handleColumnToggle = (column: string) => {
    setVisibleColumns((prev: any) => ({
      ...prev,
      [column]: !prev[column]
    }));
  };

  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedCategories(new Set(categories.map(c => c.id)));
    } else {
      setSelectedCategories(new Set());
    }
  };

  const handleSelectCategory = (id: string) => {
    const newSelection = new Set(selectedCategories);
    if (newSelection.has(id)) {
      newSelection.delete(id);
    } else {
      newSelection.add(id);
    }
    setSelectedCategories(newSelection);
  };

  const handleAddNew = () => {
    // Navigate to the new category page
    navigate('/categories/new');
  };

  const handleSaveCategory = () => {
    if (formData.name) {
      const newCategory: Category = {
        id: Date.now().toString(),
        name: formData.name,
        description: formData.description,
        slug: formData.slug || formData.name.toLowerCase().replace(/\s+/g, '-'),
        count: 0,
        date: new Date().toISOString().split('T')[0]
      };
      setCategories([...categories, newCategory]);
      setFormData({ name: '', slug: '', description: '', parent: '' });
      setShowAddModal(false);
    }
  };

  const handleEdit = (id: string) => {
    // Navigate to the edit page
    navigate(`/categories/edit/${id}`);
  };

  const handleQuickEdit = (id: string) => {
    setEditingCategory(id);
  };

  const handleView = (id: string) => {
    // TODO: Navigate to category view page
  };

  const handleDuplicate = (id: string) => {
    const category = categories.find(c => c.id === id);
    if (category) {
      const duplicated = {
        ...category,
        id: Date.now().toString(),
        name: category.name + ' (Copy)',
        slug: category.slug + '-copy'
      };
      setCategories([...categories, duplicated]);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('이 카테고리를 삭제하시겠습니까?')) {
      setCategories(categories.filter(c => c.id !== id));
    }
  };

  const handleApplyBulkAction = () => {
    if (!selectedBulkAction) {
      alert('Please select an action.');
      return;
    }
    
    if (selectedCategories.size === 0) {
      alert('No categories selected.');
      return;
    }
    
    if (selectedBulkAction === 'delete') {
      if (confirm(`선택한 ${selectedCategories.size}개의 카테고리를 삭제하시겠습니까?`)) {
        setCategories(categories.filter(c => !selectedCategories.has(c.id)));
        setSelectedCategories(new Set());
        setSelectedBulkAction('');
      }
    }
  };

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f0f0f1' }}>
      {/* Header with Breadcrumb and Screen Options */}
      <div className="bg-white border-b border-gray-200 px-8 py-3">
        <div className="flex items-center justify-between">
          <AdminBreadcrumb 
            items={[
              { label: 'Admin', path: '/admin' },
              { label: '글', path: '/admin/posts' },
              { label: '카테고리' }
            ]}
          />
          
          {/* Screen Options Button */}
          <div className="relative">
            <button
              onClick={() => setShowScreenOptions(!showScreenOptions)}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
            >
              <Settings className="w-4 h-4" />
              Screen Options
              <ChevronDown className="w-3 h-3" />
            </button>
            
            {showScreenOptions && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-300 rounded-md shadow-lg z-50">
                <div className="p-4">
                  <h3 className="font-medium text-sm mb-3">Show on screen</h3>
                  <div className="space-y-2">
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        id="screen-option-description"
                        name="screen-option-description"
                        checked={visibleColumns.description}
                        onChange={() => handleColumnToggle('description')}
                        className="mr-2" 
                      />
                      Description
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        id="screen-option-slug"
                        name="screen-option-slug"
                        checked={visibleColumns.slug}
                        onChange={() => handleColumnToggle('slug')}
                        className="mr-2" 
                      />
                      Slug
                    </label>
                    <label className="flex items-center text-sm">
                      <input 
                        type="checkbox" 
                        id="screen-option-count"
                        name="screen-option-count"
                        checked={visibleColumns.count}
                        onChange={() => handleColumnToggle('count')}
                        className="mr-2" 
                      />
                      Count
                    </label>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="px-8 py-6">
        {/* Page Title and Description */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">카테고리</h1>
          <p className="text-gray-600 mt-1">컨텐츠를 체계적으로 분류하고 관리합니다</p>
        </div>

        {/* WO-O4O-ADMIN-DASHBOARD-LOAD-FAILURE-EMPTY-LIST-AUDIT-AND-FIX-V1:
            조회 실패를 지속 배너로 드러낸다. 종전에는 빈 표("0 items")만 남아 0건과 구분되지 않았다. */}
        {loadError && (
          <div
            role="alert"
            className="mb-4 flex items-start justify-between gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
          >
            <div>
              <p className="font-semibold">카테고리 목록을 불러오지 못했습니다.</p>
              <p className="mt-1 break-all">{loadError}</p>
              <p className="mt-1 text-xs text-red-700">
                아래 목록은 마지막으로 조회에 성공한 내용이거나 비어 있을 수 있습니다. 카테고리가 0건이라는 뜻이
                아닙니다.
              </p>
            </div>
            <button
              type="button"
              onClick={loadCategories}
              className="shrink-0 rounded-md bg-red-100 px-3 py-1 font-medium text-red-800 hover:bg-red-200"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* Action Bar */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-medium">Categories</h2>
            {canCreateCategory && (
              <button
                onClick={handleAddNew}
                className="px-3 py-1 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50 transition-colors"
              >
                Add New
              </button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {selectedBulkAction === 'delete' ? 'Delete' : 'Bulk Actions'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 top-full mt-1 w-40 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('delete');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedCategories.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedCategories.size === 0}
            >
              Apply
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {categories.length} items
          </div>
        </div>

        {/* Table */}
        <div className="bg-white border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-white border-b border-gray-200">
              <tr>
                <th className="w-10 px-3 py-3 text-left">
                  <input
                    type="checkbox"
                    onChange={handleSelectAll}
                    checked={selectedCategories.size === categories.length && categories.length > 0}
                  />
                </th>
                <th className="px-3 py-3 text-left">
                  <button className="flex items-center gap-1 font-medium text-sm text-gray-700 hover:text-black">
                    Name
                    <ChevronDown className="w-3 h-3" />
                  </button>
                </th>
                {visibleColumns.description && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Description</th>
                )}
                {visibleColumns.slug && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Slug</th>
                )}
                {visibleColumns.count && (
                  <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Count</th>
                )}
                <th className="px-3 py-3 text-left text-sm font-medium text-gray-700">Date</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr
                  key={category.id}
                  className={`border-b border-gray-100 ${hoveredRow === category.id ? 'bg-gray-50' : ''}`}
                  onMouseEnter={() => setHoveredRow(category.id)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  <td className="px-3 py-3">
                    <input
                      type="checkbox"
                      id={`select-category-${category.id}`}
                      name={`select-category-${category.id}`}
                      checked={selectedCategories.has(category.id)}
                      onChange={() => handleSelectCategory(category.id)}
                    />
                  </td>
                  <td className="px-3 py-3">
                    {editingCategory === category.id ? (
                      <div className="space-y-2">
                        <input
                          type="text"
                          id={`edit-category-name-${category.id}`}
                          name="category-name"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              const updated = categories.map(c =>
                                c.id === category.id
                                  ? { ...c, name: formData.name, slug: formData.slug, description: formData.description }
                                  : c
                              );
                              setCategories(updated);
                              setEditingCategory(null);
                            }}
                            className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                          >
                            Update
                          </button>
                          <button
                            onClick={() => setEditingCategory(null)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div>
                        <div className="font-medium text-sm text-blue-600 hover:text-blue-800">
                          {category.name}
                        </div>
                        {hoveredRow === category.id && (
                          <div className="flex items-center gap-1 mt-1">
                            {canEditCategory && (
                              <>
                                <button
                                  onClick={() => handleEdit(category.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 px-1"
                                >
                                  Edit
                                </button>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleQuickEdit(category.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 px-1"
                                >
                                  Quick Edit
                                </button>
                                <span className="text-gray-300">|</span>
                              </>
                            )}
                            <button
                              onClick={() => handleView(category.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 px-1"
                            >
                              View
                            </button>
                            {canEditCategory && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDuplicate(category.id)}
                                  className="text-xs text-blue-600 hover:text-blue-800 px-1"
                                >
                                  Duplicate
                                </button>
                              </>
                            )}
                            {canDeleteCategory && (
                              <>
                                <span className="text-gray-300">|</span>
                                <button
                                  onClick={() => handleDelete(category.id)}
                                  className="text-xs text-red-600 hover:text-red-800 px-1"
                                >
                                  Delete
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  {visibleColumns.description && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {editingCategory === category.id ? (
                        <input
                          type="text"
                          id={`edit-category-description-${category.id}`}
                          name="category-description"
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        category.description
                      )}
                    </td>
                  )}
                  {visibleColumns.slug && (
                    <td className="px-3 py-3 text-sm text-gray-600">
                      {editingCategory === category.id ? (
                        <input
                          type="text"
                          id={`edit-category-slug-${category.id}`}
                          name="category-slug"
                          value={formData.slug}
                          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        category.slug
                      )}
                    </td>
                  )}
                  {visibleColumns.count && (
                    <td className="px-3 py-3 text-sm text-gray-600">{category.count}</td>
                  )}
                  <td className="px-3 py-3 text-sm text-gray-600">{category.date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom Bulk Actions */}
        <div className="flex items-center justify-between mt-4">
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                onClick={() => setShowBulkActions(!showBulkActions)}
                className="flex items-center gap-1 px-3 py-1.5 text-sm bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                {selectedBulkAction === 'delete' ? 'Delete' : 'Bulk Actions'}
                <ChevronDown className="w-3 h-3" />
              </button>
              
              {showBulkActions && (
                <div className="absolute left-0 bottom-full mb-1 w-40 bg-white border border-gray-300 rounded shadow-lg z-20">
                  <button
                    onClick={() => {
                      setSelectedBulkAction('delete');
                      setShowBulkActions(false);
                    }}
                    className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
                  >
                    Delete
                  </button>
                </div>
              )}
            </div>
            <button 
              onClick={handleApplyBulkAction}
              className={`px-3 py-1.5 text-sm border border-gray-300 rounded transition-colors ${
                selectedBulkAction && selectedCategories.size > 0 
                  ? 'bg-white text-gray-700 hover:bg-gray-50 cursor-pointer'
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
              disabled={!selectedBulkAction || selectedCategories.size === 0}
            >
              Apply
            </button>
          </div>
          
          <div className="text-sm text-gray-600">
            {categories.length} items
          </div>
        </div>
      </div>

      {/* Add Category Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium">카테고리 추가</h3>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label htmlFor="new-category-name" className="block text-sm font-medium text-gray-700 mb-1">이름</label>
                  <input
                    type="text"
                    id="new-category-name"
                    name="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="카테고리 이름"
                  />
                </div>
                <div>
                  <label htmlFor="new-category-slug" className="block text-sm font-medium text-gray-700 mb-1">슬러그</label>
                  <input
                    type="text"
                    id="new-category-slug"
                    name="slug"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="category-slug"
                  />
                </div>
                <div>
                  <label htmlFor="new-category-parent" className="block text-sm font-medium text-gray-700 mb-1">상위 카테고리</label>
                  <select
                    id="new-category-parent"
                    name="parent"
                    value={formData.parent}
                    onChange={(e) => setFormData({ ...formData, parent: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">없음</option>
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="new-category-description" className="block text-sm font-medium text-gray-700 mb-1">설명</label>
                  <textarea
                    id="new-category-description"
                    name="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="카테고리 설명"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowAddModal(false);
                  setFormData({ name: '', slug: '', description: '', parent: '' });
                }}
                className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
              >
                취소
              </button>
              <button
                onClick={handleSaveCategory}
                className="px-4 py-2 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                카테고리 추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Categories;
