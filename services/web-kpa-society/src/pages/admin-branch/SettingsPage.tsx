/**
 * SettingsPage - 지부 설정 관리
 */

import { useState } from 'react';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface BranchInfo {
  name: string;
  code: string;
  parentOrg: string;
  address: string;
  phone: string;
  fax: string;
  email: string;
  website: string;
  establishedYear: number;
}

interface FeeSettings {
  annualFee: number;
  dueMonth: number;
  dueDay: number;
  reminderDays: number[];
}

interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: string;
  lastLogin: string;
  isActive: boolean;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'info' | 'fee' | 'admins' | 'notification'>('info');

  const [branchInfo, setBranchInfo] = useState<BranchInfo>({
    name: '경기도약사회 샘플지부',
    code: 'GG-SAMPLE',
    parentOrg: '경기도약사회',
    address: '경기도 수원시 팔달구 중부대로 123',
    phone: '031-123-4567',
    fax: '031-123-4568',
    email: 'sample@ggpa.or.kr',
    website: 'https://sample.ggpa.or.kr',
    establishedYear: 1980,
  });

  const [feeSettings, setFeeSettings] = useState<FeeSettings>({
    annualFee: 300000,
    dueMonth: 3,
    dueDay: 31,
    reminderDays: [30, 14, 7],
  });

  const [adminUsers] = useState<AdminUser[]>([
    {
      id: '1',
      name: '김관리자',
      email: 'admin@sample.ggpa.or.kr',
      role: '최고관리자',
      lastLogin: '2025-01-04 10:30',
      isActive: true,
    },
    {
      id: '2',
      name: '박운영자',
      email: 'operator@sample.ggpa.or.kr',
      role: '운영자',
      lastLogin: '2025-01-03 15:20',
      isActive: true,
    },
  ]);

  const handleSaveBranchInfo = () => {
    alert('지부 정보 저장 (UI 데모)');
  };

  const handleSaveFeeSettings = () => {
    alert('연회비 설정 저장 (UI 데모)');
  };

  const handleAddAdmin = () => {
    alert('관리자 추가 (UI 데모)');
  };

  const handleEditAdmin = (id: string) => {
    alert(`관리자 #${id} 수정 (UI 데모)`);
  };

  const handleRemoveAdmin = (id: string) => {
    if (confirm('정말 삭제하시겠습니까?')) {
      alert(`관리자 #${id} 삭제 (UI 데모)`);
    }
  };

  return (
    <div>
      <AdminHeader title="설정" subtitle="지부 설정 및 관리자 관리" />

      <div style={styles.content}>
        {/* 탭 네비게이션 */}
        <div style={styles.tabs}>
          {[
            { key: 'info', label: '지부 정보' },
            { key: 'fee', label: '연회비 설정' },
            { key: 'admins', label: '관리자' },
            { key: 'notification', label: '알림 설정' },
          ].map((tab) => (
            <button
              key={tab.key}
              style={{
                ...styles.tab,
                ...(activeTab === tab.key ? styles.tabActive : {}),
              }}
              onClick={() => setActiveTab(tab.key as typeof activeTab)}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 지부 정보 */}
        {activeTab === 'info' && (
          <div style={styles.settingsCard}>
            <h3 style={styles.cardTitle}>지부 기본 정보</h3>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>지부명</label>
                <input
                  type="text"
                  value={branchInfo.name}
                  onChange={(e) => setBranchInfo({ ...branchInfo, name: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>지부 코드</label>
                <input
                  type="text"
                  value={branchInfo.code}
                  disabled
                  style={{ ...styles.input, backgroundColor: colors.neutral100 }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>상위 조직</label>
                <input
                  type="text"
                  value={branchInfo.parentOrg}
                  disabled
                  style={{ ...styles.input, backgroundColor: colors.neutral100 }}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>설립년도</label>
                <input
                  type="number"
                  value={branchInfo.establishedYear}
                  onChange={(e) =>
                    setBranchInfo({ ...branchInfo, establishedYear: parseInt(e.target.value) })
                  }
                  style={styles.input}
                />
              </div>

              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>주소</label>
                <input
                  type="text"
                  value={branchInfo.address}
                  onChange={(e) => setBranchInfo({ ...branchInfo, address: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>전화번호</label>
                <input
                  type="text"
                  value={branchInfo.phone}
                  onChange={(e) => setBranchInfo({ ...branchInfo, phone: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>팩스</label>
                <input
                  type="text"
                  value={branchInfo.fax}
                  onChange={(e) => setBranchInfo({ ...branchInfo, fax: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>이메일</label>
                <input
                  type="email"
                  value={branchInfo.email}
                  onChange={(e) => setBranchInfo({ ...branchInfo, email: e.target.value })}
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>웹사이트</label>
                <input
                  type="url"
                  value={branchInfo.website}
                  onChange={(e) => setBranchInfo({ ...branchInfo, website: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>

            <div style={styles.formActions}>
              <button style={styles.saveButton} onClick={handleSaveBranchInfo}>
                저장
              </button>
            </div>
          </div>
        )}

        {/* 연회비 설정 */}
        {activeTab === 'fee' && (
          <div style={styles.settingsCard}>
            <h3 style={styles.cardTitle}>연회비 설정</h3>

            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>연회비 (원)</label>
                <input
                  type="number"
                  value={feeSettings.annualFee}
                  onChange={(e) =>
                    setFeeSettings({ ...feeSettings, annualFee: parseInt(e.target.value) })
                  }
                  style={styles.input}
                />
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>납부 기한 월</label>
                <select
                  value={feeSettings.dueMonth}
                  onChange={(e) =>
                    setFeeSettings({ ...feeSettings, dueMonth: parseInt(e.target.value) })
                  }
                  style={styles.select}
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                    <option key={month} value={month}>
                      {month}월
                    </option>
                  ))}
                </select>
              </div>

              <div style={styles.formGroup}>
                <label style={styles.label}>납부 기한 일</label>
                <select
                  value={feeSettings.dueDay}
                  onChange={(e) =>
                    setFeeSettings({ ...feeSettings, dueDay: parseInt(e.target.value) })
                  }
                  style={styles.select}
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                    <option key={day} value={day}>
                      {day}일
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={styles.reminderSection}>
              <label style={styles.label}>독촉 알림 (납부 기한 전)</label>
              <div style={styles.reminderTags}>
                {feeSettings.reminderDays.map((day, idx) => (
                  <span key={idx} style={styles.reminderTag}>
                    {day}일 전
                  </span>
                ))}
              </div>
              <div style={styles.reminderNote}>
                납부 기한 {feeSettings.reminderDays.join(', ')}일 전에 자동 알림
              </div>
            </div>

            <div style={styles.formActions}>
              <button style={styles.saveButton} onClick={handleSaveFeeSettings}>
                저장
              </button>
            </div>
          </div>
        )}

        {/* 관리자 */}
        {activeTab === 'admins' && (
          <div style={styles.settingsCard}>
            <div style={styles.cardHeader}>
              <h3 style={styles.cardTitle}>관리자 계정</h3>
              <button style={styles.addButton} onClick={handleAddAdmin}>
                + 관리자 추가
              </button>
            </div>

            <div style={styles.adminList}>
              {adminUsers.map((admin) => (
                <div key={admin.id} style={styles.adminCard}>
                  <div style={styles.adminAvatar}>{admin.name.charAt(0)}</div>
                  <div style={styles.adminInfo}>
                    <div style={styles.adminName}>{admin.name}</div>
                    <div style={styles.adminEmail}>{admin.email}</div>
                    <div style={styles.adminMeta}>
                      <span style={styles.roleBadge}>{admin.role}</span>
                      <span style={styles.lastLogin}>최근 접속: {admin.lastLogin}</span>
                    </div>
                  </div>
                  <div style={styles.adminActions}>
                    <button style={styles.editButton} onClick={() => handleEditAdmin(admin.id)}>
                      수정
                    </button>
                    <button style={styles.removeButton} onClick={() => handleRemoveAdmin(admin.id)}>
                      삭제
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 알림 설정 */}
        {activeTab === 'notification' && (
          <div style={styles.settingsCard}>
            <h3 style={styles.cardTitle}>알림 설정</h3>

            <div style={styles.notificationList}>
              <div style={styles.notificationItem}>
                <div style={styles.notificationInfo}>
                  <div style={styles.notificationTitle}>신규 회원 가입</div>
                  <div style={styles.notificationDesc}>새 회원 가입 시 관리자 이메일 알림</div>
                </div>
                <label style={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span style={styles.slider}></span>
                </label>
              </div>

              <div style={styles.notificationItem}>
                <div style={styles.notificationInfo}>
                  <div style={styles.notificationTitle}>신상신고 제출</div>
                  <div style={styles.notificationDesc}>신상신고 제출 시 관리자 알림</div>
                </div>
                <label style={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span style={styles.slider}></span>
                </label>
              </div>

              <div style={styles.notificationItem}>
                <div style={styles.notificationInfo}>
                  <div style={styles.notificationTitle}>연회비 납부</div>
                  <div style={styles.notificationDesc}>연회비 납부 완료 시 알림</div>
                </div>
                <label style={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span style={styles.slider}></span>
                </label>
              </div>

              <div style={styles.notificationItem}>
                <div style={styles.notificationInfo}>
                  <div style={styles.notificationTitle}>게시물 신고</div>
                  <div style={styles.notificationDesc}>게시물 신고 접수 시 즉시 알림</div>
                </div>
                <label style={styles.switch}>
                  <input type="checkbox" defaultChecked />
                  <span style={styles.slider}></span>
                </label>
              </div>

              <div style={styles.notificationItem}>
                <div style={styles.notificationInfo}>
                  <div style={styles.notificationTitle}>주간 리포트</div>
                  <div style={styles.notificationDesc}>매주 월요일 주간 현황 리포트 발송</div>
                </div>
                <label style={styles.switch}>
                  <input type="checkbox" />
                  <span style={styles.slider}></span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
  },
  tab: {
    padding: '12px 24px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  settingsCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '24px',
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '20px',
    marginBottom: '24px',
  },
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  label: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
  },
  input: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
  },
  select: {
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
    backgroundColor: colors.white,
  },
  formActions: {
    paddingTop: '20px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  saveButton: {
    padding: '12px 32px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  reminderSection: {
    marginBottom: '24px',
  },
  reminderTags: {
    display: 'flex',
    gap: '8px',
    marginTop: '8px',
    marginBottom: '8px',
  },
  reminderTag: {
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '6px',
    fontSize: '13px',
  },
  reminderNote: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  addButton: {
    padding: '10px 16px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  adminList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  adminCard: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '12px',
  },
  adminAvatar: {
    width: '48px',
    height: '48px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '18px',
    fontWeight: 600,
  },
  adminInfo: {
    flex: 1,
  },
  adminName: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  adminEmail: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '2px',
  },
  adminMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginTop: '8px',
  },
  roleBadge: {
    padding: '4px 10px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  lastLogin: {
    fontSize: '12px',
    color: colors.neutral400,
  },
  adminActions: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    padding: '8px 16px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  removeButton: {
    padding: '8px 16px',
    backgroundColor: colors.neutral100,
    color: colors.accentRed,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  notificationList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  notificationItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px 20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    marginBottom: '8px',
  },
  notificationInfo: {},
  notificationTitle: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral900,
  },
  notificationDesc: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '4px',
  },
  switch: {
    position: 'relative',
    display: 'inline-block',
    width: '48px',
    height: '26px',
  },
  slider: {
    position: 'absolute',
    cursor: 'pointer',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.neutral300,
    transition: '0.4s',
    borderRadius: '13px',
  },
};
