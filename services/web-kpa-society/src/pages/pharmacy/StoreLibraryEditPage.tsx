/**
 * StoreLibraryEditPage — 매장 자료 수정 (멀티 에셋 타입 지원)
 *
 * WO-O4O-STORE-LIBRARY-EDIT-V1
 * WO-STORE-LIBRARY-ASSET-EXTENSION-V1
 *
 * 기존 자료 로드 → 타입별 수정 UI
 * - file: 제목/설명/카테고리 + 파일 교체
 * - content: 제목/설명/카테고리 + 리치 텍스트 편집
 * - external-link: 제목/설명/카테고리 + URL 수정
 *
 * asset_type은 생성 후 변경 불가 (read-only 배지)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, X, Image, ExternalLink } from 'lucide-react';
import { RichTextEditor } from '@o4o/content-editor';
import { colors } from '../../styles/theme';
import { getStoreLibraryItem, updateStoreLibraryItem } from '../../api/storeLibrary';
import type { StoreLibraryItem } from '../../api/storeLibrary';

const ALLOWED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];
const ACCEPT_STRING = ALLOWED_EXTENSIONS.map(e => `.${e}`).join(',');
const IMAGE_MAX_SIZE = 10 * 1024 * 1024; // 10MB
const PDF_MAX_SIZE = 20 * 1024 * 1024;   // 20MB

const ASSET_TYPE_LABELS: Record<string, string> = {
  file: '파일',
  content: '콘텐츠',
  'external-link': '외부 링크',
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function validateFile(file: File): string | null {
  const ext = file.name.split('.').pop()?.toLowerCase() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    return `허용되지 않는 파일 형식입니다. (${ALLOWED_EXTENSIONS.join(', ')})`;
  }
  if (ext === 'pdf') {
    if (file.size > PDF_MAX_SIZE) {
      return '파일 크기가 제한을 초과했습니다.\nPDF: 20MB 이하';
    }
  } else {
    if (file.size > IMAGE_MAX_SIZE) {
      return '파일 크기가 제한을 초과했습니다.\n이미지: 10MB 이하';
    }
  }
  return null;
}

export function StoreLibraryEditPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Original data
  const [item, setItem] = useState<StoreLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  // File state (file type)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  // Content state (content type)
  const [htmlContent, setHtmlContent] = useState('');

  // URL state (external-link type)
  const [externalUrl, setExternalUrl] = useState('');

  // Save state
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadItem = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setLoadError(null);
      const result = await getStoreLibraryItem(id);
      const data = result.data;
      setItem(data);
      setTitle(data.title || '');
      setDescription(data.description || '');
      setCategory(data.category || '');
      setHtmlContent(data.htmlContent || '');
      setExternalUrl(data.url || '');
    } catch (err: any) {
      setLoadError(err.message || '자료를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const error = validateFile(file);
    if (error) {
      setFileError(error);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setFileError(null);
    setSelectedFile(file);
    setSaveError(null);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setFileError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const currentType = item?.assetType || 'file';
  const canSave = title.trim().length > 0 && !saving;

  const handleSave = async () => {
    if (!canSave || !id) return;

    setSaving(true);
    setSaveError(null);

    try {
      const params: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
      };

      if (currentType === 'file' && selectedFile) {
        params.fileName = selectedFile.name;
        params.fileSize = selectedFile.size;
        params.mimeType = selectedFile.type || 'application/octet-stream';
      } else if (currentType === 'content') {
        params.htmlContent = htmlContent;
      } else if (currentType === 'external-link') {
        params.url = externalUrl.trim();
      }

      const result = await updateStoreLibraryItem(id, params);

      if (result.success) {
        navigate(`/store/operation/library/${id}`, { replace: true });
      } else {
        setSaveError('자료 수정 중 오류가 발생했습니다.');
      }
    } catch {
      setSaveError('자료 수정 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // Loading
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <p style={{ color: colors.neutral500 }}>자료를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  // Load error
  if (loadError || !item) {
    return (
      <div style={styles.container}>
        <button onClick={() => navigate('/store/operation/library')} style={styles.backButton}>
          <ArrowLeft size={16} /> 목록으로
        </button>
        <div style={styles.errorCard}>
          <p style={{ margin: 0, fontSize: '14px', color: colors.error }}>
            {loadError || '자료를 찾을 수 없습니다.'}
          </p>
        </div>
      </div>
    );
  }

  const hasCurrentFile = !!item.fileUrl;
  const isCurrentImage = item.mimeType?.startsWith('image/');

  return (
    <div style={styles.container}>
      {/* Back */}
      <button onClick={() => navigate(`/store/operation/library/${id}`)} style={styles.backButton}>
        <ArrowLeft size={16} /> 돌아가기
      </button>

      <h1 style={styles.pageTitle}>자료 수정</h1>

      {/* Save error */}
      {saveError && (
        <div style={styles.errorBanner}>
          <p style={{ margin: 0, fontSize: '13px', color: colors.error }}>{saveError}</p>
        </div>
      )}

      {/* Form */}
      <div style={styles.formCard}>
        {/* Asset type badge (read-only) */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>자료 유형</label>
          <span style={styles.assetTypeBadge}>
            {ASSET_TYPE_LABELS[currentType] || currentType}
          </span>
        </div>

        {/* Title */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>제목 *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="자료 제목을 입력하세요"
            style={styles.input}
            maxLength={200}
          />
        </div>

        {/* Description */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="자료에 대한 설명을 입력하세요"
            style={styles.textarea}
            rows={4}
          />
        </div>

        {/* Category */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>카테고리</label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            placeholder="예: banner, promotion, signage, qr, manual"
            style={styles.input}
            maxLength={100}
          />
        </div>

        {/* === Type-specific editing === */}

        {/* File type: Current file + replacement */}
        {currentType === 'file' && (
          <>
            {/* Current File */}
            {hasCurrentFile && !selectedFile && (
              <div style={styles.fieldGroup}>
                <label style={styles.label}>현재 파일</label>
                <div style={styles.currentFile}>
                  <div style={styles.currentFileInfo}>
                    {isCurrentImage ? (
                      <Image size={20} style={{ color: colors.primary, flexShrink: 0 }} />
                    ) : (
                      <FileText size={20} style={{ color: colors.primary, flexShrink: 0 }} />
                    )}
                    <div style={{ minWidth: 0 }}>
                      <p style={styles.fileName}>{item.fileName || '파일'}</p>
                      <p style={styles.fileMeta}>
                        {item.fileSize ? formatFileSize(item.fileSize) : ''}
                        {item.mimeType ? ` · ${item.mimeType}` : ''}
                      </p>
                    </div>
                  </div>
                  {item.fileUrl && (
                    <a
                      href={item.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={styles.previewLink}
                    >
                      <ExternalLink size={14} /> 미리보기
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* File Upload / Replace */}
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                {hasCurrentFile ? '파일 교체' : '파일 업로드'}
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept={ACCEPT_STRING}
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />

              {fileError && (
                <div style={styles.fileErrorBanner}>
                  <p style={{ margin: 0, fontSize: '13px', color: colors.error, whiteSpace: 'pre-line' }}>
                    {fileError}
                  </p>
                </div>
              )}

              {selectedFile ? (
                <div style={styles.fileSelected}>
                  <div style={styles.fileInfo}>
                    <FileText size={20} style={{ color: colors.primary, flexShrink: 0 }} />
                    <div style={{ minWidth: 0 }}>
                      <p style={styles.fileName}>{selectedFile.name}</p>
                      <p style={styles.fileMeta}>
                        {formatFileSize(selectedFile.size)} · {selectedFile.type || 'unknown'}
                      </p>
                    </div>
                  </div>
                  <button onClick={handleRemoveFile} style={styles.removeFileBtn} title="파일 제거">
                    <X size={16} />
                  </button>
                </div>
              ) : (
                <div
                  style={styles.uploadArea}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload size={32} style={{ color: colors.neutral400 }} />
                  <p style={styles.uploadText}>
                    {hasCurrentFile ? '새 파일을 선택하여 교체하세요' : '파일을 클릭하여 업로드하세요'}
                  </p>
                  <p style={styles.uploadHint}>
                    이미지(jpg, png, webp): 10MB 이하 · PDF: 20MB 이하
                  </p>
                </div>
              )}
            </div>
          </>
        )}

        {/* Content type: Rich text editor */}
        {currentType === 'content' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>콘텐츠 편집</label>
            <div style={styles.editorWrapper}>
              <RichTextEditor
                value={htmlContent}
                onChange={(content) => setHtmlContent(content.html)}
                placeholder="콘텐츠를 편집하세요..."
              />
            </div>
          </div>
        )}

        {/* External link type: URL input */}
        {currentType === 'external-link' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>외부 링크 URL</label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://example.com"
              style={styles.input}
            />
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={() => navigate(`/store/operation/library/${id}`)} style={styles.cancelBtn}>취소</button>
          <button
            onClick={handleSave}
            disabled={!canSave}
            style={{
              ...styles.saveBtn,
              opacity: canSave ? 1 : 0.5,
              cursor: canSave ? 'pointer' : 'not-allowed',
            }}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '720px',
    margin: '0 auto',
    padding: '24px 0',
  },
  loadingBox: {
    textAlign: 'center' as const,
    padding: '60px',
  },
  backButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '6px 12px',
    backgroundColor: 'transparent',
    border: 'none',
    color: colors.neutral500,
    fontSize: '13px',
    cursor: 'pointer',
    marginBottom: '16px',
  },
  pageTitle: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: '0 0 20px 0',
  },
  errorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '16px',
  },
  errorCard: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    padding: '40px 24px',
    textAlign: 'center' as const,
  },
  formCard: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
    padding: '24px',
  },
  fieldGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '6px',
  },
  input: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral800,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 12px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral800,
    outline: 'none',
    resize: 'vertical' as const,
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  assetTypeBadge: {
    display: 'inline-block',
    padding: '4px 12px',
    borderRadius: '12px',
    backgroundColor: `${colors.primary}15`,
    color: colors.primary,
    fontSize: '13px',
    fontWeight: 500,
  },
  // Current file
  currentFile: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    backgroundColor: colors.neutral50,
    gap: '12px',
  },
  currentFileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  previewLink: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    fontSize: '13px',
    color: colors.primary,
    textDecoration: 'none',
    flexShrink: 0,
  },
  // Upload
  uploadArea: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '32px',
    border: `2px dashed ${colors.neutral300}`,
    borderRadius: '10px',
    backgroundColor: colors.neutral50,
    cursor: 'pointer',
  },
  uploadText: {
    margin: '12px 0 4px',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral600,
  },
  uploadHint: {
    margin: 0,
    fontSize: '12px',
    color: colors.neutral400,
    textAlign: 'center' as const,
    lineHeight: 1.5,
  },
  fileSelected: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 16px',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '10px',
    backgroundColor: colors.neutral50,
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flex: 1,
    minWidth: 0,
  },
  fileName: {
    margin: 0,
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  fileMeta: {
    margin: '2px 0 0',
    fontSize: '12px',
    color: colors.neutral400,
  },
  removeFileBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '28px',
    height: '28px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
    color: colors.neutral500,
    cursor: 'pointer',
    flexShrink: 0,
  },
  fileErrorBanner: {
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '10px 14px',
    marginBottom: '10px',
  },
  editorWrapper: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    overflow: 'hidden',
    minHeight: '300px',
  },
  // Actions
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '20px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelBtn: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  saveBtn: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
  },
};
