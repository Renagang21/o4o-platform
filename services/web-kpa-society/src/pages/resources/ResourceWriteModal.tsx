/**
 * ResourceWriteModal — 자료 등록 모달
 *
 * WO-O4O-KPA-RESOURCES-CREATE-MODAL-UX-V1
 * - /resources/new 페이지형 등록 → 모달 전환 (신규 등록만)
 * - 수정 모드는 /resources/:id/edit 페이지 유지
 * - 태그 chip 및 활용 방식 버튼 스타일 개선 포함
 */

import { useState, useEffect, useRef } from 'react';
import { RichTextEditor, AiContentModal } from '@o4o/content-editor';
import { resourcesApi } from '../../api/resources';
import { mediaApi } from '../../api/media';
import { getAccessToken } from '../../contexts/AuthContext';
import { toast } from '@o4o/error-handling';

// ─── Types ────────────────────────────────────────────────────────────────────

type UsageType = 'READ' | 'LINK' | 'DOWNLOAD' | 'COPY';

const USAGE_TYPE_OPTIONS: { value: UsageType; label: string; desc: string }[] = [
  { value: 'READ',     label: '📄 읽기',      desc: '화면에서 내용을 읽는 자료' },
  { value: 'LINK',     label: '🔗 링크 열기', desc: '외부 웹페이지로 이동하는 자료' },
  { value: 'DOWNLOAD', label: '⬇ 다운로드',  desc: '파일을 저장해서 사용하는 자료' },
  { value: 'COPY',     label: '📋 내용 복사', desc: '내용을 복사해서 활용하는 자료' },
];

interface UploadedFile {
  url: string;
  fileName: string;
  fileSize: number;
}

function extractTitleFromHtml(html: string): string {
  const match = html.match(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/i);
  if (!match) return '';
  return match[1].replace(/<[^>]+>/g, '').trim();
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ResourceWriteModal({ open, onClose, onSuccess }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [body, setBody] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null);
  const [usageType, setUsageType] = useState<UsageType>('DOWNLOAD');
  const [externalUrl, setExternalUrl] = useState('');
  const [aiOpen, setAiOpen] = useState(false);

  // body 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = ''; };
    }
  }, [open]);

  const resetForm = () => {
    setTitle('');
    setSummary('');
    setBody('');
    setTags([]);
    setTagInput('');
    setUploadedFile(null);
    setUsageType('DOWNLOAD');
    setExternalUrl('');
    setSaving(false);
    setUploading(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleAiInsert = ({ html, title: aiTitle }: { html: string; title: string }) => {
    const finalTitle = (aiTitle || '').trim() || extractTitleFromHtml(html);
    if (finalTitle && !title.trim()) setTitle(finalTitle);
    setBody(html);
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const res = await mediaApi.upload(file, true, 'kpa-society', 'resources');
      if (res.success && res.data) {
        setUploadedFile({ url: res.data.url, fileName: res.data.originalName, fileSize: res.data.fileSize });
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

  const handleSave = async (saveStatus: 'draft' | 'published') => {
    if (!title.trim()) { toast.error('제목을 입력해주세요'); return; }
    if (usageType === 'LINK' && !externalUrl.trim()) { toast.error('링크를 입력해야 합니다'); return; }
    if (usageType === 'DOWNLOAD' && !uploadedFile) { toast.error('다운로드할 파일이 필요합니다'); return; }
    if (usageType === 'COPY' && !body.trim()) { toast.error('복사할 내용이 없습니다'); return; }

    const pendingFromInput = tagInput.split(',').map(t => t.trim()).filter(Boolean);
    const tagArr = Array.from(new Set([...tags, ...pendingFromInput]));
    if (tagArr.length === 0) { toast.error('태그를 1개 이상 입력해주세요'); return; }

    setSaving(true);
    try {
      const base = {
        title: title.trim(),
        summary: summary || undefined,
        tags: tagArr,
        status: saveStatus,
        usage_type: usageType,
        sub_type: 'resource' as const,
      };
      const payload =
        usageType === 'LINK'
          ? { ...base, source_type: 'external' as const, source_url: externalUrl.trim() }
          : usageType === 'DOWNLOAD'
          ? { ...base, source_type: 'upload' as const, source_url: uploadedFile!.url, source_file_name: uploadedFile!.fileName }
          : { ...base, source_type: 'manual' as const, body: body || undefined };

      const res = await resourcesApi.create(payload);
      if (res.data) {
        toast.success('등록되었습니다');
        resetForm();
        onSuccess();
        onClose();
      }
    } catch (e: any) {
      toast.error(e?.message || '저장에 실패했습니다');
    } finally {
      setSaving(false);
    }
  };

  const handleImageUpload = async (file: File): Promise<string> => {
    const res = await mediaApi.upload(file, true, 'kpa-society', 'resources');
    if (res.success && res.data) return res.data.url;
    throw new Error('이미지 업로드에 실패했습니다');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '';
    if (bytes < 1024) return `${bytes}B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
  };

  if (!open) return null;

  return (
    <div
      style={S.overlay}
      onMouseDown={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={S.dialog} role="dialog" aria-modal="true" aria-label="자료 등록">

        {/* ── Header ── */}
        <div style={S.header}>
          <h2 style={S.headerTitle}>자료 등록</h2>
          <button onClick={handleClose} style={S.closeBtn} aria-label="닫기">✕</button>
        </div>

        {/* ── Body ── */}
        <div style={S.body}>

          {/* 제목 */}
          <div style={S.field}>
            <label style={S.label}>제목 <span style={S.required}>*</span></label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="자료 제목을 입력하세요"
              style={S.input}
              autoFocus
            />
          </div>

          {/* 설명 */}
          <div style={S.field}>
            <label style={S.label}>설명 <span style={S.hint}>(선택)</span></label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              placeholder="자료에 대한 간단한 설명을 입력하세요"
              rows={2}
              style={S.textarea}
            />
          </div>

          {/* 자료 활용 방식 */}
          <div style={S.field}>
            <label style={S.label}>자료 활용 방식 <span style={S.required}>*</span></label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' as const }}>
              {USAGE_TYPE_OPTIONS.map((opt) => {
                const sel = usageType === opt.value;
                return (
                  <label
                    key={opt.value}
                    title={opt.desc}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      padding: '8px 14px',
                      border: `1.5px solid ${sel ? '#2563eb' : '#e2e8f0'}`,
                      borderRadius: 8,
                      backgroundColor: sel ? '#dbeafe' : '#f8fafc',
                      cursor: 'pointer',
                      fontSize: '0.8125rem',
                      fontWeight: sel ? 700 : 400,
                      color: sel ? '#1d4ed8' : '#64748b',
                      transition: 'all 0.15s',
                      boxShadow: sel ? '0 0 0 3px rgba(37,99,235,0.1)' : 'none',
                    }}
                  >
                    <input
                      type="radio"
                      name="modal_usage_type"
                      value={opt.value}
                      checked={sel}
                      onChange={() => setUsageType(opt.value)}
                      style={{ display: 'none' }}
                    />
                    {opt.label}
                  </label>
                );
              })}
            </div>
            <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 6, marginBottom: 0 }}>
              {USAGE_TYPE_OPTIONS.find(o => o.value === usageType)?.desc}
            </p>
          </div>

          {/* LINK: URL 입력 */}
          {usageType === 'LINK' && (
            <div style={S.field}>
              <label style={S.label}>링크 URL <span style={S.required}>*</span></label>
              <input
                type="url"
                value={externalUrl}
                onChange={(e) => setExternalUrl(e.target.value)}
                placeholder="https://..."
                style={S.input}
              />
              <p style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: 4, marginBottom: 0 }}>
                클릭 시 외부 웹페이지가 새 탭에서 열립니다
              </p>
            </div>
          )}

          {/* DOWNLOAD: 파일 업로드 */}
          {usageType === 'DOWNLOAD' && (
            <div style={S.field}>
              <label style={S.label}>파일 <span style={S.required}>*</span></label>
              {!uploadedFile ? (
                <div style={S.uploadArea}>
                  <input
                    ref={fileInputRef}
                    type="file"
                    onChange={handleFileSelect}
                    style={{ display: 'none' }}
                    id="modal-resource-file-input"
                  />
                  <div style={S.uploadPlaceholder}>
                    <span style={{ fontSize: '2rem' }}>📄</span>
                    <p style={{ fontSize: '0.875rem', color: '#64748b', margin: 0 }}>파일을 선택하세요</p>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading}
                      style={S.uploadBtn}
                    >
                      {uploading ? '업로드 중...' : '파일 선택'}
                    </button>
                  </div>
                </div>
              ) : (
                <div style={S.fileInfo}>
                  <span>✅</span>
                  <span style={S.fileName}>{uploadedFile.fileName}</span>
                  {uploadedFile.fileSize > 0 && (
                    <span style={{ fontSize: '0.75rem', color: '#94a3b8', flexShrink: 0 }}>
                      {formatFileSize(uploadedFile.fileSize)}
                    </span>
                  )}
                  <button type="button" onClick={() => setUploadedFile(null)} style={S.fileRemoveBtn}>
                    제거
                  </button>
                </div>
              )}
            </div>
          )}

          {/* READ / COPY: 본문 편집기 */}
          {(usageType === 'READ' || usageType === 'COPY') && (
            <>
              <div style={S.aiBanner}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#4338ca', marginBottom: 2 }}>
                    ✨ AI 보조
                  </div>
                  <div style={{ fontSize: 12, color: '#6366f1' }}>
                    유튜브 URL 또는 콘텐츠 URL로 제목과 본문을 한 번에 생성합니다.
                  </div>
                </div>
                <button type="button" onClick={() => setAiOpen(true)} style={S.aiBannerBtn}>
                  AI로 만들기
                </button>
              </div>
              <div style={S.field}>
                <label style={S.label}>
                  본문 {usageType === 'COPY' && <span style={S.required}>*</span>}
                </label>
                <RichTextEditor
                  value={body}
                  onChange={(content) => setBody(content.html)}
                  onImageUpload={handleImageUpload}
                  placeholder={usageType === 'COPY' ? '복사해서 활용할 내용을 입력하세요' : '내용을 입력하세요'}
                  minHeight="200px"
                />
              </div>
            </>
          )}

          {/* 태그 */}
          <div style={S.field}>
            <label style={S.label}>
              태그 <span style={S.required}>*</span>{' '}
              <span style={S.hint}>(Enter 또는 쉼표로 추가, 최소 1개)</span>
            </label>
            <div style={S.tagInputWrap}>
              {tags.map((tag) => (
                <span key={tag} style={S.tagChip}>
                  {tag}
                  <button
                    type="button"
                    onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                    style={S.tagChipRemove}
                    aria-label={`${tag} 삭제`}
                  >
                    ×
                  </button>
                </span>
              ))}
              <input
                type="text"
                value={tagInput}
                onChange={(e) => {
                  const v = e.target.value;
                  if (v.includes(',')) {
                    const parts = v.split(',');
                    const last = parts.pop() || '';
                    setTags((prev) => {
                      const next = [...prev];
                      parts.forEach((p) => { const t = p.trim(); if (t && !next.includes(t)) next.push(t); });
                      return next;
                    });
                    setTagInput(last);
                  } else {
                    setTagInput(v);
                  }
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ',') {
                    e.preventDefault();
                    const t = tagInput.trim();
                    if (!t) return;
                    setTags((prev) => (prev.includes(t) ? prev : [...prev, t]));
                    setTagInput('');
                  } else if (e.key === 'Backspace' && tagInput === '' && tags.length > 0) {
                    e.preventDefault();
                    setTags((prev) => prev.slice(0, -1));
                  }
                }}
                placeholder={tags.length === 0 ? '예: 약국경영, 복약지도, 건강관리' : ''}
                style={S.tagInput}
              />
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={S.footer}>
          <button type="button" onClick={handleClose} style={S.cancelBtn} disabled={saving}>
            취소
          </button>
          <button
            type="button"
            onClick={() => handleSave('draft')}
            disabled={saving || uploading}
            style={S.draftBtn}
          >
            {saving ? '저장 중...' : '임시 저장'}
          </button>
          <button
            type="button"
            onClick={() => handleSave('published')}
            disabled={saving || uploading}
            style={S.publishBtn}
          >
            {saving ? '저장 중...' : '공개'}
          </button>
        </div>
      </div>

      {/* AI 콘텐츠 생성 모달 (READ/COPY에서만 진입) */}
      <AiContentModal
        open={aiOpen}
        onClose={() => setAiOpen(false)}
        editor={null}
        onInsert={handleAiInsert}
        aiRequestHeaders={(() => {
          const token = getAccessToken();
          return token ? { Authorization: `Bearer ${token}` } : undefined;
        })()}
      />
    </div>
  );
}

export default ResourceWriteModal;

// ─── Styles ───────────────────────────────────────────────────────────────────

const S: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    inset: 0,
    zIndex: 1000,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
  },
  dialog: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 640,
    maxHeight: 'calc(100vh - 32px)',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
    overflow: 'hidden',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px 16px',
    borderBottom: '1px solid #f1f5f9',
    flexShrink: 0,
  },
  headerTitle: {
    fontSize: '1.125rem',
    fontWeight: 700,
    color: '#0f172a',
    margin: 0,
  },
  closeBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 32,
    height: 32,
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#64748b',
    fontSize: '0.875rem',
    cursor: 'pointer',
    borderRadius: 6,
    padding: 0,
  },
  body: {
    flex: 1,
    overflowY: 'auto',
    padding: '20px 24px',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: 8,
    padding: '16px 24px',
    borderTop: '1px solid #f1f5f9',
    flexShrink: 0,
    backgroundColor: '#fff',
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
  // 태그 chip — 개선: 파란색 계열, 테두리 추가
  tagInputWrap: {
    display: 'flex',
    flexWrap: 'wrap' as const,
    alignItems: 'center',
    gap: 6,
    width: '100%',
    minHeight: 44,
    padding: '7px 10px',
    border: '1.5px solid #e2e8f0',
    borderRadius: 8,
    background: '#fff',
    boxSizing: 'border-box' as const,
  },
  tagChip: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '4px 10px',
    fontSize: '0.8125rem',
    fontWeight: 500,
    background: '#eff6ff',
    color: '#1d4ed8',
    border: '1px solid #bfdbfe',
    borderRadius: 9999,
    lineHeight: 1.2,
  },
  tagChipRemove: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    padding: 0,
    border: 'none',
    background: 'rgba(29, 78, 216, 0.12)',
    color: '#1d4ed8',
    fontSize: '0.875rem',
    cursor: 'pointer',
    lineHeight: 1,
    borderRadius: '50%',
  },
  tagInput: {
    flex: 1,
    minWidth: 120,
    padding: '4px 4px',
    fontSize: '0.875rem',
    border: 'none',
    outline: 'none',
    background: 'transparent',
  },
  uploadArea: {
    border: '2px dashed #e2e8f0',
    borderRadius: 12,
    padding: '24px 20px',
    backgroundColor: '#f8fafc',
  },
  uploadPlaceholder: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    gap: 8,
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
  fileName: {
    flex: 1,
    fontSize: '0.875rem',
    fontWeight: 500,
    color: '#334155',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
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
  aiBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    padding: '12px 14px',
    marginBottom: 16,
    background: '#eef2ff',
    border: '1px solid #c7d2fe',
    borderRadius: 8,
  },
  aiBannerBtn: {
    padding: '8px 16px',
    background: '#4f46e5',
    color: '#fff',
    border: 'none',
    borderRadius: 7,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    whiteSpace: 'nowrap' as const,
  },
};
