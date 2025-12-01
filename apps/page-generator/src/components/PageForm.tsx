/**
 * Page Form Component
 * Form for entering page metadata (title, slug, status, etc.)
 */

import { FC, useState } from 'react';
import { generateSlug } from '../utils/slug';

interface PageFormData {
  title: string;
  slug: string;
  excerpt?: string;
  status: 'draft' | 'publish';
  type: 'page' | 'post';
  showInMenu: boolean;
}

interface PageFormProps {
  onSubmit: (data: PageFormData) => void;
  isSubmitting?: boolean;
  disabled?: boolean;
}

export const PageForm: FC<PageFormProps> = ({
  onSubmit,
  isSubmitting = false,
  disabled = false,
}) => {
  const [formData, setFormData] = useState<PageFormData>({
    title: '',
    slug: '',
    excerpt: '',
    status: 'draft',
    type: 'page',
    showInMenu: false,
  });

  const [autoSlug, setAutoSlug] = useState(true);

  const handleTitleChange = (title: string) => {
    setFormData((prev) => ({
      ...prev,
      title,
      slug: autoSlug ? generateSlug(title) : prev.slug,
    }));
  };

  const handleSlugChange = (slug: string) => {
    setAutoSlug(false);
    setFormData((prev) => ({ ...prev, slug }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
          Page Title *
        </label>
        <input
          type="text"
          id="title"
          value={formData.title}
          onChange={(e) => handleTitleChange(e.target.value)}
          required
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          placeholder="Enter page title"
        />
      </div>

      <div>
        <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
          Slug *
          {autoSlug && (
            <span className="ml-2 text-xs text-gray-500">(auto-generated)</span>
          )}
        </label>
        <input
          type="text"
          id="slug"
          value={formData.slug}
          onChange={(e) => handleSlugChange(e.target.value)}
          required
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 font-mono text-sm"
          placeholder="page-slug"
        />
      </div>

      <div>
        <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 mb-1">
          Excerpt
        </label>
        <textarea
          id="excerpt"
          value={formData.excerpt}
          onChange={(e) => setFormData((prev) => ({ ...prev, excerpt: e.target.value }))}
          disabled={disabled}
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          rows={2}
          placeholder="Short description (optional)"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
            Type
          </label>
          <select
            id="type"
            value={formData.type}
            onChange={(e) =>
              setFormData((prev) => ({ ...prev, type: e.target.value as 'page' | 'post' }))
            }
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="page">Page</option>
            <option value="post">Post</option>
          </select>
        </div>

        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
            Status
          </label>
          <select
            id="status"
            value={formData.status}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                status: e.target.value as 'draft' | 'publish',
              }))
            }
            disabled={disabled}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
          >
            <option value="draft">Draft</option>
            <option value="publish">Publish</option>
          </select>
        </div>
      </div>

      <div className="flex items-center">
        <input
          type="checkbox"
          id="showInMenu"
          checked={formData.showInMenu}
          onChange={(e) =>
            setFormData((prev) => ({ ...prev, showInMenu: e.target.checked }))
          }
          disabled={disabled}
          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
        />
        <label htmlFor="showInMenu" className="ml-2 text-sm text-gray-700">
          Show in menu
        </label>
      </div>

      <button
        type="submit"
        disabled={disabled || isSubmitting || !formData.title || !formData.slug}
        className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium"
      >
        {isSubmitting ? 'Creating Page...' : 'Create Page'}
      </button>
    </form>
  );
};
