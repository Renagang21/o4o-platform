/**
 * ContentEditPage Component
 *
 * 콘텐츠 수정 페이지
 * - 기존 콘텐츠 수정
 * - 상태 변경
 */

import { useState, useEffect } from 'react';
import type {
  Content,
  ContentStatus,
  ContentVisibility,
  UpdateContentRequest,
} from '../types/ContentTypes.js';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  STATUS_LABELS,
  OWNER_TYPE_LABELS,
} from '../types/ContentTypes.js';
import { ContentEditor } from './ContentEditor.js';

interface ContentEditPageProps {
  content: Content;
  saving?: boolean;
  onSave: (data: UpdateContentRequest) => void;
  onCancel: () => void;
  onChangeStatus?: (status: ContentStatus) => void;
}

export function ContentEditPage({
  content,
  saving = false,
  onSave,
  onCancel,
  onChangeStatus,
}: ContentEditPageProps) {
  const [title, setTitle] = useState(content.title);
  const [summary, setSummary] = useState(content.summary || '');
  const [body, setBody] = useState(content.body);
  const [imageUrl, setImageUrl] = useState(content.imageUrl || '');
  const [tags, setTags] = useState<string[]>(content.tags);
  const [visibility, setVisibility] = useState<ContentVisibility>(
    content.visibility
  );
  const [error, setError] = useState<string | null>(null);

  // content가 변경되면 상태 업데이트
  useEffect(() => {
    setTitle(content.title);
    setSummary(content.summary || '');
    setBody(content.body);
    setImageUrl(content.imageUrl || '');
    setTags(content.tags);
    setVisibility(content.visibility);
  }, [content]);

  const handleSave = () => {
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!body.trim()) {
      setError('본문을 입력해주세요.');
      return;
    }

    setError(null);

    const data: UpdateContentRequest = {
      title: title.trim(),
      summary: summary.trim() || undefined,
      body,
      imageUrl: imageUrl.trim() || undefined,
      tags,
      visibility,
    };

    onSave(data);
  };

  const handleStatusChange = (newStatus: ContentStatus) => {
    if (onChangeStatus && newStatus !== content.status) {
      onChangeStatus(newStatus);
    }
  };

  const getStatusColor = (status: ContentStatus) => {
    switch (status) {
      case 'ready':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'archived':
        return 'bg-gray-100 text-gray-600 border-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">콘텐츠 수정</h1>
          <p className="mt-1 text-sm text-gray-600">
            {CONTENT_TYPE_ICONS[content.type]} {CONTENT_TYPE_LABELS[content.type]} 콘텐츠
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          취소
        </button>
      </div>

      {/* 소유자 정보 (읽기 전용) */}
      <div className="p-4 bg-gray-50 rounded-lg mb-6">
        <div className="text-xs text-gray-500 mb-1">소유 주체 (변경 불가)</div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-gray-900">{content.owner.name}</span>
          <span className="text-sm text-gray-500">
            ({OWNER_TYPE_LABELS[content.owner.type]})
          </span>
        </div>
      </div>

      {/* 상태 변경 */}
      {onChangeStatus && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            상태
          </label>
          <div className="flex gap-2">
            {(['draft', 'ready', 'archived'] as ContentStatus[]).map(
              (status) => (
                <button
                  key={status}
                  onClick={() => handleStatusChange(status)}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    content.status === status
                      ? getStatusColor(status)
                      : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                  } ${saving ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                >
                  {STATUS_LABELS[status]}
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* 콘텐츠 에디터 */}
      <ContentEditor
        type={content.type}
        title={title}
        summary={summary}
        body={body}
        imageUrl={imageUrl}
        tags={tags}
        visibility={visibility}
        onTitleChange={setTitle}
        onSummaryChange={setSummary}
        onBodyChange={setBody}
        onImageUrlChange={setImageUrl}
        onTagsChange={setTags}
        onVisibilityChange={setVisibility}
        disabled={saving}
      />

      {/* 저장 버튼 */}
      <div className="flex justify-end gap-3 pt-6 mt-6 border-t">
        <button
          onClick={onCancel}
          disabled={saving}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
        >
          취소
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {saving ? '저장 중...' : '저장'}
        </button>
      </div>
    </div>
  );
}

export default ContentEditPage;
