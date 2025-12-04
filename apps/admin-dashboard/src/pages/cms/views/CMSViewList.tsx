/**
 * CMS V2 - View Templates Management
 *
 * Lists all View Templates with CRUD operations
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, Copy, Layers } from 'lucide-react';
import cmsAPI, { View, ViewStatus } from '@/lib/cms';
import toast from 'react-hot-toast';
import PreviewFrame from '@/components/cms/PreviewFrame';

export default function CMSViewList() {
  const [views, setViews] = useState<View[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<ViewStatus | 'all'>('all');
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadViews();
  }, [filter]);

  const loadViews = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await cmsAPI.listViews(params);
      setViews(response.data);
    } catch (error) {
      console.error('Failed to load views:', error);
      toast.error('Failed to load View Templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this view?')) {
      return;
    }

    try {
      await cmsAPI.deleteView(id);
      toast.success('View deleted successfully');
      loadViews();
    } catch (error) {
      console.error('Failed to delete view:', error);
      toast.error('Failed to delete view');
    }
  };

  const handleClone = async (id: string) => {
    try {
      await cmsAPI.cloneView(id);
      toast.success('View cloned successfully');
      loadViews();
    } catch (error) {
      console.error('Failed to clone view:', error);
      toast.error('Failed to clone view');
    }
  };

  const getStatusBadge = (status: ViewStatus) => {
    const badges = {
      [ViewStatus.ACTIVE]: 'bg-green-100 text-green-800',
      [ViewStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [ViewStatus.ARCHIVED]: 'bg-yellow-100 text-yellow-800',
    };
    return badges[status] || badges[ViewStatus.DRAFT];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Layers className="w-6 h-6" />
              View Templates
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage view templates for page rendering
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/cms/views/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create View
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === 'all'
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter(ViewStatus.ACTIVE)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === ViewStatus.ACTIVE
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setFilter(ViewStatus.DRAFT)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === ViewStatus.DRAFT
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => setFilter(ViewStatus.ARCHIVED)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === ViewStatus.ARCHIVED
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Archived
          </button>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && views.length === 0 && (
        <div className="text-center py-12">
          <Layers className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No views found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new view template.
          </p>
        </div>
      )}

      {/* View List */}
      {!loading && views.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {views.map((view) => (
              <li key={view.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{view.name}</h3>
                      <p className="text-sm text-gray-500">
                        Slug: {view.slug} | Type: {view.type}
                        {view.postTypeSlug && ` | CPT: ${view.postTypeSlug}`}
                      </p>
                      {view.description && (
                        <p className="mt-1 text-sm text-gray-600">{view.description}</p>
                      )}
                      <div className="mt-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                            view.status
                          )}`}
                        >
                          {view.status}
                        </span>
                        <span className="ml-2 text-xs text-gray-400">
                          {view.schema.components?.length || 0} components
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setPreviewSlug(view.slug)}
                        className="p-2 text-gray-400 hover:text-purple-600"
                        title="Preview"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleClone(view.id)}
                        className="p-2 text-gray-400 hover:text-purple-600"
                        title="Clone"
                      >
                        <Copy className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => navigate(`/admin/cms/views/${view.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(view.id)}
                        className="p-2 text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Preview Frame */}
      {previewSlug && (
        <PreviewFrame
          slug={previewSlug}
          onClose={() => setPreviewSlug(null)}
        />
      )}
    </div>
  );
}
