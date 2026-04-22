/**
 * SupplierLibraryFormPage - 자료 등록/수정
 *
 * WO-O4O-NETURE-LIBRARY-UI-V1
 * WO-NETURE-CONTENT-META-DOCUMENT-PATH-COMPLETION-V1
 *
 * - 등록 모드: POST /api/v1/neture/library
 * - 수정 모드: PATCH /api/v1/neture/library/:id
 * - media: 파일 URL 직접 입력 (S3 업로드 미구현)
 * - document: RichTextEditor 기반 blocks 입력
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supplierApi } from '../../lib/api';
import { RichTextEditor } from '@o4o/content-editor';
import type { EditorContent } from '@o4o/content-editor';

type ContentType = 'media' | 'document';

interface FormData {
  title: string;
  description: string;
  contentType: ContentType;
  // media 전용
  fileUrl: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  // document 전용
  documentHtml: string;
  // 공통
  category: string;
  isPublic: boolean;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  contentType: 'media',
  fileUrl: '',
  fileName: '',
  fileSize: '',
  mimeType: '',
  documentHtml: '',
  category: '',
  isPublic: false,
};

export default function SupplierLibraryFormPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // 수정 모드: 기존 데이터 로드
  useEffect(() => {
    if (!isEditMode || !id) return;
    const loadItem = async () => {
      setLoading(true);
      const items = await supplierApi.getLibraryItems({ limit: 100 });
      const item = items.find((i) => i.id === id);
      if (item) {
        const isDocument = item.contentType === 'document';
        const existingHtml = isDocument
          ? ((item.blocks?.[0] as Record<string, unknown>)?.content as string) || ''
          : '';
        setFormData({
          title: item.title,
          description: item.description || '',
          contentType: isDocument ? 'document' : 'media',
          fileUrl: isDocument ? '' : item.fileUrl,
          fileName: isDocument ? '' : item.fileName,
          fileSize: isDocument ? '' : String(item.fileSize),
          mimeType: isDocument ? '' : item.mimeType,
          documentHtml: existingHtml,
          category: item.category || '',
          isPublic: item.isPublic,
        });
      } else {
        setError('자료를 찾을 수 없습니다.');
      }
      setLoading(false);
    };
    loadItem();
  }, [id, isEditMode]);

  const handleChange = (field: keyof FormData, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setError(null);
  };

  const handleEditorChange = (content: EditorContent) => {
    setFormData((prev) => ({ ...prev, documentHtml: content.html }));
    setError(null);
  };

  const handleSubmit = async () => {
    // 공통 검증
    if (!formData.title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }

    // 타입별 검증
    if (formData.contentType === 'media') {
      if (!formData.fileUrl.trim()) {
        setError('파일 URL을 입력하세요.');
        return;
      }
      if (!formData.fileName.trim()) {
        setError('파일명을 입력하세요.');
        return;
      }
      const fileSize = Number(formData.fileSize);
      if (!formData.fileSize || isNaN(fileSize) || fileSize <= 0) {
        setError('파일 크기를 올바르게 입력하세요.');
        return;
      }
      if (!formData.mimeType.trim()) {
        setError('MIME 타입을 입력하세요.');
        return;
      }
    } else {
      // document 검증: 내용이 비어 있지 않아야 함
      const plainText = formData.documentHtml.replace(/<[^>]*>/g, '').trim();
      if (!plainText) {
        setError('문서 본문을 입력하세요.');
        return;
      }
    }

    setSaving(true);
    setError(null);

    let result;
    if (formData.contentType === 'media') {
      const mediaPayload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        fileUrl: formData.fileUrl.trim(),
        fileName: formData.fileName.trim(),
        fileSize: Number(formData.fileSize),
        mimeType: formData.mimeType.trim(),
        category: formData.category.trim() || undefined,
        isPublic: formData.isPublic,
        contentType: 'media',
      };
      if (isEditMode && id) {
        result = await supplierApi.updateLibraryItem(id, mediaPayload);
      } else {
        result = await supplierApi.createLibraryItem(mediaPayload);
      }
    } else {
      const documentPayload = {
        title: formData.title.trim(),
        description: formData.description.trim() || undefined,
        category: formData.category.trim() || undefined,
        isPublic: formData.isPublic,
        contentType: 'document',
        blocks: [{ type: 'html', content: formData.documentHtml }],
      };
      if (isEditMode && id) {
        result = await supplierApi.updateLibraryItem(id, documentPayload);
      } else {
        result = await supplierApi.createLibraryItem(documentPayload);
      }
    }

    setSaving(false);

    if (result.success) {
      navigate('/supplier/library');
    } else {
      setError(result.error || '저장에 실패했습니다.');
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
        <Loader2 size={24} className="animate-spin" style={{ color: '#2563eb' }} />
        <span style={{ marginLeft: '8px', color: '#64748b' }}>불러오는 중...</span>
      </div>
    );
  }

  return (
    <div style={{ padding: '32px', maxWidth: '720px' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/supplier/library')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: '#64748b',
            fontSize: '14px',
            padding: 0,
            marginBottom: '12px',
          }}
        >
          <ArrowLeft size={16} />
          자료실로 돌아가기
        </button>
        <h1 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: 0 }}>
          {isEditMode ? '자료 수정' : '자료 등록'}
        </h1>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: '12px 16px',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#dc2626',
          fontSize: '14px',
          marginBottom: '20px',
        }}>
          {error}
        </div>
      )}

      {/* Form */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>

        {/* 유형 선택 */}
        <div>
          <label style={labelStyle}>
            유형
            {isEditMode && (
              <span style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 400, marginLeft: '6px' }}>
                (수정 시 변경 불가)
              </span>
            )}
          </label>
          <div style={{ display: 'flex', gap: '8px' }}>
            {(['media', 'document'] as const).map((type) => (
              <button
                key={type}
                type="button"
                disabled={isEditMode}
                onClick={() => !isEditMode && handleChange('contentType', type)}
                style={{
                  padding: '8px 24px',
                  borderRadius: '6px',
                  border: '1px solid',
                  borderColor: formData.contentType === type ? '#2563eb' : '#d1d5db',
                  backgroundColor: formData.contentType === type ? '#eff6ff' : '#fff',
                  color: formData.contentType === type ? '#2563eb' : '#6b7280',
                  fontSize: '14px',
                  fontWeight: formData.contentType === type ? 600 : 400,
                  cursor: isEditMode ? 'default' : 'pointer',
                  opacity: isEditMode && formData.contentType !== type ? 0.35 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {type === 'media' ? '파일 (Media)' : '문서 (Document)'}
              </button>
            ))}
          </div>
        </div>

        {/* 제목 */}
        <div>
          <label style={labelStyle}>제목 <span style={{ color: '#dc2626' }}>*</span></label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => handleChange('title', e.target.value)}
            maxLength={200}
            placeholder="자료 제목을 입력하세요"
            style={inputStyle}
          />
        </div>

        {/* 설명 */}
        <div>
          <label style={labelStyle}>설명</label>
          <textarea
            value={formData.description}
            onChange={(e) => handleChange('description', e.target.value)}
            placeholder="자료에 대한 설명을 입력하세요"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', minHeight: '80px' }}
          />
        </div>

        {/* media 전용 필드 */}
        {formData.contentType === 'media' && (
          <>
            {/* 파일 URL */}
            <div>
              <label style={labelStyle}>파일 URL <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="text"
                value={formData.fileUrl}
                onChange={(e) => handleChange('fileUrl', e.target.value)}
                placeholder="https://example.com/files/document.pdf"
                style={inputStyle}
              />
            </div>

            {/* 파일명 + MIME 타입 (2열) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>파일명 <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  value={formData.fileName}
                  onChange={(e) => handleChange('fileName', e.target.value)}
                  maxLength={255}
                  placeholder="document.pdf"
                  style={inputStyle}
                />
              </div>
              <div>
                <label style={labelStyle}>MIME 타입 <span style={{ color: '#dc2626' }}>*</span></label>
                <input
                  type="text"
                  value={formData.mimeType}
                  onChange={(e) => handleChange('mimeType', e.target.value)}
                  maxLength={100}
                  placeholder="application/pdf"
                  style={inputStyle}
                />
              </div>
            </div>

            {/* 파일 크기 */}
            <div style={{ maxWidth: '240px' }}>
              <label style={labelStyle}>파일 크기 (bytes) <span style={{ color: '#dc2626' }}>*</span></label>
              <input
                type="number"
                value={formData.fileSize}
                onChange={(e) => handleChange('fileSize', e.target.value)}
                placeholder="1048576"
                min="0"
                style={inputStyle}
              />
            </div>
          </>
        )}

        {/* document 전용 필드 */}
        {formData.contentType === 'document' && (
          <div>
            <label style={labelStyle}>문서 본문 <span style={{ color: '#dc2626' }}>*</span></label>
            <div style={{ border: '1px solid #d1d5db', borderRadius: '6px', overflow: 'hidden' }}>
              <RichTextEditor
                value={formData.documentHtml}
                onChange={handleEditorChange}
                placeholder="문서 내용을 입력하세요..."
                preset="compact"
                minHeight="300px"
              />
            </div>
          </div>
        )}

        {/* 카테고리 */}
        <div style={{ maxWidth: '320px' }}>
          <label style={labelStyle}>카테고리</label>
          <input
            type="text"
            value={formData.category}
            onChange={(e) => handleChange('category', e.target.value)}
            maxLength={100}
            placeholder="카탈로그, 가이드 등"
            style={inputStyle}
          />
        </div>

        {/* 공개 여부 */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            id="isPublic"
            checked={formData.isPublic}
            onChange={(e) => handleChange('isPublic', e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <label htmlFor="isPublic" style={{ fontSize: '14px', color: '#1e293b', cursor: 'pointer' }}>
            공개 자료로 등록 (비인증 사용자도 조회 가능)
          </label>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '10px 24px',
              backgroundColor: saving ? '#93c5fd' : '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              fontWeight: 500,
              cursor: saving ? 'not-allowed' : 'pointer',
            }}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            {saving ? '저장 중...' : isEditMode ? '수정 저장' : '등록'}
          </button>
          <button
            onClick={() => navigate('/supplier/library')}
            style={{
              padding: '10px 24px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: 'none',
              borderRadius: '6px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '14px',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '6px',
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #d1d5db',
  borderRadius: '6px',
  fontSize: '14px',
  color: '#1e293b',
  outline: 'none',
  boxSizing: 'border-box',
};
