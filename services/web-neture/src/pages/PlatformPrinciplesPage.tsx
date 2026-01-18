/**
 * PlatformPrinciplesPage - 플랫폼 운영 원칙 안내 페이지
 *
 * "Neture는 왜 자격을 검증하지 않습니까?" 등
 * 플랫폼의 설계 원칙과 역할에 대한 설명을 제공합니다.
 *
 * WO-NETURE-PHARMA-LEGAL-JUDGMENT-INVESTIGATION-V1 결과 반영
 *
 * 대상: 공급자, 약국, 파트너 등 외부 사용자
 */

import { Link } from 'react-router-dom';
import { Shield, Scale, Users, ArrowRight, Building, Truck, FileCheck } from 'lucide-react';

export function PlatformPrinciplesPage() {
  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <header style={styles.header}>
        <h1 style={styles.title}>플랫폼 운영 원칙</h1>
        <p style={styles.subtitle}>
          Neture가 어떤 역할을 하고, 어떤 역할을 하지 않는지 안내합니다.
        </p>
      </header>

      {/* 핵심 질문 */}
      <section style={styles.questionSection}>
        <div style={styles.questionIcon}>
          <Shield size={32} color="#2563EB" />
        </div>
        <h2 style={styles.questionTitle}>
          왜 Neture는 약국·도매상 자격을 직접 검증하지 않나요?
        </h2>
        <p style={styles.questionAnswer}>
          Neture는 의약품 유통에 참여하는 플랫폼이지만,
          <br />
          <strong>약국이나 도매상의 자격을 직접 승인하거나 판단하지 않습니다.</strong>
        </p>
      </section>

      {/* 이유 1: 행정청 권한 */}
      <section style={styles.reasonSection}>
        <div style={styles.reasonHeader}>
          <div style={styles.reasonNumber}>1</div>
          <h3 style={styles.reasonTitle}>자격 판단은 행정청의 권한입니다</h3>
        </div>
        <div style={styles.reasonContent}>
          <div style={styles.reasonIcon}>
            <Building size={48} color="#0369a1" />
          </div>
          <div style={styles.reasonText}>
            <p>
              약국 개설, 의약품 도매상 허가는 모두{' '}
              <strong>시장·군수·구청장 등 행정청의 고유 권한</strong>입니다.
            </p>
            <p>
              Neture는 민간 플랫폼으로서 이 자격을{' '}
              <strong>부여하거나 박탈할 수 없습니다.</strong>
            </p>
          </div>
        </div>
        <div style={styles.lawReference}>
          <Scale size={16} color="#64748b" />
          <span>약사법 제20조 (약국 개설등록), 약사법 제45조 (의약품 도매상 허가)</span>
        </div>
      </section>

      {/* 이유 2: 책임 확대 */}
      <section style={styles.reasonSection}>
        <div style={styles.reasonHeader}>
          <div style={styles.reasonNumber}>2</div>
          <h3 style={styles.reasonTitle}>검증을 하면 책임이 함께 따라옵니다</h3>
        </div>
        <div style={styles.reasonContent}>
          <div style={styles.reasonIcon}>
            <FileCheck size={48} color="#dc2626" />
          </div>
          <div style={styles.reasonText}>
            <p>
              플랫폼이 자격을 직접 검증하고 그 결과를 바탕으로 거래를 허용할 경우:
            </p>
            <ul style={styles.reasonList}>
              <li>검증 오류 발생 시</li>
              <li>무자격 거래 발생 시</li>
              <li>분쟁 발생 시</li>
            </ul>
            <p>
              플랫폼이 <strong>직접적인 책임 주체</strong>가 될 수 있습니다.
            </p>
            <p style={styles.reasonHighlight}>
              Neture는 이러한 구조를 만들지 않기로 결정했습니다.
            </p>
          </div>
        </div>
      </section>

      {/* 이유 3: 대신 제공하는 것 */}
      <section style={styles.reasonSection}>
        <div style={styles.reasonHeader}>
          <div style={styles.reasonNumber}>3</div>
          <h3 style={styles.reasonTitle}>대신, 더 명확한 환경을 제공합니다</h3>
        </div>
        <div style={styles.reasonContent}>
          <div style={styles.reasonIcon}>
            <Users size={48} color="#059669" />
          </div>
          <div style={styles.reasonText}>
            <p>Neture는 다음을 제공합니다:</p>
            <ul style={styles.provideList}>
              <li>
                <ArrowRight size={16} color="#059669" />
                <span>이 상품이 <strong>어떤 서비스에서 유통되는지</strong></span>
              </li>
              <li>
                <ArrowRight size={16} color="#059669" />
                <span>해당 서비스에서 <strong>어떤 자격이 필요한지</strong></span>
              </li>
              <li>
                <ArrowRight size={16} color="#059669" />
                <span>현재 상태에서 <strong>무엇을 해야 하는지</strong></span>
              </li>
              <li>
                <ArrowRight size={16} color="#059669" />
                <span>실제 신청·승인·주문이 이루어지는 <strong>정확한 위치</strong></span>
              </li>
            </ul>
          </div>
        </div>
        <div style={styles.principleBox}>
          <p style={styles.principleText}>
            <strong>판단</strong>은 행정청과 서비스가,
            <br />
            <strong>이해와 선택</strong>은 사용자가 하도록 돕는 역할을 합니다.
          </p>
        </div>
      </section>

      {/* 이유 4: 실제 처리 위치 */}
      <section style={styles.reasonSection}>
        <div style={styles.reasonHeader}>
          <div style={styles.reasonNumber}>4</div>
          <h3 style={styles.reasonTitle}>실제 신청·승인·구매는 어디에서 하나요?</h3>
        </div>
        <div style={styles.reasonContent}>
          <div style={styles.reasonIcon}>
            <Truck size={48} color="#7c3aed" />
          </div>
          <div style={styles.reasonText}>
            <p>
              의약품 관련 행위는 모두 <strong>전용 서비스 내부</strong>에서 이루어집니다.
            </p>
          </div>
        </div>
        <div style={styles.serviceTable}>
          <div style={styles.serviceRow}>
            <span style={styles.serviceAction}>약국 신청 및 승인</span>
            <span style={styles.serviceArrow}>→</span>
            <span style={styles.serviceTarget}>GlycoPharm 서비스</span>
          </div>
          <div style={styles.serviceRow}>
            <span style={styles.serviceAction}>의약품 주문</span>
            <span style={styles.serviceArrow}>→</span>
            <span style={styles.serviceTarget}>GlycoPharm / E-commerce 시스템</span>
          </div>
          <div style={styles.serviceRow}>
            <span style={styles.serviceAction}>유통 조건 판단</span>
            <span style={styles.serviceArrow}>→</span>
            <span style={styles.serviceTarget}>공급자와 해당 서비스</span>
          </div>
        </div>
        <p style={styles.serviceNote}>
          Neture는 이 과정을 <strong>한눈에 보이게 연결</strong>할 뿐입니다.
        </p>
      </section>

      {/* 요약 */}
      <section style={styles.summarySection}>
        <h3 style={styles.summaryTitle}>한 줄 요약</h3>
        <p style={styles.summaryText}>
          Neture는 판단하지 않기 때문에
          <br />
          오히려 <strong>더 안전하고 중립적인 플랫폼</strong>으로 유지됩니다.
        </p>
      </section>

      {/* 현재 상태 */}
      <section style={styles.statusSection}>
        <h3 style={styles.statusTitle}>현재 상태 요약</h3>
        <div style={styles.statusGrid}>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>자격 검증</span>
            <span style={styles.statusValueNo}>하지 않음 (선택)</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>자격 판단</span>
            <span style={styles.statusValueNo}>하지 않음 (원칙)</span>
          </div>
          <div style={styles.statusItem}>
            <span style={styles.statusLabel}>정보 제공 및 연결</span>
            <span style={styles.statusValueYes}>집중</span>
          </div>
        </div>
      </section>

      {/* 관련 링크 */}
      <section style={styles.relatedSection}>
        <h3 style={styles.relatedTitle}>관련 안내</h3>
        <div style={styles.relatedLinks}>
          <Link to="/partner-info" style={styles.relatedLink}>
            참여 안내 →
          </Link>
          <Link to="/channel/structure" style={styles.relatedLink}>
            채널·판매 구조 →
          </Link>
          <Link to="/o4o" style={styles.relatedLink}>
            o4o 플랫폼 소개 →
          </Link>
        </div>
      </section>

      {/* 푸터 */}
      <footer style={styles.footer}>
        <Link to="/" style={styles.backLink}>
          ← 홈으로 돌아가기
        </Link>
      </footer>
    </div>
  );
}

const PRIMARY_COLOR = '#2563EB';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    padding: '48px 24px',
  },
  header: {
    textAlign: 'center',
    marginBottom: '48px',
  },
  title: {
    fontSize: '32px',
    fontWeight: 700,
    color: '#1a1a1a',
    marginBottom: '12px',
  },
  subtitle: {
    fontSize: '16px',
    color: '#64748b',
  },
  questionSection: {
    backgroundColor: '#f0f9ff',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    marginBottom: '32px',
  },
  questionIcon: {
    marginBottom: '16px',
  },
  questionTitle: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#0c4a6e',
    marginBottom: '16px',
    lineHeight: 1.4,
  },
  questionAnswer: {
    fontSize: '16px',
    color: '#334155',
    lineHeight: 1.7,
  },
  reasonSection: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '28px',
    marginBottom: '24px',
    boxShadow: '0 2px 12px rgba(0, 0, 0, 0.06)',
    border: '1px solid #f0f0f0',
  },
  reasonHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '20px',
  },
  reasonNumber: {
    width: '32px',
    height: '32px',
    borderRadius: '50%',
    backgroundColor: PRIMARY_COLOR,
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '16px',
    fontWeight: 600,
    flexShrink: 0,
  },
  reasonTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: '#1a1a1a',
    margin: 0,
  },
  reasonContent: {
    display: 'flex',
    gap: '24px',
    alignItems: 'flex-start',
  },
  reasonIcon: {
    flexShrink: 0,
    padding: '12px',
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
  },
  reasonText: {
    flex: 1,
    fontSize: '15px',
    color: '#475569',
    lineHeight: 1.7,
  },
  reasonList: {
    margin: '12px 0',
    paddingLeft: '20px',
  },
  reasonHighlight: {
    color: '#0369a1',
    fontWeight: 500,
    marginTop: '12px',
  },
  lawReference: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    fontSize: '13px',
    color: '#64748b',
  },
  provideList: {
    listStyle: 'none',
    padding: 0,
    margin: '12px 0 0 0',
  },
  principleBox: {
    backgroundColor: '#ecfdf5',
    borderRadius: '12px',
    padding: '20px',
    marginTop: '20px',
    textAlign: 'center',
  },
  principleText: {
    fontSize: '15px',
    color: '#065f46',
    lineHeight: 1.7,
    margin: 0,
  },
  serviceTable: {
    marginTop: '16px',
  },
  serviceRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    marginBottom: '8px',
  },
  serviceAction: {
    fontSize: '14px',
    color: '#475569',
    minWidth: '140px',
  },
  serviceArrow: {
    color: '#94a3b8',
  },
  serviceTarget: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#7c3aed',
  },
  serviceNote: {
    fontSize: '14px',
    color: '#64748b',
    textAlign: 'center',
    marginTop: '16px',
  },
  summarySection: {
    backgroundColor: '#0f172a',
    borderRadius: '16px',
    padding: '32px',
    textAlign: 'center',
    marginBottom: '32px',
  },
  summaryTitle: {
    fontSize: '16px',
    fontWeight: 500,
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '12px',
  },
  summaryText: {
    fontSize: '20px',
    fontWeight: 600,
    color: '#fff',
    lineHeight: 1.6,
    margin: 0,
  },
  statusSection: {
    backgroundColor: '#f8fafc',
    borderRadius: '16px',
    padding: '28px',
    marginBottom: '32px',
  },
  statusTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '20px',
    textAlign: 'center',
  },
  statusGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
    gap: '16px',
  },
  statusItem: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '16px',
    backgroundColor: '#fff',
    borderRadius: '12px',
  },
  statusLabel: {
    fontSize: '13px',
    color: '#64748b',
  },
  statusValueNo: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#dc2626',
  },
  statusValueYes: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#059669',
  },
  relatedSection: {
    textAlign: 'center',
    marginBottom: '32px',
  },
  relatedTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#1a1a1a',
    marginBottom: '16px',
  },
  relatedLinks: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  relatedLink: {
    padding: '12px 20px',
    backgroundColor: '#fff',
    color: PRIMARY_COLOR,
    fontSize: '14px',
    fontWeight: 500,
    borderRadius: '8px',
    textDecoration: 'none',
    border: `1px solid ${PRIMARY_COLOR}`,
  },
  footer: {
    textAlign: 'center',
    paddingTop: '24px',
    borderTop: '1px solid #e5e7eb',
  },
  backLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
  },
};

export default PlatformPrinciplesPage;
