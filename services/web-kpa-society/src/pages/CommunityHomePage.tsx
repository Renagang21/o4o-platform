/**
 * CommunityHomePage - KPA Society 메인 홈 페이지
 *
 * 마케팅 랜딩이 아닌 "지금 무엇을 할 수 있는지" 보여주는 커뮤니티 홈
 * 로그인 전/후 동일 페이지, 위젯 노출만 다름
 *
 * 컴포넌트 트리:
 * HomePage (= CommunityHomePage)
 * ├─ QuickAccessBar          - 상단 바로가기
 * ├─ ActivitySection          - 최근 활동 (포럼 글 + 공지)
 * ├─ CommunityServiceSection  - 공용 서비스 2x2 그리드
 * ├─ OrganizationDemoSection  - 지부 서비스 데모
 * └─ UtilitySection           - 유틸리티 (로그인 패널 + 링크)
 */

import { QuickAccessBar } from '../components/home/QuickAccessBar';
import { ActivitySection } from '../components/home/ActivitySection/ActivitySection';
import { CommunityServiceSection } from '../components/home/CommunityServiceSection';
import { OrganizationDemoSection } from '../components/home/OrganizationDemoSection';
import { UtilitySection } from '../components/home/UtilitySection';
import { colors, spacing } from '../styles/theme';

export function CommunityHomePage() {
  return (
    <div style={styles.page}>
      <div style={styles.content}>
        <QuickAccessBar />
        <ActivitySection />
        <CommunityServiceSection />
        <OrganizationDemoSection />
        <UtilitySection />
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: colors.neutral50,
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: `0 ${spacing.lg}`,
  },
};

export default CommunityHomePage;
