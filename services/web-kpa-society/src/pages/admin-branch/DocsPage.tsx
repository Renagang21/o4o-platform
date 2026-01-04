/**
 * DocsPage - 지부 자료실 관리
 */

import { useState } from 'react';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface DocItem {
  id: string;
  title: string;
  category: 'regulation' | 'form' | 'manual' | 'material';
  fileName: string;
  fileSize: string;
  author: string;
  createdAt: string;
  downloadCount: number;
  isPublished: boolean;
}

export function DocsPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [docs] = useState<DocItem[]>([
    {
      id: '1',
      title: '2025년 약사회 정관',
      category: 'regulation',
      fileName: '정관_2025.pdf',
      fileSize: '2.5MB',
      author: '사무국',
      createdAt: '2025-01-02',
      downloadCount: 45,
      isPublished: true,
    },
    {
      id: '2',
      title: '신상신고서 양식',
      category: 'form',
      fileName: '신상신고서.hwp',
      fileSize: '156KB',
      author: '사무국',
      createdAt: '2024-12-15',
      downloadCount: 128,
      isPublished: true,
    },
    {
      id: '3',
      title: '회원 관리 매뉴얼',
      category: 'manual',
      fileName: '회원관리매뉴얼.pdf',
      fileSize: '4.2MB',
      author: '관리자',
      createdAt: '2024-11-20',
      downloadCount: 67,
      isPublished: true,
    },
    {
      id: '4',
      title: '2025년 사업계획서',
      category: 'material',
      fileName: '사업계획_2025.pdf',
      fileSize: '1.8MB',
      author: '기획부',
      createdAt: '2025-01-03',
      downloadCount: 23,
      isPublished: false,
    },
  ]);

  const categories = [
    { key: 'all', label: '전체' },
    { key: 'regulation', label: '규정' },
    { key: 'form', label: '양식' },
    { key: 'manual', label: '매뉴얼' },
    { key: 'material', label: '자료' },
  ];

  const filteredDocs = docs.filter((doc) => {
    const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
    const matchesSearch = doc.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryLabel = (category: DocItem['category']) => {
    const labels: Record<string, string> = {
      regulation: '규정',
      form: '양식',
      manual: '매뉴얼',
      material: '자료',
    };
    return labels[category];
  };

  const getFileIcon = (fileName: string) => {
    if (fileName.endsWith('.pdf')) return '📄';
    if (fileName.endsWith('.hwp')) return '📝';
    if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) return '📊';
    if (fileName.endsWith('.docx') || fileName.endsWith('.doc')) return '📃';
    return '📁';
  };

  const handleUpload = () => {
    alert('파일 업로드 (UI 데모)');
  };

  const handleEdit = (id: string) => {
    alert(`자료 #${id} 수정 (UI 데모)`);
  };

  const handleDownload = (_id: string, fileName: string) => {
    alert(`${fileName} 다운로드 (UI 데모)`);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      alert(`자료 #${id} 삭제 (UI 데모)`);
    }
  };

  return (
    <div>
      <AdminHeader
        title="자료실 관리"
        subtitle="지부 자료 및 양식 관리"
        actions={
          <button style={styles.uploadButton} onClick={handleUpload}>
            + 파일 업로드
          </button>
        }
      />

      <div style={styles.content}>
        {/* 카테고리 탭 및 검색 */}
        <div style={styles.toolbar}>
          <div style={styles.categoryTabs}>
            {categories.map((cat) => (
              <button
                key={cat.key}
                style={{
                  ...styles.categoryTab,
                  ...(filterCategory === cat.key ? styles.categoryTabActive : {}),
                }}
                onClick={() => setFilterCategory(cat.key)}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="자료 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* 자료 목록 */}
        <div style={styles.docGrid}>
          {filteredDocs.map((doc) => (
            <div key={doc.id} style={styles.docCard}>
              <div style={styles.docHeader}>
                <span style={styles.fileIcon}>{getFileIcon(doc.fileName)}</span>
                <span
                  style={{
                    ...styles.categoryBadge,
                    backgroundColor:
                      doc.category === 'regulation'
                        ? colors.primary
                        : doc.category === 'form'
                          ? colors.accentGreen
                          : doc.category === 'manual'
                            ? colors.accentYellow
                            : colors.neutral500,
                  }}
                >
                  {getCategoryLabel(doc.category)}
                </span>
              </div>

              <div style={styles.docTitle}>{doc.title}</div>

              <div style={styles.docMeta}>
                <div style={styles.fileName}>{doc.fileName}</div>
                <div style={styles.fileInfo}>
                  <span>{doc.fileSize}</span>
                  <span>•</span>
                  <span>{doc.createdAt}</span>
                </div>
              </div>

              <div style={styles.docStats}>
                <span>📥 {doc.downloadCount}회 다운로드</span>
                <span
                  style={{
                    color: doc.isPublished ? colors.accentGreen : colors.neutral400,
                  }}
                >
                  {doc.isPublished ? '공개' : '비공개'}
                </span>
              </div>

              <div style={styles.docActions}>
                <button
                  style={styles.downloadButton}
                  onClick={() => handleDownload(doc.id, doc.fileName)}
                >
                  다운로드
                </button>
                <button style={styles.editButton} onClick={() => handleEdit(doc.id)}>
                  수정
                </button>
                <button style={styles.deleteButton} onClick={() => handleDelete(doc.id)}>
                  삭제
                </button>
              </div>
            </div>
          ))}
        </div>

        {filteredDocs.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>📂</div>
            <div style={styles.emptyText}>등록된 자료가 없습니다.</div>
          </div>
        )}

        {/* 저장 용량 정보 */}
        <div style={styles.storageInfo}>
          <div style={styles.storageLabel}>저장 공간</div>
          <div style={styles.storageBar}>
            <div style={styles.storageFill} />
          </div>
          <div style={styles.storageText}>8.7MB / 1GB 사용중</div>
        </div>
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
    cursor: 'pointer',
    fontWeight: 500,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  categoryTabs: {
    display: 'flex',
    gap: '8px',
  },
  categoryTab: {
    padding: '10px 20px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  categoryTabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  searchBox: {
    display: 'flex',
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
    width: '250px',
  },
  docGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  fileIcon: {
    fontSize: '28px',
  },
  categoryBadge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  docTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '12px',
    lineHeight: 1.4,
  },
  docMeta: {
    marginBottom: '12px',
  },
  fileName: {
    fontSize: '13px',
    color: colors.neutral600,
    marginBottom: '4px',
  },
  fileInfo: {
    fontSize: '12px',
    color: colors.neutral400,
    display: 'flex',
    gap: '6px',
  },
  docStats: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '12px',
    color: colors.neutral500,
    paddingTop: '12px',
    borderTop: `1px solid ${colors.neutral100}`,
    marginBottom: '16px',
  },
  docActions: {
    display: 'flex',
    gap: '8px',
  },
  downloadButton: {
    flex: 1,
    padding: '8px 12px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  editButton: {
    padding: '8px 12px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  deleteButton: {
    padding: '8px 12px',
    backgroundColor: colors.neutral100,
    color: colors.accentRed,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
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
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  storageInfo: {
    marginTop: '32px',
    padding: '20px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  storageLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '12px',
  },
  storageBar: {
    height: '8px',
    backgroundColor: colors.neutral200,
    borderRadius: '4px',
    overflow: 'hidden',
    marginBottom: '8px',
  },
  storageFill: {
    width: '0.87%',
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: '4px',
  },
  storageText: {
    fontSize: '13px',
    color: colors.neutral500,
  },
};
