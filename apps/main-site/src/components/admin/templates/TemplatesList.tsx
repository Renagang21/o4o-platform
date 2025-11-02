import { FC } from 'react';
import {
  Plus,
  Edit3,
  Trash2,
  Play,
  Copy,
  FileCode,
  Layout,
  Layers
} from 'lucide-react';
import type { Template, AvailableCPT } from '../../../types/templates';

interface TemplatesListProps {
  templates: Template[];
  availableCPTs: AvailableCPT[];
  onCreateClick: () => void;
  onPreview: (template: Template) => void;
  onCopyShortcode: (shortcode: string) => void;
  onEdit: (template: Template) => void;
  onDelete: (id: string) => void;
}

export const TemplatesList: FC<TemplatesListProps> = ({
  templates,
  availableCPTs,
  onCreateClick,
  onPreview,
  onCopyShortcode,
  onEdit,
  onDelete
}) => {
  const getTemplateTypeLabel = (type: Template['type']) => {
    switch (type) {
      case 'single': return '단일 페이지';
      case 'archive': return '목록 페이지';
      case 'custom': return '커스텀';
      default: return type;
    }
  };

  const getTemplateTypeIcon = (type: Template['type']) => {
    switch (type) {
      case 'single': return <FileCode className="w-5 h-5" />;
      case 'archive': return <Layout className="w-5 h-5" />;
      case 'custom': return <Layers className="w-5 h-5" />;
      default: return <FileCode className="w-5 h-5" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900">등록된 Template</h3>
          <p className="text-sm text-gray-500">총 {templates.length}개의 템플릿이 생성되어 있습니다.</p>
        </div>
        <button
          onClick={onCreateClick}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새 Template 생성
        </button>
      </div>

      {templates.length === 0 ? (
        <div className="text-center py-12">
          <FileCode className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            아직 생성된 Template이 없습니다
          </h3>
          <p className="text-gray-600 mb-4">
            첫 번째 콘텐츠 템플릿을 생성해보세요
          </p>
          <button
            onClick={onCreateClick}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            새 Template 생성
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {templates.map(template => (
            <div key={template.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    {getTemplateTypeIcon(template.type)}
                    <h3 className="font-semibold text-gray-900">{template.title}</h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      template.type === 'single' ? 'bg-blue-100 text-blue-800' :
                      template.type === 'archive' ? 'bg-green-100 text-green-800' :
                      'bg-purple-100 text-purple-800'
                    }`}>
                      {getTemplateTypeLabel(template.type)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mb-1">/{template.name}</p>
                  {template.description && (
                    <p className="text-gray-600 text-sm">{template.description}</p>
                  )}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => onPreview(template)}
                    className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                    title="미리보기"
                  >
                    <Play className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onCopyShortcode(template.shortcode)}
                    className="p-2 text-gray-400 hover:text-purple-600 transition-colors"
                    title="숏코드 복사"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onEdit(template)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                    title="편집"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => onDelete(template.id)}
                    className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Type Info */}
              {template.postType && (
                <div className="mb-4">
                  <span className="text-sm text-gray-500">적용 대상:</span>
                  <span className="ml-2 px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
                    {availableCPTs.find(cpt => cpt.slug === template.postType)?.name || template.postType}
                  </span>
                </div>
              )}

              {/* Shortcode */}
              <div className="bg-gray-100 rounded-lg p-3 mb-4">
                <div className="flex items-center justify-between">
                  <code className="text-sm text-gray-800">{template.shortcode}</code>
                  <button
                    onClick={() => onCopyShortcode(template.shortcode)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-gray-200 hover:bg-gray-300 rounded transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    복사
                  </button>
                </div>
              </div>

              {/* Settings */}
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">반응형:</span>
                    <span className={template.settings.responsive ? 'text-green-600' : 'text-gray-400'}>
                      {template.settings.responsive ? '예' : '아니오'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">캐시:</span>
                    <span className={template.settings.cache ? 'text-green-600' : 'text-gray-400'}>
                      {template.settings.cache ? `${template.settings.cacheTime}분` : '사용 안함'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-gray-500">상태:</span>
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    template.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {template.active ? '활성' : '비활성'}
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
