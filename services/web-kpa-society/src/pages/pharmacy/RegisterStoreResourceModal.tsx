/**
 * RegisterStoreResourceModal — 매장 원소스 자료 직접 등록
 *
 * WO-O4O-STORE-LIBRARY-RESOURCE-DIRECT-REGISTER-V2
 *
 * 매장 운영자가 콘텐츠 제작 시 참고할 원소스 자료를 직접 등록한다.
 * 본 모달은 조회/저장 전용 — 편집기/AI/콘텐츠 생성/제작 진입 없음.
 *
 * 등록 방식:
 *   - 외부 링크: assetType='external-link', url=<URL>
 *   - 파일 업로드: mediaApi.upload → assetType='file' + fileUrl/fileName/fileSize/mimeType
 *
 * 저장 대상:
 *   POST /store/assets (store_execution_assets) — sourceType='direct' (직접 등록 출처 식별)
 *   목록에서는 kind='library' 행이 되어 "직접 등록" 배지로 표시된다.
 */

import { useRef, useState, type CSSProperties } from 'react';
import { X, Upload, Link as LinkIcon, FileText } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import { mediaApi } from '../../api/media';
import { createStoreExecutionAsset } from '../../api/storeExecutionAssets';
import { colors } from '../../styles/theme';

type RegisterMode = 'link' | 'file';

interface UploadedFile {
  url: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
}

export interface RegisterStoreResourceModalProps {
  open: boolean;
  onClose: () => void;
  onRegistered: () => void;
}

export function RegisterStoreResourceModal({ open, onClose, onRegistered }: RegisterStoreResourceModalProps) {
  const [mode, setMode] = useState<RegisterMode>('link');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [externalUrl, setExternalUrl] = useState('');
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  if (!open) return null;

  const resetForm = () => {
    setMode('link');
    setTitle('');
    setDescription('');
    setExternalUrl('');
    setUploadedFile(null);
    setUploading(false);
    setSaving(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleClose = () => {
    if (saving || uploading) return;
    resetForm();
    onClose();
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await mediaApi.upload(file, true, 'kpa-society', 'resources');
      if (res.success && res.data) {
        setUploadedFile({
          url: res.data.url,
          fileName: res.data.originalName,
          fileSize: res.data.fileSize,
          mimeType: res.data.mimeType,
        });
        if (!title.trim()) setTitle(res.data.originalName);
        toast.success('파일이 업로드되었습니다');
      } else {
        toast.error(res.error || '업로드에 실패했습니다');
      }
    } catch {
      toast.error('업로드에 실패했습니다');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    if (mode === 'link' && !externalUrl.trim()) {
      toast.error('외부 링크 URL 을 입력해주세요');
      return;
    }
    if (mode === 'file' && !uploadedFile) {
      toast.error('파일을 업로드해주세요');
      return;
    }

    setSaving(true);
    try {
      if (mode === 'link') {
        await createStoreExecutionAsset({
          title: title.trim(),
          description: description.trim() || undefined,
          assetType: 'external-link',
          url: externalUrl.trim(),
          sourceType: 'direct',
        });
      } else if (uploadedFile) {
        await createStoreExecutionAsset({
          title: title.trim(),
          description: description.trim() || undefined,
          assetType: 'file',
          fileUrl: uploadedFile.url,
          fileName: uploadedFile.fileName,
          fileSize: uploadedFile.fileSize,
          mimeType: uploadedFile.mimeType,
          sourceType: 'direct',
        });
      }
      toast.success('자료가 등록되었습니다');
      resetForm();
      onRegistered();
      onClose();
    } catch (e: any) {
      toast.error(e?.message || '등록에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div style={styles.backdrop} onClick={handleClose} aria-hidden="true" />
      <div role="dialog" aria-label="자료 등록" style={styles.modal}>
        <header style={styles.header}>
          <h2 style={styles.headerTitle}>자료 등록</h2>
          <button
            type="button"
            onClick={handleClose}
            style={styles.closeBtn}
            aria-label="닫기"
            disabled={saving || uploading}
          >
            <X size={18} />
          </button>
        </header>

        <div style={styles.body}>
          <div style={styles.modeRow}>
            <button
              type="button"
              onClick={() => setMode('link')}
              style={{ ...styles.modeBtn, ...(mode === 'link' ? styles.modeBtnActive : {}) }}
              disabled={saving || uploading}
            >
              <LinkIcon size={14} />
              외부 링크
            </button>
            <button
              type="button"
              onClick={() => setMode('file')}
              style={{ ...styles.modeBtn, ...(mode === 'file' ? styles.modeBtnActive : {}) }}
              disabled={saving || uploading}
            >
              <Upload size={14} />
              파일 업로드
            </button>
          </div>

          <Field label="제목" required>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="자료 제목"
              style={styles.input}
              disabled={saving}
              maxLength={200}
            />
          </Field>

          <Field label="설명 / 메모">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="콘텐츠 제작 시 참고할 메모"
              style={{ ...styles.input, ...styles.textarea }}
              disabled={saving}
              rows={3}
              maxLength={1000}
            />
          </Field>

          {mode === 'link' ? (
            <Field label="외부 링크 URL" required>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                style={styles.input}
                disabled={saving}
              />
            </Field>
          ) : (
            <Field label="파일" required>
              <input
                ref={fileInputRef}
                type="file"
                onChange={handleFileSelect}
                style={styles.fileInput}
                disabled={saving || uploading}
              />
              {uploading && <p style={styles.helperText}>업로드 중...</p>}
              {uploadedFile && (
                <div style={styles.uploadedBox}>
                  <FileText size={14} style={{ color: colors.primary, flexShrink: 0 }} />
                  <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                    <span style={styles.uploadedName}>{uploadedFile.fileName}</span>
                    <span style={styles.uploadedMeta}>
                      {formatBytes(uploadedFile.fileSize)} · {uploadedFile.mimeType || '—'}
                    </span>
                  </div>
                </div>
              )}
            </Field>
          )}
        </div>

        <footer style={styles.footer}>
          <button
            type="button"
            onClick={handleClose}
            style={styles.cancelBtn}
            disabled={saving || uploading}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            style={styles.submitBtn}
            disabled={saving || uploading}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </footer>
      </div>
    </>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label style={styles.field}>
      <span style={styles.fieldLabel}>
        {label}
        {required && <span style={styles.requiredMark}>*</span>}
      </span>
      {children}
    </label>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(15, 23, 42, 0.4)',
    zIndex: 110,
  },
  modal: {
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 'min(480px, calc(100% - 32px))',
    maxHeight: 'calc(100% - 32px)',
    background: colors.white,
    borderRadius: '10px',
    boxShadow: '0 16px 48px rgba(15, 23, 42, 0.2)',
    display: 'flex',
    flexDirection: 'column',
    zIndex: 120,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 18px',
    borderBottom: `1px solid ${colors.neutral200}`,
    flexShrink: 0,
  },
  headerTitle: {
    margin: 0,
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral800,
  },
  closeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '32px',
    height: '32px',
    background: 'transparent',
    border: 'none',
    color: colors.neutral500,
    cursor: 'pointer',
    borderRadius: '6px',
  },
  body: {
    padding: '18px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: '14px',
  },
  modeRow: {
    display: 'flex',
    gap: '8px',
  },
  modeBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  modeBtnActive: {
    background: '#EFF6FF',
    borderColor: colors.primary,
    color: colors.primary,
    fontWeight: 500,
  },
  field: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
  },
  fieldLabel: {
    fontSize: '12px',
    fontWeight: 500,
    color: colors.neutral600,
  },
  requiredMark: {
    color: '#DC2626',
    marginLeft: '4px',
  },
  input: {
    width: '100%',
    padding: '8px 10px',
    fontSize: '13px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    background: colors.white,
    color: colors.neutral800,
    outline: 'none',
    boxSizing: 'border-box',
  },
  textarea: {
    resize: 'vertical',
    minHeight: '64px',
    fontFamily: 'inherit',
  },
  fileInput: {
    fontSize: '13px',
    color: colors.neutral700,
  },
  helperText: {
    margin: '4px 0 0',
    fontSize: '12px',
    color: colors.neutral500,
  },
  uploadedBox: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '4px',
    padding: '8px 10px',
    background: colors.neutral50,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '6px',
  },
  uploadedName: {
    fontSize: '13px',
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  uploadedMeta: {
    fontSize: '11px',
    color: colors.neutral500,
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '8px',
    padding: '12px 18px',
    borderTop: `1px solid ${colors.neutral200}`,
    flexShrink: 0,
  },
  cancelBtn: {
    padding: '8px 16px',
    fontSize: '13px',
    background: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  submitBtn: {
    padding: '8px 18px',
    fontSize: '13px',
    background: colors.primary,
    border: 'none',
    borderRadius: '6px',
    color: colors.white,
    fontWeight: 500,
    cursor: 'pointer',
  },
};
