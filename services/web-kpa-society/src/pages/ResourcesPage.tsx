/**
 * 자료실 페이지
 * Phase H8-FE: KPA Society Frontend
 */

import { useState } from 'react';

interface Resource {
  id: number;
  title: string;
  date: string;
  category: string;
  fileType: string;
  fileSize: string;
  downloads: number;
}

// 샘플 데이터 (실제로는 API에서 가져옴)
const sampleResources: Resource[] = [
  { id: 1, title: '2024년 약사회 정관', date: '2024-12-01', category: '정관/규정', fileType: 'PDF', fileSize: '2.5MB', downloads: 156 },
  { id: 2, title: '연수교육 신청서 양식', date: '2024-11-20', category: '서식', fileType: 'HWP', fileSize: '125KB', downloads: 234 },
  { id: 3, title: '약국 운영 가이드라인', date: '2024-11-15', category: '가이드라인', fileType: 'PDF', fileSize: '4.8MB', downloads: 312 },
  { id: 4, title: '회비 납부 증명서 발급 신청서', date: '2024-11-10', category: '서식', fileType: 'HWP', fileSize: '98KB', downloads: 89 },
  { id: 5, title: '의약품 안전관리 매뉴얼', date: '2024-11-05', category: '가이드라인', fileType: 'PDF', fileSize: '8.2MB', downloads: 445 },
  { id: 6, title: '약사 윤리강령', date: '2024-10-25', category: '정관/규정', fileType: 'PDF', fileSize: '1.2MB', downloads: 178 },
  { id: 7, title: '회원 가입 신청서', date: '2024-10-20', category: '서식', fileType: 'HWP', fileSize: '156KB', downloads: 267 },
  { id: 8, title: '2024년 학술세미나 자료집', date: '2024-10-15', category: '학술자료', fileType: 'PDF', fileSize: '15.6MB', downloads: 523 },
];

export function ResourcesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['전체', '정관/규정', '서식', '가이드라인', '학술자료'];

  const filteredResources = sampleResources.filter((resource) => {
    const matchesCategory = selectedCategory === '전체' || resource.category === selectedCategory;
    const matchesSearch = resource.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getFileIcon = (fileType: string): string => {
    switch (fileType) {
      case 'PDF':
        return '📄';
      case 'HWP':
        return '📝';
      case 'DOC':
      case 'DOCX':
        return '📃';
      case 'XLS':
      case 'XLSX':
        return '📊';
      default:
        return '📁';
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>자료실</h1>

      <div style={styles.filterBar}>
        <div style={styles.categories}>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              style={{
                ...styles.categoryButton,
                ...(selectedCategory === cat ? styles.categoryButtonActive : {}),
              }}
            >
              {cat}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="검색어를 입력하세요"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={styles.searchInput}
        />
      </div>

      <div style={styles.resourceList}>
        {filteredResources.map((resource) => (
          <div key={resource.id} style={styles.resourceCard}>
            <div style={styles.fileIcon}>{getFileIcon(resource.fileType)}</div>
            <div style={styles.resourceInfo}>
              <h3 style={styles.resourceTitle}>
                <a href={`/resources/${resource.id}`} style={styles.link}>
                  {resource.title}
                </a>
              </h3>
              <div style={styles.resourceMeta}>
                <span style={styles.categoryTag}>{resource.category}</span>
                <span style={styles.metaItem}>{resource.date}</span>
                <span style={styles.metaItem}>{resource.fileType} ({resource.fileSize})</span>
                <span style={styles.metaItem}>다운로드 {resource.downloads}회</span>
              </div>
            </div>
            <button style={styles.downloadButton}>
              다운로드
            </button>
          </div>
        ))}
      </div>

      {filteredResources.length === 0 && (
        <p style={styles.noData}>검색 결과가 없습니다.</p>
      )}

      <div style={styles.pagination}>
        <button style={styles.pageButton}>{'<'}</button>
        <button style={{ ...styles.pageButton, ...styles.pageButtonActive }}>1</button>
        <button style={styles.pageButton}>2</button>
        <button style={styles.pageButton}>3</button>
        <button style={styles.pageButton}>{'>'}</button>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '40px 20px',
    maxWidth: '1000px',
    margin: '0 auto',
  },
  title: {
    fontSize: '28px',
    fontWeight: 'bold',
    marginBottom: '30px',
    textAlign: 'center',
  },
  filterBar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  categories: {
    display: 'flex',
    gap: '8px',
    flexWrap: 'wrap',
  },
  categoryButton: {
    padding: '8px 16px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  categoryButtonActive: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: '1px solid #007bff',
  },
  searchInput: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '14px',
    width: '200px',
  },
  resourceList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  resourceCard: {
    display: 'flex',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: '#fff',
    border: '1px solid #e9ecef',
    borderRadius: '8px',
    gap: '16px',
  },
  fileIcon: {
    fontSize: '32px',
    width: '48px',
    textAlign: 'center',
  },
  resourceInfo: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  link: {
    color: '#333',
    textDecoration: 'none',
  },
  resourceMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
    fontSize: '13px',
    color: '#666',
  },
  categoryTag: {
    padding: '2px 8px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
  },
  metaItem: {
    display: 'inline-block',
  },
  downloadButton: {
    padding: '8px 16px',
    backgroundColor: '#28a745',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
    whiteSpace: 'nowrap',
  },
  noData: {
    textAlign: 'center',
    color: '#666',
    padding: '40px',
  },
  pagination: {
    display: 'flex',
    justifyContent: 'center',
    gap: '4px',
    marginTop: '20px',
  },
  pageButton: {
    padding: '8px 12px',
    border: '1px solid #ddd',
    backgroundColor: '#fff',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '14px',
  },
  pageButtonActive: {
    backgroundColor: '#007bff',
    color: '#fff',
    border: '1px solid #007bff',
  },
};
