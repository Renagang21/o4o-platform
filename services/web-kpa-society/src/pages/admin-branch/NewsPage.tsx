/**
 * NewsPage - 지부 공지사항 관리
 */

import { useState } from 'react';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface NewsItem {
  id: string;
  title: string;
  category: 'notice' | 'news' | 'event';
  author: string;
  createdAt: string;
  isPinned: boolean;
  isPublished: boolean;
  viewCount: number;
}

export function NewsPage() {
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [newsItems] = useState<NewsItem[]>([
    {
      id: '1',
      title: '2025년 신년 인사',
      category: 'notice',
      author: '관리자',
      createdAt: '2025-01-01',
      isPinned: true,
      isPublished: true,
      viewCount: 156,
    },
    {
      id: '2',
      title: '1월 정기 총회 안내',
      category: 'event',
      author: '사무국',
      createdAt: '2025-01-03',
      isPinned: true,
      isPublished: true,
      viewCount: 89,
    },
    {
      id: '3',
      title: '연회비 납부 안내',
      category: 'notice',
      author: '재무부',
      createdAt: '2025-01-02',
      isPinned: false,
      isPublished: true,
      viewCount: 234,
    },
    {
      id: '4',
      title: '신년 하례회 개최',
      category: 'news',
      author: '홍보부',
      createdAt: '2025-01-04',
      isPinned: false,
      isPublished: false,
      viewCount: 0,
    },
  ]);

  const filteredNews = newsItems.filter((item) => {
    const matchesCategory = filterCategory === 'all' || item.category === filterCategory;
    const matchesSearch = item.title.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (category: NewsItem['category']) => {
    const config: Record<string, { bg: string; label: string }> = {
      notice: { bg: colors.primary, label: '공지' },
      news: { bg: colors.accentGreen, label: '소식' },
      event: { bg: colors.accentYellow, label: '행사' },
    };
    const { bg, label } = config[category];
    return <span style={{ ...styles.badge, backgroundColor: bg }}>{label}</span>;
  };

  const handleCreate = () => {
    alert('새 공지 작성 (UI 데모)');
  };

  const handleEdit = (id: string) => {
    alert(`공지 #${id} 수정 (UI 데모)`);
  };

  const handleTogglePublish = (id: string, currentState: boolean) => {
    alert(`공지 #${id} ${currentState ? '비공개' : '게시'} 처리 (UI 데모)`);
  };

  const handleTogglePin = (id: string, currentState: boolean) => {
    alert(`공지 #${id} ${currentState ? '고정 해제' : '고정'} 처리 (UI 데모)`);
  };

  return (
    <div>
      <AdminHeader
        title="공지사항 관리"
        subtitle="지부 공지사항 및 소식 관리"
        actions={
          <button style={styles.createButton} onClick={handleCreate}>
            + 새 공지 작성
          </button>
        }
      />

      <div style={styles.content}>
        {/* 필터 및 검색 */}
        <div style={styles.toolbar}>
          <div style={styles.categoryTabs}>
            {[
              { key: 'all', label: '전체' },
              { key: 'notice', label: '공지' },
              { key: 'news', label: '소식' },
              { key: 'event', label: '행사' },
            ].map((cat) => (
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
              placeholder="제목 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* 공지 목록 */}
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '60px' }}>고정</th>
                <th style={{ ...styles.th, width: '80px' }}>분류</th>
                <th style={styles.th}>제목</th>
                <th style={{ ...styles.th, width: '100px' }}>작성자</th>
                <th style={{ ...styles.th, width: '100px' }}>작성일</th>
                <th style={{ ...styles.th, width: '80px' }}>조회</th>
                <th style={{ ...styles.th, width: '80px' }}>상태</th>
                <th style={{ ...styles.th, width: '120px' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {filteredNews.map((item) => (
                <tr
                  key={item.id}
                  style={{
                    ...styles.tr,
                    backgroundColor: item.isPinned ? colors.neutral50 : 'transparent',
                  }}
                >
                  <td style={styles.td}>
                    <button
                      style={{
                        ...styles.iconButton,
                        color: item.isPinned ? colors.primary : colors.neutral400,
                      }}
                      onClick={() => handleTogglePin(item.id, item.isPinned)}
                    >
                      📌
                    </button>
                  </td>
                  <td style={styles.td}>{getCategoryBadge(item.category)}</td>
                  <td style={styles.td}>
                    <span style={{ fontWeight: item.isPinned ? 600 : 400 }}>{item.title}</span>
                  </td>
                  <td style={styles.td}>{item.author}</td>
                  <td style={styles.td}>{item.createdAt}</td>
                  <td style={styles.td}>{item.viewCount.toLocaleString()}</td>
                  <td style={styles.td}>
                    <span
                      style={{
                        ...styles.statusBadge,
                        backgroundColor: item.isPublished ? colors.accentGreen : colors.neutral400,
                      }}
                    >
                      {item.isPublished ? '게시' : '비공개'}
                    </span>
                  </td>
                  <td style={styles.td}>
                    <div style={styles.actionButtons}>
                      <button style={styles.editButton} onClick={() => handleEdit(item.id)}>
                        수정
                      </button>
                      <button
                        style={styles.toggleButton}
                        onClick={() => handleTogglePublish(item.id, item.isPublished)}
                      >
                        {item.isPublished ? '비공개' : '게시'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 통계 */}
        <div style={styles.statsRow}>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>전체</span>
            <span style={styles.statValue}>{newsItems.length}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>게시중</span>
            <span style={styles.statValue}>{newsItems.filter((n) => n.isPublished).length}</span>
          </div>
          <div style={styles.statItem}>
            <span style={styles.statLabel}>비공개</span>
            <span style={styles.statValue}>{newsItems.filter((n) => !n.isPublished).length}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  createButton: {
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
  badge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  statusBadge: {
    padding: '4px 8px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  iconButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: '16px',
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '6px 12px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  toggleButton: {
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '4px',
    fontSize: '12px',
    cursor: 'pointer',
  },
  statsRow: {
    display: 'flex',
    gap: '24px',
    marginTop: '20px',
    padding: '16px 20px',
    backgroundColor: colors.white,
    borderRadius: '8px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  statItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  statLabel: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  statValue: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
};
