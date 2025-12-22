/**
 * Preset Templates Page
 *
 * Phase 3: Browse and use pre-defined playlist templates.
 * Templates can be cloned and customized for the pharmacy.
 */

import React, { useState } from 'react';
import { PRESET_TEMPLATES, type PresetTemplate } from '../data/presetTemplates.js';
import { usePlaylists } from '../hooks/usePharmacySignage.js';

interface TemplateCardProps {
  template: PresetTemplate;
  onUseTemplate: (template: PresetTemplate) => void;
}

const TemplateCard: React.FC<TemplateCardProps> = ({ template, onUseTemplate }) => {
  const getCategoryColor = (category: PresetTemplate['category']) => {
    switch (category) {
      case 'basic':
        return 'bg-blue-100 text-blue-800';
      case 'health':
        return 'bg-green-100 text-green-800';
      case 'promo':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getCategoryLabel = (category: PresetTemplate['category']) => {
    switch (category) {
      case 'basic':
        return '기본';
      case 'health':
        return '건강정보';
      case 'promo':
        return '홍보';
      default:
        return category;
    }
  };

  const totalDuration = template.items.reduce((sum, item) => sum + item.duration, 0);
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}분 ${secs}초` : `${secs}초`;
  };

  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
      {/* Header */}
      <div className="p-5 border-b">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
            <p className="text-sm text-gray-500 mt-1">{template.description}</p>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getCategoryColor(template.category)}`}>
            {getCategoryLabel(template.category)}
          </span>
        </div>
      </div>

      {/* Template Items Preview */}
      <div className="p-4 bg-gray-50">
        <p className="text-xs font-medium text-gray-500 mb-2">
          구성 ({template.items.length}개 항목)
        </p>
        <div className="space-y-2">
          {template.items.slice(0, 3).map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between text-sm bg-white rounded px-3 py-2"
            >
              <span className="text-gray-700">{item.placeholderName}</span>
              <span className="text-gray-400 text-xs">{item.duration}초</span>
            </div>
          ))}
          {template.items.length > 3 && (
            <p className="text-xs text-gray-400 text-center">
              +{template.items.length - 3}개 더
            </p>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 flex items-center justify-between">
        <div className="text-sm text-gray-500">
          총 {formatDuration(totalDuration)} | {template.loop ? '반복' : '1회'}
        </div>
        <button
          onClick={() => onUseTemplate(template)}
          className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 transition-colors"
        >
          이 템플릿 사용
        </button>
      </div>
    </div>
  );
};

interface UseTemplateModalProps {
  template: PresetTemplate | null;
  isOpen: boolean;
  onClose: () => void;
  onCreate: (name: string) => void;
}

const UseTemplateModal: React.FC<UseTemplateModalProps> = ({
  template,
  isOpen,
  onClose,
  onCreate,
}) => {
  const [name, setName] = useState('');

  React.useEffect(() => {
    if (template) {
      setName(`${template.name} - 내 플레이리스트`);
    }
  }, [template]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onCreate(name.trim());
      setName('');
      onClose();
    }
  };

  if (!isOpen || !template) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        <form onSubmit={handleSubmit}>
          <div className="p-6">
            <h2 className="text-lg font-semibold mb-2">템플릿으로 플레이리스트 만들기</h2>
            <p className="text-sm text-gray-500 mb-4">
              "{template.name}" 템플릿을 기반으로 새 플레이리스트를 만듭니다.
            </p>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
              <h4 className="text-sm font-medium text-blue-800 mb-2">템플릿 구성</h4>
              <ul className="space-y-1">
                {template.items.map((item, index) => (
                  <li key={index} className="text-sm text-blue-700 flex items-center gap-2">
                    <span className="w-5 h-5 flex items-center justify-center bg-blue-200 rounded-full text-xs">
                      {index + 1}
                    </span>
                    {item.placeholderName}
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                플레이리스트 이름
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="플레이리스트 이름"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                생성 후 콘텐츠를 추가하여 완성해주세요.
              </p>
            </div>
          </div>

          <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 rounded-b-lg">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              취소
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg"
            >
              만들기
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export const PresetTemplates: React.FC = () => {
  const { createPlaylist } = usePlaylists();
  const [selectedTemplate, setSelectedTemplate] = useState<PresetTemplate | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState<PresetTemplate['category'] | 'all'>('all');

  const filteredTemplates = filter === 'all'
    ? PRESET_TEMPLATES
    : PRESET_TEMPLATES.filter((t) => t.category === filter);

  const handleUseTemplate = (template: PresetTemplate) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleCreateFromTemplate = async (name: string) => {
    if (!selectedTemplate) return;

    // Create playlist with template settings
    await createPlaylist(
      name,
      `${selectedTemplate.name} 템플릿 기반`,
      selectedTemplate.loop
    );

    // Note: In a real implementation, we would also add the template items
    // For MVP, we just create the playlist and user adds content manually
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">프리셋 템플릿</h1>
          <p className="text-gray-500 mt-1">
            미리 구성된 템플릿으로 빠르게 플레이리스트를 만들어보세요
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { value: 'all', label: '전체' },
          { value: 'basic', label: '기본 안내형' },
          { value: 'health', label: '건강정보 중심' },
          { value: 'promo', label: '제품 홍보 중심' },
        ].map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value as PresetTemplate['category'] | 'all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              filter === option.value
                ? 'bg-blue-500 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Templates Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <TemplateCard
            key={template.id}
            template={template}
            onUseTemplate={handleUseTemplate}
          />
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-gray-500">해당 카테고리의 템플릿이 없습니다.</p>
        </div>
      )}

      {/* Tip */}
      <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h3 className="font-medium text-yellow-800 mb-1">사용 팁</h3>
        <p className="text-sm text-yellow-700">
          템플릿을 선택하면 기본 구조가 잡힌 플레이리스트가 생성됩니다.
          생성 후 콘텐츠 라이브러리에서 원하는 콘텐츠를 추가하여 완성해주세요.
        </p>
      </div>

      <UseTemplateModal
        template={selectedTemplate}
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setSelectedTemplate(null);
        }}
        onCreate={handleCreateFromTemplate}
      />
    </div>
  );
};

export default PresetTemplates;
