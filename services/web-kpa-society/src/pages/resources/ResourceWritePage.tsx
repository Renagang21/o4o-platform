/**
 * ResourceWritePage — 자료 등록/수정
 *
 * WO-KPA-RESOURCES-UPLOAD-ENTRY-AND-FORM-SEPARATION-V1
 *
 * 두 가지 등록 모드:
 * - 파일 등록: mediaApi.upload → source_type='upload'
 * - 편집기 등록: RichTextEditor → source_type='manual'
 *
 * DB/API는 기존 kpa_contents / POST /contents를 그대로 사용.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { RichTextEditor } from '@o4o/content-editor';
import { resourcesApi } from '../../api/resources';
import { mediaApi } from '../../api/media';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

// ─── Types ────────────────────────────────────────────────────────────────────

type WriteMode = 'file' | 'editor';
type UsageType = 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY';

// source_type → 기본 usage_type 파생
function deriveUsageType(sourceType: 'upload' | 'external' | 'manual'): UsageType {
  if (sourceType === 'external') return 'LINK';
  if (sourceType === 'upload') return 'DOWNLOAD';
  return 'READ';
}

const USAGE_TYPE_OPTIONS: { value: UsageType; label: string; desc: string }[] = [
  { value: 'READ',     label: '📄 읽기',       desc: '화면에서 내용을 읽는 자료' },
  { value: 'LINK',     label: '🔗 링크 열기',  desc: '외부 웹페이지로 이동하는 자료' },
  { value: 'DOWNLOAD', label: '⬇ 다운로드',   desc: '파일을 저장해서 사용하는 자료' },
  { value: 'COPY',     label: '📋 내용 복사',  desc: '내용을 복사해서 활용하는 자료' },
];

interface UploadedFile {
  url: string;
  fileName: string;
  fileSize: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResourceWritePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useAuth();
  const isEditMode = Boolean(id);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── State ──
  const [mode, setMode] = useState<WriteMode>('file');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState('');
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  // WO-O4O-KPA-RESOURCES-USAGE-TYPE-V1: usage_type + 자동동기화 플래그
  const [usageType, setUsageType] = useState<UsageType>('DOWNLOAD'); // file 모드 기본
  const [autoSyncUsageType, setAutoSyncUsageType] = useState(true);

  // ── Auth guard ──
  useEffect(() => {
    if (!isAuthenticated) {
      toast.error('로그인이 필요합니다');
      navigate('/resources', { replace: true });
    }
  }, [isAuthenticated, navigate]);

  // ── Load existing for edit ──
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    resourcesApi.getDetail(id)
      .then((res) => {
        if (res.data) {
          const item = res.data;
          if (item.created_by !== user?.id) {
            toast.error('수정 권한이 없습니다');
            navigate('/resources', { replace: true });
            return;
          }
          setTitle(item.title);
          setSummary(item.summary || '');
          setBody(item.body || '');
          setTags((item.tags || []).join(', '));

          // Determine mode from source_type
          if (item.source_type === 'upload' || item.source_type === 'external') {
            setMode('file');
            if (item.source_url) {
              setUploadedFile({
                url: item.source_url,
                fileName: item.source_file_name || '첨부파일',
                fileSize: 0,
              });
            }
          } else {
            setMode('editor');
          }
          // 수정 모드: 저장된 usage_type 복원 (autoSync 비활성)
          if (item.usage_type && ['READ','LINK','DOWNLOAD','COPY'].includes(item.usage_type)) {
            setUsageType(item.usage_type as UsageType);
            setAutoSyncUsageType(false);
          }
        }
      })
      .catch((e) => {
        toast.error(e?.message || '자료를 불러올 수 없습니다');
        navigate('/resources', { replace: true });
      })
      .finally(() => setLoading(false));
  }, [id, user?.id, navigate]);

  // ── File upload handler ──
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
        });
        toast.success('파일이 업로드되었습니다');
      } else {
        toast.error(res.error || '업로드에 실패했습니다');
      }
    } catch {
      toast.error('업로드에 실패했습니다');
    } finally {
      setUploading(false);
      // Reset input so same file can be selected again
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
  };

  // ── Save handler ──
  const handleSave = async (saveStatus: 'draft' | 'published') => {
    if (!title.trim()) {
      toast.error('제목을 입력해주세요');
      return;
    }
    if (mode === 'file' && !uploadedFile) {
      toast.error('파일을 선택해주세요');
      return;
    }

    setSaving(true);
    try {
      const tagArr = tags.split(',').map((t) => t.trim()).filter(Boolean);

      const payload = mode === 'file'
        ? {
            title: title.trim(),
            summary: summary || undefined,
            tags: tagArr.length > 0 ? tagArr : undefined,
            source_type: 'upload' as const,
            source_url: uploadedFile!.url,
            source_file_name: uploadedFile!.fileName,
            status: saveStatus,
            usage_type: usageType,
          }
        : {
            title: title.trim(),
            summary: summary || undefined,
            body: body || undefined,
            tags: tagArr.length > 0 ? tagArr : undefined,
            source_type: 'manual' as const,
            status: saveStatus,
            usage_type: usageType,
          };

      if (isEditMode && id) {
        const res = await resourcesApi.update(id, payload);
        if (res.data) {
          toast.success('수정되었습니다');
          navigate('/resources');
        }
      } else {
        const res = await resourcesApi.create(payload);
        if (res.data) {
          toast.success('등록되었습니다');
          navigate('/resources');
        }
      }
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  // ── Image upload for RichTextEditor ──
  const handleImageUpload = async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, 'kpa-society', 'resources');
    if (res.success && res.data) return res.data.url;
    throw new Error('이미지 업로드에 실패했습니다');
  };

  // ── Format file size ──
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  // ── Render ──

  if (loading) {
    return (
      <div style={styles.center}>
        <p style={{ color: '#64748b' }}>불러오는 중...</p>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <h1 style={styles.pageTitle}>
        {isEditMode ? '자료 수정' : '자료 등록'}
      </h1>

      <div style={styles.card}>
        {/* Mode Tabs */}
        {!isEditMode && (
          <div style={styles.modeTabs}>
            <button
              onClick={() => {
                setMode('file');
                if (autoSyncUsageType) setUsageType('DOWNLOAD');
              }}
              style={{
                ...styles.modeTab,
                ...(mode === 'file' ? styles.modeTabActive : {}),
              }}
            >
              파일 등록
            </button>
            <button
              onClick={() => {
                setMode('editor');
                if (autoSyncUsageType) setUsageType('READ');
              }}
              style={{
                ...styles.modeTab,
                ...(mode === 'editor' ? styles.modeTabActive : {}),
              }}
            >
              편집기 등록
            </button>
          </div>
        )}

        {/* Title */}
        <div style={styles.field}>
          <label style={styles.label}>제목 <span style={styles.required}>*</span></label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="자료 제목을 입력하세요"
            style={styles.input}
          />
        </div>

        {/* Summary */}
        <div style={styles.field}>
          <label style={styles.label}>설명 <span style={styles.hint}>(선택)</span></label>
          <textarea
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="자료에 대한 간단한 설명을 입력하세요"
            rows={3}
            style={styles.textarea}
          />
        </div>

        {/* File Upload Mode */}
        {mode === 'file' && (
          <div style={styles.field}>
            <label style={styles.label}>파일</label>
            {!uploadedFile ? (
              <div style={styles.uploadArea}>
                <input
                  ref={fileInputRef}
                  type="file"
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  id="resource-file-input"
                />
                <div style={styles.uploadPlaceholder}>
                  <span style={styles.uploadIcon}>&#128196;</span>
                  <p style={styles.uploadText}>파일을 선택하세요</p>
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    style={styles.uploadBtn}
                  >
                    {uploading ? '업로드 중...' : '파일 선택'}
                  </button>
                </div>
              </div>
            ) : (
              <div style={styles.fileInfo}>
                <span style={styles.fileIcon}>&#9989;</span>
                <span style={styles.fileName}>{uploadedFile.fileName}</span>
                {uploadedFile.fileSize > 0 && (
                  <span style={styles.fileSize}>{formatFileSize(uploadedFile.fileSize)}</span>
                )}
                <button onClick={handleRemoveFile} style={styles.fileRemoveBtn}>
                  제거
                </button>
              </div>
            )}
          </div>
        )}

        {/* Editor Mode */}
        {mode === 'editor' && (
          <div style={styles.field}>
            <label style={styles.label}>본문</label>
            <RichTextEditor
              value={body}
              onChange={(content) => setBody(content.html)}
              onImageUpload={handleImageUpload}
              placeholder="내용을 입력하세요"
              minHeight="300px"
            />
          </div>
        )}

        {/* Usage Type — WO-O4O-KPA-RESOURCES-USAGE-TYPE-V1 */}
        <div style={styles.field}>
          <label style={styles.label}>자료 활용 방식</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
            {USAGE_TYPE_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                title={opt.desc}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '8px 14px',
                  border: `1px solid ${usageType === opt.value ? '#2563eb' : '#e2e8f0'}`,
                  borderRadius: 8,
                  backgroundColor: usageType === opt.value ? '#eff6ff' : '#fff',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                  fontWeight: usageType === opt.value ? 600 : 400,
                  color: usageType === opt.value ? '#1d4ed8' : '#475569',
                  transition: 'all 0.15s',
                }}
              >
                <input
                  type="radio"
                  name="usage_type"
                  value={opt.value}
                  checked={usageType === opt.value}
                  onChange={() => {
                    setUsageType(opt.value);
                    setAutoSyncUsageType(false); // 수동 선택 → autoSync 비활성
                  }}
                  style={{ display: 'none' }}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        {/* Tags */}
        <div style={styles.field}>
          <label style={styles.label}>태그 <span style={styles.hint}>(선택, 쉼표로 구분)</span></label>
          <input
            type="text"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
            placeholder="예: 약국경영, 복약지도, 건강관리"
            style={styles.input}
          />
        </div>

        {/* Action Buttons */}
        <div style={styles.actions}>
          <button
            onClick={() => navigate(-1)}
            style={styles.cancelBtn}
            disabled={saving}
          >
            취소
          </button>
          <button
            onClick={() => handleSave('draft')}
            disabled={saving || uploading}
            style={styles.draftBtn}
          >
            {saving ? '저장 중...' : '임시 저장'}
          </button>
          <button
            onClick={() => handleSave('published')}
            disabled={saving || uploading}
            style={styles.publishBtn}
          >
            {saving ? '저장 중...' : '공개'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 780,
    margin: '0 auto',
    padding: '24px 16px 60px',
  },
  center: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '40vh',
  },
  pageTitle: {
    fontSize: '1.375rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 20px',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  },
  modeTabs: {
    display: 'flex',
    gap: 0,
    marginBottom: 24,
    borderBottom: '2px solid #e2e8f0',
  },
  modeTab: {
    flex: 1,
    padding: '12px 16px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  modeTabActive: {
    color: '#2563eb',
    fontWeight: 600,
    borderBottomColor: '#2563eb',
  },
  field: {
    marginBottom: 20,
  },
  label: {
    display: 'block',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
    marginBottom: 6,
  },
  required: {
    color: '#ef4444',
  },
  hint: {
    fontSize: '0.75rem',
    fontWeight: 400,
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    boxSizing: 'border-box' as const,
  },
  textarea: {
    width: '100%',
    padding: '10px 14px',
    fontSize: '0.875rem',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    outline: 'none',
    resize: 'vertical' as const,
    boxSizing: 'border-box' as const,
  },
  uploadArea: {
    border: '2px dashed #e2e8f0',
    borderRadius: 12,
    padding: '32px 20px',
    backgroundColor: '#f8fafc',
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
  },
  uploadIcon: {
    fontSize: '2rem',
  },
  uploadText: {
    fontSize: '0.875rem',
    color: '#64748b',
    margin: 0,
  },
  uploadBtn: {
    marginTop: 4,
    padding: '8px 20px',
    fontSize: '0.8125rem',
    fontWeight: 600,
    color: '#2563eb',
    backgroundColor: '#ffffff',
    border: '1px solid #2563eb',
    borderRadius: 8,
    cursor: 'pointer',
  },
  fileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: 8,
  },
  fileIcon: {
    fontSize: '1rem',
  },
  fileName: {
    flex: 1,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  fileSize: {
    fontSize: '0.75rem',
    color: '#94a3b8',
    flexShrink: 0,
  },
  fileRemoveBtn: {
    padding: '4px 10px',
    fontSize: '0.75rem',
    fontWeight: 500,
    color: '#ef4444',
    backgroundColor: '#ffffff',
    border: '1px solid #fecaca',
    borderRadius: 6,
    cursor: 'pointer',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    paddingTop: 16,
    borderTop: '1px solid #f1f5f9',
  },
  cancelBtn: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#64748b',
    backgroundColor: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
  },
  draftBtn: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#334155',
    backgroundColor: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: 8,
    cursor: 'pointer',
  },
  publishBtn: {
    padding: '10px 20px',
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#ffffff',
    backgroundColor: '#2563eb',
    border: '1px solid #2563eb',
    borderRadius: 8,
    cursor: 'pointer',
  },
};

export default ResourceWritePage;
