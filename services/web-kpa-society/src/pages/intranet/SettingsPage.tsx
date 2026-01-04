/**
 * SettingsPage - 조직 설정 (관리자 전용)
 * Work Order 6: 조직 정보 수정, 회원 목록 조회, 회원 역할 설정, 행위 권한 토글
 */

import { useState } from 'react';
import { IntranetHeader } from '../../components/intranet';
import { colors } from '../../styles/theme';

interface Member {
  id: string;
  name: string;
  email: string;
  role: 'member' | 'officer' | 'chair';
  permissions: {
    canWriteNotice: boolean;
    canCreateMeeting: boolean;
    canUploadDocument: boolean;
  };
  joinedAt: string;
}

interface OrgInfo {
  name: string;
  type: 'branch' | 'division';
  address: string;
  phone: string;
  email: string;
}

export function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'info' | 'members' | 'permissions'>('info');

  const [orgInfo, setOrgInfo] = useState<OrgInfo>({
    name: '샘플지부',
    type: 'branch',
    address: '서울시 강남구 테헤란로 123',
    phone: '02-1234-5678',
    email: 'sample@kpa.or.kr',
  });

  const [members, setMembers] = useState<Member[]>([
    {
      id: '1',
      name: '김지부장',
      email: 'chair@kpa.or.kr',
      role: 'chair',
      permissions: { canWriteNotice: true, canCreateMeeting: true, canUploadDocument: true },
      joinedAt: '2020-01-15',
    },
    {
      id: '2',
      name: '이부지부장',
      email: 'vice@kpa.or.kr',
      role: 'officer',
      permissions: { canWriteNotice: true, canCreateMeeting: true, canUploadDocument: true },
      joinedAt: '2021-03-20',
    },
    {
      id: '3',
      name: '박총무',
      email: 'secretary@kpa.or.kr',
      role: 'officer',
      permissions: { canWriteNotice: true, canCreateMeeting: false, canUploadDocument: true },
      joinedAt: '2022-05-10',
    },
    {
      id: '4',
      name: '최재무',
      email: 'finance@kpa.or.kr',
      role: 'officer',
      permissions: { canWriteNotice: false, canCreateMeeting: false, canUploadDocument: true },
      joinedAt: '2022-07-01',
    },
    {
      id: '5',
      name: '홍회원',
      email: 'member1@kpa.or.kr',
      role: 'member',
      permissions: { canWriteNotice: false, canCreateMeeting: false, canUploadDocument: false },
      joinedAt: '2023-01-10',
    },
  ]);

  const handleSaveOrgInfo = () => {
    alert('조직 정보 저장 (UI 데모)');
  };

  const handleRoleChange = (memberId: string, newRole: Member['role']) => {
    setMembers(members.map((m) =>
      m.id === memberId ? { ...m, role: newRole } : m
    ));
    alert(`역할 변경 완료 (UI 데모)`);
  };

  const handlePermissionToggle = (memberId: string, permission: keyof Member['permissions']) => {
    setMembers(members.map((m) =>
      m.id === memberId
        ? { ...m, permissions: { ...m.permissions, [permission]: !m.permissions[permission] } }
        : m
    ));
  };

  const getRoleBadge = (role: Member['role']) => {
    const config: Record<string, { bg: string; label: string }> = {
      chair: { bg: colors.primary, label: '회장' },
      officer: { bg: colors.accentGreen, label: '임원' },
      member: { bg: colors.neutral400, label: '회원' },
    };
    const { bg, label } = config[role];
    return <span style={{ ...styles.roleBadge, backgroundColor: bg }}>{label}</span>;
  };

  return (
    <div>
      <IntranetHeader
        title="조직 설정"
        subtitle="조직 정보 및 회원 관리"
      />

      <div style={styles.content}>
        {/* 탭 */}
        <div style={styles.tabs}>
          {[
            { key: 'info', label: '조직 정보' },
            { key: 'members', label: '회원 관리' },
            { key: 'permissions', label: '권한 설정' },
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

        {/* 조직 정보 탭 */}
        {activeTab === 'info' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>조직 기본 정보</h3>
            <div style={styles.formGrid}>
              <div style={styles.formGroup}>
                <label style={styles.label}>조직명</label>
                <input
                  type="text"
                  value={orgInfo.name}
                  onChange={(e) => setOrgInfo({ ...orgInfo, name: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>조직 유형</label>
                <select
                  value={orgInfo.type}
                  onChange={(e) => setOrgInfo({ ...orgInfo, type: e.target.value as OrgInfo['type'] })}
                  style={styles.select}
                  disabled
                >
                  <option value="branch">지부</option>
                  <option value="division">분회</option>
                </select>
              </div>
              <div style={{ ...styles.formGroup, gridColumn: '1 / -1' }}>
                <label style={styles.label}>주소</label>
                <input
                  type="text"
                  value={orgInfo.address}
                  onChange={(e) => setOrgInfo({ ...orgInfo, address: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>전화번호</label>
                <input
                  type="text"
                  value={orgInfo.phone}
                  onChange={(e) => setOrgInfo({ ...orgInfo, phone: e.target.value })}
                  style={styles.input}
                />
              </div>
              <div style={styles.formGroup}>
                <label style={styles.label}>이메일</label>
                <input
                  type="email"
                  value={orgInfo.email}
                  onChange={(e) => setOrgInfo({ ...orgInfo, email: e.target.value })}
                  style={styles.input}
                />
              </div>
            </div>
            <div style={styles.formActions}>
              <button style={styles.saveButton} onClick={handleSaveOrgInfo}>
                저장
              </button>
            </div>
          </div>
        )}

        {/* 회원 관리 탭 */}
        {activeTab === 'members' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>회원 목록 ({members.length}명)</h3>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>이름</th>
                    <th style={styles.th}>이메일</th>
                    <th style={styles.th}>역할</th>
                    <th style={styles.th}>가입일</th>
                    <th style={{ ...styles.th, width: '120px' }}>역할 변경</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} style={styles.tr}>
                      <td style={styles.td}>{member.name}</td>
                      <td style={styles.td}>{member.email}</td>
                      <td style={styles.td}>{getRoleBadge(member.role)}</td>
                      <td style={styles.td}>{member.joinedAt}</td>
                      <td style={styles.td}>
                        <select
                          value={member.role}
                          onChange={(e) => handleRoleChange(member.id, e.target.value as Member['role'])}
                          style={styles.roleSelect}
                        >
                          <option value="member">회원</option>
                          <option value="officer">임원</option>
                          <option value="chair">회장</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 권한 설정 탭 */}
        {activeTab === 'permissions' && (
          <div style={styles.card}>
            <h3 style={styles.cardTitle}>행위 권한 설정</h3>
            <p style={styles.permissionNote}>
              각 회원별로 공지 작성, 회의 생성, 문서 업로드 권한을 설정할 수 있습니다.
            </p>
            <div style={styles.tableWrapper}>
              <table style={styles.table}>
                <thead>
                  <tr>
                    <th style={styles.th}>이름</th>
                    <th style={styles.th}>역할</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>공지 작성</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>회의 생성</th>
                    <th style={{ ...styles.th, textAlign: 'center' }}>문서 업로드</th>
                  </tr>
                </thead>
                <tbody>
                  {members.map((member) => (
                    <tr key={member.id} style={styles.tr}>
                      <td style={styles.td}>{member.name}</td>
                      <td style={styles.td}>{getRoleBadge(member.role)}</td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={member.permissions.canWriteNotice}
                          onChange={() => handlePermissionToggle(member.id, 'canWriteNotice')}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={member.permissions.canCreateMeeting}
                          onChange={() => handlePermissionToggle(member.id, 'canCreateMeeting')}
                          style={styles.checkbox}
                        />
                      </td>
                      <td style={{ ...styles.td, textAlign: 'center' }}>
                        <input
                          type="checkbox"
                          checked={member.permissions.canUploadDocument}
                          onChange={() => handlePermissionToggle(member.id, 'canUploadDocument')}
                          style={styles.checkbox}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
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
  card: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '28px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 24px 0',
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
  tableWrapper: {
    overflow: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  th: {
    padding: '14px 16px',
    textAlign: 'left',
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral600,
    backgroundColor: colors.neutral50,
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  tr: {
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  td: {
    padding: '14px 16px',
    fontSize: '14px',
    color: colors.neutral800,
  },
  roleBadge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  roleSelect: {
    padding: '8px 12px',
    borderRadius: '6px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '13px',
    backgroundColor: colors.white,
  },
  permissionNote: {
    fontSize: '14px',
    color: colors.neutral600,
    marginBottom: '20px',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  checkbox: {
    width: '18px',
    height: '18px',
    cursor: 'pointer',
  },
};
