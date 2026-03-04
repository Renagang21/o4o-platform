/**
 * DocsManagementPage - 자료실 관리 페이지
 *
 * WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1: mock → API
 */

import { useState, useEffect, useCallback } from 'react';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';
import { branchAdminApi } from '../../api/branchAdmin';
import type { BranchDoc } from '../../api/branchAdmin';

export function DocsManagementPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [documents, setDocuments] = useState<BranchDoc[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDocs = useCallback(async () => {
    try {
      setLoading(true);
      const params = filterCategory !== 'all' ? { category: filterCategory } : undefined;
      const res = await branchAdminApi.getDocs(params);
      setDocuments(res.data?.items || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [filterCategory]);

  useEffect(() => { fetchDocs(); }, [fetchDocs]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0B';
    if (bytes < 1024) return bytes + 'B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(0) + 'KB';
    return (bytes / (1024 * 1024)).toFixed(1) + 'MB';
  };

  const getCategoryBadge = (category: string) => {
    const styles: Record<string, React.CSSProperties> = {
      form: { backgroundColor: colors.primary, color: colors.white },
      general: { backgroundColor: colors.neutral600, color: colors.white },
      regulation: { backgroundColor: colors.accentYellow, color: colors.white },
      guide: { backgroundColor: colors.accentGreen, color: colors.white },
    };
    const labels: Record<string, string> = {
      form: '서식/양식',
      general: '일반',
      regulation: '규정/정관',
      guide: '가이드',
    };
    return <span style={{ ...badgeStyle, ...(styles[category] || styles.general) }}>{labels[category] || category}</span>;
  };

  const getFileIcon = (fileName: string | null) => {
    if (!fileName) return '📎';
    if (fileName.endsWith('.pdf')) return '📄';
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return '📝';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return '📊';
    if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) return '📽️';
    if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) return '📦';
    return '📎';
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      await branchAdminApi.deleteDoc(id);
      fetchDocs();
    } catch (err: any) {
      alert('삭제에 실패했습니다: ' + (err.message || ''));
    }
  };

  const handleTogglePublish = async (id: string, currentPublic: boolean) => {
    try {
      await branchAdminApi.updateDoc(id, { is_public: !currentPublic });
      fetchDocs();
    } catch (err: any) {
      alert('상태 변경에 실패했습니다: ' + (err.message || ''));
    }
  };

  const handleUpload = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    try {
      await branchAdminApi.createDoc({
        title: fd.get('title') as string,
        category: fd.get('category') as string || 'general',
      });
      setShowUploadModal(false);
      fetchDocs();
    } catch (err: any) {
      alert('업로드에 실패했습니다: ' + (err.message || ''));
    }
  };

  return (
    <div>
      <AdminHeader
        title="자료실 관리"
        subtitle="분회 자료를 관리합니다"
      />

      <div style={pageStyles.content}>
        {/* 상단 액션 */}
        <div style={pageStyles.toolbar}>
          <div style={pageStyles.tabs}>
            {[
              { value: 'all', label: '전체' },
              { value: 'general', label: '일반' },
              { value: 'regulation', label: '규정/정관' },
              { value: 'form', label: '서식/양식' },
              { value: 'guide', label: '가이드' },
            ].map((tab) => (
              <button
                key={tab.value}
                style={{
                  ...pageStyles.tab,
                  ...(filterCategory === tab.value ? pageStyles.tabActive : {}),
                }}
                onClick={() => setFilterCategory(tab.value)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            style={pageStyles.uploadButton}
            onClick={() => setShowUploadModal(true)}
          >
            📤 새 자료 업로드
          </button>
        </div>

        {/* 자료 목록 */}
        <div style={pageStyles.tableWrapper}>
          <table style={pageStyles.table}>
            <thead>
              <tr>
                <th style={{ ...pageStyles.th, width: '80px' }}>분류</th>
                <th style={pageStyles.th}>제목</th>
                <th style={{ ...pageStyles.th, width: '180px' }}>파일명</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>크기</th>
                <th style={{ ...pageStyles.th, width: '100px' }}>업로드일</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>다운로드</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>상태</th>
                <th style={{ ...pageStyles.th, width: '150px' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={8} style={{ ...pageStyles.td, textAlign: 'center' }}>불러오는 중...</td></tr>
              ) : documents.length === 0 ? (
                <tr><td colSpan={8} style={{ ...pageStyles.td, textAlign: 'center' }}>등록된 자료가 없습니다</td></tr>
              ) : (
                documents.map((doc) => (
                  <tr key={doc.id} style={pageStyles.tr}>
                    <td style={pageStyles.td}>{getCategoryBadge(doc.category)}</td>
                    <td style={pageStyles.td}>
                      <span style={pageStyles.docTitle}>{doc.title}</span>
                    </td>
                    <td style={pageStyles.td}>
                      <div style={pageStyles.fileName}>
                        <span style={pageStyles.fileIcon}>{getFileIcon(doc.file_name)}</span>
                        <span>{doc.file_name || '-'}</span>
                      </div>
                    </td>
                    <td style={pageStyles.td}>{formatFileSize(doc.file_size)}</td>
                    <td style={pageStyles.td}>{doc.created_at?.slice(0, 10)}</td>
                    <td style={pageStyles.td}>{doc.download_count.toLocaleString()}</td>
                    <td style={pageStyles.td}>
                      <span
                        style={{
                          ...pageStyles.statusBadge,
                          backgroundColor: doc.is_public ? colors.accentGreen : colors.neutral400,
                        }}
                      >
                        {doc.is_public ? '게시중' : '비공개'}
                      </span>
                    </td>
                    <td style={pageStyles.td}>
                      <div style={pageStyles.actions}>
                        {doc.file_url && (
                          <a href={doc.file_url} style={pageStyles.actionButton} target="_blank" rel="noopener noreferrer">
                            📥 다운로드
                          </a>
                        )}
                        <button
                          style={pageStyles.actionButton}
                          onClick={() => handleTogglePublish(doc.id, doc.is_public)}
                        >
                          {doc.is_public ? '숨김' : '게시'}
                        </button>
                        <button
                          style={{ ...pageStyles.actionButton, color: colors.accentRed }}
                          onClick={() => handleDelete(doc.id)}
                        >
                          삭제
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* 저장 공간 정보 */}
        <div style={pageStyles.storageInfo}>
          <div style={pageStyles.storageLabel}>저장 공간 사용량</div>
          <div style={pageStyles.storageBar}>
            <div style={{ ...pageStyles.storageUsed, width: '35%' }} />
          </div>
          <div style={pageStyles.storageText}>3.5GB / 10GB 사용중</div>
        </div>
      </div>

      {/* 업로드 모달 */}
      {showUploadModal && (
        <div style={pageStyles.modalOverlay} onClick={() => setShowUploadModal(false)}>
          <div style={pageStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={pageStyles.modalHeader}>
              <h3 style={pageStyles.modalTitle}>새 자료 업로드</h3>
              <button style={pageStyles.closeButton} onClick={() => setShowUploadModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpload(e.currentTarget); }}>
            <div style={pageStyles.modalBody}>
              <div style={pageStyles.formGroup}>
                <label style={pageStyles.label}>제목</label>
                <input type="text" name="title" style={pageStyles.input} placeholder="자료 제목을 입력하세요" required />
              </div>
              <div style={pageStyles.formGroup}>
                <label style={pageStyles.label}>분류</label>
                <select name="category" style={pageStyles.select}>
                  <option value="general">일반</option>
                  <option value="regulation">규정/정관</option>
                  <option value="form">서식/양식</option>
                  <option value="guide">가이드</option>
                </select>
              </div>
              <div style={pageStyles.formGroup}>
                <label style={pageStyles.label}>파일</label>
                <div style={pageStyles.dropZone}>
                  <span style={pageStyles.dropIcon}>📤</span>
                  <p>파일 업로드는 추후 지원 예정입니다</p>
                  <p style={pageStyles.dropHint}>현재는 자료 정보만 등록됩니다</p>
                </div>
              </div>
            </div>
            <div style={pageStyles.modalFooter}>
              <button type="button" style={pageStyles.cancelButton} onClick={() => setShowUploadModal(false)}>
                취소
              </button>
              <button type="submit" style={pageStyles.submitButton}>
                등록
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const badgeStyle: React.CSSProperties = {
  padding: '4px 8px',
  borderRadius: '4px',
  fontSize: '11px',
  fontWeight: 500,
};

const pageStyles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
  },
  tab: {
    padding: '10px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  uploadButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  tableWrapper: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral600,
    backgroundColor: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  tr: {
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: colors.neutral800,
  },
  docTitle: {
    fontWeight: 500,
  },
  fileName: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '13px',
    color: colors.neutral600,
  },
  fileIcon: {
    fontSize: '16px',
  },
  statusBadge: {
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
    color: colors.white,
  },
  actions: {
    display: 'flex',
    gap: '8px',
  },
  actionButton: {
    padding: '6px 10px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
    textDecoration: 'none',
  },
  storageInfo: {
    marginTop: '24px',
    padding: '20px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  storageLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
    marginBottom: '12px',
  },
  storageBar: {
    height: '8px',
    backgroundColor: colors.neutral200,
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  storageUsed: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: '4px',
  },
  storageText: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
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
    backgroundColor: colors.white,
    borderRadius: '12px',
    width: '500px',
    maxWidth: '90vw',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: colors.neutral500,
    cursor: 'pointer',
  },
  modalBody: {
    padding: '24px',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
  },
  dropZone: {
    border: `2px dashed ${colors.neutral300}`,
    borderRadius: '8px',
    padding: '40px',
    textAlign: 'center',
    cursor: 'pointer',
  },
  dropIcon: {
    fontSize: '40px',
    display: 'block',
    marginBottom: '12px',
  },
  dropHint: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '8px',
  },
  modalFooter: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    padding: '16px 24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
