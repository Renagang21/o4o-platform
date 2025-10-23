import React, { useState, useEffect } from 'react';
import { aiReferencesApi, AIReference } from '@/api/ai-references.api';
import toast from 'react-hot-toast';
import {
  Plus,
  Edit2,
  Trash2,
  Loader2,
  FileText,
} from 'lucide-react';
import ReferenceEditor from './ReferenceEditor';

const ReferencesTab: React.FC = () => {
  const [references, setReferences] = useState<AIReference[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<{
    type?: string;
    status?: string;
  }>({});
  const [editingRef, setEditingRef] = useState<AIReference | null>(null);
  const [showEditor, setShowEditor] = useState(false);

  useEffect(() => {
    loadReferences();
  }, [filter]);

  const loadReferences = async () => {
    setLoading(true);
    try {
      const data = await aiReferencesApi.list(filter);
      setReferences(data);
    } catch (error) {
      console.error('Error loading references:', error);
      toast.error('References 목록을 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;

    try {
      await aiReferencesApi.delete(id);
      toast.success('삭제되었습니다.');
      loadReferences();
    } catch (error) {
      console.error('Error deleting reference:', error);
      toast.error('삭제에 실패했습니다.');
    }
  };

  const handleEdit = (ref: AIReference) => {
    setEditingRef(ref);
    setShowEditor(true);
  };

  const handleNew = () => {
    setEditingRef(null);
    setShowEditor(true);
  };

  const handleSave = () => {
    setShowEditor(false);
    setEditingRef(null);
    loadReferences();
  };

  const handleCancel = () => {
    setShowEditor(false);
    setEditingRef(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (showEditor) {
    return (
      <ReferenceEditor
        reference={editingRef}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & Filters */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <select
            value={filter.type || ''}
            onChange={(e) => setFilter({ ...filter, type: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 타입</option>
            <option value="blocks">Blocks</option>
            <option value="shortcodes">Shortcodes</option>
            <option value="image-prompts">Image Prompts</option>
          </select>

          <select
            value={filter.status || ''}
            onChange={(e) => setFilter({ ...filter, status: e.target.value || undefined })}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">모든 상태</option>
            <option value="active">활성</option>
            <option value="draft">임시저장</option>
            <option value="archived">보관됨</option>
          </select>
        </div>

        <button
          onClick={handleNew}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          새로 만들기
        </button>
      </div>

      {/* References List */}
      <div className="space-y-4">
        {references.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">등록된 Reference가 없습니다.</p>
          </div>
        ) : (
          references.map((ref) => (
            <div
              key={ref.id}
              className="bg-white border border-gray-200 rounded-lg p-6 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h3 className="text-lg font-semibold text-gray-900">
                      {ref.name}
                    </h3>
                    <span
                      className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                        ref.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : ref.status === 'draft'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {ref.status === 'active' ? '활성' : ref.status === 'draft' ? '임시저장' : '보관됨'}
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                      {ref.type}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2">{ref.description}</p>
                  <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                    <span>버전: {ref.version}</span>
                    <span>포맷: {ref.format}</span>
                    <span>
                      수정일: {new Date(ref.updatedAt).toLocaleDateString('ko-KR')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 ml-4">
                  <button
                    onClick={() => handleEdit(ref)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                    title="편집"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(ref.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="삭제"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default ReferencesTab;
