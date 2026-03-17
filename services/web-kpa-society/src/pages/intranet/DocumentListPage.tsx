/**
 * DocumentListPage - 문서 목록
 * Work Order 5: 파일 업로드/다운로드, 설명, 회의 연결
 */

import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { IntranetHeader } from '../../components/intranet';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

interface Document {
  id: string;
  title: string;
  description: string;
  fileName: string;
  fileSize: string;
  fileType: string;
  author: string;
  createdAt: string;
  downloadCount: number;
  meetingId?: string;
  meetingTitle?: string;
}

export function DocumentListPage() {
  const { user } = useAuth();
  const userRole = user?.roles[0] || 'member';
  const canUpload = ['officer', 'chair', 'admin', 'super_admin'].includes(userRole);

  const [searchQuery, setSearchQuery] = useState('');

  const [documents] = useState<Document[]>([
    {
      id: '1',
      title: '2025년 사업계획서',
      description: '2025년도 지부 사업계획서입니다.',
      fileName: '2025_사업계획서.pdf',
      fileSize: '2.5MB',
      fileType: 'pdf',
      author: '사무국',
      createdAt: '2025-01-03',
      downloadCount: 45,
      meetingId: '1',
      meetingTitle: '1월 정기 이사회',
    },
    {
      id: '2',
      title: '정관 개정안',
      description: '2025년 정관 개정안 초안입니다.',
      fileName: '정관개정안_2025.hwp',
      fileSize: '156KB',
      fileType: 'hwp',
      author: '법제위원회',
      createdAt: '2025-01-02',
      downloadCount: 32,
    },
    {
      id: '3',
      title: '12월 회의록',
      description: '12월 정기 이사회 회의록입니다.',
      fileName: '12월_정기이사회_회의록.pdf',
      fileSize: '890KB',
      fileType: 'pdf',
      author: '총무',
      createdAt: '2024-12-20',
      downloadCount: 67,
      meetingId: '4',
      meetingTitle: '12월 정기 이사회',
    },
    {
      id: '4',
      title: '회원명부 양식',
      description: '분회별 회원명부 제출 양식입니다.',
      fileName: '회원명부양식.xlsx',
      fileSize: '45KB',
      fileType: 'xlsx',
      author: '사무국',
      createdAt: '2024-12-15',
      downloadCount: 128,
    },
    {
      id: '5',
      title: '2024년 결산보고서',
      description: '2024년도 수입/지출 결산 보고서입니다.',
      fileName: '2024_결산보고서.pdf',
      fileSize: '3.2MB',
      fileType: 'pdf',
      author: '재무',
      createdAt: '2024-12-28',
      downloadCount: 89,
    },
  ]);

  const filteredDocs = documents.filter((doc) =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getFileIcon = (type: string) => {
    const icons: Record<string, string> = {
      pdf: '📄',
      hwp: '📝',
      doc: '📃',
      docx: '📃',
      xls: '📊',
      xlsx: '📊',
      ppt: '📽️',
      pptx: '📽️',
    };
    return icons[type] || '📁';
  };

  const handleDownload = (doc: Document) => {
    toast.info(`${doc.fileName} 다운로드 (UI 데모)`);
  };

  const handleUpload = () => {
    toast.info('문서 업로드 (UI 데모)');
  };

  return (
    <div>
      <IntranetHeader
        title="문서"
        subtitle="조직 문서 및 자료"
        actions={
          canUpload && (
            <button style={styles.uploadButton} onClick={handleUpload}>
              + 문서 업로드
            </button>
          )
        }
      />

      <div style={styles.content}>
        {/* 검색 */}
        <div style={styles.searchBar}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="문서 검색..."
            style={styles.searchInput}
          />
        </div>

        {/* 문서 목록 */}
        <div style={styles.docGrid}>
          {filteredDocs.map((doc) => (
            <div key={doc.id} style={styles.docCard}>
              <div style={styles.docHeader}>
                <span style={styles.fileIcon}>{getFileIcon(doc.fileType)}</span>
                <div style={styles.docInfo}>
                  <h3 style={styles.docTitle}>{doc.title}</h3>
                  <p style={styles.docDesc}>{doc.description}</p>
                </div>
              </div>

              <div style={styles.docMeta}>
                <span style={styles.fileName}>{doc.fileName}</span>
                <div style={styles.metaRow}>
                  <span>{doc.fileSize}</span>
                  <span>•</span>
                  <span>{doc.createdAt}</span>
                  <span>•</span>
                  <span>📥 {doc.downloadCount}</span>
                </div>
                <span style={styles.author}>by {doc.author}</span>
              </div>

              {doc.meetingTitle && (
                <Link
                  to={`/intranet/meetings/${doc.meetingId}`}
                  style={styles.meetingLink}
                >
                  📋 {doc.meetingTitle}
                </Link>
              )}

              <div style={styles.docActions}>
                <button
                  style={styles.downloadButton}
                  onClick={() => handleDownload(doc)}
                >
                  다운로드
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <div style={styles.emptyState}>
            <span style={styles.emptyIcon}>📁</span>
            <p style={styles.emptyText}>문서가 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  uploadButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  searchBar: {
    marginBottom: '24px',
  },
  searchInput: {
    width: '300px',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
  },
  docGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
  },
  docCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  docHeader: {
    display: 'flex',
    gap: '16px',
    marginBottom: '16px',
  },
  fileIcon: {
    fontSize: '36px',
    width: '48px',
    height: '48px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  docInfo: {
    flex: 1,
  },
  docTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 4px 0',
  },
  docDesc: {
    fontSize: '13px',
    color: colors.neutral500,
    margin: 0,
    lineHeight: 1.4,
  },
  docMeta: {
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    marginBottom: '12px',
  },
  fileName: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral700,
    display: 'block',
    marginBottom: '4px',
  },
  metaRow: {
    display: 'flex',
    gap: '8px',
    fontSize: '12px',
    color: colors.neutral500,
    marginBottom: '4px',
  },
  author: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  meetingLink: {
    display: 'block',
    padding: '8px 12px',
    backgroundColor: colors.neutral100,
    borderRadius: '6px',
    fontSize: '13px',
    color: colors.primary,
    textDecoration: 'none',
    marginBottom: '12px',
  },
  docActions: {},
  downloadButton: {
    width: '100%',
    padding: '10px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: colors.white,
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
  },
  emptyText: {
    fontSize: '14px',
    color: colors.neutral500,
    marginTop: '12px',
  },
};
