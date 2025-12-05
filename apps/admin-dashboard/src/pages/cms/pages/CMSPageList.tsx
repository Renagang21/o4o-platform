/**
 * CMS V2 - Pages Management with Publishing Workflow
 *
 * Lists all CMS Pages with CRUD and publishing operations
 */

import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2, Eye, FileText, Send, Archive as ArchiveIcon } from 'lucide-react';
import cmsAPI, { Page, PageStatus } from '@/lib/cms';
import { useToast } from '@/contexts/ToastContext';
import PreviewFrame from '@/components/cms/PreviewFrame';

export default function CMSPageList() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<PageStatus | 'all'>('all');
  const [previewSlug, setPreviewSlug] = useState<string | null>(null);

  useEffect(() => {
    loadPages();
  }, [filter, location.key]); // location.key changes on navigation

  const loadPages = async () => {
    try {
      setLoading(true);
      const params = filter !== 'all' ? { status: filter } : {};
      const response = await cmsAPI.listPages(params);
      setPages(response.data);
    } catch (error) {
      console.error('Failed to load pages:', error);
      toast.error('Failed to load CMS Pages');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this page?')) {
      return;
    }

    try {
      await cmsAPI.deletePage(id);
      toast.success('Page deleted successfully');
      loadPages();
    } catch (error) {
      console.error('Failed to delete page:', error);
      toast.error('Failed to delete page');
    }
  };

  const handlePublish = async (id: string) => {
    try {
      await cmsAPI.publishPage(id);
      toast.success('Page published successfully');
      loadPages();
    } catch (error) {
      console.error('Failed to publish page:', error);
      toast.error('Failed to publish page');
    }
  };

  const handleArchive = async (id: string) => {
    try {
      await cmsAPI.archivePage(id);
      toast.success('Page archived successfully');
      loadPages();
    } catch (error) {
      console.error('Failed to archive page:', error);
      toast.error('Failed to archive page');
    }
  };

  const getStatusBadge = (status: PageStatus) => {
    const badges = {
      [PageStatus.PUBLISHED]: 'bg-green-100 text-green-800',
      [PageStatus.DRAFT]: 'bg-gray-100 text-gray-800',
      [PageStatus.SCHEDULED]: 'bg-blue-100 text-blue-800',
      [PageStatus.ARCHIVED]: 'bg-yellow-100 text-yellow-800',
    };
    return badges[status] || badges[PageStatus.DRAFT];
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              CMS Pages
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage dynamic pages with publishing workflow
            </p>
          </div>
          <button
            onClick={() => navigate('/admin/cms/pages/new')}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Page
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
            onClick={() => setFilter(PageStatus.PUBLISHED)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === PageStatus.PUBLISHED
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Published
          </button>
          <button
            onClick={() => setFilter(PageStatus.DRAFT)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === PageStatus.DRAFT
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => setFilter(PageStatus.SCHEDULED)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === PageStatus.SCHEDULED
                ? 'bg-blue-100 text-blue-700'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Scheduled
          </button>
          <button
            onClick={() => setFilter(PageStatus.ARCHIVED)}
            className={`px-3 py-1 rounded-md text-sm ${
              filter === PageStatus.ARCHIVED
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
      {!loading && pages.length === 0 && (
        <div className="text-center py-12">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">No pages found</h3>
          <p className="mt-1 text-sm text-gray-500">
            Get started by creating a new CMS page.
          </p>
        </div>
      )}

      {/* Page List */}
      {!loading && pages.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {pages.map((page) => (
              <li key={page.id}>
                <div className="px-4 py-4 sm:px-6">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-lg font-medium text-gray-900">{page.title}</h3>
                      <p className="text-sm text-gray-500">
                        Slug: {page.slug}
                        {page.viewId && ` | View ID: ${page.viewId}`}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(
                            page.status
                          )}`}
                        >
                          {page.status}
                        </span>
                        {page.publishedAt && (
                          <span className="text-xs text-gray-500">
                            Published: {new Date(page.publishedAt).toLocaleDateString()}
                          </span>
                        )}
                        {page.scheduledAt && (
                          <span className="text-xs text-blue-600">
                            Scheduled: {new Date(page.scheduledAt).toLocaleDateString()}
                          </span>
                        )}
                        <span className="text-xs text-gray-400">v{page.currentVersion}</span>
                      </div>
                      {page.tags && page.tags.length > 0 && (
                        <div className="mt-1 flex gap-1">
                          {page.tags.map((tag) => (
                            <span
                              key={tag}
                              className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {/* Preview Button - Available for all statuses */}
                      <button
                        onClick={() => setPreviewSlug(page.slug)}
                        className="p-2 text-gray-400 hover:text-purple-600"
                        title="Preview"
                      >
                        <Eye className="w-5 h-5" />
                      </button>

                      {page.status === PageStatus.PUBLISHED && (
                        <button
                          onClick={() => window.open(`https://neture.co.kr/${page.slug}`, '_blank')}
                          className="p-2 text-gray-400 hover:text-blue-600"
                          title="View Live"
                        >
                          <Eye className="w-5 h-5" />
                        </button>
                      )}
                      {page.status === PageStatus.DRAFT && (
                        <button
                          onClick={() => handlePublish(page.id)}
                          className="p-2 text-gray-400 hover:text-green-600"
                          title="Publish"
                        >
                          <Send className="w-5 h-5" />
                        </button>
                      )}
                      {page.status === PageStatus.PUBLISHED && (
                        <button
                          onClick={() => handleArchive(page.id)}
                          className="p-2 text-gray-400 hover:text-yellow-600"
                          title="Archive"
                        >
                          <ArchiveIcon className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => navigate(`/admin/cms/pages/${page.id}/edit`)}
                        className="p-2 text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDelete(page.id)}
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
