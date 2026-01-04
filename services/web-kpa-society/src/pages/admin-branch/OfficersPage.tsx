/**
 * OfficersPage - 지부 임원 관리
 */

import { useState } from 'react';
import { AdminHeader } from '../../components/admin';
import { colors } from '../../styles/theme';

interface Officer {
  id: string;
  name: string;
  position: string;
  positionLevel: number;
  division?: string;
  divisionId?: string;
  pharmacyName: string;
  phone: string;
  email: string;
  term: string;
  isActive: boolean;
}

export function OfficersPage() {
  const [filterLevel, setFilterLevel] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [officers] = useState<Officer[]>([
    {
      id: '1',
      name: '김지부장',
      position: '지부장',
      positionLevel: 1,
      pharmacyName: '중앙약국',
      phone: '010-1111-1111',
      email: 'president@kpa-sample.or.kr',
      term: '2024-2026',
      isActive: true,
    },
    {
      id: '2',
      name: '이부지부장',
      position: '부지부장',
      positionLevel: 2,
      pharmacyName: '건강약국',
      phone: '010-2222-2222',
      email: 'vice@kpa-sample.or.kr',
      term: '2024-2026',
      isActive: true,
    },
    {
      id: '3',
      name: '박총무',
      position: '총무',
      positionLevel: 3,
      pharmacyName: '미래약국',
      phone: '010-3333-3333',
      email: 'secretary@kpa-sample.or.kr',
      term: '2024-2026',
      isActive: true,
    },
    {
      id: '4',
      name: '최재무',
      position: '재무',
      positionLevel: 3,
      pharmacyName: '희망약국',
      phone: '010-4444-4444',
      email: 'finance@kpa-sample.or.kr',
      term: '2024-2026',
      isActive: true,
    },
    {
      id: '5',
      name: '정분회장',
      position: '분회장',
      positionLevel: 4,
      division: '샘플분회',
      divisionId: 'div-1',
      pharmacyName: '샘플약국',
      phone: '010-5555-5555',
      email: 'div1@kpa-sample.or.kr',
      term: '2024-2026',
      isActive: true,
    },
    {
      id: '6',
      name: '한분회장',
      position: '분회장',
      positionLevel: 4,
      division: '테스트분회',
      divisionId: 'div-2',
      pharmacyName: '테스트약국',
      phone: '010-6666-6666',
      email: 'div2@kpa-sample.or.kr',
      term: '2024-2026',
      isActive: true,
    },
    {
      id: '7',
      name: '윤전임회장',
      position: '전임지부장',
      positionLevel: 5,
      pharmacyName: '원로약국',
      phone: '010-7777-7777',
      email: 'former@kpa-sample.or.kr',
      term: '2022-2024',
      isActive: false,
    },
  ]);

  const positionLevels = [
    { key: 'all', label: '전체' },
    { key: '1', label: '지부장' },
    { key: '2', label: '부지부장' },
    { key: '3', label: '사무국' },
    { key: '4', label: '분회장' },
    { key: '5', label: '전임' },
  ];

  const filteredOfficers = officers.filter((officer) => {
    const matchesLevel =
      filterLevel === 'all' || officer.positionLevel.toString() === filterLevel;
    const matchesSearch =
      officer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      officer.position.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesLevel && matchesSearch;
  });

  // 레벨별 그룹화
  const groupedOfficers = {
    executives: filteredOfficers.filter((o) => o.positionLevel <= 2),
    staff: filteredOfficers.filter((o) => o.positionLevel === 3),
    divisionHeads: filteredOfficers.filter((o) => o.positionLevel === 4),
    former: filteredOfficers.filter((o) => o.positionLevel === 5),
  };

  const handleEdit = (id: string) => {
    alert(`임원 #${id} 정보 수정 (UI 데모)`);
  };

  const handleToggleActive = (id: string, currentState: boolean) => {
    alert(`임원 #${id} ${currentState ? '비활성화' : '활성화'} (UI 데모)`);
  };

  const handleAdd = () => {
    alert('새 임원 추가 (UI 데모)');
  };

  const renderOfficerCard = (officer: Officer) => (
    <div key={officer.id} style={styles.officerCard}>
      <div style={styles.cardHeader}>
        <div style={styles.avatar}>{officer.name.charAt(0)}</div>
        <div style={styles.headerInfo}>
          <div style={styles.officerName}>{officer.name}</div>
          <div style={styles.officerPosition}>{officer.position}</div>
        </div>
        <span
          style={{
            ...styles.statusBadge,
            backgroundColor: officer.isActive ? colors.accentGreen : colors.neutral400,
          }}
        >
          {officer.isActive ? '현직' : '전임'}
        </span>
      </div>

      {officer.division && (
        <div style={styles.divisionRow}>
          <span style={styles.divisionBadge}>{officer.division}</span>
        </div>
      )}

      <div style={styles.cardBody}>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>💊</span>
          <span style={styles.infoValue}>{officer.pharmacyName}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>📞</span>
          <span style={styles.infoValue}>{officer.phone}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>📧</span>
          <span style={styles.infoValue}>{officer.email}</span>
        </div>
        <div style={styles.infoRow}>
          <span style={styles.infoLabel}>📅</span>
          <span style={styles.infoValue}>임기: {officer.term}</span>
        </div>
      </div>

      <div style={styles.cardActions}>
        <button style={styles.editButton} onClick={() => handleEdit(officer.id)}>
          수정
        </button>
        <button
          style={styles.toggleButton}
          onClick={() => handleToggleActive(officer.id, officer.isActive)}
        >
          {officer.isActive ? '전임처리' : '현직복귀'}
        </button>
      </div>
    </div>
  );

  const renderSection = (title: string, officers: Officer[]) => {
    if (officers.length === 0) return null;
    return (
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>{title}</h3>
        <div style={styles.officerGrid}>{officers.map(renderOfficerCard)}</div>
      </div>
    );
  };

  return (
    <div>
      <AdminHeader
        title="임원 관리"
        subtitle={`현직 임원 ${officers.filter((o) => o.isActive).length}명`}
        actions={
          <button style={styles.addButton} onClick={handleAdd}>
            + 임원 추가
          </button>
        }
      />

      <div style={styles.content}>
        {/* 필터 및 검색 */}
        <div style={styles.toolbar}>
          <div style={styles.levelTabs}>
            {positionLevels.map((level) => (
              <button
                key={level.key}
                style={{
                  ...styles.levelTab,
                  ...(filterLevel === level.key ? styles.levelTabActive : {}),
                }}
                onClick={() => setFilterLevel(level.key)}
              >
                {level.label}
              </button>
            ))}
          </div>

          <div style={styles.searchBox}>
            <input
              type="text"
              placeholder="이름 또는 직책 검색..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>

        {/* 임원 섹션별 표시 */}
        {filterLevel === 'all' ? (
          <>
            {renderSection('📌 지부 임원', groupedOfficers.executives)}
            {renderSection('🏢 사무국', groupedOfficers.staff)}
            {renderSection('🏘️ 분회장', groupedOfficers.divisionHeads)}
            {renderSection('📜 전임 임원', groupedOfficers.former)}
          </>
        ) : (
          <div style={styles.officerGrid}>{filteredOfficers.map(renderOfficerCard)}</div>
        )}

        {filteredOfficers.length === 0 && (
          <div style={styles.emptyState}>
            <div style={styles.emptyIcon}>👤</div>
            <div style={styles.emptyText}>해당 조건의 임원이 없습니다.</div>
          </div>
        )}

        {/* 조직도 요약 */}
        <div style={styles.orgChart}>
          <h3 style={styles.orgTitle}>조직 구성 요약</h3>
          <div style={styles.orgGrid}>
            <div style={styles.orgItem}>
              <div style={styles.orgValue}>1</div>
              <div style={styles.orgLabel}>지부장</div>
            </div>
            <div style={styles.orgItem}>
              <div style={styles.orgValue}>1</div>
              <div style={styles.orgLabel}>부지부장</div>
            </div>
            <div style={styles.orgItem}>
              <div style={styles.orgValue}>{officers.filter((o) => o.positionLevel === 3).length}</div>
              <div style={styles.orgLabel}>사무국</div>
            </div>
            <div style={styles.orgItem}>
              <div style={styles.orgValue}>{officers.filter((o) => o.positionLevel === 4).length}</div>
              <div style={styles.orgLabel}>분회장</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
    fontWeight: 500,
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  levelTabs: {
    display: 'flex',
    gap: '8px',
  },
  levelTab: {
    padding: '10px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  levelTabActive: {
    backgroundColor: colors.primary,
    color: colors.white,
    borderColor: colors.primary,
  },
  searchBox: {
    display: 'flex',
  },
  searchInput: {
    padding: '10px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
    width: '250px',
  },
  section: {
    marginBottom: '32px',
  },
  sectionTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '16px',
  },
  officerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
  },
  officerCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '20px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '16px',
  },
  avatar: {
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
  headerInfo: {
    flex: 1,
  },
  officerName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
  },
  officerPosition: {
    fontSize: '13px',
    color: colors.primary,
    marginTop: '2px',
  },
  statusBadge: {
    padding: '4px 10px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '11px',
    fontWeight: 500,
  },
  divisionRow: {
    marginBottom: '16px',
  },
  divisionBadge: {
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    borderRadius: '6px',
    fontSize: '13px',
  },
  cardBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    marginBottom: '16px',
  },
  infoRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '13px',
  },
  infoLabel: {
    width: '20px',
  },
  infoValue: {
    color: colors.neutral700,
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
    paddingTop: '16px',
    borderTop: `1px solid ${colors.neutral100}`,
  },
  editButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  toggleButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: colors.neutral100,
    color: colors.neutral600,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    backgroundColor: colors.white,
    borderRadius: '12px',
  },
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  },
  emptyText: {
    fontSize: '14px',
    color: colors.neutral500,
  },
  orgChart: {
    marginTop: '32px',
    padding: '24px',
    backgroundColor: colors.white,
    borderRadius: '12px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  orgTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginTop: 0,
    marginBottom: '20px',
  },
  orgGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: '16px',
  },
  orgItem: {
    textAlign: 'center',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  orgValue: {
    fontSize: '28px',
    fontWeight: 700,
    color: colors.primary,
  },
  orgLabel: {
    fontSize: '13px',
    color: colors.neutral600,
    marginTop: '4px',
  },
};
