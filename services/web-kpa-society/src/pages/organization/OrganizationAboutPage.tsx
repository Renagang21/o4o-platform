/**
 * OrganizationAboutPage - 조직 소개 페이지
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { organizationApi } from '../../api';
import { colors, typography } from '../../styles/theme';
import type { Organization } from '../../types';

export function OrganizationAboutPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await organizationApi.getOrganization();
      setOrganization(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner message="조직 정보를 불러오는 중..." />;
  }

  if (error) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          action={{ label: '다시 시도', onClick: loadData }}
        />
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <PageHeader
        title="약사회 소개"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '조직소개' }]}
      />

      {/* 인사말 */}
      <Card padding="large" style={{ marginBottom: '24px' }}>
        <div style={styles.greetingSection}>
          <div style={styles.greetingImage}>
            <div style={styles.greetingImagePlaceholder}>👤</div>
          </div>
          <div style={styles.greetingContent}>
            <h2 style={styles.sectionTitle}>회장 인사말</h2>
            <p style={styles.greetingText}>
              안녕하십니까. {organization?.name || '약사회'}를 방문해 주셔서 감사합니다.
            </p>
            <p style={styles.greetingText}>
              저희 약사회는 지역 사회의 건강증진과 약사 회원들의 권익 보호를 위해
              다양한 활동을 전개하고 있습니다. 앞으로도 회원 여러분과 함께
              더욱 발전하는 약사회가 되도록 노력하겠습니다.
            </p>
            <p style={styles.signature}>
              {organization?.name || '약사회'} 회장
            </p>
          </div>
        </div>
      </Card>

      {/* 비전/미션 */}
      <div style={styles.visionSection}>
        <Card padding="large">
          <h3 style={styles.cardTitle}>비전</h3>
          <p style={styles.visionText}>
            "국민 건강과 함께하는 신뢰받는 약사회"
          </p>
        </Card>
        <Card padding="large">
          <h3 style={styles.cardTitle}>미션</h3>
          <ul style={styles.missionList}>
            <li>지역 주민의 건강 증진</li>
            <li>약사 전문성 강화 및 권익 보호</li>
            <li>회원 간 상호 협력과 발전</li>
          </ul>
        </Card>
      </div>

      {/* 연혁 */}
      <Card padding="large" style={{ marginTop: '24px' }}>
        <h2 style={styles.sectionTitle}>연혁</h2>
        <div style={styles.timeline}>
          <div style={styles.timelineItem}>
            <span style={styles.timelineYear}>2024</span>
            <span style={styles.timelineEvent}>디지털 플랫폼 구축</span>
          </div>
          <div style={styles.timelineItem}>
            <span style={styles.timelineYear}>2020</span>
            <span style={styles.timelineEvent}>교육 연수 시스템 도입</span>
          </div>
          <div style={styles.timelineItem}>
            <span style={styles.timelineYear}>2015</span>
            <span style={styles.timelineEvent}>이벤트 사업 시작</span>
          </div>
          <div style={styles.timelineItem}>
            <span style={styles.timelineYear}>2010</span>
            <span style={styles.timelineEvent}>회원 관리 시스템 현대화</span>
          </div>
        </div>
      </Card>

      {/* 조직도 */}
      <Card padding="large" style={{ marginTop: '24px' }}>
        <h2 style={styles.sectionTitle}>조직도</h2>
        <div style={styles.orgChart}>
          <div style={styles.orgChartPlaceholder}>
            <span style={styles.orgChartIcon}>🏛️</span>
            <p>조직도 이미지가 표시됩니다</p>
          </div>
        </div>
      </Card>

      {/* 바로가기 */}
      <div style={styles.quickLinks}>
        <Link to="/organization/branches" style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>🏢</span>
          <span>지부/분회 안내</span>
        </Link>
        <Link to="/organization/officers" style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>👥</span>
          <span>임원 안내</span>
        </Link>
        <Link to="/organization/contact" style={styles.quickLink}>
          <span style={styles.quickLinkIcon}>📞</span>
          <span>연락처</span>
        </Link>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  greetingSection: {
    display: 'flex',
    gap: '32px',
    alignItems: 'flex-start',
  },
  greetingImage: {
    flexShrink: 0,
  },
  greetingImagePlaceholder: {
    width: '150px',
    height: '180px',
    backgroundColor: colors.neutral100,
    borderRadius: '8px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
  },
  greetingContent: {
    flex: 1,
  },
  sectionTitle: {
    ...typography.headingL,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '20px',
  },
  greetingText: {
    ...typography.bodyL,
    color: colors.neutral700,
    lineHeight: 1.8,
    marginBottom: '16px',
  },
  signature: {
    ...typography.bodyM,
    color: colors.neutral500,
    fontStyle: 'italic',
    marginTop: '24px',
  },
  visionSection: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginTop: '24px',
  },
  cardTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '16px',
  },
  visionText: {
    ...typography.headingM,
    color: colors.primary,
    textAlign: 'center',
    padding: '20px',
  },
  missionList: {
    ...typography.bodyL,
    color: colors.neutral700,
    paddingLeft: '20px',
    margin: 0,
  },
  timeline: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  timelineItem: {
    display: 'flex',
    gap: '24px',
    padding: '12px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  timelineYear: {
    width: '60px',
    fontWeight: 600,
    color: colors.primary,
  },
  timelineEvent: {
    color: colors.neutral700,
  },
  orgChart: {
    marginTop: '16px',
  },
  orgChartPlaceholder: {
    height: '300px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    color: colors.neutral500,
  },
  orgChartIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  quickLinks: {
    display: 'flex',
    gap: '16px',
    marginTop: '32px',
  },
  quickLink: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    padding: '24px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
    textDecoration: 'none',
    color: colors.neutral700,
    transition: 'background-color 0.2s',
  },
  quickLinkIcon: {
    fontSize: '32px',
    marginBottom: '8px',
  },
};
