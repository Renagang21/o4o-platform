/**
 * StoreLibraryNewPage — 매장 자료실 등록 (멀티 에셋 타입 지원)
 *
 * WO-O4O-NETURE-TO-STORE-MANUAL-FLOW-V1
 * WO-O4O-STORE-LIBRARY-API-INTEGRATION-V1
 * WO-STORE-LIBRARY-ASSET-EXTENSION-V1
 *
 * 동작:
 * - 에셋 타입 선택: 파일 / 콘텐츠 / 외부 링크
 * - ?fromNeture=<id> 존재 시 Neture 공개 API에서 메타데이터 조회 → 폼 프리필
 * - file_url은 비워둠 (사용자 직접 업로드 필수)
 * - 자동 DB 복사 금지, FK 연결 금지
 * - handleSave → POST /api/v1/kpa/pharmacy/library
 */

import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Info, Upload, FileText, X, Link, FileEdit } from 'lucide-react';
import { RichTextEditor } from '@o4o/content-editor';
import { colors } from '../../styles/theme';
import { getNetureLibraryItem, createStoreLibraryItem } from '../../api/storeLibrary';
import type { AssetType } from '../../api/storeLibrary';

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ASSET_TYPE_OPTIONS: { key: AssetType; label: string; icon: typeof FileText }[] = [
  { key: 'file', label: '파일', icon: Upload },
  { key: 'content', label: '콘텐츠', icon: FileEdit },
  { key: 'external-link', label: '외부 링크', icon: Link },
];

export function StoreLibraryNewPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const fromNeture = searchParams.get('fromNeture');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Asset type
  const [assetType, setAssetType] = useState<AssetType>('file');

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceType, setSourceType] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [category, setCategory] = useState('');

  // File state (for 'file' type)
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Content state (for 'content' type)
  const [htmlContent, setHtmlContent] = useState('');

  // URL state (for 'external-link' type)
  const [externalUrl, setExternalUrl] = useState('');

  // UI state
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [prefillDone, setPrefillDone] = useState(false);
  const [prefillError, setPrefillError] = useState<string | null>(null);

  // Neture 프리필
  useEffect(() => {
    if (!fromNeture) return;

    let cancelled = false;
    setLoading(true);

    getNetureLibraryItem(fromNeture)
      .then((res) => {
        if (cancelled) return;
        if (res.success && res.data) {
          setTitle(res.data.title || '');
          setDescription(res.data.description || '');
          setSourceType(res.data.type || '');
          setImageUrl(res.data.imageUrl || '');
          setCategory(res.data.type || '');
          setPrefillDone(true);
        } else {
          setPrefillError('자료를 불러올 수 없습니다.');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPrefillError('자료를 불러오는 중 오류가 발생했습니다.');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [fromNeture]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setSaveError(null);
    }
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // 타입별 canSave 로직
  const canSave = (() => {
    if (saving || title.trim().length === 0) return false;
    if (assetType === 'file') return selectedFile !== null;
    if (assetType === 'content') return htmlContent.trim().length > 0;
    if (assetType === 'external-link') return externalUrl.trim().length > 0;
    return false;
  })();

  const handleSave = async () => {
    if (!canSave) return;

    setSaving(true);
    setSaveError(null);

    try {
      const params: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || undefined,
        category: category.trim() || undefined,
        assetType,
        sourceType: sourceType || (fromNeture ? 'neture-prefill' : 'manual'),
      };

      if (assetType === 'file' && selectedFile) {
        params.fileName = selectedFile.name;
        params.fileSize = selectedFile.size;
        params.mimeType = selectedFile.type || 'application/octet-stream';
      } else if (assetType === 'content') {
        params.htmlContent = htmlContent;
      } else if (assetType === 'external-link') {
        params.url = externalUrl.trim();
      }

      const result = await createStoreLibraryItem(params as any);

      if (result.success) {
        navigate('/store/operation/library', { replace: true });
      } else {
        setSaveError('자료 저장 중 오류가 발생했습니다.');
      }
    } catch {
      setSaveError('자료 저장 중 오류가 발생했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.loadingBox}>
          <p style={{ color: colors.neutral500 }}>공급자 자료를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        style={styles.backButton}
      >
        <ArrowLeft size={16} />
        돌아가기
      </button>

      {/* Page header */}
      <h1 style={styles.pageTitle}>매장 자료 등록</h1>

      {/* Neture prefill banner */}
      {fromNeture && prefillDone && (
        <div style={styles.prefillBanner}>
          <Info size={16} style={{ color: '#2563eb', flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={styles.bannerTitle}>공급자 자료에서 가져온 정보입니다</p>
            <p style={styles.bannerText}>
              제목과 설명이 자동으로 채워졌습니다. 매장에서 사용하려면 파일을 직접 업로드해주세요.
            </p>
          </div>
        </div>
      )}

      {/* Neture prefill error */}
      {fromNeture && prefillError && (
        <div style={styles.errorBanner}>
          <Info size={16} style={{ color: colors.error, flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '13px', color: colors.error }}>{prefillError}</p>
        </div>
      )}

      {/* Save error */}
      {saveError && (
        <div style={styles.errorBanner}>
          <Info size={16} style={{ color: colors.error, flexShrink: 0, marginTop: '2px' }} />
          <p style={{ margin: 0, fontSize: '13px', color: colors.error }}>{saveError}</p>
        </div>
      )}

      {/* Form */}
      <div style={styles.formCard}>
        {/* Asset Type Selector */}
        <div style={styles.fieldGroup}>
          <label style={styles.label}>자료 유형 *</label>
          <div style={styles.assetTypeTabs}>
            {ASSET_TYPE_OPTIONS.map((opt) => {
              const Icon = opt.icon;
              const isActive = assetType === opt.key;
              return (
                <button
                  key={opt.key}
                  onClick={() => setAssetType(opt.key)}
                  style={{
                    ...styles.assetTypeTab,
                    ...(isActive ? styles.assetTypeTabActive : {}),
                  }}
                >
                  <Icon size={16} />
                  {opt.label}
                </button>
              );
            })}
          </div>
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
            placeholder="예: 제품 설명, 이미지, 배너, 가이드"
            style={styles.input}
            maxLength={100}
            readOnly={!!sourceType}
          />
        </div>

        {/* Source type (read-only when prefilled) */}
        {sourceType && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>자료 유형 (공급자)</label>
            <input
              type="text"
              value={sourceType}
              readOnly
              style={{ ...styles.input, backgroundColor: colors.neutral100, color: colors.neutral500 }}
            />
          </div>
        )}

        {/* === Type-specific content areas === */}

        {/* File upload area (file type) */}
        {assetType === 'file' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>파일 업로드 *</label>
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            {selectedFile ? (
              <div style={styles.fileSelected}>
                <div style={styles.fileInfo}>
                  <FileText size={20} style={{ color: colors.primary, flexShrink: 0 }} />
                  <div>
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
                <p style={styles.uploadText}>파일을 클릭하여 업로드하세요</p>
                <p style={styles.uploadHint}>
                  {fromNeture
                    ? '공급자 자료의 파일은 자동으로 복사되지 않습니다. 다운로드한 파일을 여기에 업로드해주세요.'
                    : '이미지, PDF 등 매장에서 사용할 파일을 업로드하세요.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Rich text editor (content type) */}
        {assetType === 'content' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>콘텐츠 작성 *</label>
            <div style={styles.editorWrapper}>
              <RichTextEditor
                value={htmlContent}
                onChange={(content) => setHtmlContent(content.html)}
                placeholder="콘텐츠를 작성하세요..."
              />
            </div>
          </div>
        )}

        {/* URL input (external-link type) */}
        {assetType === 'external-link' && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>외부 링크 URL *</label>
            <input
              type="url"
              value={externalUrl}
              onChange={(e) => setExternalUrl(e.target.value)}
              placeholder="https://example.com"
              style={styles.input}
            />
            <p style={{ margin: '6px 0 0', fontSize: '12px', color: colors.neutral400 }}>
              YouTube, 블로그 등 외부 URL을 입력하세요.
            </p>
          </div>
        )}

        {/* Image preview (if prefilled) */}
        {imageUrl && (
          <div style={styles.fieldGroup}>
            <label style={styles.label}>참고 이미지 (공급자 원본)</label>
            <div style={styles.previewBox}>
              <img
                src={imageUrl}
                alt="공급자 원본 이미지"
                style={styles.previewImage}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <p style={styles.previewHint}>이 이미지는 참고용입니다. 매장 사용을 위해 직접 업로드해주세요.</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={styles.actions}>
          <button onClick={() => navigate(-1)} style={styles.cancelBtn}>취소</button>
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
    textAlign: 'center',
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
  prefillBanner: {
    display: 'flex',
    gap: '12px',
    backgroundColor: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '20px',
  },
  bannerTitle: {
    margin: '0 0 4px 0',
    fontSize: '14px',
    fontWeight: 600,
    color: '#1e40af',
  },
  bannerText: {
    margin: 0,
    fontSize: '13px',
    color: '#1e40af',
    lineHeight: 1.5,
  },
  errorBanner: {
    display: 'flex',
    gap: '12px',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    border: `1px solid #fecaca`,
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '20px',
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
  // Asset type selector
  assetTypeTabs: {
    display: 'flex',
    gap: '8px',
  },
  assetTypeTab: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 16px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral600,
    cursor: 'pointer',
    fontWeight: 400,
    transition: 'all 0.15s',
  },
  assetTypeTabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: '#fff',
    fontWeight: 500,
  },
  // File upload
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
  // Editor
  editorWrapper: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    overflow: 'hidden',
    minHeight: '300px',
  },
  previewBox: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    padding: '12px',
    backgroundColor: colors.neutral50,
  },
  previewImage: {
    maxWidth: '100%',
    maxHeight: '200px',
    borderRadius: '6px',
    objectFit: 'contain' as const,
  },
  previewHint: {
    margin: '8px 0 0',
    fontSize: '12px',
    color: colors.neutral400,
  },
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
