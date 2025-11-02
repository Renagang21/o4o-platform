import { FC } from 'react';
import {
  Plus,
  Play,
  Copy,
  Trash2,
  Database,
  Table2,
  List,
  Grid,
  BarChart3,
  Globe,
  Calendar,
  Layers
} from 'lucide-react';
import type { EnhancedView, ViewVisualization } from '../../../types/enhanced-views';

interface EnhancedViewsListProps {
  views: EnhancedView[];
  onCreateClick: () => void;
  onPreview: (view: EnhancedView) => void;
  onCopyShortcode: (view: EnhancedView) => void;
  onDelete: (id: string) => void;
}

export const EnhancedViewsList: FC<EnhancedViewsListProps> = ({
  views,
  onCreateClick,
  onPreview,
  onCopyShortcode,
  onDelete
}) => {
  const getVisualizationIcon = (type: ViewVisualization['type']) => {
    const icons = {
      table: <Table2 className="w-4 h-4 text-gray-500" />,
      list: <List className="w-4 h-4 text-gray-500" />,
      grid: <Grid className="w-4 h-4 text-gray-500" />,
      chart: <BarChart3 className="w-4 h-4 text-gray-500" />,
      map: <Globe className="w-4 h-4 text-gray-500" />,
      calendar: <Calendar className="w-4 h-4 text-gray-500" />,
      kanban: <Layers className="w-4 h-4 text-gray-500" />
    };
    return icons[type] || null;
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">Registered Views</h3>
          <p className="text-sm text-gray-500">Total {views.length} views created</p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New View
        </button>
      </div>

      {views.length === 0 ? (
        <div className="text-center py-12">
          <Database className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            No views created yet
          </h3>
          <p className="text-gray-600 mb-4">
            Create your first dynamic query view
          </p>
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            Create View
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {views.map(view => (
            <div key={view.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{view.title}</h3>
                    {getVisualizationIcon(view.visualization.type)}
                  </div>
                  <p className="text-sm text-gray-500">/{view.name}</p>
                  {view.description && (
                    <p className="text-gray-600 text-sm mt-2">{view.description}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onPreview(view)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="Preview"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCopyShortcode(view)}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                    title="Copy shortcode"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(view.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Query Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Source:</span>
                    <div className="font-medium">{view.query.source.tables.join(', ')}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Type:</span>
                    <div className="font-medium capitalize">{view.query.source.type}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Fields:</span>
                    <div className="font-medium">{view.query.select.fields.length}</div>
                  </div>
                  <div>
                    <span className="text-gray-500">Cache:</span>
                    <div className="font-medium">
                      {view.cache.enabled ? `${view.cache.duration}min` : 'Disabled'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Features */}
              <div className="flex flex-wrap gap-2 mb-4">
                {view.query.source.joins && view.query.source.joins.length > 0 && (
                  <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs">
                    Joins
                  </span>
                )}
                {view.query.select.aggregates && view.query.select.aggregates.length > 0 && (
                  <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                    Aggregates
                  </span>
                )}
                {view.query.groupBy && view.query.groupBy.length > 0 && (
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    Group By
                  </span>
                )}
                {view.security.rowLevelSecurity && view.security.rowLevelSecurity.length > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs">
                    RLS
                  </span>
                )}
                {view.schedule?.enabled && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                    Scheduled
                  </span>
                )}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span>v{view.version}</span>
                <span>Updated {new Date(view.updatedAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
