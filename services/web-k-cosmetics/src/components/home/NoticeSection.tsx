/**
 * NoticeSection — K-Cosmetics 홈 운영 공지
 *
 * WO-KCOS-HOME-DYNAMIC-IMPL-V1:
 *   정적 notices[] 배열 제거 → CMS API 동적 연동
 *
 * 패턴 참조: web-kpa-society/src/components/home/NoticeSection.tsx
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { homeApi, HomeNotice } from '../../api/home';

interface Props {
  prefetchedNotices?: HomeNotice[];
  loading?: boolean;
}

export function NoticeSection({ prefetchedNotices, loading: parentLoading }: Props) {
  const [notices, setNotices] = useState<HomeNotice[]>(prefetchedNotices ?? []);
  const [loading, setLoading] = useState(!prefetchedNotices);

  useEffect(() => {
    if (prefetchedNotices) {
      setNotices(prefetchedNotices);
      setLoading(false);
      return;
    }
    homeApi.getNotices(5)
      .then(setNotices)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [prefetchedNotices]);

  const isLoading = parentLoading ?? loading;

  return (
    <section style={{ padding: '40px 24px', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        border: '1px solid #e2e8f0',
        overflow: 'hidden',
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: '1px solid #e2e8f0',
        }}>
          <h2 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>운영 공지</h2>
          <Link
            to="/about"
            style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, textDecoration: 'none' }}
          >
            전체보기 ›
          </Link>
        </div>

        <div>
          {isLoading ? (
            <p style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              불러오는 중...
            </p>
          ) : notices.length === 0 ? (
            <p style={{ padding: '24px', textAlign: 'center', color: '#94a3b8', fontSize: '13px', margin: 0 }}>
              등록된 공지가 없습니다.
            </p>
          ) : (
            notices.map((notice, index) => (
              <Link
                key={notice.id}
                to={notice.link}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '16px 20px',
                  borderBottom: index < notices.length - 1 ? '1px solid #f5f5f5' : 'none',
                  textDecoration: 'none',
                  transition: 'background 0.2s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  {notice.isPinned && <span style={{ fontSize: '14px' }}>📌</span>}
                  <span style={{
                    fontSize: '14px',
                    color: notice.isPinned ? '#1a1a1a' : '#666',
                    fontWeight: notice.isPinned ? 500 : 400,
                  }}>
                    {notice.title}
                  </span>
                </div>
                <span style={{ fontSize: '12px', color: '#999', flexShrink: 0, marginLeft: '16px' }}>
                  {notice.date}
                </span>
              </Link>
            ))
          )}
        </div>
      </div>
    </section>
  );
}
