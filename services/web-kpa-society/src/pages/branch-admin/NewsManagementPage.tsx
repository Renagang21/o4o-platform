/**
 * NewsManagementPage - 공지사항 관리 페이지
 */

import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';

interface Notice {
  id: string;
  title: string;
  category: 'notice' | 'event' | 'urgent';
  author: string;
  createdAt: string;
  viewCount: number;
  isPinned: boolean;
  isPublished: boolean;
}

export function NewsManagementPage() {
  const { branchId } = useParams();
  const [filterCategory, setFilterCategory] = useState<string>('all');

  const [notices] = useState<Notice[]>([
    {
      id: '1',
      title: '2025년 정기총회 개최 안내',
      category: 'notice',
      author: '관리자',
      createdAt: '2025-01-04',
      viewCount: 156,
      isPinned: true,
      isPublished: true,
    },
    {
      id: '2',
      title: '[긴급] 약국 운영 지침 변경 안내',
      category: 'urgent',
      author: '관리자',
      createdAt: '2025-01-03',
      viewCount: 342,
      isPinned: true,
      isPublished: true,
    },
    {
      id: '3',
      title: '신년 하례회 참석 안내',
      category: 'event',
      author: '관리자',
      createdAt: '2025-01-02',
      viewCount: 89,
      isPinned: false,
      isPublished: true,
    },
    {
      id: '4',
      title: '2025년 연회비 납부 안내',
      category: 'notice',
      author: '관리자',
      createdAt: '2025-01-01',
      viewCount: 234,
      isPinned: false,
      isPublished: true,
    },
    {
      id: '5',
      title: '보수교육 일정 변경 (임시저장)',
      category: 'notice',
      author: '관리자',
      createdAt: '2024-12-30',
      viewCount: 0,
      isPinned: false,
      isPublished: false,
    },
  ]);

  const getCategoryBadge = (category: Notice['category']) => {
    const styles: Record<string, React.CSSProperties> = {
      notice: { backgroundColor: colors.primary, color: colors.white },
      event: { backgroundColor: colors.accentGreen, color: colors.white },
      urgent: { backgroundColor: colors.accentRed, color: colors.white },
    };
    const labels: Record<string, string> = {
      notice: '공지',
      event: '행사',
      urgent: '긴급',
    };
    return <span style={{ ...badgeStyle, ...styles[category] }}>{labels[category]}</span>;
  };

  const handleTogglePin = (id: string) => {
    alert(`공지 #${id} 고정 상태 변경`);
  };

  const handleTogglePublish = (id: string) => {
    alert(`공지 #${id} 게시 상태 변경`);
  };

  const handleDelete = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      alert(`공지 #${id} 삭제`);
    }
  };

  return (
    <div>
      <AdminHeader
        title="공지사항 관리"
        subtitle="분회 공지사항을 관리합니다"
      />

      <div style={pageStyles.content}>
        {/* 상단 액션 */}
        <div style={pageStyles.toolbar}>
          <div style={pageStyles.tabs}>
            {[
              { value: 'all', label: '전체' },
              { value: 'notice', label: '공지' },
              { value: 'event', label: '행사' },
              { value: 'urgent', label: '긴급' },
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

          <Link to={`/branch/${branchId}/admin/news/new`} style={pageStyles.createButton}>
            + 새 공지 작성
          </Link>
        </div>

        {/* 공지 목록 */}
        <div style={pageStyles.tableWrapper}>
          <table style={pageStyles.table}>
            <thead>
              <tr>
                <th style={{ ...pageStyles.th, width: '50px' }}>고정</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>분류</th>
                <th style={pageStyles.th}>제목</th>
                <th style={{ ...pageStyles.th, width: '100px' }}>작성자</th>
                <th style={{ ...pageStyles.th, width: '100px' }}>작성일</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>조회수</th>
                <th style={{ ...pageStyles.th, width: '80px' }}>상태</th>
                <th style={{ ...pageStyles.th, width: '150px' }}>관리</th>
              </tr>
            </thead>
            <tbody>
              {notices
                .filter((n) => filterCategory === 'all' || n.category === filterCategory)
                .map((notice) => (
                  <tr key={notice.id} style={pageStyles.tr}>
                    <td style={pageStyles.td}>
                      <button
                        style={{
                          ...pageStyles.pinButton,
                          ...(notice.isPinned ? pageStyles.pinButtonActive : {}),
                        }}
                        onClick={() => handleTogglePin(notice.id)}
                      >
                        📌
                      </button>
                    </td>
                    <td style={pageStyles.td}>{getCategoryBadge(notice.category)}</td>
                    <td style={pageStyles.td}>
                      <Link
                        to={`/branch/${branchId}/admin/news/${notice.id}`}
                        style={pageStyles.titleLink}
                      >
                        {notice.title}
                      </Link>
                    </td>
                    <td style={pageStyles.td}>{notice.author}</td>
                    <td style={pageStyles.td}>{notice.createdAt}</td>
                    <td style={pageStyles.td}>{notice.viewCount.toLocaleString()}</td>
                    <td style={pageStyles.td}>
                      <span
                        style={{
                          ...pageStyles.statusBadge,
                          backgroundColor: notice.isPublished ? colors.accentGreen : colors.neutral400,
                        }}
                      >
                        {notice.isPublished ? '게시중' : '임시저장'}
                      </span>
                    </td>
                    <td style={pageStyles.td}>
                      <div style={pageStyles.actions}>
                        <Link
                          to={`/branch/${branchId}/admin/news/${notice.id}/edit`}
                          style={pageStyles.actionButton}
                        >
                          수정
                        </Link>
                        <button
                          style={pageStyles.actionButton}
                          onClick={() => handleTogglePublish(notice.id)}
                        >
                          {notice.isPublished ? '숨김' : '게시'}
                        </button>
                        <button
                          style={{ ...pageStyles.actionButton, color: colors.accentRed }}
                          onClick={() => handleDelete(notice.id)}
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
      </div>
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
    padding: '10px 20px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  createButton: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '12px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '8px',
    textDecoration: 'none',
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
  pinButton: {
    padding: '4px 8px',
    backgroundColor: 'transparent',
    border: 'none',
    fontSize: '16px',
    cursor: 'pointer',
    opacity: 0.3,
  },
  pinButtonActive: {
    opacity: 1,
  },
  titleLink: {
    color: colors.neutral800,
    textDecoration: 'none',
    fontWeight: 500,
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
};
