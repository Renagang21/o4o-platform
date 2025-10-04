import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Users, Eye, Settings, Edit, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

interface ForumCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  postCount: number;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

const ForumCategories: React.FC = () => {
  const [categories, setCategories] = useState<ForumCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<ForumCategory | null>(null);
  const [bulkSelection, setBulkSelection] = useState<string[]>([]);

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/forum/categories');
      if (response.ok) {
        const data = await response.json();
        setCategories(data.categories || []);
      } else {
        console.error('Failed to fetch forum categories');
        toast.error('포럼 카테고리 로드 실패');
      }
    } catch (error) {
      console.error('Error fetching forum categories:', error);
      toast.error('포럼 카테고리 로드 중 오류 발생');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('카테고리를 삭제하시겠습니까?')) {
      setCategories(categories.filter(c => c.id !== id));
      toast.success('카테고리가 삭제되었습니다');
    }
  };

  const handleCreate = () => {
    setSelectedCategory(null);
    setShowForm(true);
  };

  const handleEdit = (category: ForumCategory) => {
    setSelectedCategory(category);
    setShowForm(true);
  };

  const toggleBulkSelect = (id: string) => {
    setBulkSelection(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (bulkSelection.length === categories.length) {
      setBulkSelection([]);
    } else {
      setBulkSelection(categories.map(c => c.id));
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-800' 
          : 'bg-gray-100 text-gray-800'
      }`}>
        {isActive ? '활성' : '비활성'}
      </span>
    );
  };

  if (showForm) {
    return <CategoryForm category={selectedCategory} onClose={() => setShowForm(false)} />;
  }

  return (
    <div className="p-6">
      {/* WordPress Admin Style Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-normal text-gray-900">포럼 카테고리</h1>
        <button
          onClick={handleCreate}
          className="px-3 py-1 bg-wordpress-blue text-white text-sm rounded hover:bg-wordpress-blue-hover transition"
        >
          새로 추가
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">전체 카테고리</p>
              <p className="text-2xl font-bold">{categories.length}</p>
            </div>
            <MessageSquare className="h-8 w-8 text-gray-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">활성 카테고리</p>
              <p className="text-2xl font-bold">{categories.filter(c => c.isActive).length}</p>
            </div>
            <Eye className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">총 게시글</p>
              <p className="text-2xl font-bold">{categories.reduce((sum, c) => sum + c.postCount, 0)}</p>
            </div>
            <Users className="h-8 w-8 text-purple-400" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg border border-gray-300">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm">평균 게시글</p>
              <p className="text-2xl font-bold">
                {categories.length > 0 
                  ? Math.round(categories.reduce((sum, c) => sum + c.postCount, 0) / categories.length)
                  : 0
                }
              </p>
            </div>
            <Settings className="h-8 w-8 text-blue-400" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-gray-300 rounded-t-lg p-3 flex justify-between items-center">
        <div className="flex gap-2">
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option value="">일괄 작업</option>
            <option value="delete">삭제</option>
            <option value="deactivate">비활성화</option>
            <option value="activate">활성화</option>
          </select>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            적용
          </button>
        </div>
        
        <div className="flex gap-2 items-center">
          <select className="px-3 py-1 border border-gray-300 rounded text-sm">
            <option value="">모든 상태</option>
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
          <button className="px-3 py-1 border border-gray-300 rounded text-sm hover:bg-gray-50">
            필터
          </button>
        </div>
      </div>

      {/* WordPress Style Table */}
      <div className="bg-white border-x border-b border-gray-300 rounded-b-lg">
        <table className="w-full wp-list-table widefat fixed striped">
          <thead>
            <tr>
              <td className="manage-column check-column">
                <input 
                  type="checkbox" 
                  onChange={toggleSelectAll}
                  checked={bulkSelection.length === categories.length && categories.length > 0}
                />
              </td>
              <th className="manage-column column-title column-primary">
                <span>카테고리명</span>
              </th>
              <th className="manage-column">설명</th>
              <th className="manage-column">게시글 수</th>
              <th className="manage-column">정렬 순서</th>
              <th className="manage-column">상태</th>
            </tr>
          </thead>
          <tbody>
            {categories.map((category) => (
              <tr key={category.id}>
                <th scope="row" className="check-column">
                  <input 
                    type="checkbox"
                    checked={bulkSelection.includes(category.id)}
                    onChange={() => toggleBulkSelect(category.id)}
                  />
                </th>
                <td className="title column-title column-primary page-title">
                  <strong>
                    <a 
                      href="#" 
                      onClick={(e) => { e.preventDefault(); handleEdit(category); }}
                      className="row-title"
                    >
                      {category.name}
                    </a>
                  </strong>
                  <div className="text-sm text-gray-500 mt-1">
                    슬러그: {category.slug}
                  </div>
                  <div className="row-actions">
                    <span className="edit">
                      <a href="#" onClick={(e) => { e.preventDefault(); handleEdit(category); }}>
                        편집
                      </a>
                    </span>
                    {' | '}
                    <span className="trash">
                      <a 
                        href="#" 
                        onClick={(e) => { e.preventDefault(); handleDelete(category.id); }}
                        className="submitdelete"
                      >
                        휴지통
                      </a>
                    </span>
                  </div>
                </td>
                <td>
                  <span className="text-sm text-gray-600">
                    {category.description || '설명 없음'}
                  </span>
                </td>
                <td>
                  <strong className="text-lg text-wordpress-blue">
                    {category.postCount}
                  </strong>
                </td>
                <td>
                  <span className="text-sm">
                    {category.sortOrder}
                  </span>
                </td>
                <td>{getStatusBadge(category.isActive)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Category Form Component
const CategoryForm: React.FC<{ category: ForumCategory | null; onClose: () => void }> = ({ category, onClose }) => {
  const [formData, setFormData] = useState({
    name: category?.name || '',
    slug: category?.slug || '',
    description: category?.description || '',
    sortOrder: category?.sortOrder || 0,
    isActive: category?.isActive ?? true
  });

  const handleSave = () => {
    toast.success(category ? '카테고리가 수정되었습니다' : '카테고리가 생성되었습니다');
    onClose();
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: !category ? generateSlug(name) : prev.slug // Only auto-generate for new categories
    }));
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-normal text-gray-900">
          {category ? '포럼 카테고리 편집' : '새 포럼 카테고리'}
        </h1>
      </div>

      <div className="bg-white border border-gray-300 rounded-lg p-6 max-w-4xl">
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              카테고리명 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
              placeholder="카테고리명을 입력하세요"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              슬러그
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
              placeholder="url-friendly-slug"
            />
            <p className="text-xs text-gray-500 mt-1">
              URL에 사용될 이름입니다. 영문, 숫자, 하이픈만 사용 가능합니다.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              설명
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
              rows={3}
              placeholder="카테고리에 대한 간단한 설명을 입력하세요"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                정렬 순서
              </label>
              <input
                type="number"
                value={formData.sortOrder}
                onChange={(e) => setFormData({ ...formData, sortOrder: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:border-wordpress-blue focus:outline-none"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                상태
              </label>
              <div className="flex items-center mt-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-gray-700">
                  활성화
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 pt-6 border-t flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-wordpress-blue text-white rounded hover:bg-wordpress-blue-hover"
          >
            {category ? '업데이트' : '카테고리 생성'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ForumCategories;