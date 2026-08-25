/**
 * Content Form Modal
 *
 * WO-P3-CMS-ADMIN-CRUD-P0: Create/Edit form for CMS Content
 * WO-O4O-CMS-GUIDE-EDITOR-V1: TipTap Rich Editor for guide type
 * WO-O4O-KNOWLEDGE-LIBRARY-V1: Knowledge type + file attachments
 */

import { useState, useRef } from 'react';
import { X, Upload, FileText, Trash2 } from 'lucide-react';
import cmsAPI, { CmsContent, ContentType } from '@/lib/cms';
import { mediaApi } from '@/services/api/postApi';
import toast from 'react-hot-toast';
import { RichTextEditor } from '@o4o/content-editor';
// WO-O4O-ADMIN-CMS-BROWSER-IMPORT-CRASH-FIX-V1:
//   루트 배럴(@o4o/forum-core)은 backend export 와 `import { Router } from 'express'` 를 포함해
//   브라우저 번들에서 런타임 크래시를 일으킨다. 필요한 두 함수만 클라이언트 안전 경로에서 직접 가져온다.
//   (htmlToBlocks.ts 의 유일한 import 는 `import type { Block }` 로 런타임 의존이 0)
import { htmlToBlocks, blocksToHtml } from '@o4o/forum-core/src/utils/htmlToBlocks';
import { uploadImageForEditor } from '@/api/media-library.api';
import { cmsServiceOptionsWithAll } from '../cmsServiceCatalog';

interface ContentFormModalProps {
  content: CmsContent | null;
  onClose: () => void;
  onSave: () => void;
}

// Available services
const SERVICES = cmsServiceOptionsWithAll('Global (No Service)');

// Content types
const CONTENT_TYPES: { value: ContentType; label: string; description: string }[] = [
  { value: 'hero', label: 'Hero', description: 'Main banner/slide for homepage' },
  { value: 'notice', label: 'Notice', description: 'Announcements and notifications' },
  { value: 'guide', label: 'Guide', description: '가이드 콘텐츠 (Rich Editor)' },
  { value: 'knowledge', label: 'Knowledge', description: '자료실 (Rich Editor + 첨부파일)' },
];

interface AttachmentItem {
  name: string;
  url: string;
  type: string;
  size?: number;
}

interface FormData {
  serviceKey: string;
  type: ContentType;
  title: string;
  summary: string;
  editorHtml: string;
  imageUrl: string;
  linkUrl: string;
  linkText: string;
  sortOrder: number;
  isPinned: boolean;
  isOperatorPicked: boolean;
  backgroundColor: string;
  attachments: AttachmentItem[];
}

/**
 * WO-O4O-ADMIN-CMS-BODY-CANONICAL-EDIT-HYDRATION-FIX-V2
 *
 * CMS 본문 canonical 계약:
 *   - `body`        : canonical HTML. 공개 상세 / 사이니지 / 매장 사본 등 모든 소비처의 읽기 기준.
 *   - `bodyBlocks`  : 편집용 파생 구조화 데이터. canonical 이 아니다.
 * 편집기 초기화는 `body` 우선이고, `body` 가 없고 `bodyBlocks` 만 있는 레거시 레코드는
 * blocksToHtml() 로 복원해 편집 가능하게 한다.
 */
function deriveEditorHtml(content: CmsContent | null): string {
  if (!content) return '';
  if (typeof content.body === 'string' && content.body.trim()) {
    return content.body;
  }
  const blocks = content.bodyBlocks;
  if (Array.isArray(blocks) && blocks.length > 0) {
    return blocksToHtml(blocks as any);
  }
  return '';
}

/**
 * 상세 API 로 hydrate 된 객체인지 판별한다.
 * 목록 projection 은 body / bodyBlocks 를 아예 내려주지 않으므로(둘 다 undefined),
 * "미조회" 와 "실제 빈 본문(null 또는 '')" 을 이 조건으로 구분할 수 있다.
 */
function isHydratedDetail(content: CmsContent): boolean {
  return content.body !== undefined || content.bodyBlocks !== undefined;
}

export default function ContentFormModal({ content, onClose, onSave }: ContentFormModalProps) {
  const isEditing = !!content;
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 수정 모드에서 hydrate 되지 않은 객체가 들어온 경우 저장을 차단한다(2차 방어선).
  // 정상 경로(CMSContentList.handleEdit)는 상세 조회 성공 후에만 모달을 연다.
  const isHydrated = !content || isHydratedDetail(content);

  const [formData, setFormData] = useState<FormData>({
    serviceKey: content?.serviceKey || '',
    type: content?.type || 'hero',
    title: content?.title || '',
    summary: content?.summary || '',
    editorHtml: deriveEditorHtml(content),
    imageUrl: content?.imageUrl || '',
    linkUrl: content?.linkUrl || '',
    linkText: content?.linkText || '',
    sortOrder: content?.sortOrder || 0,
    isPinned: content?.isPinned || false,
    isOperatorPicked: content?.isOperatorPicked || false,
    backgroundColor: content?.metadata?.backgroundColor || '',
    attachments: content?.attachments || [],
  });

  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }

    if (!formData.type) {
      newErrors.type = 'Type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const result = await mediaApi.upload(file);
        if (result.success && result.data) {
          const ext = file.name.split('.').pop()?.toLowerCase() || '';
          setFormData((prev) => ({
            ...prev,
            attachments: [
              ...prev.attachments,
              {
                name: file.name,
                url: result.data!.url,
                type: ext,
                size: file.size,
              },
            ],
          }));
        }
      }
      toast.success('파일 업로드 완료');
    } catch (error) {
      console.error('File upload failed:', error);
      toast.error('파일 업로드 실패');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      attachments: prev.attachments.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    // V2: 상세 조회 실패/미조회 상태에서는 저장을 허용하지 않는다.
    if (!isHydrated) {
      toast.error('본문을 불러오지 못한 상태에서는 저장할 수 없습니다. 창을 닫고 다시 시도해 주세요.');
      return;
    }

    setSaving(true);
    try {
      // V2: metadata 는 전체 교체 대상이므로 기존 값을 보존한 뒤 편집 항목만 덮어쓴다.
      //     (기존 구현은 backgroundColor 만 담은 새 객체로 교체해 creatorType 등을 잃었다.)
      const metadata: Record<string, any> = { ...(content?.metadata || {}) };
      if (formData.backgroundColor) {
        metadata.backgroundColor = formData.backgroundColor;
      } else {
        delete metadata.backgroundColor;
      }

      const data: Record<string, any> = {
        serviceKey: formData.serviceKey || undefined,
        type: formData.type,
        title: formData.title.trim(),
        summary: formData.summary.trim() || undefined,
        imageUrl: formData.imageUrl.trim() || undefined,
        linkUrl: formData.linkUrl.trim() || undefined,
        linkText: formData.linkText.trim() || undefined,
        sortOrder: formData.sortOrder,
        isPinned: formData.isPinned,
        isOperatorPicked: formData.isOperatorPicked,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      };

      // V2: Guide/Knowledge 본문 저장 — canonical `body`(HTML) 와 파생 `bodyBlocks` 를 동일 편집
      //     결과로 함께 동기화한다. 본문을 실제로 비운 경우에도 두 필드를 같이 비워 불일치를 막는다.
      //     (rich editor 를 노출하지 않는 hero/notice 등은 두 필드를 전송하지 않아 기존 값이 보존된다 —
      //      백엔드 PUT 은 `if (field !== undefined)` patch 방식이다.)
      if (formData.type === 'guide' || formData.type === 'knowledge') {
        const html = formData.editorHtml.trim();
        data.body = html || null;
        data.bodyBlocks = html ? htmlToBlocks(html) : null;
      }

      // V2: Knowledge 첨부파일 — 목록 projection 에 필드가 없다는 이유로 기존 첨부를 null 로
      //     덮어쓰지 않는다. hydrate 된 상태에서만 도달하며,
      //       · 현재 목록이 있으면 그대로 전송
      //       · 원래 첨부가 있었는데 사용자가 전부 제거했을 때만 null 전송(명시적 삭제)
      //       · 원래도 없고 지금도 없으면 아예 전송하지 않는다(no-op)
      if (formData.type === 'knowledge') {
        const originalHadAttachments =
          Array.isArray(content?.attachments) && content!.attachments!.length > 0;
        if (formData.attachments.length > 0) {
          data.attachments = formData.attachments;
        } else if (originalHadAttachments) {
          data.attachments = null;
        }
      }

      if (isEditing) {
        await cmsAPI.updateContent(content!.id, data);
        toast.success('Content updated successfully');
      } else {
        await cmsAPI.createContent(data as any);
        toast.success('Content created successfully');
      }

      onSave();
    } catch (error: any) {
      console.error('Failed to save content:', error);
      toast.error(error.response?.data?.error?.message || 'Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));

    // Clear error on change
    if (errors[name]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[name];
        return newErrors;
      });
    }
  };

  const isRichEditorType = formData.type === 'guide' || formData.type === 'knowledge';

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose} />

      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b">
            <h2 className="text-xl font-semibold text-gray-900">
              {isEditing ? 'Edit Content' : 'Create New Content'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit}>
            <div className="px-6 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Service Key */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Service
                </label>
                <select
                  name="serviceKey"
                  value={formData.serviceKey}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SERVICES.map((service) => (
                    <option key={service.value} value={service.value}>
                      {service.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  Select which service this content belongs to
                </p>
              </div>

              {/* Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Content Type <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {CONTENT_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className={`flex items-start p-3 border rounded-md cursor-pointer transition-colors ${
                        formData.type === type.value
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="type"
                        value={type.value}
                        checked={formData.type === type.value}
                        onChange={handleChange}
                        className="sr-only"
                      />
                      <div>
                        <div className="font-medium text-gray-900">{type.label}</div>
                        <div className="text-xs text-gray-500">{type.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">{errors.type}</p>
                )}
              </div>

              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleChange}
                  className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                    errors.title ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Enter content title"
                />
                {errors.title && (
                  <p className="mt-1 text-sm text-red-600">{errors.title}</p>
                )}
              </div>

              {/* Summary */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Summary
                </label>
                <textarea
                  name="summary"
                  value={formData.summary}
                  onChange={handleChange}
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Brief description or subtitle"
                />
              </div>

              {/* Rich Text Editor (Guide / Knowledge) */}
              {isRichEditorType && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    본문 (Rich Editor)
                  </label>
                  <div className="border border-gray-300 rounded-md overflow-hidden">
                    <RichTextEditor
                      value={formData.editorHtml}
                      onChange={(content) =>
                        setFormData((prev) => ({ ...prev, editorHtml: content.html }))
                      }
                      onImageUpload={(file) => uploadImageForEditor(file, 'blog')}
                    />
                  </div>
                </div>
              )}

              {/* Attachments (Knowledge only) */}
              {formData.type === 'knowledge' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    첨부파일
                  </label>

                  {/* Attachment list */}
                  {formData.attachments.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {formData.attachments.map((att, index) => (
                        <div
                          key={index}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-md border border-gray-200"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
                            <span className="text-sm text-gray-700 truncate">{att.name}</span>
                            <span className="text-xs text-gray-400 uppercase flex-shrink-0">{att.type}</span>
                            {att.size && (
                              <span className="text-xs text-gray-400 flex-shrink-0">{formatFileSize(att.size)}</span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(index)}
                            className="text-red-400 hover:text-red-600 flex-shrink-0 ml-2"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Upload button */}
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.jpg,.jpeg,.png,.gif"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="inline-flex items-center gap-2 px-3 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    {uploading ? '업로드 중...' : '파일 추가'}
                  </button>
                  <p className="mt-1 text-xs text-gray-500">
                    PDF, DOC, XLS, PPT, ZIP, 이미지 (최대 25MB)
                  </p>
                </div>
              )}

              {/* Image URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Image URL
                </label>
                <input
                  type="url"
                  name="imageUrl"
                  value={formData.imageUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://example.com/image.jpg"
                />
              </div>

              {/* Link URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link URL
                </label>
                <input
                  type="text"
                  name="linkUrl"
                  value={formData.linkUrl}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="/about or https://example.com"
                />
              </div>

              {/* Link Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Link Text
                </label>
                <input
                  type="text"
                  name="linkText"
                  value={formData.linkText}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Learn More"
                />
              </div>

              {/* Background Color (for Hero) */}
              {formData.type === 'hero' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Background Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      name="backgroundColor"
                      value={formData.backgroundColor || '#1e40af'}
                      onChange={handleChange}
                      className="w-12 h-10 rounded border border-gray-300"
                    />
                    <input
                      type="text"
                      name="backgroundColor"
                      value={formData.backgroundColor}
                      onChange={handleChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="#1e40af"
                    />
                  </div>
                </div>
              )}

              {/* Sort Order */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sort Order
                </label>
                <input
                  type="number"
                  name="sortOrder"
                  value={formData.sortOrder}
                  onChange={handleChange}
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  Lower numbers appear first
                </p>
              </div>

              {/* Checkboxes */}
              <div className="flex gap-6">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isPinned"
                    checked={formData.isPinned}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Pin to top</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isOperatorPicked"
                    checked={formData.isOperatorPicked}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-sm text-gray-700">Operator Pick</span>
                </label>
              </div>

              {/* Status Note */}
              {!isEditing && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    New content will be created as <strong>Draft</strong>. You can publish it from the content list.
                  </p>
                </div>
              )}

              {isEditing && (
                <div className="p-3 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-600">
                    Current status: <strong className="capitalize">{content?.status}</strong>
                    {content?.status === 'draft' && ' - Publish from the content list'}
                  </p>
                </div>
              )}

              {/* V2: hydrate 되지 않은 상태(정상 경로에서는 발생하지 않음) — 저장 차단을 명시한다 */}
              {!isHydrated && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">
                    기존 본문을 불러오지 못했습니다. 콘텐츠 훼손을 막기 위해 저장이 차단되었습니다.
                    창을 닫고 다시 시도해 주세요.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t bg-gray-50">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={saving || uploading || !isHydrated}
              >
                {saving ? 'Saving...' : isEditing ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
