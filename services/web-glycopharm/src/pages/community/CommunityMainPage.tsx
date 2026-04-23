/**
 * CommunityMainPage — GlycoPharm Community Main Page
 *
 * WO-O4O-GLYCOPHARM-MENU-HOME-KPA-CANONICAL-PORT-V1
 *
 * KPA-Society canonical 기준 이식.
 *
 * 섹션 구조 (KPA canonical):
 * ├─ 공지 / 약업신문 뉴스     — 2-column (좌: 공지, 우: placeholder)
 * ├─ AppEntrySection          — 서비스 바로가기 카드 5개 (shared)
 * └─ CtaGuidanceSection       — CTA (shared)
 */

import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/services/api';
import {
  NewsNoticesSection,
  AppEntrySection,
  CtaGuidanceSection,
} from '@o4o/shared-space-ui';
import type { NoticeItem } from '@o4o/shared-space-ui';
import { PageSection, PageContainer } from '@o4o/ui';

// ─── Inline SVG Icons ──────────────────────────────────────

const ForumIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
  </svg>
);

const EducationIconSvg = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
  </svg>
);

const ContentIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="16" y1="13" x2="8" y2="13" />
    <line x1="16" y1="17" x2="8" y2="17" />
  </svg>
);

const SignageIcon = () => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

const ResourceLibraryIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const NewspaperIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
    <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6z" />
  </svg>
);

// ─── Types ──────────────────────────────────────────────────

interface ForumPostRaw {
  id: string;
  title: string;
  category?: { name?: string } | null;
  createdAt: string;
}

// ─── Main Component ─────────────────────────────────────────

export default function CommunityMainPage() {
  const [noticeItems, setNoticeItems] = useState<NoticeItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = 'glyco-home-two-col-responsive';
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = `
      @media (max-width: 768px) {
        .glyco-home-two-col { flex-direction: column !important; }
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById(id)?.remove(); };
  }, []);

  const loadNotices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<ForumPostRaw[]>('/api/v1/glycopharm/forum/posts?limit=30');
      if (Array.isArray(res.data)) {
        const items: NoticeItem[] = res.data
          .filter((p) => p.category?.name === '공지')
          .slice(0, 5)
          .map((p) => ({ id: p.id, title: p.title, date: p.createdAt, href: `/forum/posts/${p.id}`, isPinned: true }));
        setNoticeItems(items);
      }
    } catch {
      setNoticeItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  return (
    <div style={styles.page}>
      {/* 1. 공지 / 약업신문 뉴스 (2-column) */}
      <PageSection>
        <PageContainer>
          <div style={twoColStyles.row} className="glyco-home-two-col">
            {/* Left: 공지사항 */}
            <div style={twoColStyles.col}>
              <NewsNoticesSection
                title="공지"
                items={noticeItems}
                loading={loading}
                viewAllHref="/forum"
              />
            </div>
            {/* Right: 약업신문 뉴스 Placeholder */}
            <div style={twoColStyles.col}>
              <div style={twoColStyles.placeholderHeader}>
                <h2 style={twoColStyles.placeholderTitle}>약업신문 뉴스</h2>
              </div>
              <div style={twoColStyles.placeholderCard}>
                <NewspaperIcon />
                <p style={twoColStyles.placeholderText}>
                  이 영역은 약업신문 뉴스가 표시될 예정입니다.
                </p>
                <a
                  href="https://www.yakup.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={twoColStyles.placeholderLink}
                >
                  약업신문 바로가기 →
                </a>
              </div>
            </div>
          </div>
        </PageContainer>
      </PageSection>

      {/* 2. 서비스 바로가기 (shared) */}
      <PageSection>
        <PageContainer>
          <AppEntrySection
            cards={[
              { title: '포럼', description: '동료 약사와 질문·토론으로 전문성을 높이세요', href: '/forum', icon: <ForumIcon /> },
              { title: '강의', description: '보수교육·세미나를 온라인으로 수강하세요', href: '/lms', icon: <EducationIconSvg /> },
              { title: '콘텐츠', description: '플랫폼 콘텐츠를 검색하고 활용하세요', href: '/content', icon: <ContentIcon /> },
              { title: '디지털 사이니지', description: '약국 디지털 미디어를 관리하세요', href: '/store/signage/library', icon: <SignageIcon /> },
              { title: '자료실', description: '자료를 저장하고 AI 작업에 활용하세요', href: '/resources', icon: <ResourceLibraryIcon /> },
            ]}
          />
        </PageContainer>
      </PageSection>

      {/* 3. CTA (shared) */}
      <PageSection last>
        <PageContainer>
          <CtaGuidanceSection
            title="매장 운영에 도움이 필요하세요?"
            description="디지털 사이니지로 약국을 꾸며보세요"
            href="/store/signage/library"
            linkLabel="사이니지 보기 →"
            icon={<SignageIcon />}
          />
        </PageContainer>
      </PageSection>
    </div>
  );
}

const twoColStyles: Record<string, React.CSSProperties> = {
  row: {
    display: 'flex',
    gap: 16,
  },
  col: {
    flex: 1,
    minWidth: 0,
  },
  placeholderHeader: {
    marginBottom: 12,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  placeholderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: '40px 16px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 200,
  },
  placeholderText: {
    fontSize: '0.9375rem',
    fontWeight: 500,
    color: '#334155',
    margin: '12px 0',
    textAlign: 'center',
  },
  placeholderLink: {
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#059669',
    textDecoration: 'none',
  },
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
  },
};
