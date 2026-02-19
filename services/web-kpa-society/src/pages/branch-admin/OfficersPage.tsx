/**
 * OfficersPage - 임원 관리 페이지
 *
 * WO-KPA-C-BRANCH-ADMIN-IMPLEMENTATION-V1: mock → API
 */

import { useState, useEffect, useCallback } from 'react';
import { AdminHeader } from '../../components/branch-admin';
import { colors } from '../../styles/theme';
import { branchAdminApi } from '../../api/branchAdmin';
import type { BranchOfficer } from '../../api/branchAdmin';

export function OfficersPage() {
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingOfficer, setEditingOfficer] = useState<BranchOfficer | null>(null);
  const [officers, setOfficers] = useState<BranchOfficer[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchOfficers = useCallback(async () => {
    try {
      setLoading(true);
      const res = await branchAdminApi.getOfficers();
      setOfficers(res.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOfficers(); }, [fetchOfficers]);

  const handleEdit = (officer: BranchOfficer) => {
    setEditingOfficer(officer);
    setShowFormModal(true);
  };

  const handleAdd = () => {
    setEditingOfficer(null);
    setShowFormModal(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 이 임원을 삭제하시겠습니까?')) return;
    try {
      await branchAdminApi.deleteOfficer(id);
      fetchOfficers();
    } catch (err: any) {
      alert('삭제에 실패했습니다: ' + (err.message || ''));
    }
  };

  const handleSaveOfficer = async (form: HTMLFormElement) => {
    const fd = new FormData(form);
    const data = {
      name: fd.get('name') as string,
      position: ROLE_LABELS[fd.get('role') as string] || fd.get('role') as string,
      role: fd.get('role') as string,
      pharmacy_name: fd.get('pharmacy_name') as string || undefined,
      phone: (fd.get('phone') as string)?.replace(/\D/g, '') || undefined,
      email: fd.get('email') as string || undefined,
      term_start: fd.get('term_start') as string || undefined,
      term_end: fd.get('term_end') as string || undefined,
    };
    try {
      if (editingOfficer) {
        await branchAdminApi.updateOfficer(editingOfficer.id, data);
      } else {
        await branchAdminApi.createOfficer(data);
      }
      setShowFormModal(false);
      fetchOfficers();
    } catch (err: any) {
      alert('저장에 실패했습니다: ' + (err.message || ''));
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    president: '분회장', vice_president: '부회장', secretary: '총무',
    treasurer: '재무', director: '이사', auditor: '감사',
  };

  const calculateRemainingDays = (termEnd: string | null) => {
    if (!termEnd) return 999;
    const end = new Date(termEnd);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div>
      <AdminHeader
        title="임원 관리"
        subtitle="분회 임원진을 관리합니다"
      />

      <div style={pageStyles.content}>
        {loading && <div style={{ padding: '40px', textAlign: 'center', color: colors.neutral500 }}>불러오는 중...</div>}
        {/* 임기 알림 */}
        {officers.some((o) => calculateRemainingDays(o.term_end) < 90) && (
          <div style={pageStyles.termAlert}>
            <span style={pageStyles.alertIcon}>📢</span>
            <span>
              임기가 3개월 이내로 남은 임원이 있습니다. 차기 임원 선출을 준비해주세요.
            </span>
          </div>
        )}

        {/* 상단 액션 */}
        <div style={pageStyles.toolbar}>
          <div style={pageStyles.summary}>
            <span>현재 임원: <strong>{officers.filter((o) => o.is_active).length}명</strong></span>
            <span style={pageStyles.divider}>|</span>
            <span>임기: 2024.01 ~ 2025.12</span>
          </div>

          <div style={pageStyles.actions}>
            <button style={pageStyles.exportButton}>
              📥 임원 명부 다운로드
            </button>
            <button style={pageStyles.addButton} onClick={handleAdd}>
              + 임원 추가
            </button>
          </div>
        </div>

        {/* 임원 카드 그리드 */}
        <div style={pageStyles.officerGrid}>
          {officers
            .filter((o) => o.is_active)
            .sort((a, b) => a.sort_order - b.sort_order)
            .map((officer) => {
              const remainingDays = calculateRemainingDays(officer.term_end);
              return (
                <div key={officer.id} style={pageStyles.officerCard}>
                  <div style={pageStyles.cardHeader}>
                    <div style={pageStyles.avatar}>
                      {officer.name.charAt(0)}
                    </div>
                    <div style={pageStyles.cardInfo}>
                      <div style={pageStyles.officerName}>{officer.name}</div>
                      <div style={pageStyles.officerPosition}>{officer.position}</div>
                    </div>
                    <div style={pageStyles.cardActions}>
                      <button
                        style={pageStyles.cardButton}
                        onClick={() => handleEdit(officer)}
                      >
                        수정
                      </button>
                    </div>
                  </div>

                  <div style={pageStyles.cardBody}>
                    <div style={pageStyles.infoRow}>
                      <span style={pageStyles.infoLabel}>약국</span>
                      <span style={pageStyles.infoValue}>{officer.pharmacy_name || '-'}</span>
                    </div>
                    <div style={pageStyles.infoRow}>
                      <span style={pageStyles.infoLabel}>연락처</span>
                      <span style={pageStyles.infoValue}>{officer.phone || '-'}</span>
                    </div>
                    <div style={pageStyles.infoRow}>
                      <span style={pageStyles.infoLabel}>이메일</span>
                      <span style={pageStyles.infoValue}>{officer.email || '-'}</span>
                    </div>
                  </div>

                  <div style={pageStyles.cardFooter}>
                    <div style={pageStyles.termInfo}>
                      <span style={pageStyles.termLabel}>임기</span>
                      <span style={pageStyles.termValue}>
                        {officer.term_start || '-'} ~ {officer.term_end || '-'}
                      </span>
                    </div>
                    {remainingDays < 90 && (
                      <div style={pageStyles.termWarning}>
                        ⚠️ {remainingDays}일 남음
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>

        {/* 조직도 */}
        <div style={pageStyles.orgChart}>
          <h3 style={pageStyles.chartTitle}>조직도</h3>
          <div style={pageStyles.chartContent}>
            <div style={pageStyles.chartLevel}>
              <div style={pageStyles.chartBox}>
                <strong>분회장</strong>
                <span>홍분회장</span>
              </div>
            </div>
            <div style={pageStyles.chartConnector}>┬───────┬</div>
            <div style={pageStyles.chartLevel}>
              <div style={pageStyles.chartBox}>
                <strong>총무</strong>
                <span>김총무</span>
              </div>
              <div style={pageStyles.chartBox}>
                <strong>감사</strong>
                <span>박감사</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 임원 추가/수정 모달 */}
      {showFormModal && (
        <div style={pageStyles.modalOverlay} onClick={() => setShowFormModal(false)}>
          <div style={pageStyles.modal} onClick={(e) => e.stopPropagation()}>
            <div style={pageStyles.modalHeader}>
              <h3 style={pageStyles.modalTitle}>
                {editingOfficer ? '임원 정보 수정' : '새 임원 추가'}
              </h3>
              <button style={pageStyles.closeButton} onClick={() => setShowFormModal(false)}>
                ×
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleSaveOfficer(e.currentTarget); }}>
            <div style={pageStyles.modalBody}>
              <div style={pageStyles.formRow}>
                <div style={pageStyles.formGroup}>
                  <label style={pageStyles.label}>이름</label>
                  <input
                    type="text"
                    name="name"
                    style={pageStyles.input}
                    defaultValue={editingOfficer?.name}
                    placeholder="이름"
                    required
                  />
                </div>
                <div style={pageStyles.formGroup}>
                  <label style={pageStyles.label}>직책</label>
                  <select name="role" style={pageStyles.select} defaultValue={editingOfficer?.role || 'president'}>
                    <option value="president">분회장</option>
                    <option value="vice_president">부회장</option>
                    <option value="secretary">총무</option>
                    <option value="treasurer">재무</option>
                    <option value="director">이사</option>
                    <option value="auditor">감사</option>
                  </select>
                </div>
              </div>
              <div style={pageStyles.formGroup}>
                <label style={pageStyles.label}>약국명</label>
                <input
                  type="text"
                  name="pharmacy_name"
                  style={pageStyles.input}
                  defaultValue={editingOfficer?.pharmacy_name || ''}
                  placeholder="소속 약국명"
                />
              </div>
              <div style={pageStyles.formRow}>
                <div style={pageStyles.formGroup}>
                  <label style={pageStyles.label}>연락처</label>
                  <input
                    type="tel"
                    name="phone"
                    style={pageStyles.input}
                    defaultValue={editingOfficer?.phone || ''}
                    placeholder="01000000000"
                  />
                </div>
                <div style={pageStyles.formGroup}>
                  <label style={pageStyles.label}>이메일</label>
                  <input
                    type="email"
                    name="email"
                    style={pageStyles.input}
                    defaultValue={editingOfficer?.email || ''}
                    placeholder="email@example.com"
                  />
                </div>
              </div>
              <div style={pageStyles.formRow}>
                <div style={pageStyles.formGroup}>
                  <label style={pageStyles.label}>임기 시작</label>
                  <input
                    type="date"
                    name="term_start"
                    style={pageStyles.input}
                    defaultValue={editingOfficer?.term_start || ''}
                  />
                </div>
                <div style={pageStyles.formGroup}>
                  <label style={pageStyles.label}>임기 종료</label>
                  <input
                    type="date"
                    name="term_end"
                    style={pageStyles.input}
                    defaultValue={editingOfficer?.term_end || ''}
                  />
                </div>
              </div>
            </div>
            <div style={pageStyles.modalFooter}>
              {editingOfficer && (
                <button
                  type="button"
                  style={{ ...pageStyles.deleteButton }}
                  onClick={() => {
                    handleDelete(editingOfficer.id);
                    setShowFormModal(false);
                  }}
                >
                  삭제
                </button>
              )}
              <div style={{ flex: 1 }} />
              <button type="button" style={pageStyles.cancelButton} onClick={() => setShowFormModal(false)}>
                취소
              </button>
              <button type="submit" style={pageStyles.submitButton}>
                {editingOfficer ? '저장' : '추가'}
              </button>
            </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

const pageStyles: Record<string, React.CSSProperties> = {
  content: {
    padding: '24px 32px',
  },
  termAlert: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 20px',
    backgroundColor: '#FEF3C7',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    color: colors.neutral800,
  },
  alertIcon: {
    fontSize: '20px',
  },
  toolbar: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '24px',
  },
  summary: {
    fontSize: '14px',
    color: colors.neutral600,
  },
  divider: {
    margin: '0 12px',
    color: colors.neutral300,
  },
  actions: {
    display: 'flex',
    gap: '12px',
  },
  exportButton: {
    padding: '10px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  addButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  officerGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, 1fr)',
    gap: '20px',
    marginBottom: '32px',
  },
  officerCard: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    overflow: 'hidden',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '20px',
    borderBottom: `1px solid ${colors.neutral100}`,
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
  cardInfo: {
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
    fontWeight: 500,
    marginTop: '2px',
  },
  cardActions: {},
  cardButton: {
    padding: '6px 12px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '13px',
    cursor: 'pointer',
  },
  cardBody: {
    padding: '16px 20px',
  },
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${colors.neutral100}`,
  },
  infoLabel: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  infoValue: {
    fontSize: '13px',
    color: colors.neutral800,
    fontWeight: 500,
  },
  cardFooter: {
    padding: '16px 20px',
    backgroundColor: colors.neutral50,
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termInfo: {},
  termLabel: {
    fontSize: '12px',
    color: colors.neutral500,
    display: 'block',
  },
  termValue: {
    fontSize: '13px',
    color: colors.neutral700,
    fontWeight: 500,
  },
  termWarning: {
    fontSize: '12px',
    color: colors.accentYellow,
    fontWeight: 500,
  },
  orgChart: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  chartTitle: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '24px',
    textAlign: 'center',
  },
  chartContent: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  chartLevel: {
    display: 'flex',
    gap: '16px',
  },
  chartConnector: {
    fontSize: '14px',
    color: colors.neutral400,
    padding: '8px 0',
    textAlign: 'center',
    fontFamily: 'monospace',
  },
  chartBox: {
    padding: '12px 20px',
    backgroundColor: colors.neutral100,
    borderRadius: '8px',
    textAlign: 'center',
    minWidth: '100px',
  },
  // Modal styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
  },
  modal: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    width: '600px',
    maxWidth: '90vw',
  },
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 24px',
    borderBottom: `1px solid ${colors.neutral200}`,
  },
  modalTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    color: colors.neutral500,
    cursor: 'pointer',
  },
  modalBody: {
    padding: '24px',
  },
  formRow: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '16px',
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
  },
  select: {
    width: '100%',
    padding: '12px 14px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
  },
  modalFooter: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '16px 24px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  deleteButton: {
    padding: '10px 20px',
    backgroundColor: '#FEE2E2',
    color: colors.accentRed,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  cancelButton: {
    padding: '10px 20px',
    backgroundColor: colors.neutral100,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  submitButton: {
    padding: '10px 20px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
