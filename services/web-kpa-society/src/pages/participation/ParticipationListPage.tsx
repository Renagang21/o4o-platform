/**
 * ParticipationListPage - 참여 목록 페이지
 *
 * 참여(설문/퀴즈) 기능은 현재 서비스 준비 중.
 * participation backend가 없으므로 정적 안내만 표시.
 */

import { PageHeader, EmptyState } from '../../components/common';

export function ParticipationListPage() {
  return (
    <div style={styles.container}>
      <PageHeader
        title="참여"
        description="설문과 퀴즈에 참여하고 의견을 나눠보세요"
        breadcrumb={[{ label: '홈', href: '/' }, { label: '참여' }]}
      />

      <EmptyState
        icon="📋"
        title="참여 기능 준비 중"
        description="설문/퀴즈 기능은 현재 준비 중입니다."
      />
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '1000px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
};
