import React, { useState } from 'react';
import { aiReferencesApi, AIReference, CreateReferenceDto } from '@/api/ai-references.api';
import toast from 'react-hot-toast';
import { Save, X, Loader2 } from 'lucide-react';
import Editor from '@monaco-editor/react';

interface Props {
  reference: AIReference | null;
  onSave: () => void;
  onCancel: () => void;
}

const ReferenceEditor: React.FC<Props> = ({ reference, onSave, onCancel }) => {
  const [formData, setFormData] = useState<CreateReferenceDto>({
    name: reference?.name || '',
    description: reference?.description || '',
    type: reference?.type || 'blocks',
    version: reference?.version || '1.0.0',
    status: reference?.status || 'draft',
    content: reference?.content || '',
    format: reference?.format || 'markdown',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!formData.name || !formData.content) {
      toast.error('이름과 내용은 필수입니다.');
      return;
    }

    setSaving(true);
    try {
      if (reference) {
        await aiReferencesApi.update(reference.id, {
          name: formData.name,
          description: formData.description,
          content: formData.content,
          version: formData.version,
          status: formData.status,
        });
        toast.success('수정되었습니다.');
      } else {
        await aiReferencesApi.create(formData);
        toast.success('생성되었습니다.');
      }
      onSave();
    } catch (error: any) {
      console.error('Error saving reference:', error);
      toast.error(error.response?.data?.error || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">
          {reference ? 'Reference 편집' : '새 Reference'}
        </h2>
        <button
          onClick={onCancel}
          className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Form */}
      <div className="space-y-4 mb-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              이름 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="예: blocks-reference"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              타입
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="blocks">Blocks</option>
              <option value="shortcodes">Shortcodes</option>
              <option value="image-prompts">Image Prompts</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              버전
            </label>
            <input
              type="text"
              value={formData.version}
              onChange={(e) => setFormData({ ...formData, version: e.target.value })}
              placeholder="1.0.0"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              상태
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">임시저장</option>
              <option value="active">활성</option>
              <option value="archived">보관됨</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            설명
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            rows={2}
            placeholder="Reference에 대한 설명을 입력하세요"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-sm font-medium text-gray-700">
              내용 <span className="text-red-500">*</span>
            </label>
            <select
              value={formData.format}
              onChange={(e) => setFormData({ ...formData, format: e.target.value })}
              className="text-xs px-2 py-1 border border-gray-300 rounded"
            >
              <option value="markdown">Markdown</option>
              <option value="json">JSON</option>
            </select>
          </div>
          <div className="border border-gray-300 rounded-md overflow-hidden">
            <Editor
              height="500px"
              defaultLanguage={formData.format === 'json' ? 'json' : 'markdown'}
              language={formData.format === 'json' ? 'json' : 'markdown'}
              value={formData.content}
              onChange={(value) => setFormData({ ...formData, content: value || '' })}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                wordWrap: 'on',
                automaticLayout: true,
              }}
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              저장 중...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              저장
            </>
          )}
        </button>
      </div>
    </div>
  );
};

export default ReferenceEditor;
