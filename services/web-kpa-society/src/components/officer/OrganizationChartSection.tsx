/**
 * OrganizationChartSection - 조직도 섹션
 *
 * WO-KPA-ORGANIZATION-STRUCTURE-V1
 * - 조직도 표시 (회장/부회장/위원장/고문/기타)
 * - 운영자가 신규/수정/삭제 가능
 */

import { useState } from 'react';
import { colors } from '../../styles/theme';
import type {
  OrganizationChart,
  Officer,
  ExtendedCommittee,
  OfficerRole,
  OFFICER_ROLE_LABELS,
  EXTENDED_COMMITTEE_TYPE_LABELS,
} from '../../types/organization';

interface OrganizationChartSectionProps {
  chart: OrganizationChart;
  currentUserRole: OfficerRole;
  canEdit?: boolean;
  onEditOfficer?: (officer: Officer) => void;
  onAddOfficer?: (role: OfficerRole) => void;
  onEditCommittee?: (committee: ExtendedCommittee) => void;
  onAddCommittee?: () => void;
}

export function OrganizationChartSection({
  chart,
  currentUserRole,
  canEdit = false,
  onEditOfficer,
  onAddOfficer,
  onEditCommittee,
  onAddCommittee,
}: OrganizationChartSectionProps) {
  const [expandedCommittees, setExpandedCommittees] = useState<string[]>([]);

  const toggleCommittee = (id: string) => {
    setExpandedCommittees(prev =>
      prev.includes(id) ? prev.filter(c => c !== id) : [...prev, id]
    );
  };

  const getRoleColor = (role: OfficerRole) => {
    switch (role) {
      case 'president': return '#4F46E5';
      case 'vice_president': return '#059669';
      case 'committee_chair': return '#D97706';
      case 'advisor': return '#6366F1';
      default: return colors.neutral600;
    }
  };

  return (
    <div style={styles.orgChartSection}>
      <div style={styles.orgChartHeader}>
        <h2 style={styles.sectionTitle}>🏛️ 조직도</h2>
        {canEdit && (
          <div style={styles.editActions}>
            <button onClick={onAddCommittee} style={styles.addButton}>
              + 위원회 추가
            </button>
          </div>
        )}
      </div>

      <div style={styles.orgChart}>
        {/* 회장 */}
        {chart.president && (
          <div style={styles.presidentSection}>
            <div
              style={styles.officerCard}
              onClick={() => canEdit && onEditOfficer?.(chart.president!)}
            >
              <div style={{ ...styles.roleTag, backgroundColor: getRoleColor('president') }}>
                회장
              </div>
              <div style={styles.officerName}>{chart.president.name}</div>
              <div style={styles.officerTitle}>{chart.president.title}</div>
            </div>
          </div>
        )}

        {/* 부회장들 */}
        {chart.vicePresidents.length > 0 && (
          <div style={styles.vpSection}>
            <div style={styles.sectionLabel}>부회장단</div>
            <div style={styles.vpGrid}>
              {chart.vicePresidents.map((vp) => (
                <div
                  key={vp.id}
                  style={styles.officerCard}
                  onClick={() => canEdit && onEditOfficer?.(vp)}
                >
                  <div style={{ ...styles.roleTag, backgroundColor: getRoleColor('vice_president') }}>
                    부회장
                  </div>
                  <div style={styles.officerName}>{vp.name}</div>
                  <div style={styles.officerTitle}>{vp.title}</div>
                  {vp.subordinateCommittees && vp.subordinateCommittees.length > 0 && (
                    <div style={styles.subordinateInfo}>
                      담당: {chart.committees
                        .filter(c => vp.subordinateCommittees?.includes(c.id))
                        .map(c => c.name)
                        .join(', ')}
                    </div>
                  )}
                </div>
              ))}
              {canEdit && (
                <button
                  style={styles.addOfficerButton}
                  onClick={() => onAddOfficer?.('vice_president')}
                >
                  + 부회장 추가
                </button>
              )}
            </div>
          </div>
        )}

        {/* 위원회들 */}
        {chart.committees.length > 0 && (
          <div style={styles.committeesSection}>
            <div style={styles.sectionLabel}>위원회</div>
            <div style={styles.committeeGrid}>
              {chart.committees.filter(c => c.isActive).map((committee) => {
                const isExpanded = expandedCommittees.includes(committee.id);
                const chair = chart.committees
                  .find(c => c.id === committee.id);

                return (
                  <div
                    key={committee.id}
                    style={{
                      ...styles.committeeCard,
                      ...(committee.type === 'special' ? styles.specialCommittee : {}),
                    }}
                  >
                    <div
                      style={styles.committeeHeader}
                      onClick={() => toggleCommittee(committee.id)}
                    >
                      <div style={styles.committeeInfo}>
                        <span style={styles.committeeName}>{committee.name}</span>
                        <span style={{
                          ...styles.committeeType,
                          backgroundColor: committee.type === 'special' ? '#FEF3C7' : colors.neutral100,
                          color: committee.type === 'special' ? '#D97706' : colors.neutral600,
                        }}>
                          {committee.type === 'standing' ? '상임' :
                           committee.type === 'special' ? '특별' : '임시'}
                        </span>
                      </div>
                      <span style={styles.expandIcon}>{isExpanded ? '▼' : '▶'}</span>
                    </div>

                    {isExpanded && (
                      <div style={styles.committeeDetails}>
                        {committee.description && (
                          <p style={styles.committeeDesc}>{committee.description}</p>
                        )}
                        <div style={styles.memberCount}>
                          위원: {committee.members.length}명
                        </div>
                        {committee.type === 'special' && committee.endDate && (
                          <div style={styles.endDate}>
                            종료: {committee.endDate}
                          </div>
                        )}
                        {canEdit && (
                          <button
                            style={styles.editCommitteeButton}
                            onClick={() => onEditCommittee?.(committee)}
                          >
                            수정
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 고문들 */}
        {chart.advisors.length > 0 && (
          <div style={styles.advisorSection}>
            <div style={styles.sectionLabel}>고문</div>
            <div style={styles.advisorGrid}>
              {chart.advisors.map((advisor) => (
                <div
                  key={advisor.id}
                  style={styles.advisorCard}
                  onClick={() => canEdit && onEditOfficer?.(advisor)}
                >
                  <div style={styles.advisorName}>{advisor.name}</div>
                  <div style={styles.advisorTitle}>{advisor.title}</div>
                </div>
              ))}
              {canEdit && (
                <button
                  style={styles.addAdvisorButton}
                  onClick={() => onAddOfficer?.('advisor')}
                >
                  + 고문 추가
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div style={styles.chartFooter}>
        <span style={styles.lastUpdated}>
          최종 수정: {new Date(chart.updatedAt).toLocaleDateString()}
        </span>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  orgChartSection: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    marginTop: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  orgChartHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  editActions: {
    display: 'flex',
    gap: '8px',
  },
  addButton: {
    padding: '8px 14px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  orgChart: {
    display: 'flex',
    flexDirection: 'column',
    gap: '24px',
  },
  presidentSection: {
    display: 'flex',
    justifyContent: 'center',
  },
  officerCard: {
    padding: '16px 24px',
    backgroundColor: colors.neutral50,
    borderRadius: '10px',
    textAlign: 'center',
    cursor: 'pointer',
    minWidth: '140px',
  },
  roleTag: {
    display: 'inline-block',
    padding: '4px 10px',
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 600,
    color: colors.white,
    marginBottom: '8px',
  },
  officerName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '4px',
  },
  officerTitle: {
    fontSize: '13px',
    color: colors.neutral600,
  },
  subordinateInfo: {
    fontSize: '11px',
    color: colors.neutral500,
    marginTop: '8px',
    padding: '4px 8px',
    backgroundColor: colors.neutral100,
    borderRadius: '4px',
  },
  vpSection: {
    marginTop: '16px',
  },
  sectionLabel: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral700,
    marginBottom: '12px',
    paddingLeft: '4px',
  },
  vpGrid: {
    display: 'flex',
    justifyContent: 'center',
    gap: '16px',
    flexWrap: 'wrap',
  },
  addOfficerButton: {
    padding: '16px 24px',
    backgroundColor: colors.neutral100,
    border: `2px dashed ${colors.neutral300}`,
    borderRadius: '10px',
    fontSize: '13px',
    color: colors.neutral500,
    cursor: 'pointer',
    minWidth: '140px',
  },
  committeesSection: {
    marginTop: '16px',
  },
  committeeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '12px',
  },
  committeeCard: {
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    overflow: 'hidden',
    border: `1px solid ${colors.neutral100}`,
  },
  specialCommittee: {
    borderColor: '#FCD34D',
  },
  committeeHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    cursor: 'pointer',
  },
  committeeInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  committeeName: {
    fontSize: '14px',
    fontWeight: 600,
    color: colors.neutral800,
  },
  committeeType: {
    padding: '2px 6px',
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 500,
  },
  expandIcon: {
    fontSize: '10px',
    color: colors.neutral500,
  },
  committeeDetails: {
    padding: '12px 16px',
    borderTop: `1px solid ${colors.neutral100}`,
    backgroundColor: colors.white,
  },
  committeeDesc: {
    fontSize: '13px',
    color: colors.neutral600,
    margin: '0 0 8px 0',
  },
  memberCount: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  endDate: {
    fontSize: '12px',
    color: '#D97706',
    marginTop: '4px',
  },
  editCommitteeButton: {
    marginTop: '8px',
    padding: '4px 10px',
    backgroundColor: colors.neutral200,
    border: 'none',
    borderRadius: '4px',
    fontSize: '12px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  advisorSection: {
    marginTop: '16px',
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  advisorGrid: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap',
  },
  advisorCard: {
    padding: '10px 16px',
    backgroundColor: colors.white,
    borderRadius: '6px',
    cursor: 'pointer',
  },
  advisorName: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
  },
  advisorTitle: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  addAdvisorButton: {
    padding: '10px 16px',
    backgroundColor: 'transparent',
    border: `1px dashed ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '12px',
    color: colors.neutral500,
    cursor: 'pointer',
  },
  chartFooter: {
    marginTop: '20px',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.neutral100}`,
    textAlign: 'right',
  },
  lastUpdated: {
    fontSize: '12px',
    color: colors.neutral400,
  },
};

export default OrganizationChartSection;
