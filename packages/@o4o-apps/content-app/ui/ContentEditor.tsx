/**
 * ContentEditor Component
 *
 * 콘텐츠 편집기 컴포넌트
 * - WYSIWYG 기반 작성
 * - 콘텐츠 유형별 필드
 * - 미리보기 지원
 */

import { useState } from 'react';
import type {
  ContentType,
  ContentVisibility,
} from '../types/ContentTypes.js';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
  VISIBILITY_LABELS,
} from '../types/ContentTypes.js';

interface ContentEditorProps {
  type: ContentType;
  title: string;
  summary: string;
  body: string;
  imageUrl: string;
  tags: string[];
  visibility: ContentVisibility;
  onTitleChange: (value: string) => void;
  onSummaryChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onImageUrlChange: (value: string) => void;
  onTagsChange: (value: string[]) => void;
  onVisibilityChange: (value: ContentVisibility) => void;
  disabled?: boolean;
}

export function ContentEditor({
  type,
  title,
  summary,
  body,
  imageUrl,
  tags,
  visibility,
  onTitleChange,
  onSummaryChange,
  onBodyChange,
  onImageUrlChange,
  onTagsChange,
  onVisibilityChange,
  disabled = false,
}: ContentEditorProps) {
  const [tagInput, setTagInput] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      onTagsChange([...tags, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    onTagsChange(tags.filter((tag) => tag !== tagToRemove));
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="space-y-6">
      {/* 콘텐츠 유형 표시 */}
      <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
        <span className="text-2xl">{CONTENT_TYPE_ICONS[type]}</span>
        <div>
          <div className="font-medium text-gray-900">
            {CONTENT_TYPE_LABELS[type]} 콘텐츠
          </div>
          <div className="text-xs text-gray-500">
            {type === 'text' && '안내문, 설명문, 게시용 텍스트'}
            {type === 'image' && '이미지/카드형 콘텐츠'}
            {type === 'social' && '인스타·페이스북·블로그용 콘텐츠'}
            {type === 'reference' && '링크·자료 모음'}
          </div>
        </div>
      </div>

      {/* 제목 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          제목 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          disabled={disabled}
          placeholder="콘텐츠 제목을 입력하세요"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-base focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* 요약 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          요약
        </label>
        <input
          type="text"
          value={summary}
          onChange={(e) => onSummaryChange(e.target.value)}
          disabled={disabled}
          placeholder="콘텐츠 요약 (선택사항)"
          className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm focus:border-blue-500 focus:outline-none"
        />
      </div>

      {/* 대표 이미지 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          대표 이미지 URL
        </label>
        <div className="flex gap-2">
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => onImageUrlChange(e.target.value)}
            disabled={disabled}
            placeholder="https://example.com/image.jpg"
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          {imageUrl && (
            <img
              src={imageUrl}
              alt="Preview"
              className="w-12 h-12 object-cover rounded-lg border border-gray-200"
            />
          )}
        </div>
      </div>

      {/* 본문 (에디터) */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">
            본문 <span className="text-red-500">*</span>
          </label>
          <button
            type="button"
            onClick={() => setShowPreview(!showPreview)}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            {showPreview ? '편집' : '미리보기'}
          </button>
        </div>

        {showPreview ? (
          <div
            className="min-h-[300px] p-4 bg-white border border-gray-300 rounded-lg prose max-w-none"
            dangerouslySetInnerHTML={{ __html: body }}
          />
        ) : (
          <textarea
            value={body}
            onChange={(e) => onBodyChange(e.target.value)}
            disabled={disabled}
            placeholder="콘텐츠 본문을 입력하세요. HTML을 사용할 수 있습니다."
            rows={12}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-mono focus:border-blue-500 focus:outline-none resize-y"
          />
        )}
        <p className="mt-1 text-xs text-gray-500">
          HTML 태그를 사용할 수 있습니다. TipTap 에디터 연동 예정.
        </p>
      </div>

      {/* 태그 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          태그
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder="태그 입력 후 Enter"
            className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddTag}
            disabled={disabled || !tagInput.trim()}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50"
          >
            추가
          </button>
        </div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-sm"
              >
                #{tag}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(tag)}
                  disabled={disabled}
                  className="hover:text-blue-900"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* 공개 범위 */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          공개 범위
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(['private', 'domain', 'public'] as ContentVisibility[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => onVisibilityChange(v)}
              disabled={disabled}
              className={`p-3 rounded-lg border text-sm font-medium transition-colors ${
                visibility === v
                  ? 'border-blue-500 bg-blue-50 text-blue-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
            >
              {v === 'private' && '🔒'}
              {v === 'domain' && '🏢'}
              {v === 'public' && '🌐'}
              <span className="ml-1">{VISIBILITY_LABELS[v]}</span>
            </button>
          ))}
        </div>
        <p className="mt-1 text-xs text-gray-500">
          {visibility === 'private' && '소유자만 볼 수 있습니다'}
          {visibility === 'domain' && '도메인 내 사용자만 볼 수 있습니다 (해석은 상위 서비스 책임)'}
          {visibility === 'public' && '모든 사용자가 볼 수 있습니다'}
        </p>
      </div>
    </div>
  );
}

export default ContentEditor;
