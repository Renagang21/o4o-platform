/**
 * SupplierLibraryFormPage - 자료 등록/수정
 *
 * WO-O4O-NETURE-LIBRARY-UI-V1
 * - 등록 모드: POST /api/v1/neture/library
 * - 수정 모드: PATCH /api/v1/neture/library/:id
 * - 파일 URL 직접 입력 (S3 업로드 미구현)
 */

import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Save, Loader2 } from 'lucide-react';
import { supplierApi } from '../../lib/api';

interface FormData {
  title: string;
  description: string;
  fileUrl: string;
  fileName: string;
  fileSize: string;
  mimeType: string;
  category: string;
  isPublic: boolean;
}

const initialFormData: FormData = {
  title: '',
  description: '',
  fileUrl: '',
  fileName: '',
  fileSize: '',
  mimeType: '',
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
        setFormData({
          title: item.title,
          description: item.description || '',
          fileUrl: item.fileUrl,
          fileName: item.fileName,
          fileSize: String(item.fileSize),
          mimeType: item.mimeType,
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

  const handleSubmit = async () => {
    // 유효성 검증
    if (!formData.title.trim()) {
      setError('제목을 입력하세요.');
      return;
    }
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

    setSaving(true);
    setError(null);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || undefined,
      fileUrl: formData.fileUrl.trim(),
      fileName: formData.fileName.trim(),
      fileSize,
      mimeType: formData.mimeType.trim(),
      category: formData.category.trim() || undefined,
      isPublic: formData.isPublic,
    };

    let result;
    if (isEditMode && id) {
      result = await supplierApi.updateLibraryItem(id, payload);
    } else {
      result = await supplierApi.createLibraryItem(payload);
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
    <div style={{ padding: '32px', maxWidth: '640px' }}>
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

        {/* 파일 크기 + 카테고리 (2열) */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
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
          <div>
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
