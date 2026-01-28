/**
 * MyProfilePage - 프로필 관리 페이지
 *
 * 조회 모드: 프로필 정보 표시
 * 수정 모드: 정보 수정 가능
 */

import { useState, useEffect } from 'react';
import { PageHeader, LoadingSpinner, EmptyState, Card } from '../../components/common';
import { mypageApi } from '../../api';
import { useAuth, type PharmacistRole } from '../../contexts';
import { colors, typography } from '../../styles/theme';
import type { User } from '../../types';

const PHARMACIST_ROLE_LABELS: Record<PharmacistRole, string> = {
  general: '일반 약사',
  pharmacy_owner: '약국 개설자',
  hospital: '병원 약사',
  other: '기타',
};

interface ProfileData extends User {
  licenseNumber?: string;
  university?: string;
  workplace?: string;
  phone?: string;
  avatar?: string;
}

export function MyProfilePage() {
  const { user, setPharmacistRole } = useAuth();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    university: '',
    workplace: '',
    pharmacistRole: '' as PharmacistRole | '',
  });

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const res = await mypageApi.getProfile();
      const data = res.data as ProfileData;
      setProfile(data);
      setFormData({
        name: data.name || '',
        phone: data.phone || '',
        email: data.email || '',
        university: data.university || '',
        workplace: data.workplace || '',
        pharmacistRole: user?.pharmacistRole || '',
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : '데이터를 불러오는데 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = () => {
    setIsEditMode(true);
  };

  const handleCancel = () => {
    // 원래 데이터로 복원
    if (profile) {
      setFormData({
        name: profile.name || '',
        phone: profile.phone || '',
        email: profile.email || '',
        university: profile.university || '',
        workplace: profile.workplace || '',
        pharmacistRole: user?.pharmacistRole || '',
      });
    }
    setIsEditMode(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      setSaving(true);
      // pharmacistRole은 localStorage 기반이므로 API와 분리 저장
      const { pharmacistRole: roleValue, ...apiFormData } = formData;
      await mypageApi.updateProfile(apiFormData);
      if (roleValue) {
        setPharmacistRole(roleValue as PharmacistRole);
      }
      // 프로필 데이터 업데이트
      setProfile(prev => prev ? { ...prev, ...apiFormData } : null);
      setIsEditMode(false);
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
          description="프로필을 확인하려면 로그인해주세요."
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
        {/* 프로필 사진 영역 */}
        <div style={styles.avatarSection}>
          <div style={styles.avatar}>
            {profile?.avatar ? (
              <img src={profile.avatar} alt="프로필" style={styles.avatarImage} />
            ) : (
              <span style={styles.avatarIcon}>👤</span>
            )}
          </div>
          {isEditMode && (
            <button type="button" style={styles.avatarButton}>
              사진 변경
            </button>
          )}
        </div>

        {isEditMode ? (
          /* 수정 모드 */
          <form onSubmit={handleSubmit}>
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
              <label style={styles.label}>약사면허</label>
              <input
                type="text"
                style={{ ...styles.input, ...styles.inputReadonly }}
                value={profile?.licenseNumber || '-'}
                disabled
              />
              <p style={styles.hint}>약사면허는 수정할 수 없습니다.</p>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>직역</label>
              <select
                style={styles.input}
                value={formData.pharmacistRole}
                onChange={e => setFormData({ ...formData, pharmacistRole: e.target.value as PharmacistRole })}
              >
                <option value="">선택하세요</option>
                {(Object.entries(PHARMACIST_ROLE_LABELS) as [PharmacistRole, string][]).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>

            <div style={styles.field}>
              <label style={styles.label}>출신교 (대학)</label>
              <input
                type="text"
                style={styles.input}
                value={formData.university}
                onChange={e => setFormData({ ...formData, university: e.target.value })}
                placeholder="출신 대학을 입력하세요"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>근무처</label>
              <input
                type="text"
                style={styles.input}
                value={formData.workplace}
                onChange={e => setFormData({ ...formData, workplace: e.target.value })}
                placeholder="근무처를 입력하세요"
              />
            </div>

            <div style={styles.field}>
              <label style={styles.label}>핸드폰</label>
              <input
                type="tel"
                style={styles.input}
                value={formData.phone}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                placeholder="연락처를 입력하세요"
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

            <div style={styles.actions}>
              <button
                type="button"
                style={styles.cancelButton}
                onClick={handleCancel}
                disabled={saving}
              >
                취소
              </button>
              <button
                type="submit"
                style={styles.submitButton}
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        ) : (
          /* 조회 모드 */
          <div style={styles.profileView}>
            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>이름</span>
              <span style={styles.infoValue}>{profile?.name || '-'}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>약사면허</span>
              <span style={styles.infoValue}>{profile?.licenseNumber || '-'}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>직역</span>
              <span style={styles.infoValue}>
                {user?.pharmacistRole ? PHARMACIST_ROLE_LABELS[user.pharmacistRole] : '-'}
              </span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>출신교 (대학)</span>
              <span style={styles.infoValue}>{profile?.university || '-'}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>근무처</span>
              <span style={styles.infoValue}>{profile?.workplace || '-'}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>핸드폰</span>
              <span style={styles.infoValue}>{profile?.phone || '-'}</span>
            </div>

            <div style={styles.infoRow}>
              <span style={styles.infoLabel}>이메일</span>
              <span style={styles.infoValue}>{profile?.email || '-'}</span>
            </div>

            <div style={styles.editButtonWrapper}>
              <button
                type="button"
                style={styles.editButton}
                onClick={handleEdit}
              >
                수정
              </button>
            </div>
          </div>
        )}
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
    overflow: 'hidden',
    marginBottom: '12px',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    objectFit: 'cover',
  },
  avatarIcon: {
    fontSize: '48px',
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
  profileView: {
    display: 'flex',
    flexDirection: 'column',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  infoLabel: {
    ...typography.bodyM,
    color: colors.neutral500,
    fontWeight: 500,
  },
  infoValue: {
    ...typography.bodyM,
    color: colors.neutral900,
  },
  editButtonWrapper: {
    marginTop: '24px',
    display: 'flex',
    justifyContent: 'center',
  },
  editButton: {
    padding: '12px 48px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
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
    display: 'flex',
    gap: '12px',
  },
  cancelButton: {
    flex: 1,
    padding: '14px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  submitButton: {
    flex: 1,
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
