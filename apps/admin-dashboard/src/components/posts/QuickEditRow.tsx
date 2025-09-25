import React from 'react';
import { Post } from '@/hooks/posts/usePostsData';

interface QuickEditRowProps {
  data: {
    title: string;
    slug: string;
    status: Post['status'];
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