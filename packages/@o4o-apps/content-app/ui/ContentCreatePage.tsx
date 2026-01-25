/**
 * ContentCreatePage Component
 *
 * 콘텐츠 생성 페이지
 * - 콘텐츠 유형 선택
 * - 소유 주체 선택
 * - WYSIWYG 편집
 * - 템플릿 선택 (선택사항)
 */

import { useState } from 'react';
import type {
  ContentType,
  ContentVisibility,
  ContentOwner,
  ContentTemplate,
  CreateContentRequest,
} from '../types/ContentTypes.js';
import {
  CONTENT_TYPE_LABELS,
  CONTENT_TYPE_ICONS,
} from '../types/ContentTypes.js';
import { ContentEditor } from './ContentEditor.js';
import { OwnerSelector } from './OwnerSelector.js';

interface ContentCreatePageProps {
  templates?: ContentTemplate[];
  availableOwners?: ContentOwner[];
  saving?: boolean;
  onSave: (data: CreateContentRequest, asDraft: boolean) => void;
  onCancel: () => void;
}

export function ContentCreatePage({
  templates = [],
  availableOwners = [],
  saving = false,
  onSave,
  onCancel,
}: ContentCreatePageProps) {
  // Step 1: 콘텐츠 유형 선택
  const [selectedType, setSelectedType] = useState<ContentType | null>(null);

  // Step 2: 소유 주체 선택
  const [owner, setOwner] = useState<ContentOwner | null>(null);

  // Step 3: 콘텐츠 편집
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [visibility, setVisibility] = useState<ContentVisibility>('private');
  const [templateId, setTemplateId] = useState<string | undefined>();

  const [error, setError] = useState<string | null>(null);

  const currentStep = !selectedType ? 1 : !owner ? 2 : 3;

  const handleSave = (asDraft: boolean) => {
    if (!selectedType || !owner) {
      setError('콘텐츠 유형과 소유 주체를 선택해주세요.');
      return;
    }
    if (!title.trim()) {
      setError('제목을 입력해주세요.');
      return;
    }
    if (!body.trim()) {
      setError('본문을 입력해주세요.');
      return;
    }

    setError(null);

    const data: CreateContentRequest = {
      type: selectedType,
      title: title.trim(),
      summary: summary.trim() || undefined,
      body,
      imageUrl: imageUrl.trim() || undefined,
      tags,
      visibility,
      owner,
      templateId,
    };

    onSave(data, asDraft);
  };

  // 해당 유형에 맞는 템플릿 필터링
  const filteredTemplates = templates.filter(
    (t) => t.contentType === selectedType
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">새 콘텐츠 만들기</h1>
          <p className="mt-1 text-sm text-gray-600">
            콘텐츠를 만들고 다양한 서비스에서 활용하세요
          </p>
        </div>
        <button
          onClick={onCancel}
          className="px-4 py-2 text-gray-600 hover:text-gray-800"
        >
          취소
        </button>
      </div>

      {/* 진행 표시 */}
      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex items-center">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                currentStep >= step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {step}
            </div>
            {step < 3 && (
              <div
                className={`w-16 h-1 ${
                  currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
                }`}
              />
            )}
          </div>
        ))}
        <div className="ml-4 text-sm text-gray-600">
          {currentStep === 1 && '콘텐츠 유형 선택'}
          {currentStep === 2 && '소유 주체 선택'}
          {currentStep === 3 && '콘텐츠 작성'}
        </div>
      </div>

      {/* 에러 메시지 */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      {/* Step 1: 콘텐츠 유형 선택 */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <h2 className="text-lg font-medium text-gray-900">
            어떤 유형의 콘텐츠를 만드시겠습니까?
          </h2>
          <div className="grid grid-cols-2 gap-4">
            {(['text', 'image', 'social', 'reference'] as ContentType[]).map(
              (type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className="p-6 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-colors text-left"
                >
                  <span className="text-4xl">{CONTENT_TYPE_ICONS[type]}</span>
                  <div className="mt-4">
                    <div className="font-medium text-gray-900">
                      {CONTENT_TYPE_LABELS[type]}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">
                      {type === 'text' && '안내문, 설명문, 게시용 텍스트'}
                      {type === 'image' && '이미지/카드형 콘텐츠'}
                      {type === 'social' && '인스타·페이스북·블로그용'}
                      {type === 'reference' && '링크·자료 모음'}
                    </div>
                  </div>
                </button>
              )
            )}
          </div>
        </div>
      )}

      {/* Step 2: 소유 주체 선택 */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              이 콘텐츠의 소유 주체는 누구입니까?
            </h2>
            <button
              onClick={() => setSelectedType(null)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← 유형 다시 선택
            </button>
          </div>

          <OwnerSelector
            value={owner}
            onChange={setOwner}
            availableOwners={availableOwners}
          />

          {owner && (
            <div className="flex justify-end">
              <button
                onClick={() => {}}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
              >
                다음 →
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: 콘텐츠 작성 */}
      {currentStep === 3 && selectedType && owner && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-medium text-gray-900">
              콘텐츠 작성
            </h2>
            <button
              onClick={() => setOwner(null)}
              className="text-sm text-blue-600 hover:text-blue-700"
            >
              ← 소유 주체 다시 선택
            </button>
          </div>

          {/* 템플릿 선택 (있는 경우) */}
          {filteredTemplates.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                템플릿 선택 (선택사항)
              </label>
              <div className="grid grid-cols-3 gap-3">
                <button
                  onClick={() => setTemplateId(undefined)}
                  className={`p-4 border rounded-lg text-center ${
                    !templateId
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="text-2xl mb-1">📝</div>
                  <div className="text-sm font-medium">빈 문서</div>
                </button>
                {filteredTemplates.map((template) => (
                  <button
                    key={template.id}
                    onClick={() => setTemplateId(template.id)}
                    className={`p-4 border rounded-lg text-center ${
                      templateId === template.id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    {template.previewImageUrl ? (
                      <img
                        src={template.previewImageUrl}
                        alt={template.name}
                        className="w-full h-12 object-cover rounded mb-1"
                      />
                    ) : (
                      <div className="text-2xl mb-1">📄</div>
                    )}
                    <div className="text-sm font-medium">{template.name}</div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 콘텐츠 에디터 */}
          <ContentEditor
            type={selectedType}
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
          <div className="flex justify-end gap-3 pt-6 border-t">
            <button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '임시 저장'}
            </button>
            <button
              onClick={() => handleSave(false)}
              disabled={saving}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ContentCreatePage;
