/**
 * ViewsList Component
 * Displays list of created views with actions
 */

import { FC } from 'react';
import { Plus, Play, Copy, Edit3, Trash2 } from 'lucide-react';
import { Eye } from 'lucide-react';
import { View, AvailableCPT } from '../../../types/views';

interface ViewsListProps {
  views: View[];
  availableCPTs: AvailableCPT[];
  onCreateClick: () => void;
  onPreview: (view: View) => void;
  onCopyShortcode: (shortcode: string) => void;
  onEdit: (view: View) => void;
  onDelete: (id: string) => void;
}

export const ViewsList: FC<ViewsListProps> = ({
  views,
  availableCPTs,
  onCreateClick,
  onPreview,
  onCopyShortcode,
  onEdit,
  onDelete
}) => {
  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">등록된 View</h3>
          <p className="text-sm text-gray-500">총 {views.length}개의 View가 생성되어 있습니다.</p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 View 생성
        </button>
      </div>

      {views.length === 0 ? (
        <div className="text-center py-12">
          <Eye className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            아직 생성된 View가 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            첫 번째 동적 쿼리 View를 생성해보세요
          </p>
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            새 View 생성
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {views.map((view) => (
            <div key={view.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-semibold text-gray-900 text-lg">{view.title}</h3>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                      view.template.type === 'list' ? 'bg-blue-100 text-blue-800' :
                      view.template.type === 'grid' ? 'bg-green-100 text-green-800' :
                      view.template.type === 'table' ? 'bg-purple-100 text-purple-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {view.template.type === 'list' ? '목록' :
                       view.template.type === 'grid' ? '그리드' :
                       view.template.type === 'table' ? '테이블' : '커스텀'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">/{view.name}</p>
                  {view.description && (
                    <p className="text-gray-600 text-sm">{view.description}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onPreview(view)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="미리보기"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCopyShortcode(view.shortcode)}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                    title="숏코드 복사"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(view)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="편집"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(view.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Query Info */}
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <span className="text-sm text-gray-500">Post Type:</span>
                    <div className="font-medium">{availableCPTs.find(cpt => cpt.slug === view.query.postType)?.name || view.query.postType}</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">필터:</span>
                    <div className="font-medium">{view.query.filters.length}개</div>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">페이지당 항목:</span>
                    <div className="font-medium">
                      {view.query.pagination.enabled ?
                        view.query.pagination.itemsPerPage : '무제한'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Shortcode */}
              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-800">{view.shortcode}</code>
                  <button
                    onClick={() => onCopyShortcode(view.shortcode)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    복사
                  </button>
                </div>
              </div>

              {/* Template Fields */}
              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">표시 필드:</span>
                  <div className="flex gap-1">
                    {view.template.fields.slice(0, 3).map((field) => (
                      <span key={field} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {field}
                      </span>
                    ))}
                    {view.template.fields.length > 3 && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs">
                        +{view.template.fields.length - 3}개
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500">캐시:</span>
                  <span className={view.settings.cache ? 'text-green-600' : 'text-gray-400'}>
                    {view.settings.cache ? `${view.settings.cacheTime}분` : '사용 안함'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
