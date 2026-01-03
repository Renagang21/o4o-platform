/**
 * MyProfilePage - 프로필 관리 페이지
 */

import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { mypageApi } from '../../api';
import { useAuth } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { User } from '../../types';

export function MyProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await mypageApi.getProfile();
      setProfile(res.data);
      setFormData({
        name: res.data.name || '',
        phone: res.data.phone || '',
        email: res.data.email || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      await mypageApi.updateProfile(formData);
      alert('프로필이 저장되었습니다.');
    } catch (err) {
      alert('저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div style={styles.container}>
        <EmptyState
          icon="🔒"
          title="로그인이 필요합니다"
          description="프로필을 수정하려면 로그인해주세요."
        />
      </div>
    );
  }

  if (loading) {
    return <LoadingSpinner message="프로필을 불러오는 중..." />;
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
        title="프로필"
        breadcrumb={[
          { label: '홈', href: '/' },
          { label: '마이페이지', href: '/mypage' },
          { label: '프로필' },
        ]}
      />

      <Card padding="large">
        <form onSubmit={handleSubmit}>
          <div style={styles.avatarSection}>
            <div style={styles.avatar}>
              <span>👤</span>
            </div>
            <button type="button" style={styles.avatarButton}>
              사진 변경
            </button>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>이름</label>
            <input
              type="text"
              style={styles.input}
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
              placeholder="이름을 입력하세요"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>이메일</label>
            <input
              type="email"
              style={styles.input}
              value={formData.email}
              onChange={e => setFormData({ ...formData, email: e.target.value })}
              placeholder="이메일을 입력하세요"
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>연락처</label>
            <input
              type="tel"
              style={styles.input}
              value={formData.phone}
              onChange={e => setFormData({ ...formData, phone: e.target.value })}
              placeholder="연락처를 입력하세요"
            />
          </div>

          {/* 읽기 전용 필드 */}
          {profile?.licenseNumber && (
            <div style={styles.field}>
              <label style={styles.label}>면허번호</label>
              <input
                type="text"
                style={{ ...styles.input, ...styles.inputReadonly }}
                value={profile.licenseNumber}
                disabled
              />
              <p style={styles.hint}>면허번호는 수정할 수 없습니다.</p>
            </div>
          )}

          {profile?.organizationName && (
            <div style={styles.field}>
              <label style={styles.label}>소속</label>
              <input
                type="text"
                style={{ ...styles.input, ...styles.inputReadonly }}
                value={profile.organizationName}
                disabled
              />
              <p style={styles.hint}>소속 변경은 관리자에게 문의하세요.</p>
            </div>
          )}

          <div style={styles.actions}>
            <button
              type="submit"
              style={styles.submitButton}
              disabled={saving}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>
        </form>
      </Card>

      {/* 비밀번호 변경 */}
      <Card padding="large" style={{ marginTop: '24px' }}>
        <h3 style={styles.sectionTitle}>비밀번호 변경</h3>
        <p style={styles.sectionDesc}>
          비밀번호를 변경하려면 아래 버튼을 클릭하세요.
        </p>
        <button
          type="button"
          style={styles.secondaryButton}
          onClick={() => alert('비밀번호 변경 기능은 준비 중입니다.')}
        >
          비밀번호 변경
        </button>
      </Card>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: '600px',
    margin: '0 auto',
    padding: '0 20px 40px',
  },
  avatarSection: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    marginBottom: '32px',
  },
  avatar: {
    width: '100px',
    height: '100px',
    borderRadius: '50%',
    backgroundColor: colors.neutral100,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '48px',
    marginBottom: '12px',
  },
  avatarButton: {
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
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
  input: {
    width: '100%',
    padding: '12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  inputReadonly: {
    backgroundColor: colors.neutral50,
    color: colors.neutral500,
  },
  hint: {
    ...typography.bodyS,
    color: colors.neutral500,
    marginTop: '4px',
  },
  actions: {
    marginTop: '32px',
  },
  submitButton: {
    width: '100%',
    padding: '14px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  sectionTitle: {
    ...typography.headingM,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '8px',
  },
  sectionDesc: {
    ...typography.bodyM,
    color: colors.neutral500,
    marginBottom: '16px',
  },
  secondaryButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
