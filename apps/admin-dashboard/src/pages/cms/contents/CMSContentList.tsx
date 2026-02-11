/**
 * CMS Content List Page
 *
 * WO-P3-CMS-ADMIN-CRUD-P0: Admin CRUD for Hero/Notice content
 *
 * Features:
 * - List all CMS contents (Hero, Notice only for P0)
 * - Filter by type, serviceKey, status
 * - Create new content
 * - Edit existing content
 * - Change status (draft -> published -> archived)
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Plus,
  Edit,
  FileText,
  Layout,
  CheckCircle,
  Archive,
  Filter,
  X,
} from 'lucide-react';
import cmsAPI, { CmsContent, ContentType, ContentStatus } from '@/lib/cms';
import toast from 'react-hot-toast';
import ContentFormModal from './ContentFormModal';

// Available services for filtering
const SERVICES = [
  { value: '', label: 'All Services' },
  { value: 'glycopharm', label: 'Glycopharm' },
  { value: 'kpa', label: 'KPA Society' },
  { value: 'glucoseview', label: 'GlucoseView' },
  { value: 'neture', label: 'Neture' },
  { value: 'k-cosmetics', label: 'K-Cosmetics' },
];

// Content types for P0 (only hero and notice)
const CONTENT_TYPES: { value: ContentType | ''; label: string }[] = [
  { value: '', label: 'All Types' },
  { value: 'hero', label: 'Hero' },
  { value: 'notice', label: 'Notice' },
];

// Status options
const STATUSES: { value: ContentStatus | ''; label: string }[] = [
  { value: '', label: 'All Status' },
  { value: 'draft', label: 'Draft' },
  { value: 'published', label: 'Published' },
  { value: 'archived', label: 'Archived' },
];

export default function CMSContentList() {
  const [contents, setContents] = useState<CmsContent[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<ContentType | ''>('');
  const [filterService, setFilterService] = useState('');
  const [filterStatus, setFilterStatus] = useState<ContentStatus | ''>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingContent, setEditingContent] = useState<CmsContent | null>(null);
  const [total, setTotal] = useState(0);

  const loadContents = useCallback(async () => {
    try {
      setLoading(true);
      const params: Record<string, string> = {};
      if (filterType) params.type = filterType;
      if (filterService) params.serviceKey = filterService;
      if (filterStatus) params.status = filterStatus;

      const response = await cmsAPI.listContents(params);
      setContents(response.data);
      setTotal(response.pagination.total);
    } catch (error) {
      console.error('Failed to load contents:', error);
      toast.error('Failed to load contents');
    } finally {
      setLoading(false);
    }
  }, [filterType, filterService, filterStatus]);

  useEffect(() => {
    loadContents();
  }, [loadContents]);

  const handleCreate = () => {
    setEditingContent(null);
    setIsModalOpen(true);
  };

  const handleEdit = (content: CmsContent) => {
    setEditingContent(content);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingContent(null);
  };

  const handleModalSave = async () => {
    await loadContents();
    handleModalClose();
  };

  const handlePublish = async (content: CmsContent) => {
    try {
      await cmsAPI.updateContentStatus(content.id, 'published');
      toast.success('Content published successfully');
      loadContents();
    } catch (error: any) {
      console.error('Failed to publish content:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to publish content');
    }
  };

  const handleArchive = async (content: CmsContent) => {
    if (!confirm('Are you sure you want to archive this content?')) {
      return;
    }
    try {
      await cmsAPI.updateContentStatus(content.id, 'archived');
      toast.success('Content archived successfully');
      loadContents();
    } catch (error: any) {
      console.error('Failed to archive content:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to archive content');
    }
  };

  const getStatusBadge = (status: ContentStatus) => {
    const badges: Record<ContentStatus, string> = {
      draft: 'bg-gray-100 text-gray-800',
      published: 'bg-green-100 text-green-800',
      archived: 'bg-yellow-100 text-yellow-800',
    };
    return badges[status];
  };

  const getTypeBadge = (type: ContentType) => {
    const badges: Record<ContentType, { bg: string; icon: React.JSX.Element }> = {
      hero: { bg: 'bg-blue-100 text-blue-800', icon: <Layout className="w-3 h-3" /> },
      notice: { bg: 'bg-purple-100 text-purple-800', icon: <FileText className="w-3 h-3" /> },
      news: { bg: 'bg-cyan-100 text-cyan-800', icon: <FileText className="w-3 h-3" /> },
      featured: { bg: 'bg-amber-100 text-amber-800', icon: <FileText className="w-3 h-3" /> },
      promo: { bg: 'bg-pink-100 text-pink-800', icon: <FileText className="w-3 h-3" /> },
      event: { bg: 'bg-red-100 text-red-800', icon: <FileText className="w-3 h-3" /> },
    };
    return badges[type] || badges.notice;
  };

  const clearFilters = () => {
    setFilterType('');
    setFilterService('');
    setFilterStatus('');
  };

  const hasActiveFilters = filterType || filterService || filterStatus;

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <FileText className="w-6 h-6" />
              CMS Contents
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Manage Hero and Notice content for all services
            </p>
          </div>
          <button
            onClick={handleCreate}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Content
          </button>
        </div>

        {/* Filters */}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Filter className="w-4 h-4 text-gray-400" />

          {/* Type Filter */}
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as ContentType | '')}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {CONTENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>

          {/* Service Filter */}
          <select
            value={filterService}
            onChange={(e) => setFilterService(e.target.value)}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SERVICES.map((service) => (
              <option key={service.value} value={service.value}>
                {service.label}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as ContentStatus | '')}
            className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 flex items-center gap-1"
            >
              <X className="w-3 h-3" />
              Clear
            </button>
          )}

          <span className="text-sm text-gray-500">
            {total} content{total !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      )}

      {/* Empty State */}
      {!loading && contents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <FileText className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            {hasActiveFilters ? 'No contents match your filters' : 'No contents found'}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {hasActiveFilters
              ? 'Try adjusting your filters or create new content.'
              : 'Get started by creating a new content.'}
          </p>
          <div className="mt-6">
            <button
              onClick={handleCreate}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Content
            </button>
          </div>
        </div>
      )}

      {/* Content List */}
      {!loading && contents.length > 0 && (
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {contents.map((content) => {
              const typeBadge = getTypeBadge(content.type);
              return (
                <li key={content.id}>
                  <div className="px-4 py-4 sm:px-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-medium text-gray-900 truncate">
                            {content.title}
                          </h3>
                        </div>
                        {content.summary && (
                          <p className="mt-1 text-sm text-gray-600 truncate">
                            {content.summary}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-2 flex-wrap">
                          {/* Type Badge */}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${typeBadge.bg}`}
                          >
                            {typeBadge.icon}
                            {content.type}
                          </span>

                          {/* Service Badge */}
                          {content.serviceKey && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                              {content.serviceKey}
                            </span>
                          )}

                          {/* Status Badge */}
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadge(content.status)}`}
                          >
                            {content.status}
                          </span>

                          {/* Pinned Badge */}
                          {content.isPinned && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                              Pinned
                            </span>
                          )}

                          {/* Operator Picked Badge */}
                          {content.isOperatorPicked && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                              Operator Picked
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        {/* Edit Button */}
                        <button
                          onClick={() => handleEdit(content)}
                          className="p-2 text-gray-400 hover:text-gray-600"
                          title="Edit"
                        >
                          <Edit className="w-5 h-5" />
                        </button>

                        {/* Publish Button (for draft) */}
                        {content.status === 'draft' && (
                          <button
                            onClick={() => handlePublish(content)}
                            className="p-2 text-gray-400 hover:text-green-600"
                            title="Publish"
                          >
                            <CheckCircle className="w-5 h-5" />
                          </button>
                        )}

                        {/* Archive Button (for draft or published) */}
                        {content.status !== 'archived' && (
                          <button
                            onClick={() => handleArchive(content)}
                            className="p-2 text-gray-400 hover:text-yellow-600"
                            title="Archive"
                          >
                            <Archive className="w-5 h-5" />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="mt-2 text-xs text-gray-400">
                      Created: {new Date(content.createdAt).toLocaleString()}
                      {content.publishedAt && (
                        <> | Published: {new Date(content.publishedAt).toLocaleString()}</>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <ContentFormModal
          content={editingContent}
          onClose={handleModalClose}
          onSave={handleModalSave}
        />
      )}
    </div>
  );
}
