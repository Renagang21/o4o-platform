/**
 * LoginModal - K-Cosmetics 로그인 모달
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 * WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1:
 *   로그인 수단은 "Google 로 계속하기" 하나다. 이메일/비밀번호 입력 · 이메일 저장 ·
 *   비밀번호 찾기 · 별도 회원가입 화면은 은퇴했다(미등록 Google 계정은 같은 버튼에서 약관 동의 → 가입).
 */

import { useState } from 'react';
import { Sparkles, X, AlertCircle } from 'lucide-react';
import { GoogleContinue } from '@o4o/auth-react';
import { useAuth, type User } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

export default function LoginModal() {
  const { loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const { isLoginModalOpen, closeLoginModal, onLoginSuccess } = useLoginModal();

  const [error, setError] = useState('');

  if (!isLoginModalOpen) return null;

  const finishLogin = () => {
    closeLoginModal();
    // WO-O4O-POSTLOGINREDIRECT-CANONICALIZATION-V1: 역할 기반 redirect는 App.tsx PostLoginRedirect 담당.
    onLoginSuccess?.();
  };

  const handleClose = () => {
    setError('');
    closeLoginModal();
  };

  return (
    <div style={styles.overlay} onClick={handleClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerContent}>
            <div style={styles.logoIcon}>
              <Sparkles size={20} color="#fff" aria-hidden="true" />
            </div>
            <div>
              <h2 style={styles.title}>로그인</h2>
              <p style={styles.subtitle}>K-Cosmetics</p>
            </div>
          </div>
          <button onClick={handleClose} style={styles.closeButton} aria-label="닫기">
            <X size={18} color="#64748b" aria-hidden="true" />
          </button>
        </div>

        {error && (
          <div style={{ ...styles.error, marginBottom: 16 }}>
            <AlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} aria-hidden="true" />
            {error}
          </div>
        )}

        {/* WO-O4O-LEGACY-PASSWORD-AUTH-RETIREMENT-V1: 로그인 진입은 이 버튼 하나다. */}
        <GoogleContinue<User>
          getConfig={getGoogleAuthConfig}
          loginWithGoogle={loginWithGoogle}
          signupWithGoogle={signupWithGoogle}
          onSuccess={() => { setError(''); finishLogin(); }}
          onStart={() => setError('')}
          onError={(e) => setError(e.message)}
          termsHref="/terms"
          privacyHref="/privacy"
        />

        <div style={styles.footer}>
          <span style={styles.footerNote}>처음이신가요? 같은 버튼으로 약관 동의 후 계정이 만들어집니다.</span>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 9999,
    padding: '16px',
  },
  modal: {
    backgroundColor: '#fff',
    borderRadius: '16px',
    maxWidth: '400px',
    width: '100%',
    padding: '32px',
    boxShadow: '0 20px 60px rgba(0, 0, 0, 0.2)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '24px',
  },
  headerContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  logoIcon: {
    width: '40px',
    height: '40px',
    borderRadius: '12px',
    background: 'linear-gradient(135deg, #e91e63, #c2185b)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '20px',
  },
  title: {
    fontSize: '20px',
    fontWeight: 700,
    color: '#1e293b',
    margin: 0,
  },
  subtitle: {
    fontSize: '12px',
    color: '#64748b',
    margin: 0,
  },
  closeButton: {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    border: 'none',
    background: '#f1f5f9',
    cursor: 'pointer',
    fontSize: '16px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  error: {
    display: 'flex',
    alignItems: 'center',
    padding: '12px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '12px',
    color: '#dc2626',
    fontSize: '14px',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerNote: {
    fontSize: '13px',
    color: '#64748b',
    textAlign: 'center',
  },
};
