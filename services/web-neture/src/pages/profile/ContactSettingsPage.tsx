/**
 * ContactSettingsPage - 외부 연락 설정 페이지
 *
 * Work Order: WO-NETURE-EXTERNAL-CONTACT-V1
 *
 * 사용자가 외부 연락 수단(카카오톡)을 선택적으로 등록할 수 있도록 합니다.
 * - contactEnabled: 외부 연락 허용 여부
 * - kakaoOpenChatUrl: 카카오 오픈채팅 URL
 * - kakaoChannelUrl: 카카오 채널 URL
 *
 * 금지:
 * - 플랫폼 내 메시징
 * - 전화번호/이메일 직접 노출
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts';
import {
  fetchUserContactSettings,
  updateUserContactSettings,
  type UserContactSettings,
} from '../../services/forumApi';

// ============================================================================
// Main Component
// ============================================================================

export function ContactSettingsPage() {
  const { isAuthenticated } = useAuth();

  const [settings, setSettings] = useState<UserContactSettings>({
    contactEnabled: false,
    kakaoOpenChatUrl: null,
    kakaoChannelUrl: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 로그인 가드
  if (!isAuthenticated) {
    return (
      <div style={styles.container}>
        <div style={styles.loginGuard}>
          <h2 style={styles.loginGuardTitle}>로그인이 필요합니다</h2>
          <p style={styles.loginGuardText}>
            연락 설정을 변경하려면 먼저 로그인해주세요.
          </p>
          <div style={styles.loginGuardActions}>
            <Link to="/login" style={styles.loginButton}>
              로그인
            </Link>
            <Link to="/" style={styles.backLink}>
              홈으로 돌아가기
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Load settings on mount
  useEffect(() => {
    async function loadSettings() {
      setIsLoading(true);
      setError(null);

      try {
        const data = await fetchUserContactSettings();
        if (data) {
          setSettings(data);
        }
      } catch (err) {
        console.error('Error loading contact settings:', err);
        setError('설정을 불러오지 못했습니다.');
      } finally {
        setIsLoading(false);
      }
    }

    loadSettings();
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await updateUserContactSettings(settings);

      if (result.success) {
        setSuccessMessage('설정이 저장되었습니다.');
        // Clear success message after 3 seconds
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setError(result.error || '설정 저장에 실패했습니다.');
      }
    } catch (err) {
      console.error('Error saving contact settings:', err);
      setError('네트워크 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  }

  function validateKakaoOpenChatUrl(url: string): boolean {
    if (!url) return true;
    return url.startsWith('https://open.kakao.com/');
  }

  function validateKakaoChannelUrl(url: string): boolean {
    if (!url) return true;
    return url.startsWith('https://pf.kakao.com/');
  }

  const hasValidUrls =
    validateKakaoOpenChatUrl(settings.kakaoOpenChatUrl || '') &&
    validateKakaoChannelUrl(settings.kakaoChannelUrl || '');

  return (
    <div style={styles.container}>
      {/* Breadcrumb */}
      <nav style={styles.breadcrumb}>
        <Link to="/" style={styles.breadcrumbLink}>홈</Link>
        <span style={styles.breadcrumbDivider}>/</span>
        <span style={styles.breadcrumbCurrent}>연락 설정</span>
      </nav>

      {/* Page Header */}
      <header style={styles.header}>
        <h1 style={styles.title}>외부 연락 설정</h1>
        <p style={styles.description}>
          포럼 글에 표시할 외부 연락 수단을 설정합니다.
        </p>
      </header>

      {/* Notice Banner */}
      <div style={styles.noticeBanner}>
        <p style={styles.noticeText}>
          네뚜레 플랫폼은 내부 메시징을 제공하지 않습니다.
          <br />
          연락을 원하시면, 외부 링크(카카오톡 오픈채팅)를 등록해주세요.
        </p>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div style={styles.loadingState}>
          <p>설정을 불러오는 중...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div style={styles.errorBanner}>
          <p style={styles.errorText}>{error}</p>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div style={styles.successBanner}>
          <p style={styles.successText}>{successMessage}</p>
        </div>
      )}

      {/* Settings Form */}
      {!isLoading && (
        <div style={styles.form}>
          {/* Enable Contact Toggle */}
          <div style={styles.toggleGroup}>
            <label style={styles.toggleLabel}>
              <input
                type="checkbox"
                checked={settings.contactEnabled}
                onChange={(e) => setSettings({
                  ...settings,
                  contactEnabled: e.target.checked,
                })}
                style={styles.checkbox}
                disabled={isSaving}
              />
              <span style={styles.toggleText}>외부 연락 허용</span>
            </label>
            <p style={styles.toggleHint}>
              이 설정을 활성화하면, 포럼 글 작성 시 연락 정보를 표시할 수 있습니다.
            </p>
          </div>

          {/* Kakao Open Chat URL */}
          <div style={styles.formGroup}>
            <label htmlFor="kakaoOpenChatUrl" style={styles.label}>
              카카오 오픈채팅 URL
            </label>
            <input
              id="kakaoOpenChatUrl"
              type="url"
              value={settings.kakaoOpenChatUrl || ''}
              onChange={(e) => setSettings({
                ...settings,
                kakaoOpenChatUrl: e.target.value || null,
              })}
              placeholder="https://open.kakao.com/o/..."
              style={{
                ...styles.input,
                ...(!validateKakaoOpenChatUrl(settings.kakaoOpenChatUrl || '') ? styles.inputError : {}),
              }}
              disabled={isSaving}
            />
            {!validateKakaoOpenChatUrl(settings.kakaoOpenChatUrl || '') && (
              <p style={styles.fieldError}>
                올바른 카카오 오픈채팅 URL을 입력해주세요.
              </p>
            )}
            <p style={styles.fieldHint}>
              1:1 대화용 오픈채팅방 링크를 입력하세요.
            </p>
          </div>

          {/* Kakao Channel URL */}
          <div style={styles.formGroup}>
            <label htmlFor="kakaoChannelUrl" style={styles.label}>
              카카오 채널 URL
            </label>
            <input
              id="kakaoChannelUrl"
              type="url"
              value={settings.kakaoChannelUrl || ''}
              onChange={(e) => setSettings({
                ...settings,
                kakaoChannelUrl: e.target.value || null,
              })}
              placeholder="https://pf.kakao.com/..."
              style={{
                ...styles.input,
                ...(!validateKakaoChannelUrl(settings.kakaoChannelUrl || '') ? styles.inputError : {}),
              }}
              disabled={isSaving}
            />
            {!validateKakaoChannelUrl(settings.kakaoChannelUrl || '') && (
              <p style={styles.fieldError}>
                올바른 카카오 채널 URL을 입력해주세요.
              </p>
            )}
            <p style={styles.fieldHint}>
              비즈니스용 카카오 채널 링크를 입력하세요. (선택)
            </p>
          </div>

          {/* Actions */}
          <div style={styles.actions}>
            <Link to="/" style={styles.cancelButton}>
              취소
            </Link>
            <button
              type="button"
              onClick={handleSave}
              style={{
                ...styles.saveButton,
                ...((isSaving || !hasValidUrls) ? styles.saveButtonDisabled : {}),
              }}
              disabled={isSaving || !hasValidUrls}
            >
              {isSaving ? '저장 중...' : '저장하기'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Styles
// ============================================================================

const PRIMARY_COLOR = '#2563EB';
const GRAY_100 = '#f1f5f9';
const GRAY_200 = '#e2e8f0';
const GRAY_400 = '#94a3b8';
const GRAY_500 = '#64748b';
const GRAY_600 = '#475569';
const GRAY_700 = '#334155';
const GRAY_900 = '#0f172a';
const RED_500 = '#ef4444';
const RED_50 = '#fef2f2';
const GREEN_500 = '#22c55e';
const GREEN_50 = '#f0fdf4';
const AMBER_50 = '#fffbeb';
const AMBER_700 = '#b45309';

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '40px 20px',
  },

  // Breadcrumb
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    marginBottom: '24px',
  },
  breadcrumbLink: {
    color: GRAY_500,
    textDecoration: 'none',
  },
  breadcrumbDivider: {
    color: GRAY_400,
  },
  breadcrumbCurrent: {
    color: GRAY_400,
  },

  // Header
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '28px',
    fontWeight: 700,
    color: GRAY_900,
    margin: '0 0 8px 0',
  },
  description: {
    fontSize: '15px',
    color: GRAY_500,
    margin: 0,
    lineHeight: 1.5,
  },

  // Notice Banner
  noticeBanner: {
    backgroundColor: AMBER_50,
    border: `1px solid ${AMBER_700}33`,
    borderRadius: '8px',
    padding: '16px 20px',
    marginBottom: '24px',
  },
  noticeText: {
    fontSize: '14px',
    color: AMBER_700,
    margin: 0,
    lineHeight: 1.6,
  },

  // Loading State
  loadingState: {
    padding: '40px 20px',
    textAlign: 'center',
    color: GRAY_500,
    fontSize: '15px',
  },

  // Error Banner
  errorBanner: {
    backgroundColor: RED_50,
    border: `1px solid ${RED_500}33`,
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  errorText: {
    fontSize: '14px',
    color: RED_500,
    margin: 0,
  },

  // Success Banner
  successBanner: {
    backgroundColor: GREEN_50,
    border: `1px solid ${GREEN_500}33`,
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '24px',
  },
  successText: {
    fontSize: '14px',
    color: GREEN_500,
    margin: 0,
  },

  // Form
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },

  // Toggle Group
  toggleGroup: {
    padding: '20px',
    backgroundColor: GRAY_100,
    borderRadius: '8px',
  },
  toggleLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    cursor: 'pointer',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
  toggleText: {
    fontSize: '15px',
    fontWeight: 600,
    color: GRAY_900,
  },
  toggleHint: {
    fontSize: '13px',
    color: GRAY_500,
    margin: '8px 0 0 30px',
    lineHeight: 1.5,
  },

  // Form Group
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 600,
    color: GRAY_700,
  },
  input: {
    padding: '12px 16px',
    fontSize: '15px',
    border: `1px solid ${GRAY_200}`,
    borderRadius: '8px',
    outline: 'none',
    transition: 'border-color 0.2s',
  },
  inputError: {
    borderColor: RED_500,
  },
  fieldHint: {
    fontSize: '13px',
    color: GRAY_400,
    margin: 0,
  },
  fieldError: {
    fontSize: '13px',
    color: RED_500,
    margin: 0,
  },

  // Actions
  actions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '16px',
    borderTop: `1px solid ${GRAY_100}`,
  },
  cancelButton: {
    display: 'inline-block',
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: GRAY_600,
    backgroundColor: 'transparent',
    border: `1px solid ${GRAY_200}`,
    borderRadius: '8px',
    textDecoration: 'none',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '12px 24px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: PRIMARY_COLOR,
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
  },
  saveButtonDisabled: {
    backgroundColor: GRAY_400,
    cursor: 'not-allowed',
  },

  // Login Guard
  loginGuard: {
    textAlign: 'center',
    padding: '80px 20px',
  },
  loginGuardTitle: {
    fontSize: '24px',
    fontWeight: 600,
    color: GRAY_900,
    margin: '0 0 12px 0',
  },
  loginGuardText: {
    fontSize: '15px',
    color: GRAY_500,
    margin: '0 0 32px 0',
  },
  loginGuardActions: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '16px',
  },
  loginButton: {
    display: 'inline-block',
    padding: '12px 32px',
    fontSize: '15px',
    fontWeight: 600,
    color: '#fff',
    backgroundColor: PRIMARY_COLOR,
    textDecoration: 'none',
    borderRadius: '8px',
  },
  backLink: {
    fontSize: '14px',
    color: GRAY_500,
    textDecoration: 'none',
  },
};

export default ContactSettingsPage;
