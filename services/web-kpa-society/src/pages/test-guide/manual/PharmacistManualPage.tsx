/**
 * PharmacistManualPage - 약사 역할 매뉴얼
 * WO-TEST-GUIDE-AND-MANUALS-V1 기준
 */

import { Link } from 'react-router-dom';
import TestGuideLayout from '../../../components/layouts/TestGuideLayout';

export default function PharmacistManualPage() {
  return (
    <TestGuideLayout title="약사 매뉴얼" subtitle="약사회 SaaS 회원 서비스 가이드">
      {/* 이 역할은 무엇을 하는가 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>약사는 무엇을 하나요?</h2>
        <p style={styles.text}>
          약사는 약사회 SaaS에서 <strong>회원 서비스를 이용</strong>하는 역할입니다.
          공지사항 확인, 포럼 참여, 교육 수강, 공동구매 참여 등을 할 수 있습니다.
        </p>
      </section>

      {/* 로그인 후 가장 먼저 보게 되는 화면 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>로그인 후 첫 화면</h2>
        <p style={styles.text}>
          로그인하면 <strong>홈페이지(대시보드)</strong>로 이동합니다.
          최신 공지, 진행 중인 공동구매, 추천 교육 등을 한눈에 확인할 수 있습니다.
        </p>
      </section>

      {/* 자주 사용하는 기능 3가지 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>자주 사용하는 기능</h2>
        <div style={styles.featureList}>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>1</span>
            <div>
              <strong>포럼</strong>
              <p style={styles.featureDesc}>약사 간 정보 공유 및 질문/답변을 할 수 있습니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>2</span>
            <div>
              <strong>교육 (LMS)</strong>
              <p style={styles.featureDesc}>온라인 교육을 수강하고 수료증을 발급받습니다.</p>
            </div>
          </div>
          <div style={styles.featureItem}>
            <span style={styles.featureNumber}>3</span>
            <div>
              <strong>공동구매</strong>
              <p style={styles.featureDesc}>약사회 회원 전용 공동구매에 참여합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 이번 테스트에서 안 해도 되는 것 */}
      <section style={styles.section}>
        <h2 style={styles.sectionTitle}>이번 테스트에서 안 해도 되는 것</h2>
        <ul style={styles.skipList}>
          <li>실제 결제 (테스트 환경)</li>
          <li>회원 정보 변경</li>
          <li>수료증 실제 발급</li>
        </ul>
        <p style={styles.notice}>※ 테스트 환경은 실제 서비스와 다를 수 있습니다.</p>
      </section>

      {/* 연결 문구 */}
      <div style={styles.footer}>
        <Link to="/test-guide" style={styles.footerLink}>← 테스트 가이드로 돌아가기</Link>
        <p style={styles.footerText}>의견은 테스트 포럼에 남겨주세요</p>
      </div>
    </TestGuideLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
  section: {
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '16px',
    border: '1px solid #e2e8f0',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  text: {
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
    margin: 0,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  featureItem: {
    display: 'flex',
    gap: '12px',
    alignItems: 'flex-start',
  },
  featureNumber: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '24px',
    height: '24px',
    backgroundColor: '#2563eb',
    color: '#fff',
    borderRadius: '50%',
    fontSize: '13px',
    fontWeight: 600,
    flexShrink: 0,
    marginTop: '2px',
  },
  featureDesc: {
    fontSize: '14px',
    color: '#64748b',
    margin: '4px 0 0 0',
  },
  skipList: {
    margin: 0,
    paddingLeft: '20px',
    color: '#64748b',
    fontSize: '14px',
    lineHeight: 1.8,
  },
  notice: {
    marginTop: '12px',
    fontSize: '13px',
    color: '#94a3b8',
    fontStyle: 'italic',
  },
  footer: {
    textAlign: 'center',
    padding: '16px 0',
  },
  footerLink: {
    color: '#2563eb',
    textDecoration: 'none',
    fontSize: '14px',
    fontWeight: 500,
  },
  footerText: {
    marginTop: '8px',
    fontSize: '13px',
    color: '#64748b',
  },
};
