/**
 * LoginModal - K-Cosmetics 로그인 모달
 * WO-O4O-AUTH-MODAL-LOGIN-AND-ACCOUNT-STANDARD-V1
 * WO-O4O-LOGIN-STANDARDIZATION-V1: 전체 서비스 로그인 표준화
 * WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google 로 계속하기 = 기본 진입 · email/password = 임시 테스트/전환용
 *
 * 중앙화된 로그인 모달 컴포넌트
 * - 이메일/비밀번호 로그인
 * - 로그인 성공 시 현재 페이지 유지
 * - 비밀번호 찾기/회원가입 링크 제공
 *
 * 표준 기능:
 * - 이메일/비밀번호 입력
 * - 비밀번호 보기/숨기기 토글
 * - 이메일 저장 (Remember Me)
 * - 비밀번호 찾기 링크
 * - 회원가입 링크
 */

import { useState, useEffect, FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, X, AlertCircle, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { GoogleContinue } from '@o4o/auth-react';
import { useAuth, type User } from '@/contexts/AuthContext';
import { useLoginModal } from '@/contexts/LoginModalContext';

const REMEMBER_EMAIL_KEY = 'kcosmetics_remember_email';

export default function LoginModal() {
  const { login, loginWithGoogle, signupWithGoogle, getGoogleAuthConfig } = useAuth();
  const { isLoginModalOpen, closeLoginModal, onLoginSuccess } = useLoginModal();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberEmail, setRememberEmail] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 저장된 이메일 불러오기
  useEffect(() => {
    const savedEmail = localStorage.getItem(REMEMBER_EMAIL_KEY);
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberEmail(true);
    }
  }, []);

  if (!isLoginModalOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const result = await login(email, password);

      if (!result.success) {
        setError(result.error || '이메일 또는 비밀번호가 올바르지 않습니다.');
        return;
      }

      // 이메일 저장 처리
      if (rememberEmail) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email);
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }

      finishLogin();
    } catch (err: any) {
      setError(err.message || '이메일 또는 비밀번호가 올바르지 않습니다.');
    } finally {
      setIsSubmitting(false);
    }
  };

  /** 로그인 성공 공통 후처리(password · Google 동일). */
  const finishLogin = () => {
    setEmail('');
    setPassword('');
    closeLoginModal();
    // WO-O4O-POSTLOGINREDIRECT-CANONICALIZATION-V1: 역할 기반 redirect는 App.tsx PostLoginRedirect 담당.
    onLoginSuccess?.();
  };

  const handleClose = () => {
    setEmail('');
    setPassword('');
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

        {/* WO-O4O-GOOGLE-ONLY-SIGNUP-LOGIN-V1: Google 로 계속하기(기본) — 미등록이면 약관 동의 → 계정 생성 */}
        <div style={{ marginBottom: 20 }}>
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
        </div>
        <div style={styles.divider}>
          <span style={styles.dividerLine} />
          <span style={styles.dividerText}>임시 테스트 · 전환용 이메일 로그인</span>
          <span style={styles.dividerLine} />
        </div>

        {/* Form (legacy email/password — 임시 유지) */}
        <form onSubmit={handleSubmit} style={styles.form}>
          {error && (
            <div style={styles.error}>
              <AlertCircle size={16} style={{ marginRight: '8px', flexShrink: 0 }} aria-hidden="true" />
              {error}
            </div>
          )}

          <div style={styles.formGroup}>
            <label style={styles.label}>이메일</label>
            <div style={styles.inputWrapper}>
              <Mail size={18} style={styles.inputIcon} aria-hidden="true" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={styles.input}
                placeholder="example@email.com"
                autoComplete="email"
                required
                autoFocus
              />
            </div>
          </div>

          <div style={styles.formGroup}>
            <label style={styles.label}>비밀번호</label>
            <div style={styles.inputWrapper}>
              <Lock size={18} style={styles.inputIcon} aria-hidden="true" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={styles.input}
                placeholder="비밀번호를 입력하세요"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={styles.togglePassword}
                aria-label={showPassword ? '비밀번호 숨기기' : '비밀번호 보기'}
              >
                {showPassword ? (
                  <EyeOff size={18} color="#94a3b8" aria-hidden="true" />
                ) : (
                  <Eye size={18} color="#94a3b8" aria-hidden="true" />
                )}
              </button>
            </div>
          </div>

          {/* 이메일 저장 체크박스 */}
          <div style={styles.checkboxWrapper}>
            <input
              type="checkbox"
              id="rememberEmail"
              checked={rememberEmail}
              onChange={(e) => setRememberEmail(e.target.checked)}
              style={styles.checkbox}
            />
            <label htmlFor="rememberEmail" style={styles.checkboxLabel}>
              이메일 저장
            </label>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              ...styles.submitButton,
              ...(isSubmitting ? styles.submitButtonDisabled : {}),
            }}
          >
            {isSubmitting ? (
              <>
                <span style={styles.spinner}></span>
                로그인 중...
              </>
            ) : (
              '이메일로 로그인 (임시)'
            )}
          </button>
        </form>

        {/* Footer Links */}
        <div style={styles.footer}>
          <Link
            to="/forgot-password"
            style={styles.footerLink}
            onClick={handleClose}
          >
            비밀번호 찾기
          </Link>
          <span style={styles.footerDivider}>|</span>
          <Link
            to="/register"
            style={styles.footerLinkPrimary}
            onClick={handleClose}
          >
            회원가입
          </Link>
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
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  divider: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  dividerLine: {
    flex: 1,
    height: '1px',
    backgroundColor: '#e2e8f0',
  },
  dividerText: {
    fontSize: '12px',
    color: '#94a3b8',
    whiteSpace: 'nowrap',
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
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: '#374151',
  },
  inputWrapper: {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
  },
  inputIcon: {
    position: 'absolute',
    left: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    color: '#94a3b8',
  },
  input: {
    width: '100%',
    padding: '12px 40px',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    fontSize: '16px',
    outline: 'none',
    transition: 'border-color 0.2s, box-shadow 0.2s',
  },
  togglePassword: {
    position: 'absolute',
    right: '12px',
    top: '50%',
    transform: 'translateY(-50%)',
    display: 'flex',
    alignItems: 'center',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '4px',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: '#e91e63',
    color: '#fff',
    fontWeight: 600,
    fontSize: '16px',
    border: 'none',
    borderRadius: '12px',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    boxShadow: '0 4px 12px rgba(233, 30, 99, 0.25)',
    transition: 'background-color 0.2s',
  },
  submitButtonDisabled: {
    backgroundColor: '#94a3b8',
    cursor: 'not-allowed',
    boxShadow: 'none',
  },
  spinner: {
    display: 'inline-block',
    width: '16px',
    height: '16px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '50%',
    borderTopColor: '#fff',
    animation: 'spin 0.8s linear infinite',
  },
  checkboxWrapper: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  checkbox: {
    width: '16px',
    height: '16px',
    accentColor: '#e91e63',
    cursor: 'pointer',
  },
  checkboxLabel: {
    fontSize: '14px',
    color: '#64748b',
    cursor: 'pointer',
  },
  footer: {
    marginTop: '24px',
    paddingTop: '24px',
    borderTop: '1px solid #e2e8f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '16px',
  },
  footerLink: {
    fontSize: '14px',
    color: '#64748b',
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
  footerDivider: {
    color: '#cbd5e1',
  },
  footerLinkPrimary: {
    fontSize: '14px',
    color: '#e91e63',
    fontWeight: 500,
    textDecoration: 'none',
    transition: 'color 0.2s',
  },
};
