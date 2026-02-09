/**
 * NoticeListPage - 공지 목록 (Forum Board 기반)
 * Work Order 3: Forum 기능을 이용한 공지 전용 Board
 * WO-APP-CONTENT-DISCOVERY-PHASE1-V1: ContentPagination
 */

import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { IntranetHeader } from '../../components/intranet';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';
import { ContentPagination } from '@o4o/ui';

const PAGE_SIZE = 10;

interface Notice {
  id: string;
  title: string;
  content: string;
  author: string;
  createdAt: string;
  isPinned: boolean;
  viewCount: number;
  commentCount: number;
  hasAttachment: boolean;
}

export function NoticeListPage() {
  const { user } = useAuth();
  const userRole = user?.role || 'member';
  const canWrite = ['officer', 'chair', 'admin', 'super_admin'].includes(userRole);
  const [currentPage, setCurrentPage] = useState(1);

  const [notices] = useState<Notice[]>([
    {
      id: '1',
      title: '2025년 신년 인사',
      content: '새해 복 많이 받으세요...',
      author: '지부장',
      createdAt: '2025-01-01',
      isPinned: true,
      viewCount: 156,
      commentCount: 12,
      hasAttachment: false,
    },
    {
      id: '2',
      title: '1월 정기회의 안내',
      content: '1월 정기회의를 아래와 같이 개최합니다...',
      author: '사무국',
      createdAt: '2025-01-03',
      isPinned: true,
      viewCount: 89,
      commentCount: 5,
      hasAttachment: true,
    },
    {
      id: '3',
      title: '연회비 납부 안내',
      content: '2025년 연회비 납부 안내드립니다...',
      author: '재무',
      createdAt: '2025-01-02',
      isPinned: false,
      viewCount: 234,
      commentCount: 23,
      hasAttachment: true,
    },
    {
      id: '4',
      title: '약국 운영 관련 법규 변경 안내',
      content: '약사법 일부 개정에 따른 안내...',
      author: '법제위원',
      createdAt: '2024-12-28',
      isPinned: false,
      viewCount: 178,
      commentCount: 8,
      hasAttachment: true,
    },
    {
      id: '5',
      title: '연말정산 관련 서류 배포',
      content: '연말정산에 필요한 서류를 첨부하오니...',
      author: '사무국',
      createdAt: '2024-12-20',
      isPinned: false,
      viewCount: 312,
      commentCount: 15,
      hasAttachment: true,
    },
  ]);

  // 고정 공지를 상단에 배치
  const allSortedNotices = [
    ...notices.filter((n) => n.isPinned),
    ...notices.filter((n) => !n.isPinned),
  ];

  const totalPages = Math.ceil(allSortedNotices.length / PAGE_SIZE);
  const sortedNotices = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return allSortedNotices.slice(start, start + PAGE_SIZE);
  }, [allSortedNotices, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <IntranetHeader
        title="공지"
        subtitle="조직 공지사항"
        actions={
          canWrite && (
            <Link to="/intranet/notice/write" style={styles.writeButton}>
              + 공지 작성
            </Link>
          )
        }
      />

      <div style={styles.content}>
        <div style={styles.tableWrapper}>
          <table style={styles.table}>
            <thead>
              <tr>
                <th style={{ ...styles.th, width: '60px' }}>번호</th>
                <th style={styles.th}>제목</th>
                <th style={{ ...styles.th, width: '100px' }}>작성자</th>
                <th style={{ ...styles.th, width: '100px' }}>작성일</th>
                <th style={{ ...styles.th, width: '70px' }}>조회</th>
              </tr>
            </thead>
            <tbody>
              {sortedNotices.map((notice, index) => (
                <tr
                  key={notice.id}
                  style={{
                    ...styles.tr,
                    backgroundColor: notice.isPinned ? colors.neutral50 : 'transparent',
                  }}
                >
                  <td style={styles.td}>
                    {notice.isPinned ? (
                      <span style={styles.pinBadge}>📌</span>
                    ) : (
                      <span style={styles.numberText}>{notices.length - index}</span>
                    )}
                  </td>
                  <td style={styles.td}>
                    <Link to={`/intranet/notice/${notice.id}`} style={styles.titleLink}>
                      <span style={{ fontWeight: notice.isPinned ? 600 : 400 }}>
                        {notice.title}
                      </span>
                      {notice.hasAttachment && (
                        <span style={styles.attachIcon}>📎</span>
                      )}
                      {notice.commentCount > 0 && (
                        <span style={styles.commentCount}>[{notice.commentCount}]</span>
                      )}
                    </Link>
                  </td>
                  <td style={styles.td}>{notice.author}</td>
                  <td style={styles.td}>{notice.createdAt}</td>
                  <td style={styles.td}>{notice.viewCount}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* 페이지네이션 */}
        {totalPages > 1 && (
          <ContentPagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={handlePageChange}
            showItemRange
            totalItems={allSortedNotices.length}
          />
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  writeButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
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
  pinBadge: {
    fontSize: '14px',
  },
  numberText: {
    color: colors.neutral400,
    fontSize: '13px',
  },
  titleLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    color: colors.neutral800,
  },
  attachIcon: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  commentCount: {
    fontSize: '12px',
    color: colors.primary,
    fontWeight: 500,
  },
};
