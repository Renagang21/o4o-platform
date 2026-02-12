/**
 * RegisterPendingPage - 가입 신청 완료 / 승인 대기 안내
 */

import { Link } from 'react-router-dom';
import { Clock, CheckCircle, Mail } from 'lucide-react';

export default function RegisterPendingPage() {
  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <div style={styles.iconWrapper}>
          <Clock style={styles.icon} />
        </div>

        <h1 style={styles.title}>가입 신청이 완료되었습니다</h1>
        <p style={styles.subtitle}>
          운영자 검토 후 승인이 완료되면 서비스 이용이 가능합니다.
        </p>

        <div style={styles.infoBox}>
          <h3 style={styles.infoTitle}>승인 절차 안내</h3>
          <ul style={styles.infoList}>
            <li style={styles.infoItem}>
              <CheckCircle style={styles.checkIcon} />
              <span>가입 신청서가 접수되었습니다</span>
            </li>
            <li style={styles.infoItem}>
              <Clock style={styles.pendingIcon} />
              <span>운영자가 자격을 확인합니다</span>
            </li>
            <li style={styles.infoItem}>
              <Mail style={styles.pendingIcon} />
              <span>승인 완료 시 이메일로 안내드립니다</span>
            </li>
          </ul>
        </div>

        <div style={styles.actions}>
          <Link to="/" style={styles.homeButton}>
            홈으로 돌아가기
          </Link>
          <Link to="/login" style={styles.loginButton}>
            로그인 페이지
          </Link>
        </div>

        <p style={styles.helpText}>
          일반적으로 1~2 영업일 내에 처리됩니다.
        </p>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px 24px',
    backgroundColor: '#f8fafc',
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    padding: '48px',
    width: '100%',
    maxWidth: '480px',
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.08)',
    textAlign: 'center',
  },
  iconWrapper: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#eff6ff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    margin: '0 auto 24px',
  },
  icon: {
    width: '40px',
    height: '40px',
    color: '#2563eb',
  },
  title: {
    fontSize: '24px',
    fontWeight: 700,
    color: '#1e293b',
    margin: '0 0 12px 0',
  },
  subtitle: {
    fontSize: '15px',
    color: '#64748b',
    margin: '0 0 32px 0',
    lineHeight: 1.6,
  },
  infoBox: {
    backgroundColor: '#f8fafc',
    borderRadius: '12px',
    padding: '20px',
    marginBottom: '24px',
    textAlign: 'left',
  },
  infoTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 16px 0',
  },
  infoList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  infoItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    fontSize: '14px',
    color: '#475569',
  },
  checkIcon: {
    width: '20px',
    height: '20px',
    color: '#16a34a',
    flexShrink: 0,
  },
  pendingIcon: {
    width: '20px',
    height: '20px',
    color: '#94a3b8',
    flexShrink: 0,
  },
  actions: {
    display: 'flex',
    gap: '12px',
    marginBottom: '24px',
  },
  homeButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    textAlign: 'center',
  },
  loginButton: {
    flex: 1,
    padding: '12px 24px',
    backgroundColor: '#fff',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    textDecoration: 'none',
    textAlign: 'center',
  },
  helpText: {
    fontSize: '13px',
    color: '#94a3b8',
    margin: 0,
  },
};
