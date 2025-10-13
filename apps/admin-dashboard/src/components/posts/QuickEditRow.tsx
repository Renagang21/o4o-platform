import React, { useState, useEffect } from 'react';
import { Post } from '@/hooks/posts/usePostsData';
import { authClient } from '@o4o/auth-client';

interface QuickEditRowProps {
  data: {
    title: string;
    slug: string;
    status: Post['status'];
    categoryIds?: string[];
    tags?: string;
  };
  onChange: (data: any) => void;
  onSave: () => void;
  onCancel: () => void;
  colSpan: number;
}

export const QuickEditRow: React.FC<QuickEditRowProps> = ({
  data,
  onChange,
  onSave,
  onCancel,
  colSpan
}) => {
  const [categories, setCategories] = useState<Array<{id: string, name: string}>>([]);
  const [loadingCategories, setLoadingCategories] = useState(true);

  // Fetch categories on mount
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await authClient.api.get('/v1/content/categories');

        const result = response.data;
        const categoriesData = result.data || result.categories || [];
        setCategories(categoriesData.map((cat: any) => ({
          id: cat.id,
          name: cat.name || cat.title
        })));
      } catch (error) {
        // Error handling
      } finally {
        setLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryToggle = (categoryId: string) => {
    const currentCategories = data.categoryIds || [];
    const newCategories = currentCategories.includes(categoryId)
      ? currentCategories.filter(id => id !== categoryId)
      : [...currentCategories, categoryId];
    onChange({ ...data, categoryIds: newCategories });
  };
  return (
    <tr className="border-b border-gray-200 bg-gray-50">
      <td colSpan={colSpan} className="p-4">
        <div className="bg-white border border-gray-300 rounded p-4">
          <h3 className="font-medium text-sm mb-3">Quick Edit</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={data.title}
                onChange={(e) => onChange({...data, title: e.target.value})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Slug</label>
              <input
                type="text"
                value={data.slug}
                onChange={(e) => onChange({...data, slug: e.target.value})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={data.status}
                onChange={(e) => onChange({...data, status: e.target.value as Post['status']})}
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="published">Published</option>
                <option value="draft">Draft</option>
                <option value="pending">Pending Review</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Categories</label>
              <div className="border border-gray-300 rounded p-2 max-h-[150px] overflow-y-auto">
                {loadingCategories ? (
                  <span className="text-sm text-gray-500">Loading...</span>
                ) : categories.length > 0 ? (
                  <div className="space-y-1">
                    {categories.map(category => (
                      <label key={category.id} className="flex items-center text-sm">
                        <input
                          type="checkbox"
                          checked={(data.categoryIds || []).includes(category.id)}
                          onChange={() => handleCategoryToggle(category.id)}
                          className="mr-2"
                        />
                        <span>{category.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <span className="text-sm text-gray-500">No categories available</span>
                )}
              </div>
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Tags</label>
              <input
                type="text"
                value={data.tags || ''}
                onChange={(e) => onChange({...data, tags: e.target.value})}
                placeholder="쉼표로 구분하여 입력"
                className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              onClick={onSave}
              className="px-4 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Update
            </button>
            <button
              onClick={onCancel}
              className="px-4 py-1.5 text-sm bg-gray-100 text-gray-700 border border-gray-300 rounded hover:bg-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </td>
    </tr>
  );
};