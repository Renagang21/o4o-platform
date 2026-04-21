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
import { htmlToBlocks, blocksToHtml } from '@o4o/forum-core';
import { uploadImageForEditor } from '@/api/media-library.api';

interface ContentFormModalProps {
  content: CmsContent | null;
  onClose: () => void;
  onSave: () => void;
}

// Available services
const SERVICES = [
  { value: '', label: 'Global (No Service)' },
  { value: 'glycopharm', label: 'Glycopharm' },
  { value: 'kpa', label: 'KPA Society' },
  { value: 'glucoseview', label: 'GlucoseView' },
  { value: 'neture', label: 'Neture' },
  { value: 'k-cosmetics', label: 'K-Cosmetics' },
];

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

export default function ContentFormModal({ content, onClose, onSave }: ContentFormModalProps) {
  const isEditing = !!content;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [formData, setFormData] = useState<FormData>({
    serviceKey: content?.serviceKey || '',
    type: content?.type || 'hero',
    title: content?.title || '',
    summary: content?.summary || '',
    editorHtml: content?.bodyBlocks ? blocksToHtml(content.bodyBlocks as any) : '',
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

    setSaving(true);
    try {
      const metadata: Record<string, any> = {};
      if (formData.backgroundColor) {
        metadata.backgroundColor = formData.backgroundColor;
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

      // Guide/Knowledge type: convert editor HTML to bodyBlocks
      if ((formData.type === 'guide' || formData.type === 'knowledge') && formData.editorHtml.trim()) {
        data.bodyBlocks = htmlToBlocks(formData.editorHtml);
      }

      // Knowledge type: include attachments
      if (formData.type === 'knowledge') {
        data.attachments = formData.attachments.length > 0 ? formData.attachments : null;
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
                disabled={saving || uploading}
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
