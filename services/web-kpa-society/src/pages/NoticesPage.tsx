/**
 * 공지사항 페이지
 * Phase H8-FE: KPA Society Frontend
 */

import { useState } from 'react';

interface Notice {
  id: number;
  title: string;
  date: string;
  category: string;
  views: number;
  isImportant?: boolean;
}

// 샘플 데이터 (실제로는 API에서 가져옴)
const sampleNotices: Notice[] = [
  { id: 1, title: '2024년 정기총회 안내', date: '2024-12-15', category: '공지', views: 245, isImportant: true },
  { id: 2, title: '연수교육 일정 변경 안내', date: '2024-12-10', category: '교육', views: 189, isImportant: true },
  { id: 3, title: '회비 납부 안내', date: '2024-12-05', category: '공지', views: 156 },
  { id: 4, title: '약국 운영 관련 법규 개정 안내', date: '2024-12-01', category: '법규', views: 312 },
  { id: 5, title: '신규 회원 가입 안내', date: '2024-11-28', category: '공지', views: 98 },
  { id: 6, title: '동절기 의약품 보관 지침', date: '2024-11-25', category: '지침', views: 134 },
  { id: 7, title: '12월 학술세미나 개최', date: '2024-11-20', category: '교육', views: 201 },
  { id: 8, title: '약사회 사무실 이전 안내', date: '2024-11-15', category: '공지', views: 178 },
];

export function NoticesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('전체');
  const [searchTerm, setSearchTerm] = useState('');

  const categories = ['전체', '공지', '교육', '법규', '지침'];

  const filteredNotices = sampleNotices.filter((notice) => {
    const matchesCategory = selectedCategory === '전체' || notice.category === selectedCategory;
    const matchesSearch = notice.title.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>공지사항</h1>

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

      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.th}>번호</th>
            <th style={styles.thTitle}>제목</th>
            <th style={styles.th}>분류</th>
            <th style={styles.th}>등록일</th>
            <th style={styles.th}>조회</th>
          </tr>
        </thead>
        <tbody>
          {filteredNotices.map((notice) => (
            <tr key={notice.id} style={styles.tr}>
              <td style={styles.td}>{notice.id}</td>
              <td style={styles.tdTitle}>
                {notice.isImportant && <span style={styles.importantBadge}>중요</span>}
                <a href={`/notices/${notice.id}`} style={styles.link}>
                  {notice.title}
                </a>
              </td>
              <td style={styles.td}>
                <span style={styles.categoryBadge}>{notice.category}</span>
              </td>
              <td style={styles.td}>{notice.date}</td>
              <td style={styles.td}>{notice.views}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {filteredNotices.length === 0 && (
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
  table: {
    width: '100%',
    borderCollapse: 'collapse',
    marginBottom: '20px',
  },
  th: {
    padding: '12px 10px',
    borderBottom: '2px solid #333',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#f8f9fa',
  },
  thTitle: {
    padding: '12px 10px',
    borderBottom: '2px solid #333',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: 'bold',
    backgroundColor: '#f8f9fa',
  },
  tr: {
    borderBottom: '1px solid #eee',
  },
  td: {
    padding: '12px 10px',
    textAlign: 'center',
    fontSize: '14px',
  },
  tdTitle: {
    padding: '12px 10px',
    textAlign: 'left',
    fontSize: '14px',
  },
  link: {
    color: '#333',
    textDecoration: 'none',
  },
  importantBadge: {
    display: 'inline-block',
    padding: '2px 6px',
    marginRight: '8px',
    backgroundColor: '#dc3545',
    color: '#fff',
    borderRadius: '3px',
    fontSize: '11px',
  },
  categoryBadge: {
    display: 'inline-block',
    padding: '2px 8px',
    backgroundColor: '#e9ecef',
    borderRadius: '3px',
    fontSize: '12px',
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
