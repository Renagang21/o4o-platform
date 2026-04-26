/**
 * 인트라넷 Dashboard (조직 홈) - 메인화면
 * WO-KPA-INTRANET-MAIN-V1-FINAL
 *
 * 구성:
 * - Hero 영역 (지부/분회 자율 관리)
 * - 협력업체 링크 (지부 전용 관리)
 * - 약사공론 기사 (API 연동)
 * - 광고/강좌 안내 (운영자 요청 반영)
 * - 공지/회의 목록
 *
 * WO-KPA-ACCOUNTING-DASHBOARD-V1
 * - 회계 섹션 추가 (단식부기)
 * - AI 통합 분석
 * - 엑셀 다운로드 기능
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { IntranetHeader } from '../../components/intranet';
import {
  HeroSection,
  PartnerLinksSection,
  NewsSection,
  PromoCardsSection,
} from '../../components/intranet';

import { useOrganization } from '../../contexts/OrganizationContext';
import { colors } from '../../styles/theme';

import {
  HeroSlide,
  PartnerLink,
  NewsArticle,
  PromoCard,
  canManageHero,
  canManagePartnerLinks,
} from '../../types/mainpage';
import { cmsApi } from '../../api/cms';
import { AiSummaryButton } from '../../components/ai';

// 회계 항목 타입 (단식부기)
interface AccountingEntry {
  id: string;
  date: string;
  type: 'income' | 'expense';
  category: string;
  description: string;
  amount: number;
  balance: number;
}

interface Notice {
  id: string;
  title: string;
  createdAt: string;
  isPinned: boolean;
}

interface Meeting {
  id: string;
  title: string;
  date: string;
  time: string;
  isParticipant: boolean;
}

export function DashboardPage() {
  const { currentOrganization } = useOrganization();
  const orgType = currentOrganization?.type || 'branch';

  // 권한 체크
  const userCanManageHero = canManageHero(orgType);
  const userCanManagePartnerLinks = canManagePartnerLinks(orgType);

  // WO-P2-IMPLEMENT-CONTENT: Hero 슬라이드 (CMS API 연동)
  const [heroSlides, setHeroSlides] = useState<HeroSlide[]>([]);
  const [, setHeroLoading] = useState(true);

  // Hero 슬라이드 로드
  const loadHeroSlides = useCallback(async () => {
    try {
      setHeroLoading(true);
      const response = await cmsApi.getSlots('intranet-hero', {
        serviceKey: 'kpa',
        organizationId: currentOrganization?.id,
      });

      if (response.success && response.data.length > 0) {
        setHeroSlides(
          response.data.map((slot) => ({
            id: slot.id,
            title: slot.content?.title || '',
            subtitle: slot.content?.summary || '',
            backgroundColor: slot.content?.metadata?.backgroundColor || colors.primary,
            linkUrl: slot.content?.linkUrl || '',
            linkText: slot.content?.linkText || '',
            order: slot.sortOrder,
            isActive: slot.isActive,
            createdAt: slot.content?.metadata?.createdAt || '',
            updatedAt: slot.content?.metadata?.updatedAt || '',
          }))
        );
      } else {
        // Empty state - no hero content in CMS
        setHeroSlides([]);
      }
    } catch (error) {
      console.error('Failed to load hero slides:', error);
      // Empty state on error
      setHeroSlides([]);
    } finally {
      setHeroLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    loadHeroSlides();
  }, [loadHeroSlides]);

  // 협력업체 샘플 데이터 (지부 전용)
  const [partnerLinks] = useState<PartnerLink[]>([
    { id: 'p1', name: '대한제약', logoUrl: '', linkUrl: 'https://example.com', order: 1, isActive: true },
    { id: 'p2', name: '한국의약', logoUrl: '', linkUrl: 'https://example.com', order: 2, isActive: true },
    { id: 'p3', name: '서울약품', logoUrl: '', linkUrl: 'https://example.com', order: 3, isActive: true },
    { id: 'p4', name: '동아제약', logoUrl: '', linkUrl: 'https://example.com', order: 4, isActive: true },
    { id: 'p5', name: '유한양행', logoUrl: '', linkUrl: 'https://example.com', order: 5, isActive: true },
  ]);

  // 약사공론 기사 (API 연동 구조)
  const [newsArticles, setNewsArticles] = useState<NewsArticle[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [newsError, setNewsError] = useState<string | undefined>();

  // 광고/강좌 안내 (운영자 요청 반영)
  const [promoCards] = useState<PromoCard[]>([
    {
      id: 'promo-1',
      type: 'course',
      title: '2025년 보수교육 안내',
      description: '약사 법정 보수교육 일정 및 신청 안내',
      linkUrl: 'https://www.kpanet.or.kr',
      startDate: '2025-01-01',
      endDate: '2025-12-31',
      isActive: true,
      createdAt: '2025-01-01',
    },
    {
      id: 'promo-2',
      type: 'survey',
      title: '회원 만족도 조사',
      description: '약사회 서비스 개선을 위한 설문에 참여해주세요',
      linkUrl: '/survey/1',
      startDate: '2025-01-01',
      endDate: '2025-01-31',
      isActive: true,
      createdAt: '2025-01-03',
    },
  ]);

  // 약사공론 기사 로드 (모의 API 호출)
  useEffect(() => {
    const loadNews = async () => {
      setNewsLoading(true);
      try {
        // 실제로는 약사공론 API 호출
        // const response = await fetch('https://api.kpanews.co.kr/articles');
        // const data = await response.json();

        // 샘플 데이터로 대체
        await new Promise((resolve) => setTimeout(resolve, 500));
        setNewsArticles([
          {
            id: 'news-1',
            title: '2025년 약사 정책 전망',
            summary: '새해 약사 정책의 주요 변화와 전망을 살펴봅니다.',
            category: '정책',
            thumbnailUrl: '',
            articleUrl: 'https://www.kpanews.co.kr/article/1',
            publishedAt: '2025-01-03',
          },
          {
            id: 'news-2',
            title: '지역약사회 신년 행사 안내',
            summary: '전국 각 지역약사회의 신년 행사 일정을 안내합니다.',
            category: '행사',
            thumbnailUrl: '',
            articleUrl: 'https://www.kpanews.co.kr/article/2',
            publishedAt: '2025-01-02',
          },
          {
            id: 'news-3',
            title: '의약품 안전 관리 강화',
            summary: '식약처, 의약품 안전 관리 강화 방안 발표.',
            category: '안전',
            thumbnailUrl: '',
            articleUrl: 'https://www.kpanews.co.kr/article/3',
            publishedAt: '2025-01-01',
          },
          {
            id: 'news-4',
            title: '약국 경영 트렌드 2025',
            summary: '올해 주목해야 할 약국 경영 트렌드를 분석합니다.',
            category: '경영',
            thumbnailUrl: '',
            articleUrl: 'https://www.kpanews.co.kr/article/4',
            publishedAt: '2024-12-30',
          },
        ]);
        setNewsError(undefined);
      } catch {
        setNewsError('기사를 불러올 수 없습니다.');
      } finally {
        setNewsLoading(false);
      }
    };

    loadNews();
  }, []);

  // WO-P2-IMPLEMENT-CONTENT: 최근 공지 (CMS API 연동)
  const [notices, setNotices] = useState<Notice[]>([]);
  const [, setNoticesLoading] = useState(true);

  // 공지사항 로드
  const loadNotices = useCallback(async () => {
    try {
      setNoticesLoading(true);
      const response = await cmsApi.getContents({
        serviceKey: 'kpa',
        organizationId: currentOrganization?.id,
        type: 'notice',
        status: 'published',
        limit: 5,
      });

      if (response.success && response.data.length > 0) {
        setNotices(
          response.data.map((content) => ({
            id: content.id,
            title: content.title,
            createdAt: content.createdAt.split('T')[0],
            isPinned: content.isPinned,
          }))
        );
      } else {
        // Empty state - no notices in CMS
        setNotices([]);
      }
    } catch (error) {
      console.error('Failed to load notices:', error);
      // Empty state on error
      setNotices([]);
    } finally {
      setNoticesLoading(false);
    }
  }, [currentOrganization?.id]);

  useEffect(() => {
    loadNotices();
  }, [loadNotices]);

  // 샘플 데이터 - 다가오는 회의
  const [meetings] = useState<Meeting[]>([
    { id: '1', title: '1월 정기 이사회', date: '2025-01-10', time: '14:00', isParticipant: true },
    { id: '2', title: '신년 사업계획 회의', date: '2025-01-15', time: '10:00', isParticipant: true },
    { id: '3', title: '분회장단 협의회', date: '2025-01-20', time: '15:00', isParticipant: false },
  ]);

  // 회계 데이터 (단식부기) - 임원용
  const [accountingEntries] = useState<AccountingEntry[]>([
    { id: '1', date: '2025-01-02', type: 'income', category: '연회비', description: '1월 연회비 수납 총계', amount: 15000000, balance: 85000000 },
    { id: '2', date: '2025-01-03', type: 'expense', category: '인건비', description: '1월 직원 급여', amount: 8000000, balance: 77000000 },
    { id: '3', date: '2025-01-04', type: 'expense', category: '운영비', description: '사무실 관리비', amount: 2000000, balance: 75000000 },
    { id: '4', date: '2025-01-05', type: 'income', category: '보조금', description: '대한약사회 사업비', amount: 5000000, balance: 80000000 },
    { id: '5', date: '2025-01-06', type: 'expense', category: '행사비', description: '신년하례회 비용', amount: 3000000, balance: 77000000 },
  ]);

  // 회계 요약 계산
  const accountingSummary = {
    totalIncome: accountingEntries.filter(e => e.type === 'income').reduce((sum, e) => sum + e.amount, 0),
    totalExpense: accountingEntries.filter(e => e.type === 'expense').reduce((sum, e) => sum + e.amount, 0),
    currentBalance: accountingEntries.length > 0 ? accountingEntries[accountingEntries.length - 1].balance : 0,
  };

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    const BOM = '\uFEFF';
    const headers = ['날짜', '구분', '분류', '적요', '수입', '지출', '잔액'];
    const rows = accountingEntries.map(entry => [
      entry.date,
      entry.type === 'income' ? '수입' : '지출',
      entry.category,
      entry.description,
      entry.type === 'income' ? entry.amount : '',
      entry.type === 'expense' ? entry.amount : '',
      entry.balance,
    ]);

    const csvContent = BOM + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `회계_현황_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  const handleEditHero = () => {
    // Hero 편집 모달 또는 페이지로 이동
    console.log('Edit hero slides');
  };

  const handleEditPartners = () => {
    // 협력업체 편집 모달 또는 페이지로 이동
    console.log('Edit partner links');
  };

  return (
    <div>
      <div style={styles.headerRow}>
        <IntranetHeader
          title="홈"
          subtitle={currentOrganization?.name || '조직 홈'}
        />
        <AiSummaryButton contextLabel="인트라넷 현황" serviceId="kpa-society" />
      </div>

      <div style={styles.content}>
        {/* Hero 영역 */}
        <HeroSection
          slides={heroSlides}
          canEdit={userCanManageHero}
          onEdit={handleEditHero}
        />

        {/* WO-KPA-TEST-FEEDBACK-BOARD-V1: 테스트 피드백 바로가기 */}
        <div style={styles.feedbackBanner}>
          <div style={styles.feedbackContent}>
            <span style={styles.feedbackIcon}>💬</span>
            <div style={styles.feedbackText}>
              <strong>테스트 피드백</strong>
              <span>기능 개선, 수정 요청, 오류 신고 등 의견을 남겨주세요</span>
            </div>
          </div>
          <Link to="/intranet/feedback" style={styles.feedbackButton}>
            피드백 작성하기 →
          </Link>
        </div>

        {/* 광고/강좌 안내 영역 */}
        <PromoCardsSection promoCards={promoCards} />

        {/* 메인 콘텐츠 그리드 */}
        <div style={styles.mainGrid}>
          {/* 왼쪽: 공지 + 회의 */}
          <div style={styles.leftColumn}>
            {/* 최근 공지 */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>📢 최근 공지</h3>
                <Link to="/intranet/notice" style={styles.viewAll}>
                  전체보기 →
                </Link>
              </div>
              <div style={styles.cardBody}>
                {notices.map((notice) => (
                  <Link
                    key={notice.id}
                    to={`/intranet/notice/${notice.id}`}
                    style={styles.listItem}
                  >
                    <div style={styles.listItemContent}>
                      {notice.isPinned && <span style={styles.pinBadge}>📌</span>}
                      <span style={styles.listItemTitle}>{notice.title}</span>
                    </div>
                    <span style={styles.listItemDate}>{notice.createdAt}</span>
                  </Link>
                ))}
              </div>
            </div>

            {/* 다가오는 회의 */}
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h3 style={styles.cardTitle}>📋 다가오는 회의</h3>
                <Link to="/intranet/meetings" style={styles.viewAll}>
                  전체보기 →
                </Link>
              </div>
              <div style={styles.cardBody}>
                {meetings.map((meeting) => (
                  <Link
                    key={meeting.id}
                    to={`/intranet/meetings/${meeting.id}`}
                    style={styles.listItem}
                  >
                    <div style={styles.listItemContent}>
                      {meeting.isParticipant && (
                        <span style={styles.participantBadge}>참석</span>
                      )}
                      <span style={styles.listItemTitle}>{meeting.title}</span>
                    </div>
                    <span style={styles.listItemDate}>
                      {meeting.date} {meeting.time}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* 오른쪽: 약사공론 기사 */}
          <div style={styles.rightColumn}>
            <NewsSection
              articles={newsArticles}
              loading={newsLoading}
              error={newsError}
            />
          </div>
        </div>

        {/* 협력업체 링크 (지부 전용) */}
        <PartnerLinksSection
          partners={partnerLinks}
          canEdit={userCanManagePartnerLinks}
          onEdit={handleEditPartners}
        />

        {/* 회계 현황 (단식부기) - AI 통합 */}
        <div style={styles.accountingSection}>
          <div style={styles.accountingHeader}>
            <div style={styles.accountingTitleRow}>
              <h3 style={styles.cardTitle}>💰 회계 현황</h3>
              <AiSummaryButton
                label="AI 분석"
                contextLabel="조직 회계 현황"
                size="sm"
                serviceId="kpa-society"
                contextData={{
                  role: 'officer',
                  summary: accountingSummary,
                  recentEntries: accountingEntries.slice(0, 5),
                  period: '2025년 1월',
                  organizationType: orgType,
                  organizationName: currentOrganization?.name,
                }}
              />
            </div>
            <button onClick={handleExcelDownload} style={styles.excelButton}>
              📥 엑셀 다운로드
            </button>
          </div>

          {/* 회계 요약 */}
          <div style={styles.accountingSummaryGrid}>
            <div style={styles.accountingSummaryCard}>
              <div style={styles.accountingSummaryLabel}>총 수입</div>
              <div style={{ ...styles.accountingSummaryValue, color: '#059669' }}>
                {formatCurrency(accountingSummary.totalIncome)}
              </div>
            </div>
            <div style={styles.accountingSummaryCard}>
              <div style={styles.accountingSummaryLabel}>총 지출</div>
              <div style={{ ...styles.accountingSummaryValue, color: '#DC2626' }}>
                {formatCurrency(accountingSummary.totalExpense)}
              </div>
            </div>
            <div style={styles.accountingSummaryCard}>
              <div style={styles.accountingSummaryLabel}>현재 잔액</div>
              <div style={{ ...styles.accountingSummaryValue, color: colors.primary }}>
                {formatCurrency(accountingSummary.currentBalance)}
              </div>
            </div>
          </div>

          {/* 최근 회계 내역 */}
          <div style={styles.accountingTable}>
            <div style={styles.accountingTableHeader}>
              <span style={styles.accountingColDate}>날짜</span>
              <span style={styles.accountingColType}>구분</span>
              <span style={styles.accountingColCategory}>분류</span>
              <span style={styles.accountingColDesc}>적요</span>
              <span style={styles.accountingColAmount}>금액</span>
              <span style={styles.accountingColBalance}>잔액</span>
            </div>
            {accountingEntries.slice(0, 5).map((entry) => (
              <div key={entry.id} style={styles.accountingRow}>
                <span style={styles.accountingColDate}>{entry.date}</span>
                <span style={styles.accountingColType}>
                  <span style={{
                    ...styles.typeTag,
                    backgroundColor: entry.type === 'income' ? '#D1FAE5' : '#FEE2E2',
                    color: entry.type === 'income' ? '#059669' : '#DC2626',
                  }}>
                    {entry.type === 'income' ? '수입' : '지출'}
                  </span>
                </span>
                <span style={styles.accountingColCategory}>{entry.category}</span>
                <span style={styles.accountingColDesc}>{entry.description}</span>
                <span style={{
                  ...styles.accountingColAmount,
                  color: entry.type === 'income' ? '#059669' : '#DC2626',
                }}>
                  {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
                </span>
                <span style={styles.accountingColBalance}>{formatCurrency(entry.balance)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  headerRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0 32px',
  },
  content: {
    padding: '24px 32px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginBottom: '24px',
  },
  leftColumn: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  rightColumn: {},
  card: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
    overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  viewAll: {
    fontSize: '13px',
    color: colors.primary,
    textDecoration: 'none',
  },
  cardBody: {
    padding: '8px 0',
  },
  listItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 20px',
    textDecoration: 'none',
    color: colors.neutral800,
    borderBottom: `1px solid ${colors.neutral50}`,
  },
  listItemContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  listItemTitle: {
    fontSize: '14px',
  },
  listItemDate: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  pinBadge: {
    fontSize: '12px',
  },
  participantBadge: {
    padding: '2px 6px',
    backgroundColor: colors.accentGreen,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 500,
  },
  // WO-KPA-TEST-FEEDBACK-BOARD-V1: 피드백 바로가기 스타일
  feedbackBanner: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fcd34d',
    borderRadius: '12px',
    marginBottom: '24px',
  },
  feedbackContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
  },
  feedbackIcon: {
    fontSize: '28px',
  },
  feedbackText: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    fontSize: '14px',
    color: '#92400e',
  },
  feedbackButton: {
    padding: '10px 20px',
    backgroundColor: '#f59e0b',
    color: colors.white,
    borderRadius: '8px',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 600,
  },
  // 회계 섹션 스타일
  accountingSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  accountingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  accountingTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  excelButton: {
    padding: '8px 16px',
    backgroundColor: '#10B981',
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  accountingSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  accountingSummaryCard: {
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '10px',
    textAlign: 'center',
  },
  accountingSummaryLabel: {
    fontSize: '14px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  accountingSummaryValue: {
    fontSize: '24px',
    fontWeight: 700,
  },
  accountingTable: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  accountingTableHeader: {
    display: 'grid',
    gridTemplateColumns: '100px 70px 80px 1fr 130px 130px',
    padding: '12px 16px',
    backgroundColor: colors.neutral100,
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
  },
  accountingRow: {
    display: 'grid',
    gridTemplateColumns: '100px 70px 80px 1fr 130px 130px',
    padding: '12px 16px',
    borderTop: `1px solid ${colors.neutral100}`,
    fontSize: '13px',
    alignItems: 'center',
  },
  accountingColDate: {
    color: colors.neutral600,
  },
  accountingColType: {},
  accountingColCategory: {
    color: colors.neutral700,
  },
  accountingColDesc: {
    color: colors.neutral800,
  },
  accountingColAmount: {
    textAlign: 'right',
    fontWeight: 500,
  },
  accountingColBalance: {
    textAlign: 'right',
    color: colors.neutral700,
  },
  typeTag: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
};
