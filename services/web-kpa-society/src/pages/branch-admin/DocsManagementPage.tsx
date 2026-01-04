/**
 * DocsManagementPage - 자료실 관리 페이지
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';

interface Document {
  id: string;
  title: string;
  category: 'form' | 'guideline' | 'policy' | 'manual' | 'etc';
  fileName: string;
  fileSize: string;
  uploadedBy: string;
  uploadedAt: string;
  downloadCount: number;
  isPublished: boolean;
}

export function DocsManagementPage() {
  const { branchId: _branchId } = useParams();
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [showUploadModal, setShowUploadModal] = useState(false);

  const [documents] = useState<Document[]>([
    {
      id: '1',
      title: '2025년 신상신고서 양식',
      category: 'form',
      fileName: 'annual_report_form_2025.pdf',
      fileSize: '245KB',
      uploadedBy: '관리자',
      uploadedAt: '2025-01-01',
      downloadCount: 156,
      isPublished: true,
    },
    {
      id: '2',
      title: '약국 운영 가이드라인',
      category: 'guideline',
      fileName: 'pharmacy_operation_guide.pdf',
      fileSize: '1.2MB',
      uploadedBy: '관리자',
      uploadedAt: '2024-12-15',
      downloadCount: 342,
      isPublished: true,
    },
    {
      id: '3',
      title: '분회 정관',
      category: 'policy',
      fileName: 'branch_charter.pdf',
      fileSize: '890KB',
      uploadedBy: '관리자',
      uploadedAt: '2024-11-01',
      downloadCount: 89,
      isPublished: true,
    },
    {
      id: '4',
      title: '회원 가입 신청서',
      category: 'form',
      fileName: 'member_application.docx',
      fileSize: '125KB',
      uploadedBy: '관리자',
      uploadedAt: '2024-10-15',
      downloadCount: 234,
      isPublished: true,
    },
    {
      id: '5',
      title: '보수교육 이수 증명서 양식 (임시)',
      category: 'form',
      fileName: 'education_cert_form.pdf',
      fileSize: '180KB',
      uploadedBy: '관리자',
      uploadedAt: '2024-12-30',
      downloadCount: 0,
      isPublished: false,
    },
  ]);

  const getCategoryBadge = (category: Document['category']) => {
    const styles: Record<string, React.CSSProperties> = {
      form: { backgroundColor: colors.primary, color: colors.white },
      guideline: { backgroundColor: colors.accentGreen, color: colors.white },
      policy: { backgroundColor: colors.accentYellow, color: colors.white },
      manual: { backgroundColor: colors.neutral600, color: colors.white },
      etc: { backgroundColor: colors.neutral400, color: colors.white },
    };
    const labels: Record<string, string> = {
      form: '서식/양식',
      guideline: '가이드라인',
      policy: '규정/정관',
      manual: '매뉴얼',
      etc: '기타',
    };
    return <span style={{ ...badgeStyle, ...styles[category] }}>{labels[category]}</span>;
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) return '📄';
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return '📝';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return '📊';
    if (fileName.endsWith('.pptx') || fileName.endsWith('.ppt')) return '📽️';
    if (fileName.endsWith('.zip') || fileName.endsWith('.rar')) return '📦';
    return '📎';
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      alert(`문서 #${id} 삭제`);
    }
  };

  const handleTogglePublish = (id: string) => {
    alert(`문서 #${id} 게시 상태 변경`);
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
              { value: 'form', label: '서식/양식' },
              { value: 'guideline', label: '가이드라인' },
              { value: 'policy', label: '규정/정관' },
              { value: 'manual', label: '매뉴얼' },
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
              {documents
                .filter((d) => filterCategory === 'all' || d.category === filterCategory)
                .map((doc) => (
                  <tr key={doc.id} style={pageStyles.tr}>
                    <td style={pageStyles.td}>{getCategoryBadge(doc.category)}</td>
                    <td style={pageStyles.td}>
                      <span style={pageStyles.docTitle}>{doc.title}</span>
                    </td>
                    <td style={pageStyles.td}>
                      <div style={pageStyles.fileName}>
                        <span style={pageStyles.fileIcon}>{getFileIcon(doc.fileName)}</span>
                        <span>{doc.fileName}</span>
                      </div>
                    </td>
                    <td style={pageStyles.td}>{doc.fileSize}</td>
                    <td style={pageStyles.td}>{doc.uploadedAt}</td>
                    <td style={pageStyles.td}>{doc.downloadCount.toLocaleString()}</td>
                    <td style={pageStyles.td}>
                      <span
                        style={{
                          ...pageStyles.statusBadge,
                          backgroundColor: doc.isPublished ? colors.accentGreen : colors.neutral400,
                        }}
                      >
                        {doc.isPublished ? '게시중' : '비공개'}
                      </span>
                    </td>
                    <td style={pageStyles.td}>
                      <div style={pageStyles.actions}>
                        <a href="#" style={pageStyles.actionButton}>
                          📥 다운로드
                        </a>
                        <button
                          style={pageStyles.actionButton}
                          onClick={() => handleTogglePublish(doc.id)}
                        >
                          {doc.isPublished ? '숨김' : '게시'}
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
                ))}
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
            <div style={pageStyles.modalBody}>
              <div style={pageStyles.formGroup}>
                <label style={pageStyles.label}>제목</label>
                <input type="text" style={pageStyles.input} placeholder="자료 제목을 입력하세요" />
              </div>
              <div style={pageStyles.formGroup}>
                <label style={pageStyles.label}>분류</label>
                <select style={pageStyles.select}>
                  <option value="form">서식/양식</option>
                  <option value="guideline">가이드라인</option>
                  <option value="policy">규정/정관</option>
                  <option value="manual">매뉴얼</option>
                  <option value="etc">기타</option>
                </select>
              </div>
              <div style={pageStyles.formGroup}>
                <label style={pageStyles.label}>파일</label>
                <div style={pageStyles.dropZone}>
                  <span style={pageStyles.dropIcon}>📤</span>
                  <p>클릭하거나 파일을 드래그하여 업로드</p>
                  <p style={pageStyles.dropHint}>PDF, DOC, XLS, PPT, ZIP (최대 50MB)</p>
                </div>
              </div>
            </div>
            <div style={pageStyles.modalFooter}>
              <button style={pageStyles.cancelButton} onClick={() => setShowUploadModal(false)}>
                취소
              </button>
              <button style={pageStyles.submitButton}>
                업로드
              </button>
            </div>
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
