import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Shield } from 'lucide-react';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import toast from 'react-hot-toast';
import { ContentApi } from '@/api/contentApi';
import { useAuthStore } from '@/stores/authStore';
import { Category as CategoryType } from '@/types/content';
import { hasPermission, hasAnyPermission } from '@/utils/permissions';
import { authClient } from '@o4o/auth-client';

interface CategoryWithPermissions extends CategoryType {
  permissions?: {
    visibility: 'public' | 'admin' | 'moderator' | 'custom';
    allowedRoles?: string[];
    allowedUsers?: string[];
  };
}

interface SystemRole {
  value: string;
  label: string;
  permissions: string[];
  permissionCount: number;
}

const CategoryEdit = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [categories, setCategories] = useState<CategoryType[]>([]);
  const [availableRoles, setAvailableRoles] = useState<SystemRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [category, setCategory] = useState<CategoryWithPermissions>({
    id: '',
    name: '',
    slug: '',
    description: '',
    parentId: '',
    order: 0,
    postCount: 0,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    permissions: {
      visibility: 'public',
      allowedRoles: [],
      allowedUsers: []
    }
  });

  // Check if user has permission to edit
  const hasEditPermission = hasAnyPermission(user, ['categories:write', 'system:admin']);

  // Fetch available roles from API
  useEffect(() => {
    const fetchRoles = async () => {
      try {
        const response = await authClient.api.get('/users/roles');

        if (response.data?.success && response.data.data) {
          setAvailableRoles(response.data.data);
        }
      } catch (error: any) {
        // If unauthorized, user may need to login again
        if (error.response?.status === 401) {
          toast.error('Session expired. Please login again.');
        } else {
          toast.error('Failed to load user roles');
        }
      } finally {
        setRolesLoading(false);
      }
    };

    fetchRoles();
  }, []);

  useEffect(() => {
    loadData();
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load all categories for parent selection
      const categoriesResponse = await ContentApi.getCategories();
      if (categoriesResponse.data) {
        setCategories(categoriesResponse.data || []);
      }

      // Load specific category if editing
      if (id && id !== 'new') {
        try {
          const response = await ContentApi.getCategory(id);
          if (response.data) {
            const categoryData = response.data;
            setCategory({
              ...categoryData,
              permissions: (categoryData as any).permissions || {
                visibility: 'public',
                allowedRoles: [],
                allowedUsers: []
              }
            });
          }
        } catch (error) {
          toast.error('Failed to load category');
        }
      }
    } catch (error) {
      toast.error('Failed to load category data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!hasEditPermission) {
      toast.error('You do not have permission to edit this category');
      return;
    }

    setSaving(true);
    try {
      const categoryData = {
        ...category,
        // Convert empty strings to undefined
        parentId: category.parentId || undefined
      };

      let response;
      if (!id || id === 'new') {
        response = await ContentApi.createCategory(categoryData);
      } else {
        response = await ContentApi.updateCategory(id, categoryData);
      }

      if (response.data) {
        toast.success(id === 'new' ? 'Category created successfully' : 'Category updated successfully');
        navigate('/categories');
      } else {
        toast.error('Failed to save category');
      }
    } catch (error) {
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handlePermissionChange = (visibility: 'public' | 'admin' | 'moderator' | 'custom') => {
    setCategory({
      ...category,
      permissions: {
        ...category.permissions!,
        visibility
      }
    });
  };

  const handleRoleToggle = (roleId: string) => {
    const currentRoles = category.permissions?.allowedRoles || [];
    const newRoles = currentRoles.includes(roleId)
      ? currentRoles.filter(r => r !== roleId)
      : [...currentRoles, roleId];

    setCategory({
      ...category,
      permissions: {
        ...category.permissions!,
        allowedRoles: newRoles
      }
    });
  };

  const generateSlug = () => {
    const slug = category.name
      .toLowerCase()
      .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setCategory({ ...category, slug });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!hasEditPermission) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">You do not have permission to edit this category.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <AdminBreadcrumb 
        items={[
          { label: 'Posts', path: '/posts' },
          { label: 'Categories', path: '/categories' },
          { label: id === 'new' ? 'Add New Category' : 'Edit Category' }
        ]} 
      />

      <div className="mb-8">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">
            {id === 'new' ? 'Add New Category' : 'Edit Category'}
          </h1>
          <button
            onClick={() => navigate('/categories')}
            className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Categories
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-sm">
        <div className="p-6 space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={category.name}
                onChange={(e) => setCategory({ ...category, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                required
              />
              <p className="mt-1 text-sm text-gray-500">The name is how it appears on your site.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Slug
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={category.slug}
                  onChange={(e) => setCategory({ ...category, slug: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
                <button
                  type="button"
                  onClick={generateSlug}
                  className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Generate
                </button>
              </div>
              <p className="mt-1 text-sm text-gray-500">The "slug" is the URL-friendly version of the name.</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parent Category
              </label>
              <select
                value={category.parentId || ''}
                onChange={(e) => setCategory({ ...category, parentId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">— No Parent —</option>
                {categories
                  .filter(c => c.id !== category.id)
                  .map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Description
              </label>
              <textarea
                value={category.description}
                onChange={(e) => setCategory({ ...category, description: e.target.value })}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              />
              <p className="mt-1 text-sm text-gray-500">The description is not prominent by default.</p>
            </div>
          </div>

          {/* Permissions Section */}
          <div className="border-t pt-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Permissions
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Who can see this category?
                </label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value="public"
                      checked={category.permissions?.visibility === 'public'}
                      onChange={() => handlePermissionChange('public')}
                      className="mr-2"
                    />
                    <span>Public (Everyone)</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value="admin"
                      checked={category.permissions?.visibility === 'admin'}
                      onChange={() => handlePermissionChange('admin')}
                      className="mr-2"
                    />
                    <span>Administrators Only</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value="moderator"
                      checked={category.permissions?.visibility === 'moderator'}
                      onChange={() => handlePermissionChange('moderator')}
                      className="mr-2"
                    />
                    <span>Moderators and Above</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="visibility"
                      value="custom"
                      checked={category.permissions?.visibility === 'custom'}
                      onChange={() => handlePermissionChange('custom')}
                      className="mr-2"
                    />
                    <span>Custom (Select specific roles)</span>
                  </label>
                </div>
              </div>

              {category.permissions?.visibility === 'custom' && (
                <div className="ml-6 p-4 bg-gray-50 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select allowed roles:
                  </label>
                  <div className="space-y-2">
                    {rolesLoading ? (
                      <span className="text-sm text-gray-500">Loading roles...</span>
                    ) : availableRoles.length > 0 ? (
                      availableRoles.map(role => (
                        <label key={role.value} className="flex items-center">
                          <input
                            type="checkbox"
                            checked={(category.permissions?.allowedRoles || []).includes(role.value)}
                            onChange={() => handleRoleToggle(role.value)}
                            className="mr-2"
                          />
                          <span>{role.label}</span>
                        </label>
                      ))
                    ) : (
                      <span className="text-sm text-gray-500">No roles available</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t flex justify-between">
          <button
            type="button"
            onClick={() => navigate('/categories')}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : (id === 'new' ? 'Create Category' : 'Update Category')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CategoryEdit;