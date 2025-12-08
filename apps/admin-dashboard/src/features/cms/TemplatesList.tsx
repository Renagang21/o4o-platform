/**
 * CMS Templates List
 *
 * Displays all CMS templates with status badges (draft/published)
 */

import React, { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { ContentApi } from '@/api/contentApi';
import type { Template } from '@/types/content';
import toast from 'react-hot-toast';
import { Badge } from '@/components/ui/badge';

const TemplatesList: React.FC = () => {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'draft' | 'published'>('all');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await ContentApi.getTemplates();
      if (response.data) {
        setTemplates(response.data);
      }
    } catch (err: any) {
      console.error('Failed to fetch templates:', err);
      setError('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handlePublish = async (template: Template) => {
    try {
      await ContentApi.publishTemplate(template.id);
      toast.success(`"${template.name}" published successfully`);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to publish template:', err);
      toast.error('Failed to publish template');
    }
  };

  const handleUnpublish = async (template: Template) => {
    try {
      await ContentApi.unpublishTemplate(template.id);
      toast.success(`"${template.name}" unpublished successfully`);
      fetchTemplates();
    } catch (err) {
      console.error('Failed to unpublish template:', err);
      toast.error('Failed to unpublish template');
    }
  };

  const handleDelete = async (template: Template) => {
    if (!confirm(`Are you sure you want to delete "${template.name}"?`)) {
      return;
    }

    try {
      await ContentApi.deleteTemplate(template.id);
      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (err) {
      console.error('Failed to delete template:', err);
      toast.error('Failed to delete template');
    }
  };

  // Filter templates
  const filteredTemplates = templates.filter((template) => {
    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !template.name.toLowerCase().includes(query) &&
        !template.description?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }

    // Status filter
    if (statusFilter !== 'all' && template.status !== statusFilter) {
      return false;
    }

    return true;
  });

  // Get status badge
  const getStatusBadge = (status: 'draft' | 'published') => {
    if (status === 'published') {
      return (
        <Badge variant="default" className="bg-blue-100 text-blue-800 hover:bg-blue-100">
          Published
        </Badge>
      );
    }
    return (
      <Badge variant="secondary" className="bg-gray-100 text-gray-600">
        Draft
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex items-center gap-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <FileText className="w-8 h-8 text-blue-600" />
          <h1 className="text-2xl font-bold">CMS Templates</h1>
        </div>
        <button className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          New Template
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-2">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'all' | 'draft' | 'published')}
          className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="published">Published</option>
        </select>
      </div>

      {/* Templates Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Name</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Version</th>
              <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Updated</th>
              <th className="px-6 py-3 text-right text-sm font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredTemplates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                  <p className="text-lg font-medium mb-1">No templates found</p>
                  <p className="text-sm">Create your first template to get started</p>
                </td>
              </tr>
            ) : (
              filteredTemplates.map((template) => (
                <tr key={template.id} className="border-b hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div>
                      <div className="font-medium text-gray-900">{template.name}</div>
                      {template.description && (
                        <div className="text-sm text-gray-500 mt-1 line-clamp-1">
                          {template.description}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <code className="px-2 py-1 bg-gray-100 text-sm rounded">{template.type}</code>
                  </td>
                  <td className="px-6 py-4">{getStatusBadge(template.status)}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {template.version || '1.0.0'}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {new Date(template.updatedAt).toLocaleDateString('ko-KR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      {template.status === 'draft' ? (
                        <button
                          onClick={() => handlePublish(template)}
                          className="p-2 text-green-600 hover:bg-green-50 rounded"
                          title="Publish"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUnpublish(template)}
                          className="p-2 text-gray-600 hover:bg-gray-100 rounded"
                          title="Unpublish"
                        >
                          <EyeOff className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(template)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default TemplatesList;
