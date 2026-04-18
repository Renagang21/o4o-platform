/**
 * StoreLibraryDetailPage — 매장 자료 상세 화면 (멀티 에셋 타입 지원)
 *
 * WO-O4O-STORE-LIBRARY-DETAIL-V1
 * WO-STORE-LIBRARY-ASSET-EXTENSION-V1
 *
 * 타입별 미리보기:
 * - file: 이미지/PDF/파일 미리보기 + 다운로드
 * - content: ContentRenderer로 HTML 렌더링
 * - external-link: 클릭 가능한 외부 링크
 *
 * 삭제 보호: QR 참조 시 409 에러 표시
 */

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Download, Edit2, Trash2, FileText, Image, Film, File, ExternalLink, Link, FileEdit } from 'lucide-react';
import { ContentRenderer } from '@o4o/content-editor';
import { colors } from '../../styles/theme';
import { getStoreLibraryItem, deleteStoreLibraryItem } from '../../api/storeLibrary';
import type { StoreLibraryItem } from '../../api/storeLibrary';

const ASSET_TYPE_LABELS: Record<string, string> = {
  file: '파일',
  content: '콘텐츠',
  'external-link': '외부 링크',
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });
}

function formatFileSize(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeIcon(mimeType: string | null) {
  if (!mimeType) return File;
  if (mimeType.startsWith('image/')) return Image;
  if (mimeType.startsWith('video/')) return Film;
  if (mimeType === 'application/pdf') return FileText;
  return File;
}

function isImageMime(mimeType: string | null): boolean {
  if (!mimeType) return false;
  return mimeType.startsWith('image/');
}

function isPdfMime(mimeType: string | null): boolean {
  return mimeType === 'application/pdf';
}

export function StoreLibraryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [item, setItem] = useState<StoreLibraryItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const loadItem = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true);
      setError(null);
      const result = await getStoreLibraryItem(id);
      setItem(result.data);
    } catch (err: any) {
      setError(err.message || '자료를 불러오는 데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadItem();
  }, [loadItem]);

  const handleDelete = async () => {
    if (!item) return;
    setDeleting(true);
    try {
      await deleteStoreLibraryItem(item.id);
      navigate('/store/operation/library', { replace: true });
    } catch (err: any) {
      // QR 참조 보호: 409 Conflict 처리
      const errorData = err?.response?.data?.error || err?.data?.error;
      if (errorData?.code === 'QR_REFERENCE_EXISTS') {
        setError(errorData.message || '이 자료를 참조하는 QR 코드가 있어 삭제할 수 없습니다.');
      } else {
        setError('삭제 중 오류가 발생했습니다.');
      }
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  const handleDownload = () => {
    if (!item?.fileUrl) return;
    const a = document.createElement('a');
    a.href = item.fileUrl;
    a.download = item.fileName || 'download';
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // Loading skeleton
  if (loading) {
    return (
      <div style={styles.container}>
        <div style={styles.backRow}>
          <div style={{ width: 120, height: 20, backgroundColor: colors.neutral100, borderRadius: 4 }} />
        </div>
        <div style={{ ...styles.card, padding: 0 }}>
          <div style={{ height: 300, backgroundColor: colors.neutral100 }} />
          <div style={{ padding: 24 }}>
            <div style={{ height: 24, width: '60%', backgroundColor: colors.neutral100, borderRadius: 4, marginBottom: 16 }} />
            <div style={{ height: 14, width: '40%', backgroundColor: colors.neutral100, borderRadius: 4, marginBottom: 12 }} />
            <div style={{ height: 14, width: '80%', backgroundColor: colors.neutral100, borderRadius: 4 }} />
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && !item) {
    return (
      <div style={styles.container}>
        <div style={styles.backRow}>
          <button onClick={() => navigate('/store/operation/library')} style={styles.backBtn}>
            <ArrowLeft size={16} /> 목록으로
          </button>
        </div>
        <div style={styles.errorCard}>
          <p style={{ margin: 0, fontSize: '14px', color: colors.error }}>{error}</p>
        </div>
      </div>
    );
  }

  if (!item) return null;

  const currentType = item.assetType || 'file';
  const MimeIcon = getMimeIcon(item.mimeType);

  return (
    <div style={styles.container}>
      {/* Back + Actions */}
      <div style={styles.topBar}>
        <button onClick={() => navigate('/store/operation/library')} style={styles.backBtn}>
          <ArrowLeft size={16} /> 목록으로
        </button>
        <div style={styles.topActions}>
          {currentType === 'file' && item.fileUrl && (
            <button onClick={handleDownload} style={styles.actionButton}>
              <Download size={16} /> 다운로드
            </button>
          )}
          <button onClick={() => navigate(`/store/operation/library/${item.id}/edit`)} style={styles.actionButton}>
            <Edit2 size={16} /> 수정
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            style={{ ...styles.actionButton, color: colors.error, borderColor: '#fecaca' }}
          >
            <Trash2 size={16} /> 삭제
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div style={styles.errorBanner}>
          <p style={{ margin: 0, fontSize: '13px', color: colors.error }}>{error}</p>
        </div>
      )}

      {/* Main Card */}
      <div style={styles.card}>
        {/* Preview — type-aware */}
        <div style={styles.previewArea}>
          {currentType === 'file' ? (
            // File preview
            isImageMime(item.mimeType) && item.fileUrl ? (
              <img
                src={item.fileUrl}
                alt={item.title}
                style={styles.previewImage}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : isPdfMime(item.mimeType) && item.fileUrl ? (
              <iframe
                src={item.fileUrl}
                title={item.title}
                style={styles.previewIframe}
              />
            ) : (
              <div style={styles.previewFallback}>
                <MimeIcon size={56} style={{ color: colors.neutral300 }} />
                {item.fileName && (
                  <p style={{ margin: '12px 0 0', fontSize: '14px', color: colors.neutral500 }}>{item.fileName}</p>
                )}
                {item.fileUrl && (
                  <a
                    href={item.fileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={styles.previewLinkBtn}
                  >
                    <ExternalLink size={14} /> 파일 열기
                  </a>
                )}
              </div>
            )
          ) : currentType === 'content' ? (
            // Content preview
            <div style={styles.contentPreview}>
              {item.htmlContent ? (
                <ContentRenderer html={item.htmlContent} />
              ) : (
                <div style={styles.previewFallback}>
                  <FileEdit size={56} style={{ color: colors.neutral300 }} />
                  <p style={{ margin: '12px 0 0', fontSize: '14px', color: colors.neutral500 }}>콘텐츠 없음</p>
                </div>
              )}
            </div>
          ) : currentType === 'external-link' ? (
            // External link preview
            <div style={styles.previewFallback}>
              <Link size={56} style={{ color: colors.neutral300 }} />
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={styles.externalLinkDisplay}
                >
                  <ExternalLink size={14} />
                  {item.url}
                </a>
              )}
            </div>
          ) : (
            <div style={styles.previewFallback}>
              <File size={56} style={{ color: colors.neutral300 }} />
            </div>
          )}
        </div>

        {/* Info */}
        <div style={styles.infoSection}>
          <h1 style={styles.title}>{item.title}</h1>

          <div style={styles.metaRow}>
            {/* Asset type badge */}
            <span style={styles.assetTypeBadge}>
              {ASSET_TYPE_LABELS[currentType] || currentType}
            </span>
            {item.category && <span style={styles.categoryBadge}>{item.category}</span>}
            <span style={styles.metaText}>{formatDate(item.createdAt)}</span>
            {currentType === 'file' && item.fileSize ? <span style={styles.metaText}>{formatFileSize(item.fileSize)}</span> : null}
            {currentType === 'file' && item.mimeType && <span style={styles.metaText}>{item.mimeType}</span>}
          </div>

          {item.description && (
            <div style={styles.descriptionArea}>
              <p style={styles.description}>{item.description}</p>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirm Modal */}
      {deleteConfirm && (
        <div style={styles.modalOverlay} onClick={() => !deleting && setDeleteConfirm(false)}>
          <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
            <h3 style={styles.modalTitle}>자료 삭제</h3>
            <p style={styles.modalText}>
              &quot;{item.title}&quot;을(를) 삭제하시겠습니까?
            </p>
            <div style={styles.modalActions}>
              <button
                onClick={() => setDeleteConfirm(false)}
                style={styles.cancelBtn}
                disabled={deleting}
              >
                취소
              </button>
              <button
                onClick={handleDelete}
                style={styles.deleteBtn}
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: 0,
  },
  topBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap' as const,
    gap: '12px',
  },
  backRow: {
    marginBottom: '20px',
  },
  backBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
    fontWeight: 500,
  },
  topActions: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap' as const,
  },
  actionButton: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '8px 14px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
    fontWeight: 500,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    border: `1px solid ${colors.neutral200}`,
    overflow: 'hidden',
  },
  // Preview
  previewArea: {
    minHeight: '240px',
    maxHeight: '500px',
    backgroundColor: colors.neutral50,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  previewImage: {
    width: '100%',
    maxHeight: '500px',
    objectFit: 'contain' as const,
  },
  previewIframe: {
    width: '100%',
    height: '500px',
    border: 'none',
  },
  previewFallback: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 20px',
  },
  previewLinkBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: '12px',
    fontSize: '13px',
    color: colors.primary,
    textDecoration: 'none',
  },
  contentPreview: {
    width: '100%',
    padding: '24px',
    maxHeight: '500px',
    overflow: 'auto',
  },
  externalLinkDisplay: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    marginTop: '16px',
    padding: '10px 16px',
    backgroundColor: '#fff',
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.primary,
    textDecoration: 'none',
    maxWidth: '100%',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  // Info
  infoSection: {
    padding: '24px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 700,
    color: colors.neutral800,
    margin: '0 0 12px 0',
    lineHeight: 1.4,
  },
  metaRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexWrap: 'wrap' as const,
    marginBottom: '16px',
  },
  assetTypeBadge: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: 500,
    padding: '3px 10px',
    borderRadius: '12px',
    backgroundColor: '#f0fdf4',
    color: '#16a34a',
  },
  categoryBadge: {
    display: 'inline-block',
    fontSize: '12px',
    fontWeight: 500,
    padding: '3px 10px',
    borderRadius: '12px',
    backgroundColor: `${colors.primary}15`,
    color: colors.primary,
  },
  metaText: {
    fontSize: '13px',
    color: colors.neutral400,
  },
  descriptionArea: {
    borderTop: `1px solid ${colors.neutral100}`,
    paddingTop: '16px',
  },
  description: {
    fontSize: '14px',
    color: colors.neutral600,
    lineHeight: 1.7,
    margin: 0,
    whiteSpace: 'pre-wrap' as const,
  },
  // Error
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
  // Modal
  modalOverlay: {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    textAlign: 'center' as const,
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral800,
    margin: '0 0 12px 0',
  },
  modalText: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: '0 0 24px 0',
    lineHeight: 1.5,
  },
  modalActions: {
    display: 'flex',
    justifyContent: 'center',
    gap: '12px',
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
  deleteBtn: {
    padding: '10px 20px',
    backgroundColor: colors.error,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    color: '#fff',
    cursor: 'pointer',
  },
};
