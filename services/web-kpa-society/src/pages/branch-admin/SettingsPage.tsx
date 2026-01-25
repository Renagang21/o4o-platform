/**
 * SettingsPage - 분회 설정 페이지
 *
 * WO-KPA-FEE-BY-FUNCTION-V1: 직능별 연회비 설정 기능 추가
 * WO-KPA-FEE-CATEGORY-2025-V1: 2025년 약사회비 체계 반영
 * - 대한약사회 회비 내역 리스트 기준 7개 분류
 * - 면허사용자(갑): 약국 개설자, 제약·도매·관리약사
 * - 면허사용자(을): 약국 근무약사, 제약근무·생산업체
 * - 면허사용자(병): 의료기관 근무약사, 행정·교육·연구
 * - 면허사용자(정): 회비면제자·미취업자
 */

import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';
import {
  PharmacistFeeCategory,
  FEE_CATEGORY_LABELS,
  FEE_CATEGORY_GROUPS,
  FeeCategoryGroup,
} from '../../types';

// 그룹별 라벨 (참고용 - 실제로는 FEE_CATEGORY_GROUPS 사용)
const _GROUP_LABELS: Record<FeeCategoryGroup, string> = {
  'A': '면허사용자(갑)',
  'B': '면허사용자(을)',
  'C': '면허사용자(병)',
  'D': '면허사용자(정)',
};

// 정렬된 회비 분류 목록
const ORDERED_CATEGORIES: PharmacistFeeCategory[] = [
  'A1_pharmacy_owner',
  'A2_pharma_manager',
  'B1_pharmacy_employee',
  'B2_pharma_company_employee',
  'C1_hospital',
  'C2_admin_edu_research',
  'D_fee_exempted',
];

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
    membershipFeeDeadline: '03-31',
    annualReportDeadline: '01-31',
  });

  // WO-KPA-FEE-CATEGORY-2025-V1: 2025년 회비 체계 기반 설정
  // 회비 분류별 금액 CRUD 가능
  const [selectedYear, setSelectedYear] = useState(2025);

  // 회비 설정 상태 (입력/수정/삭제 가능)
  interface CategoryFeeSettings {
    kpaFee: number;          // 대약회비
    cityProvinceFee: number; // 시약회비
    branchFee: number;       // 분회회비
    otherFees: number;       // 기타 회비 (보험료, 특별회비 등)
  }

  const [feeSettings, setFeeSettings] = useState<Record<PharmacistFeeCategory, CategoryFeeSettings>>({
    'A1_pharmacy_owner': { kpaFee: 230000, cityProvinceFee: 150000, branchFee: 300000, otherFees: 108000 },
    'A2_pharma_manager': { kpaFee: 230000, cityProvinceFee: 150000, branchFee: 200000, otherFees: 63000 },
    'B1_pharmacy_employee': { kpaFee: 140000, cityProvinceFee: 110000, branchFee: 85000, otherFees: 78000 },
    'B2_pharma_company_employee': { kpaFee: 140000, cityProvinceFee: 110000, branchFee: 85000, otherFees: 63000 },
    'C1_hospital': { kpaFee: 60000, cityProvinceFee: 25000, branchFee: 25000, otherFees: 33000 },
    'C2_admin_edu_research': { kpaFee: 60000, cityProvinceFee: 25000, branchFee: 25000, otherFees: 33000 },
    'D_fee_exempted': { kpaFee: 20000, cityProvinceFee: 10000, branchFee: 10000, otherFees: 30000 },
  });

  // 총액 계산
  const getTotalFee = (category: PharmacistFeeCategory): number => {
    const fee = feeSettings[category];
    return fee.kpaFee + fee.cityProvinceFee + fee.branchFee + fee.otherFees;
  };

  // 회비 수정
  const updateFee = (
    category: PharmacistFeeCategory,
    field: keyof CategoryFeeSettings,
    value: number
  ) => {
    setFeeSettings(prev => ({
      ...prev,
      [category]: { ...prev[category], [field]: value },
    }));
  };

  // 현재 그룹 표시를 위한 헬퍼
  const getGroupLabel = (category: PharmacistFeeCategory): string => {
    return FEE_CATEGORY_GROUPS[category].label;
  };

  // 같은 그룹의 이전 카테고리인지 확인 (그룹 헤더 표시용)
  const isFirstInGroup = (category: PharmacistFeeCategory, index: number): boolean => {
    if (index === 0) return true;
    const prevCategory = ORDERED_CATEGORIES[index - 1];
    return FEE_CATEGORY_GROUPS[category].group !== FEE_CATEGORY_GROUPS[prevCategory].group;
  };

  const handleSave = () => {
    alert(`${selectedYear}년도 회비 설정이 저장되었습니다.`);
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

        {/* 신고 기한 설정 */}
        <div style={pageStyles.section}>
          <h3 style={pageStyles.sectionTitle}>신고 기한 설정</h3>
          <div style={pageStyles.formGrid}>
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

        {/* WO-KPA-FEE-CATEGORY-2025-V1: 2025년 회비 체계 기반 설정 */}
        <div style={pageStyles.section}>
          <div style={pageStyles.sectionHeaderRow}>
            <h3 style={pageStyles.sectionTitle}>연회비 설정</h3>
            <div style={pageStyles.yearSelector}>
              <label style={pageStyles.yearLabel}>연도:</label>
              <select
                style={pageStyles.yearSelect}
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              >
                <option value={2025}>2025년</option>
                <option value={2024}>2024년</option>
                <option value={2023}>2023년</option>
              </select>
            </div>
          </div>
          <p style={pageStyles.sectionDesc}>
            대한약사회 연회비 내역 리스트 기준 (회비 = 대약회비 + 시약회비 + 분회회비 + 기타회비)
          </p>

          <div style={pageStyles.feeTable}>
            <div style={pageStyles.feeTableHeader}>
              <div style={{ ...pageStyles.feeTableCell, flex: 2 }}>분류 / 직능</div>
              <div style={pageStyles.feeTableCell}>대약회비</div>
              <div style={pageStyles.feeTableCell}>시약회비</div>
              <div style={pageStyles.feeTableCell}>분회회비</div>
              <div style={pageStyles.feeTableCell}>기타회비</div>
              <div style={pageStyles.feeTableCell}>총액</div>
            </div>
            {ORDERED_CATEGORIES.map((category, index) => (
              <div key={category}>
                {/* 그룹 헤더 */}
                {isFirstInGroup(category, index) && (
                  <div style={pageStyles.feeGroupHeader}>
                    <span style={pageStyles.feeGroupLabel}>{getGroupLabel(category)}</span>
                  </div>
                )}
                {/* 카테고리 행 */}
                <div style={pageStyles.feeTableRow}>
                  <div style={{ ...pageStyles.feeTableCell, flex: 2 }}>
                    <span style={pageStyles.functionLabel}>{FEE_CATEGORY_LABELS[category]}</span>
                  </div>
                  <div style={pageStyles.feeTableCell}>
                    <input
                      type="number"
                      style={pageStyles.feeInput}
                      value={feeSettings[category].kpaFee}
                      onChange={(e) => updateFee(category, 'kpaFee', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div style={pageStyles.feeTableCell}>
                    <input
                      type="number"
                      style={pageStyles.feeInput}
                      value={feeSettings[category].cityProvinceFee}
                      onChange={(e) => updateFee(category, 'cityProvinceFee', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div style={pageStyles.feeTableCell}>
                    <input
                      type="number"
                      style={pageStyles.feeInput}
                      value={feeSettings[category].branchFee}
                      onChange={(e) => updateFee(category, 'branchFee', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div style={pageStyles.feeTableCell}>
                    <input
                      type="number"
                      style={pageStyles.feeInput}
                      value={feeSettings[category].otherFees}
                      onChange={(e) => updateFee(category, 'otherFees', parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div style={pageStyles.feeTableCell}>
                    <span style={pageStyles.totalFee}>
                      {getTotalFee(category).toLocaleString()}원
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div style={pageStyles.feeNote}>
            <span style={pageStyles.feeNoteIcon}>ℹ️</span>
            <span>
              기타회비: 약화사고 배상책임 보험료, 환자안전약물관리본부, 의약품정책연구소, 장학기금,
              약바로쓰기 운동본부, 이웃돕기 마퇴성금, 연수교육비, 회관기금 등
            </span>
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
  // WO-KPA-FEE-CATEGORY-2025-V1: 2025년 회비 체계 테이블 스타일
  sectionHeaderRow: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  yearSelector: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  yearLabel: {
    fontSize: '14px',
    color: colors.neutral600,
  },
  yearSelect: {
    padding: '8px 12px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  sectionDesc: {
    fontSize: '13px',
    color: colors.neutral600,
    marginTop: '-12px',
    marginBottom: '20px',
  },
  feeTable: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  feeTableHeader: {
    display: 'flex',
    backgroundColor: colors.neutral100,
    padding: '12px 16px',
    fontSize: '12px',
    fontWeight: 600,
    color: colors.neutral700,
    gap: '8px',
  },
  feeGroupHeader: {
    backgroundColor: colors.primary + '10',
    padding: '10px 16px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  feeGroupLabel: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.primary,
  },
  feeTableRow: {
    display: 'flex',
    padding: '10px 16px',
    borderTop: `1px solid ${colors.neutral200}`,
    alignItems: 'center',
    gap: '8px',
  },
  feeTableCell: {
    display: 'flex',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  functionLabel: {
    fontSize: '13px',
    fontWeight: 500,
    color: colors.neutral800,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  feeInput: {
    width: '100%',
    maxWidth: '90px',
    padding: '6px 8px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '12px',
    textAlign: 'right',
  },
  totalFee: {
    fontSize: '13px',
    fontWeight: 600,
    color: colors.primary,
    whiteSpace: 'nowrap',
  },
  feeNote: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: '8px',
    marginTop: '16px',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    fontSize: '12px',
    color: colors.neutral600,
    lineHeight: 1.5,
  },
  feeNoteIcon: {
    fontSize: '14px',
    flexShrink: 0,
  },
};
