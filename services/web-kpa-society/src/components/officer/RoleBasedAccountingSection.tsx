/**
 * RoleBasedAccountingSection - 역할별 회계 섹션
 *
 * WO-KPA-ORGANIZATION-STRUCTURE-V1
 * - 회장: 전체 회계
 * - 부회장: 산하 위원회 회계
 * - 위원장: 자기 위원회 회계
 * - 고문: 요약만 (AI 없음)
 */

import { useState } from 'react';
import { AiSummaryButton } from '../ai';
import { colors } from '../../styles/theme';
import {
  type OfficerRole,
  type AccountingCategory,
  type AccountingEntryWithCommittee,
  ACCOUNTING_CATEGORIES,
  getAccountingAccess,
  filterAccountingByRole,
  OFFICER_ROLE_LABELS,
} from '../../types/organization';

interface RoleBasedAccountingSectionProps {
  role: OfficerRole;
  roleTitle?: string;
  committeeId?: string;
  committeeName?: string;
  subordinateCommitteeIds?: string[];
  entries: AccountingEntryWithCommittee[];
  organizationType: 'district' | 'branch';
  organizationName?: string;
  // 고문용 설정
  advisorSettings?: {
    showAccountingSummary: boolean;
    visibleCategories?: AccountingCategory[];
    customMessage?: string;
  };
}

export function RoleBasedAccountingSection({
  role,
  roleTitle,
  committeeId,
  committeeName,
  subordinateCommitteeIds,
  entries,
  organizationType,
  organizationName,
  advisorSettings,
}: RoleBasedAccountingSectionProps) {
  const access = getAccountingAccess(role);

  // 역할에 따라 회계 항목 필터링
  const filteredEntries = filterAccountingByRole(
    entries,
    role,
    committeeId,
    subordinateCommitteeIds
  );

  // 회계 요약 계산
  const accountingSummary = {
    totalIncome: filteredEntries
      .filter(e => e.type === 'income')
      .reduce((sum, e) => sum + e.amount, 0),
    totalExpense: filteredEntries
      .filter(e => e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0),
    currentBalance: filteredEntries.length > 0
      ? filteredEntries[filteredEntries.length - 1].balance
      : 0,
  };

  // 엑셀 다운로드 함수
  const handleExcelDownload = () => {
    if (!access.canExportExcel) return;

    const BOM = '\uFEFF';
    const headers = ['날짜', '구분', '분류', '위원회', '적요', '수입', '지출', '잔액'];
    const rows = filteredEntries.map(entry => [
      entry.date,
      entry.type === 'income' ? '수입' : '지출',
      entry.categoryLabel,
      entry.committeeName || '-',
      entry.description,
      entry.type === 'income' ? entry.amount : '',
      entry.type === 'expense' ? entry.amount : '',
      entry.balance,
    ]);

    const csvContent = BOM + [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${organizationType === 'district' ? '지부' : '분회'}_회계_${OFFICER_ROLE_LABELS[role]}_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('ko-KR', { style: 'currency', currency: 'KRW' }).format(amount);
  };

  // 고문인 경우 간략한 요약만 표시
  if (role === 'advisor') {
    if (!advisorSettings?.showAccountingSummary) {
      return null; // 고문에게 표시하지 않음
    }

    return (
      <div style={styles.accountingSection}>
        <div style={styles.accountingHeader}>
          <h2 style={styles.sectionTitle}>💰 회계 요약</h2>
          {advisorSettings?.customMessage && (
            <span style={styles.advisorMessage}>{advisorSettings.customMessage}</span>
          )}
        </div>

        {/* 고문용 간략 요약 */}
        <div style={styles.advisorSummary}>
          <div style={styles.advisorSummaryItem}>
            <span style={styles.advisorSummaryLabel}>현재 잔액</span>
            <span style={{ ...styles.advisorSummaryValue, color: colors.primary }}>
              {formatCurrency(accountingSummary.currentBalance)}
            </span>
          </div>
          <div style={styles.advisorSummaryItem}>
            <span style={styles.advisorSummaryLabel}>이번 달 수입</span>
            <span style={{ ...styles.advisorSummaryValue, color: '#059669' }}>
              {formatCurrency(accountingSummary.totalIncome)}
            </span>
          </div>
          <div style={styles.advisorSummaryItem}>
            <span style={styles.advisorSummaryLabel}>이번 달 지출</span>
            <span style={{ ...styles.advisorSummaryValue, color: '#DC2626' }}>
              {formatCurrency(accountingSummary.totalExpense)}
            </span>
          </div>
        </div>

        <p style={styles.advisorNote}>
          * 상세 내역은 회장 또는 담당 부회장에게 문의하세요.
        </p>
      </div>
    );
  }

  // 회원은 회계 접근 불가
  if (role === 'member' || access.scope === 'none') {
    return null;
  }

  // 회장/부회장/위원장/운영자용 전체 회계 섹션
  return (
    <div style={styles.accountingSection}>
      <div style={styles.accountingHeader}>
        <div style={styles.accountingTitleRow}>
          <h2 style={styles.sectionTitle}>
            💰 회계 현황
            {role === 'vice_president' && committeeName && (
              <span style={styles.scopeLabel}> (산하 위원회)</span>
            )}
            {role === 'committee_chair' && committeeName && (
              <span style={styles.scopeLabel}> ({committeeName})</span>
            )}
          </h2>
          {access.canUseAi && (
            <AiSummaryButton
              label="AI 분석"
              contextLabel={`${roleTitle || OFFICER_ROLE_LABELS[role]} 회계 현황`}
              size="sm"
              serviceId="kpa-society"
              contextData={{
                role,
                roleTitle: roleTitle || OFFICER_ROLE_LABELS[role],
                summary: accountingSummary,
                recentEntries: filteredEntries.slice(0, 5),
                period: '2025년 1월',
                organizationType,
                organizationName,
                committeeId,
                committeeName,
                scope: access.scope,
              }}
            />
          )}
        </div>
        {access.canExportExcel && (
          <button onClick={handleExcelDownload} style={styles.excelButton}>
            📥 엑셀 다운로드
          </button>
        )}
      </div>

      {/* 회계 요약 */}
      <div style={styles.accountingSummaryGrid}>
        <div style={styles.accountingSummaryCard}>
          <div style={styles.accountingSummaryLabel}>총 수입</div>
          <div style={{ ...styles.accountingSummaryValue, color: '#059669' }}>
            {formatCurrency(accountingSummary.totalIncome)}
          </div>
        </div>
        <div style={styles.accountingSummaryCard}>
          <div style={styles.accountingSummaryLabel}>총 지출</div>
          <div style={{ ...styles.accountingSummaryValue, color: '#DC2626' }}>
            {formatCurrency(accountingSummary.totalExpense)}
          </div>
        </div>
        <div style={styles.accountingSummaryCard}>
          <div style={styles.accountingSummaryLabel}>현재 잔액</div>
          <div style={{ ...styles.accountingSummaryValue, color: colors.primary }}>
            {formatCurrency(accountingSummary.currentBalance)}
          </div>
        </div>
      </div>

      {/* 최근 회계 내역 */}
      {access.canViewDetails && (
        <div style={styles.accountingTable}>
          <div style={styles.accountingTableHeader}>
            <span style={styles.accountingColDate}>날짜</span>
            <span style={styles.accountingColType}>구분</span>
            <span style={styles.accountingColCategory}>분류</span>
            {(role === 'president' || role === 'vice_president' || role === 'operator') && (
              <span style={styles.accountingColCommittee}>위원회</span>
            )}
            <span style={styles.accountingColDesc}>적요</span>
            <span style={styles.accountingColAmount}>금액</span>
            <span style={styles.accountingColBalance}>잔액</span>
          </div>
          {filteredEntries.slice(0, 5).map((entry) => (
            <div key={entry.id} style={styles.accountingRow}>
              <span style={styles.accountingColDate}>{entry.date}</span>
              <span style={styles.accountingColType}>
                <span style={{
                  ...styles.typeTag,
                  backgroundColor: entry.type === 'income' ? '#D1FAE5' : '#FEE2E2',
                  color: entry.type === 'income' ? '#059669' : '#DC2626',
                }}>
                  {entry.type === 'income' ? '수입' : '지출'}
                </span>
              </span>
              <span style={styles.accountingColCategory}>{entry.categoryLabel}</span>
              {(role === 'president' || role === 'vice_president' || role === 'operator') && (
                <span style={styles.accountingColCommittee}>{entry.committeeName || '-'}</span>
              )}
              <span style={styles.accountingColDesc}>{entry.description}</span>
              <span style={{
                ...styles.accountingColAmount,
                color: entry.type === 'income' ? '#059669' : '#DC2626',
              }}>
                {entry.type === 'income' ? '+' : '-'}{formatCurrency(entry.amount)}
              </span>
              <span style={styles.accountingColBalance}>{formatCurrency(entry.balance)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  accountingSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  accountingHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
  },
  accountingTitleRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  scopeLabel: {
    fontSize: '14px',
    fontWeight: 400,
    color: colors.neutral500,
  },
  excelButton: {
    padding: '8px 16px',
    backgroundColor: '#10B981',
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  accountingSummaryGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '24px',
  },
  accountingSummaryCard: {
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '10px',
    textAlign: 'center',
  },
  accountingSummaryLabel: {
    fontSize: '14px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  accountingSummaryValue: {
    fontSize: '24px',
    fontWeight: 700,
  },
  accountingTable: {
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    overflow: 'hidden',
  },
  accountingTableHeader: {
    display: 'grid',
    gridTemplateColumns: '90px 60px 70px 90px 1fr 110px 110px',
    padding: '12px 16px',
    backgroundColor: colors.neutral100,
    fontSize: '13px',
    fontWeight: 600,
    color: colors.neutral700,
  },
  accountingRow: {
    display: 'grid',
    gridTemplateColumns: '90px 60px 70px 90px 1fr 110px 110px',
    padding: '12px 16px',
    borderTop: `1px solid ${colors.neutral100}`,
    fontSize: '13px',
    alignItems: 'center',
  },
  accountingColDate: {
    color: colors.neutral600,
  },
  accountingColType: {},
  accountingColCategory: {
    color: colors.neutral700,
  },
  accountingColCommittee: {
    color: colors.neutral600,
    fontSize: '12px',
  },
  accountingColDesc: {
    color: colors.neutral800,
  },
  accountingColAmount: {
    textAlign: 'right',
    fontWeight: 500,
  },
  accountingColBalance: {
    textAlign: 'right',
    color: colors.neutral700,
  },
  typeTag: {
    padding: '3px 8px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  // 고문용 스타일
  advisorMessage: {
    fontSize: '13px',
    color: colors.neutral500,
    fontStyle: 'italic',
  },
  advisorSummary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '16px',
    marginBottom: '16px',
  },
  advisorSummaryItem: {
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    textAlign: 'center',
  },
  advisorSummaryLabel: {
    fontSize: '13px',
    color: colors.neutral500,
    marginBottom: '8px',
  },
  advisorSummaryValue: {
    fontSize: '20px',
    fontWeight: 600,
  },
  advisorNote: {
    fontSize: '12px',
    color: colors.neutral400,
    textAlign: 'center',
    margin: 0,
  },
};

export default RoleBasedAccountingSection;
