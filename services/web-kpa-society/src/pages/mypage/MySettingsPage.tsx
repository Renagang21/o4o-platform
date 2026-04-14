/**
 * MySettingsPage - 설정 페이지
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { PageHeader, LoadingSpinner, EmptyState, Card, MyPageNavigation } from '../../components/common';
import { mypageApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { UserSettings } from '../../api/mypage';

export function MySettingsPage() {
  const { user, logoutAll } = useAuth();
  const navigate = useNavigate();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await mypageApi.getSettings();
      setSettings(res.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (key: keyof UserSettings) => {
    if (!settings) return;

    try {
      setSaving(true);
      const newValue = !settings[key];
      await mypageApi.updateSettings({ [key]: newValue });
      setSettings({ ...settings, [key]: newValue });
    } catch (err) {
      toast.error('설정 변경에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoutAll = async () => {
    const confirmed = window.confirm(
      '모든 기기에서 로그아웃됩니다.\n현재 기기도 로그아웃됩니다.\n\n계속하시겠습니까?'
    );
    if (!confirmed) return;

    try {
      await logoutAll();
      navigate('/');
    } catch (err) {
      toast.error('로그아웃에 실패했습니다. 다시 시도해주세요.');
    }
  };

  const handleWithdrawRequest = async () => {
    if (!withdrawReason.trim()) {
      toast.error('탈퇴 사유를 입력해주세요.');
      return;
    }

    try {
      setIsSubmitting(true);
      // TODO: 실제 API 연동 시 mypageApi.requestWithdraw() 호출
      // await mypageApi.requestWithdraw({ reason: withdrawReason });

      // 현재는 알림만 표시
      toast.success('탈퇴 요청이 접수되었습니다. 운영자 검토 후 처리됩니다. 처리 결과는 등록된 이메일로 안내됩니다.');
      setShowWithdrawModal(false);
      setWithdrawReason('');
    } catch (err) {
      toast.error('탈퇴 요청에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="설정을 변경하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="설정을 불러오는 중..." />;
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
        title="설정"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '마이페이지', href: `/mypage` },
          { label: '설정' },
        ]}
      />
      <MyPageNavigation />

      {/* 알림 설정 */}
      <Card padding="large" style={{ marginBottom: '24px' }}>
        <h3 style={styles.sectionTitle}>알림 설정</h3>

        <div style={styles.settingItem}>
          <div style={styles.settingInfo}>
            <span style={styles.settingLabel}>이메일 알림</span>
            <span style={styles.settingDesc}>공지사항, 교육 안내 등을 이메일로 받습니다.</span>
          </div>
          <button
            style={{
              ...styles.toggle,
              ...(settings?.emailNotifications ? styles.toggleOn : styles.toggleOff),
            }}
            onClick={() => handleToggle('emailNotifications')}
            disabled={saving}
          >
            <span style={styles.toggleHandle} />
          </button>
        </div>

        <div style={styles.settingItem}>
          <div style={styles.settingInfo}>
            <span style={styles.settingLabel}>SMS 알림</span>
            <span style={styles.settingDesc}>중요 공지를 SMS로 받습니다.</span>
          </div>
          <button
            style={{
              ...styles.toggle,
              ...(settings?.smsNotifications ? styles.toggleOn : styles.toggleOff),
            }}
            onClick={() => handleToggle('smsNotifications')}
            disabled={saving}
          >
            <span style={styles.toggleHandle} />
          </button>
        </div>

        <div style={styles.settingItem}>
          <div style={styles.settingInfo}>
            <span style={styles.settingLabel}>마케팅 수신 동의</span>
            <span style={styles.settingDesc}>이벤트, 프로모션 정보를 받습니다.</span>
          </div>
          <button
            style={{
              ...styles.toggle,
              ...(settings?.marketingConsent ? styles.toggleOn : styles.toggleOff),
            }}
            onClick={() => handleToggle('marketingConsent')}
            disabled={saving}
          >
            <span style={styles.toggleHandle} />
          </button>
        </div>
      </Card>

      {/* 계정 관리 */}
      <Card padding="large">
        <h3 style={styles.sectionTitle}>계정 관리</h3>

        <div style={styles.dangerZone}>
          <button
            style={styles.dangerButton}
            onClick={handleLogoutAll}
          >
            모든 기기에서 로그아웃
          </button>
          <button
            style={styles.dangerButton}
            onClick={() => setShowWithdrawModal(true)}
          >
            계정 탈퇴
          </button>
        </div>
      </Card>

      {/* 탈퇴 요청 모달 */}
      {showWithdrawModal && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={styles.modalTitle}>계정 탈퇴 요청</h3>
            <p style={styles.modalDesc}>
              탈퇴 요청은 운영자 검토 후 처리됩니다.<br />
              지부/분회 탈퇴는 관리자 승인이 필요합니다.
            </p>
            <div style={styles.field}>
              <label style={styles.label}>탈퇴 사유</label>
              <textarea
                style={styles.textarea}
                value={withdrawReason}
                onChange={e => setWithdrawReason(e.target.value)}
                placeholder="탈퇴 사유를 입력해주세요"
                rows={4}
              />
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.cancelButton}
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawReason('');
                }}
                disabled={isSubmitting}
              >
                취소
              </button>
              <button
                style={styles.submitButton}
                onClick={handleWithdrawRequest}
                disabled={isSubmitting}
              >
                {isSubmitting ? '요청 중...' : '탈퇴 요청'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '20px',
  },
  settingItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  settingInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  settingLabel: {
    ...typography.bodyM,
    color: colors.neutral800,
    fontWeight: 500,
  },
  settingDesc: {
    ...typography.bodyS,
    color: colors.neutral500,
  },
  toggle: {
    width: '52px',
    height: '28px',
    borderRadius: '14px',
    border: 'none',
    cursor: 'pointer',
    position: 'relative',
    transition: 'background-color 0.2s',
    padding: 0,
  },
  toggleOn: {
    backgroundColor: colors.accentGreen,
  },
  toggleOff: {
    backgroundColor: colors.neutral300,
  },
  toggleHandle: {
    position: 'absolute',
    width: '24px',
    height: '24px',
    borderRadius: '50%',
    backgroundColor: colors.white,
    top: '2px',
    left: '2px',
    transition: 'transform 0.2s',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
  },
  dangerZone: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  dangerButton: {
    padding: '12px 20px',
    backgroundColor: colors.white,
    color: colors.accentRed,
    border: `1px solid ${colors.accentRed}`,
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
    textAlign: 'left',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    width: '90%',
    maxWidth: '400px',
    boxShadow: '0 4px 20px rgba(0, 0, 0, 0.15)',
  },
  modalTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '8px',
  },
  modalDesc: {
    ...typography.bodyM,
    color: colors.neutral600,
    marginBottom: '20px',
    lineHeight: '1.5',
  },
  field: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    marginBottom: '8px',
    fontWeight: 500,
    color: colors.neutral700,
    fontSize: '14px',
  },
  textarea: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  modalActions: {
    display: 'flex',
    gap: '12px',
    justifyContent: 'flex-end',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: colors.accentRed,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
