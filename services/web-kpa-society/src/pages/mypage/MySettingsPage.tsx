/**
 * MySettingsPage - 설정 페이지
 *
 * WO-O4O-MYPAGE-TIER1-DEAD-STUB-CLEANUP-V1:
 *   `계정 탈퇴` mock action 제거. mypageApi.requestWithdraw() 미구현 상태에서
 *   사용자에게 "탈퇴 요청 접수됨" 으로 성공 표시하는 위험 mock 이었음.
 *   백엔드 API 도입 시 재추가 (별도 WO).
 *
 * WO-O4O-CROSS-SERVICE-MYPAGE-SETTINGS-SECURITY-COMMONIZATION-V1:
 *   `모든 기기 로그아웃` 로컬 복제 + `/mypage/profile` 에 흩어져 있던 비밀번호 변경 진입을
 *   공통 `AccountSecuritySettings` 로 수렴한다. GlycoPharm / K-Cosmetics / Neture 와 같은
 *   계약(설정 = 보안·계정 관리)으로 정렬한다. 알림 수신 설정은 KPA 고유 확장으로 잔존한다.
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { Card } from '../../components/common';
import { MyPageLayout } from '../../layouts/MyPageLayout';
import { MyPageLoadingState, MyPageEmptyState, AccountSecuritySettings } from '@o4o/account-ui';
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

  if (!user) {
    return (
      /* WO-O4O-CROSS-SERVICE-MYPAGE-SHELL-LAYOUT-COMMONIZATION-V1:
         상태 화면도 Shell 안에서 렌더한다 (헤더·네비게이션 유실 금지). */
      <MyPageLayout title="설정">
        <MyPageEmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="설정을 변경하려면 로그인해주세요."
        />
      </MyPageLayout>
    );
  }

  if (loading) {
    return (
      <MyPageLayout title="설정">
        <MyPageLoadingState message="설정을 불러오는 중..." />
      </MyPageLayout>
    );
  }

  if (error) {
    return (
      <MyPageLayout title="설정">
        <MyPageEmptyState
          icon="⚠️"
          title="오류가 발생했습니다"
          description={error}
          actionLabel="다시 시도"
          onAction={loadData}
        />
      </MyPageLayout>
    );
  }

  return (
    <MyPageLayout
      title="설정"
      breadcrumb={[
        { label: '홈', href: '/' },
        { label: '마이페이지', href: `/mypage` },
        { label: '설정' },
      ]}
      width="form"
    >
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

      {/* 보안 설정 / 계정 관리 — 공통 계층
          WO-O4O-CROSS-SERVICE-MYPAGE-SETTINGS-SECURITY-COMMONIZATION-V1
          ⚠️ 비밀번호 값은 공통 모달 밖으로 나가지 않는다 (이 화면에 저장·로깅하지 않는다).
          WO-O4O-MYPAGE-TIER1-DEAD-STUB-CLEANUP-V1 의 `계정 탈퇴` 제거는 유지한다
          (mypageApi.requestWithdraw() backend 미구현). */}
      <AccountSecuritySettings
        securityDescription="KPA 로그인 비밀번호"
        notify={{ success: toast.success, error: toast.error }}
        onLogoutAll={logoutAll}
        logoutAllIncludesCurrentDevice
        onAfterLogoutAll={() => navigate('/')}
        onChangePassword={async (currentPassword, newPassword, newPasswordConfirm) => {
          // serviceKey='kpa-society' 는 mypageApi.changePassword 가 주입한다
          // (WO-O4O-IDENTITY-V2-PHASE2-CHANGE-PASSWORD-SERVICE-SCOPE-V1).
          await mypageApi.changePassword({ currentPassword, newPassword, newPasswordConfirm });
        }}
      />
    </MyPageLayout>
  );
}

const styles: Record<string, React.CSSProperties> = {
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
  // WO-O4O-MYPAGE-TIER1-DEAD-STUB-CLEANUP-V1: 탈퇴 모달 관련 styles 제거 (mock action 제거 동반)
};
