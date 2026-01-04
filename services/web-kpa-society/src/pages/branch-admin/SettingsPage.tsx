/**
 * SettingsPage - 분회 설정 페이지
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';

export function SettingsPage() {
  const { branchId: _branchId } = useParams();

  const [settings, setSettings] = useState({
    name: '강남분회',
    code: 'GANGNAM',
    address: '서울시 강남구 역삼동 123-45',
    phone: '02-1234-5678',
    fax: '02-1234-5679',
    email: 'gangnam@kpa.or.kr',
    workingHours: '평일 09:00 - 18:00',
    description: '강남분회는 강남구 지역 약사들의 권익 보호와 직능 발전을 위해 활동하고 있습니다.',
    annualFee: 200000,
    membershipFeeDeadline: '03-31',
    annualReportDeadline: '01-31',
  });

  const handleSave = () => {
    alert('설정이 저장되었습니다.');
  };

  return (
    <div>
      <AdminHeader
        title="분회 설정"
        subtitle="분회 기본 정보를 관리합니다"
      />

      <div style={pageStyles.content}>
        {/* 기본 정보 */}
        <div style={pageStyles.section}>
          <h3 style={pageStyles.sectionTitle}>기본 정보</h3>
          <div style={pageStyles.formGrid}>
            <div style={pageStyles.formGroup}>
              <label style={pageStyles.label}>분회명</label>
              <input
                type="text"
                style={pageStyles.input}
                value={settings.name}
                onChange={(e) => setSettings({ ...settings, name: e.target.value })}
              />
            </div>
            <div style={pageStyles.formGroup}>
              <label style={pageStyles.label}>분회 코드</label>
              <input
                type="text"
                style={{ ...pageStyles.input, backgroundColor: colors.neutral100 }}
                value={settings.code}
                disabled
              />
              <span style={pageStyles.inputHint}>분회 코드는 변경할 수 없습니다</span>
            </div>
          </div>
        </div>

        {/* 연락처 정보 */}
        <div style={pageStyles.section}>
          <h3 style={pageStyles.sectionTitle}>연락처 정보</h3>
          <div style={pageStyles.formGroup}>
            <label style={pageStyles.label}>주소</label>
            <input
              type="text"
              style={pageStyles.input}
              value={settings.address}
              onChange={(e) => setSettings({ ...settings, address: e.target.value })}
            />
          </div>
          <div style={pageStyles.formGrid}>
            <div style={pageStyles.formGroup}>
              <label style={pageStyles.label}>전화번호</label>
              <input
                type="tel"
                style={pageStyles.input}
                value={settings.phone}
                onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
              />
            </div>
            <div style={pageStyles.formGroup}>
              <label style={pageStyles.label}>팩스</label>
              <input
                type="tel"
                style={pageStyles.input}
                value={settings.fax}
                onChange={(e) => setSettings({ ...settings, fax: e.target.value })}
              />
            </div>
          </div>
          <div style={pageStyles.formGrid}>
            <div style={pageStyles.formGroup}>
              <label style={pageStyles.label}>이메일</label>
              <input
                type="email"
                style={pageStyles.input}
                value={settings.email}
                onChange={(e) => setSettings({ ...settings, email: e.target.value })}
              />
            </div>
            <div style={pageStyles.formGroup}>
              <label style={pageStyles.label}>운영 시간</label>
              <input
                type="text"
                style={pageStyles.input}
                value={settings.workingHours}
                onChange={(e) => setSettings({ ...settings, workingHours: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* 분회 소개 */}
        <div style={pageStyles.section}>
          <h3 style={pageStyles.sectionTitle}>분회 소개</h3>
          <div style={pageStyles.formGroup}>
            <label style={pageStyles.label}>소개글</label>
            <textarea
              style={pageStyles.textarea}
              value={settings.description}
              onChange={(e) => setSettings({ ...settings, description: e.target.value })}
              rows={4}
            />
          </div>
        </div>

        {/* 회비 및 신고 설정 */}
        <div style={pageStyles.section}>
          <h3 style={pageStyles.sectionTitle}>회비 및 신고 설정</h3>
          <div style={pageStyles.formGrid}>
            <div style={pageStyles.formGroup}>
              <label style={pageStyles.label}>연회비 금액</label>
              <div style={pageStyles.inputWithUnit}>
                <input
                  type="number"
                  style={pageStyles.input}
                  value={settings.annualFee}
                  onChange={(e) => setSettings({ ...settings, annualFee: parseInt(e.target.value) })}
                />
                <span style={pageStyles.unit}>원</span>
              </div>
            </div>
            <div style={pageStyles.formGroup}>
              <label style={pageStyles.label}>연회비 납부 기한</label>
              <div style={pageStyles.inputWithUnit}>
                <span style={pageStyles.unitPrefix}>매년</span>
                <input
                  type="text"
                  style={pageStyles.input}
                  value={settings.membershipFeeDeadline}
                  onChange={(e) => setSettings({ ...settings, membershipFeeDeadline: e.target.value })}
                  placeholder="MM-DD"
                />
                <span style={pageStyles.unit}>까지</span>
              </div>
            </div>
          </div>
          <div style={pageStyles.formGrid}>
            <div style={pageStyles.formGroup}>
              <label style={pageStyles.label}>신상신고 제출 기한</label>
              <div style={pageStyles.inputWithUnit}>
                <span style={pageStyles.unitPrefix}>매년</span>
                <input
                  type="text"
                  style={pageStyles.input}
                  value={settings.annualReportDeadline}
                  onChange={(e) => setSettings({ ...settings, annualReportDeadline: e.target.value })}
                  placeholder="MM-DD"
                />
                <span style={pageStyles.unit}>까지</span>
              </div>
            </div>
          </div>
        </div>

        {/* 위험 구역 */}
        <div style={{ ...pageStyles.section, ...pageStyles.dangerSection }}>
          <h3 style={{ ...pageStyles.sectionTitle, color: colors.accentRed }}>위험 구역</h3>
          <div style={pageStyles.dangerItem}>
            <div style={pageStyles.dangerInfo}>
              <div style={pageStyles.dangerTitle}>분회 비활성화</div>
              <div style={pageStyles.dangerDesc}>
                분회를 비활성화하면 회원들이 더 이상 이 분회에 접근할 수 없습니다.
              </div>
            </div>
            <button style={pageStyles.dangerButton}>
              비활성화
            </button>
          </div>
        </div>

        {/* 저장 버튼 */}
        <div style={pageStyles.footer}>
          <button style={pageStyles.cancelButton}>취소</button>
          <button style={pageStyles.saveButton} onClick={handleSave}>
            변경사항 저장
          </button>
        </div>
      </div>
    </div>
  );
}

const pageStyles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
    maxWidth: '800px',
  },
  section: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    marginBottom: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '20px',
    paddingBottom: '12px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '20px',
  },
  formGroup: {
    marginBottom: '16px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
    marginBottom: '8px',
  },
  input: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.2s',
  },
  inputHint: {
    fontSize: '12px',
    color: colors.neutral500,
    marginTop: '4px',
    display: 'block',
  },
  inputWithUnit: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  unit: {
    fontSize: '14px',
    color: colors.neutral600,
    whiteSpace: 'nowrap',
  },
  unitPrefix: {
    fontSize: '14px',
    color: colors.neutral600,
    whiteSpace: 'nowrap',
  },
  textarea: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    fontFamily: 'inherit',
  },
  dangerSection: {
    borderColor: '#FEE2E2',
    backgroundColor: '#FEF2F2',
  },
  dangerItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '16px',
    backgroundColor: colors.white,
    borderRadius: '8px',
    border: `1px solid #FEE2E2`,
  },
  dangerInfo: {},
  dangerTitle: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
  },
  dangerDesc: {
    fontSize: '13px',
    color: colors.neutral600,
    marginTop: '4px',
  },
  dangerButton: {
    padding: '10px 20px',
    backgroundColor: colors.white,
    color: colors.accentRed,
    border: `1px solid ${colors.accentRed}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  footer: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
    paddingTop: '20px',
  },
  cancelButton: {
    padding: '12px 24px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  saveButton: {
    padding: '12px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
};
