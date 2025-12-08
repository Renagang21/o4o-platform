/**
 * Membership-Yaksa: Category Management Page
 *
 * Admin page for managing member categories and annual fee settings
 */

import React, { useState, useEffect } from 'react';
import {
  Plus,
  Edit,
  Save,
  X,
  DollarSign,
  Users,
} from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';
import ExportButton from '@/components/membership/ExportButton';

interface MemberCategory {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  requiresAnnualFee: boolean;
  annualFeeAmount: number | null;
  sortOrder: number;
  metadata: any;
  createdAt: string;
  updatedAt: string;
}

interface CategoryFormData {
  name: string;
  description: string;
  requiresAnnualFee: boolean;
  annualFeeAmount: string;
  isActive: boolean;
  sortOrder: number;
}

const CategoryManagement = () => {
  const [categories, setCategories] = useState<MemberCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [formData, setFormData] = useState<CategoryFormData>({
    name: '',
    description: '',
    requiresAnnualFee: false,
    annualFeeAmount: '',
    isActive: true,
    sortOrder: 0,
  });

  useKeyboardShortcuts();

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await authClient.api.get('/membership/categories');

      if (response.data.success) {
        setCategories(response.data.data || []);
      } else {
        toast.error('카테고리를 불러올 수 없습니다.');
      }
    } catch (error: any) {
      console.error('Failed to load categories:', error);
      toast.error('카테고리를 불러올 수 없습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleStartEdit = (category: MemberCategory) => {
    setEditingId(category.id);
    setFormData({
      name: category.name,
      description: category.description || '',
      requiresAnnualFee: category.requiresAnnualFee,
      annualFeeAmount: category.annualFeeAmount?.toString() || '',
      isActive: category.isActive,
      sortOrder: category.sortOrder,
    });
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setFormData({
      name: '',
      description: '',
      requiresAnnualFee: false,
      annualFeeAmount: '',
      isActive: true,
      sortOrder: categories.length + 1,
    });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setIsCreating(false);
    setFormData({
      name: '',
      description: '',
      requiresAnnualFee: false,
      annualFeeAmount: '',
      isActive: true,
      sortOrder: 0,
    });
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast.error('카테고리 이름을 입력하세요.');
      return;
    }

    if (formData.requiresAnnualFee && !formData.annualFeeAmount) {
      toast.error('연회비 금액을 입력하세요.');
      return;
    }

    try {
      const payload = {
        name: formData.name,
        description: formData.description || null,
        requiresAnnualFee: formData.requiresAnnualFee,
        annualFeeAmount: formData.requiresAnnualFee ? parseInt(formData.annualFeeAmount) : null,
        isActive: formData.isActive,
        sortOrder: formData.sortOrder,
      };

      if (isCreating) {
        await authClient.api.post('/membership/categories', payload);
        toast.success('카테고리가 생성되었습니다.');
      } else if (editingId) {
        await authClient.api.put(`/api/membership/categories/${editingId}`, payload);
        toast.success('카테고리가 수정되었습니다.');
      }

      fetchCategories();
      handleCancelEdit();
    } catch (error: any) {
      console.error('Failed to save category:', error);
      const errorMsg = error.response?.data?.message || '저장에 실패했습니다.';
      toast.error(errorMsg);
    }
  };

  const handleToggleActive = async (id: string, currentStatus: boolean) => {
    try {
      await authClient.api.patch(`/api/membership/categories/${id}`, {
        isActive: !currentStatus,
      });
      toast.success(`카테고리가 ${!currentStatus ? '활성화' : '비활성화'}되었습니다.`);
      fetchCategories();
    } catch (error) {
      toast.error('상태 변경에 실패했습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AdminBreadcrumb
        items={[
          { label: '홈', href: '/admin' },
          { label: '회원 분류 관리' }
        ]}
      />

      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-semibold text-gray-900">회원 분류 관리</h1>
                <p className="mt-1 text-sm text-gray-600">
                  회원 분류와 연회비 설정을 관리할 수 있습니다.
                </p>
              </div>
              {!isCreating && (
                <div className="flex gap-3">
                  <ExportButton type="categories" />
                  <button
                    onClick={handleStartCreate}
                    className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <Plus className="w-5 h-5 mr-2" />
                    분류 추가
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="mt-4 text-gray-600">로딩 중...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Create Form */}
                {isCreating && (
                  <div className="border border-blue-300 rounded-lg p-4 bg-blue-50">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          분류명 *
                        </label>
                        <input
                          type="text"
                          value={formData.name}
                          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="예: 정회원"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          정렬 순서
                        </label>
                        <input
                          type="number"
                          value={formData.sortOrder}
                          onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          설명
                        </label>
                        <textarea
                          value={formData.description}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          rows={2}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="분류에 대한 설명을 입력하세요"
                        />
                      </div>
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.requiresAnnualFee}
                            onChange={(e) => setFormData({ ...formData, requiresAnnualFee: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">연회비 필요</span>
                        </label>
                      </div>
                      {formData.requiresAnnualFee && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            연회비 금액 (원)
                          </label>
                          <input
                            type="number"
                            value={formData.annualFeeAmount}
                            onChange={(e) => setFormData({ ...formData, annualFeeAmount: e.target.value })}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="50000"
                          />
                        </div>
                      )}
                      <div>
                        <label className="flex items-center">
                          <input
                            type="checkbox"
                            checked={formData.isActive}
                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                            className="mr-2"
                          />
                          <span className="text-sm font-medium text-gray-700">활성 상태</span>
                        </label>
                      </div>
                    </div>
                    <div className="flex gap-2 mt-4">
                      <button
                        onClick={handleSave}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Save className="w-4 h-4 mr-2" />
                        저장
                      </button>
                      <button
                        onClick={handleCancelEdit}
                        className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                      >
                        <X className="w-4 h-4 mr-2" />
                        취소
                      </button>
                    </div>
                  </div>
                )}

                {/* Category List */}
                {categories.map((category) => (
                  <div
                    key={category.id}
                    className={`border rounded-lg p-4 ${editingId === category.id ? 'border-blue-300 bg-blue-50' : 'border-gray-200 bg-white'}`}
                  >
                    {editingId === category.id ? (
                      // Edit Form
                      <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              분류명 *
                            </label>
                            <input
                              type="text"
                              value={formData.name}
                              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              정렬 순서
                            </label>
                            <input
                              type="number"
                              value={formData.sortOrder}
                              onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              설명
                            </label>
                            <textarea
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              rows={2}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            />
                          </div>
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.requiresAnnualFee}
                                onChange={(e) => setFormData({ ...formData, requiresAnnualFee: e.target.checked })}
                                className="mr-2"
                              />
                              <span className="text-sm font-medium text-gray-700">연회비 필요</span>
                            </label>
                          </div>
                          {formData.requiresAnnualFee && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                연회비 금액 (원)
                              </label>
                              <input
                                type="number"
                                value={formData.annualFeeAmount}
                                onChange={(e) => setFormData({ ...formData, annualFeeAmount: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              />
                            </div>
                          )}
                          <div>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={formData.isActive}
                                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                className="mr-2"
                              />
                              <span className="text-sm font-medium text-gray-700">활성 상태</span>
                            </label>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-4">
                          <button
                            onClick={handleSave}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                          >
                            <Save className="w-4 h-4 mr-2" />
                            저장
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                          >
                            <X className="w-4 h-4 mr-2" />
                            취소
                          </button>
                        </div>
                      </>
                    ) : (
                      // Display Mode
                      <>
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-semibold text-gray-900">{category.name}</h3>
                              <span className="text-sm text-gray-500">#{category.sortOrder}</span>
                              {category.isActive ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                                  활성
                                </span>
                              ) : (
                                <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs rounded-full">
                                  비활성
                                </span>
                              )}
                            </div>
                            {category.description && (
                              <p className="mt-1 text-sm text-gray-600">{category.description}</p>
                            )}
                            <div className="mt-3 flex gap-4">
                              {category.requiresAnnualFee ? (
                                <div className="flex items-center text-sm text-gray-700">
                                  <DollarSign className="w-4 h-4 mr-1 text-green-600" />
                                  연회비: {category.annualFeeAmount?.toLocaleString()}원
                                </div>
                              ) : (
                                <div className="text-sm text-gray-500">연회비 없음</div>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleStartEdit(category)}
                              className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="수정"
                            >
                              <Edit className="w-5 h-5" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}

                {categories.length === 0 && !isCreating && (
                  <div className="text-center py-12 text-gray-500">
                    카테고리가 없습니다. 새로운 분류를 추가하세요.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CategoryManagement;
