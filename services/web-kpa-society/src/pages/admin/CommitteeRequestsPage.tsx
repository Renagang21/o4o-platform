/**
 * CommitteeRequestsPage - 위원회 관리 (요청 기반)
 * WO-KPA-COMMITTEE-GOVERNANCE-V1
 *
 * 핵심 원칙:
 * - 지부/분회 관리자는 위원회 CRUD 불가
 * - 변경 요청만 가능 → 사이트 운영자가 승인/반려
 */

import { useState } from 'react';
import { toast } from '@o4o/error-handling';
import { colors } from '../../styles/theme';
import {
  CommitteeChangeRequest,
  CommitteeType,
  CommitteeRequestStatus,
  COMMITTEE_TYPE_LABELS,
  COMMITTEE_RESPONSIBILITIES,
  REQUEST_TYPE_LABELS,
  REQUEST_STATUS_LABELS,
} from '../../types/organization';

// 샘플 요청 데이터
const SAMPLE_REQUESTS: CommitteeChangeRequest[] = [
  {
    id: 'req-1',
    requestType: 'create',
    organizationId: 'div-gangnam',
    organizationType: 'division',
    committeeType: 'other',
    committeeName: '복지위원회',
    reason: '회원 복지 증진을 위한 별도 위원회 신설이 필요합니다.',
    status: 'pending',
    requestedBy: 'user-1',
    requestedByName: '김약사',
    requestedAt: '2024-01-15T10:30:00',
  },
  {
    id: 'req-2',
    requestType: 'update',
    organizationId: 'branch-1',
    organizationType: 'branch',
    committeeType: 'academic',
    targetCommitteeId: 'committee-academic-1',
    reason: '학술위원회 명칭을 "교육연수위원회"로 변경 요청합니다.',
    status: 'approved',
    requestedBy: 'user-2',
    requestedByName: '이약사',
    requestedAt: '2024-01-10T14:20:00',
    reviewedBy: 'admin-1',
    reviewedByName: '사이트 운영자',
    reviewedAt: '2024-01-12T09:00:00',
    reviewComment: '변경 승인되었습니다.',
  },
  {
    id: 'req-3',
    requestType: 'delete',
    organizationId: 'div-seocho',
    organizationType: 'division',
    committeeType: 'other',
    committeeName: '특별위원회',
    targetCommitteeId: 'committee-special-1',
    reason: '활동 부진으로 폐지를 요청합니다.',
    status: 'rejected',
    requestedBy: 'user-3',
    requestedByName: '박약사',
    requestedAt: '2024-01-08T11:00:00',
    reviewedBy: 'admin-1',
    reviewedByName: '사이트 운영자',
    reviewedAt: '2024-01-09T16:30:00',
    reviewComment: '최소 1년간 활동 기록 검토 후 재논의 필요합니다.',
  },
];

type TabType = 'overview' | 'requests' | 'new-request';

export function CommitteeRequestsPage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [requests, setRequests] = useState<CommitteeChangeRequest[]>(SAMPLE_REQUESTS);
  const [statusFilter, setStatusFilter] = useState<CommitteeRequestStatus | 'all'>('all');

  // 새 요청 폼 상태
  const [newRequest, setNewRequest] = useState({
    requestType: 'create' as 'create' | 'update' | 'delete',
    committeeType: 'academic' as CommitteeType | 'other',
    committeeName: '',
    reason: '',
  });

  const filteredRequests = statusFilter === 'all'
    ? requests
    : requests.filter(r => r.status === statusFilter);

  const handleSubmitRequest = () => {
    const request: CommitteeChangeRequest = {
      id: `req-${Date.now()}`,
      requestType: newRequest.requestType,
      organizationId: 'branch-1', // 현재 조직
      organizationType: 'branch',
      committeeType: newRequest.committeeType,
      committeeName: newRequest.committeeType === 'other' ? newRequest.committeeName : undefined,
      reason: newRequest.reason,
      status: 'pending',
      requestedBy: 'current-user',
      requestedByName: '현재 사용자',
      requestedAt: new Date().toISOString(),
    };

    setRequests([request, ...requests]);
    setNewRequest({
      requestType: 'create',
      committeeType: 'academic',
      committeeName: '',
      reason: '',
    });
    setActiveTab('requests');
    toast.success('위원회 변경 요청이 제출되었습니다. 사이트 운영자 검토 후 처리됩니다.');
  };

  const getStatusBadge = (status: CommitteeRequestStatus) => {
    const config: Record<CommitteeRequestStatus, { bg: string; color: string }> = {
      pending: { bg: colors.accentYellow, color: colors.neutral900 },
      approved: { bg: colors.accentGreen, color: colors.white },
      rejected: { bg: colors.accentRed, color: colors.white },
    };
    return (
      <span style={{ ...styles.badge, backgroundColor: config[status].bg, color: config[status].color }}>
        {REQUEST_STATUS_LABELS[status]}
      </span>
    );
  };

  return (
    <div style={styles.container}>
      {/* 헤더 */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>위원회 관리</h1>
          <p style={styles.subtitle}>
            위원회 변경은 요청 기반으로 운영됩니다. 사이트 운영자가 검토 후 처리합니다.
          </p>
        </div>
      </div>

      {/* 안내 배너 */}
      <div style={styles.infoBanner}>
        <div style={styles.infoIcon}>ℹ️</div>
        <div style={styles.infoContent}>
          <strong>위원회 운영 원칙</strong>
          <p style={styles.infoText}>
            지부/분회의 독립성을 보장하면서 플랫폼 안정성을 유지하기 위해,
            위원회 생성·변경·폐지는 <strong>요청 → 사이트 운영자 검토 → 승인/반려</strong> 절차를 따릅니다.
          </p>
        </div>
      </div>

      {/* 탭 */}
      <div style={styles.tabs}>
        {[
          { key: 'overview', label: '위원회 현황', icon: '📊' },
          { key: 'requests', label: '요청 내역', icon: '📋' },
          { key: 'new-request', label: '새 요청', icon: '➕' },
        ].map((tab) => (
          <button
            key={tab.key}
            style={{
              ...styles.tab,
              ...(activeTab === tab.key ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab.key as TabType)}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* 위원회 현황 탭 */}
      {activeTab === 'overview' && (
        <div style={styles.content}>
          <h2 style={styles.sectionTitle}>기본 위원회 구성</h2>
          <p style={styles.sectionDesc}>
            지부·분회에는 아래 3개의 기본 위원회가 구성됩니다.
          </p>

          <div style={styles.committeeGrid}>
            {(['academic', 'general', 'it'] as CommitteeType[]).map((type) => {
              const info = COMMITTEE_RESPONSIBILITIES[type];
              return (
                <div key={type} style={styles.committeeCard}>
                  <div style={styles.committeeHeader}>
                    <span style={styles.committeeIcon}>
                      {type === 'academic' ? '📚' : type === 'general' ? '📋' : '💻'}
                    </span>
                    <h3 style={styles.committeeName}>{info.name}</h3>
                  </div>
                  <p style={styles.committeeDesc}>{info.description}</p>
                  <div style={styles.functionList}>
                    <strong style={styles.functionTitle}>주요 기능:</strong>
                    <ul style={styles.functionItems}>
                      {info.keyFunctions.map((fn, idx) => (
                        <li key={idx} style={styles.functionItem}>{fn}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={styles.noteBox}>
            <strong>※ 추가 위원회</strong>
            <p>기본 위원회 외에 추가 위원회가 필요한 경우, "새 요청" 탭에서 신청할 수 있습니다.</p>
          </div>
        </div>
      )}

      {/* 요청 내역 탭 */}
      {activeTab === 'requests' && (
        <div style={styles.content}>
          {/* 필터 */}
          <div style={styles.filterBar}>
            <span style={styles.filterLabel}>상태:</span>
            {(['all', 'pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                style={{
                  ...styles.filterButton,
                  ...(statusFilter === status ? styles.filterButtonActive : {}),
                }}
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all' ? '전체' : REQUEST_STATUS_LABELS[status]}
              </button>
            ))}
          </div>

          {/* 요청 목록 */}
          <div style={styles.requestList}>
            {filteredRequests.length === 0 ? (
              <div style={styles.emptyState}>요청 내역이 없습니다.</div>
            ) : (
              filteredRequests.map((request) => (
                <div key={request.id} style={styles.requestCard}>
                  <div style={styles.requestHeader}>
                    <div style={styles.requestType}>
                      <span style={styles.requestTypeIcon}>
                        {request.requestType === 'create' ? '➕' : request.requestType === 'update' ? '✏️' : '🗑️'}
                      </span>
                      <span style={styles.requestTypeLabel}>
                        {REQUEST_TYPE_LABELS[request.requestType]}
                      </span>
                    </div>
                    {getStatusBadge(request.status)}
                  </div>

                  <div style={styles.requestBody}>
                    <div style={styles.requestCommittee}>
                      {request.committeeType === 'other'
                        ? request.committeeName
                        : COMMITTEE_TYPE_LABELS[request.committeeType as CommitteeType]}
                    </div>
                    <p style={styles.requestReason}>{request.reason}</p>
                  </div>

                  <div style={styles.requestFooter}>
                    <span style={styles.requestMeta}>
                      {request.requestedByName} · {new Date(request.requestedAt).toLocaleDateString('ko-KR')}
                    </span>
                    {request.reviewedAt && (
                      <span style={styles.requestReview}>
                        검토: {request.reviewedByName} ({new Date(request.reviewedAt).toLocaleDateString('ko-KR')})
                      </span>
                    )}
                  </div>

                  {request.reviewComment && (
                    <div style={styles.reviewComment}>
                      <strong>검토 의견:</strong> {request.reviewComment}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* 새 요청 탭 */}
      {activeTab === 'new-request' && (
        <div style={styles.content}>
          <div style={styles.formCard}>
            <h2 style={styles.formTitle}>위원회 변경 요청</h2>

            <div style={styles.formGroup}>
              <label style={styles.label}>요청 유형</label>
              <div style={styles.radioGroup}>
                {(['create', 'update', 'delete'] as const).map((type) => (
                  <label key={type} style={styles.radioLabel}>
                    <input
                      type="radio"
                      name="requestType"
                      value={type}
                      checked={newRequest.requestType === type}
                      onChange={() => setNewRequest({ ...newRequest, requestType: type })}
                      style={styles.radio}
                    />
                    <span>
                      {type === 'create' ? '➕ 신규 생성' : type === 'update' ? '✏️ 변경' : '🗑️ 폐지'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <div style={styles.formGroup}>
              <label style={styles.label}>위원회 유형</label>
              <select
                value={newRequest.committeeType}
                onChange={(e) => setNewRequest({ ...newRequest, committeeType: e.target.value as CommitteeType | 'other' })}
                style={styles.select}
              >
                <option value="academic">학술위원회</option>
                <option value="general">총무위원회</option>
                <option value="it">정보통신위원회</option>
                <option value="other">기타 (직접 입력)</option>
              </select>
            </div>

            {newRequest.committeeType === 'other' && (
              <div style={styles.formGroup}>
                <label style={styles.label}>위원회 이름</label>
                <input
                  type="text"
                  value={newRequest.committeeName}
                  onChange={(e) => setNewRequest({ ...newRequest, committeeName: e.target.value })}
                  placeholder="예: 복지위원회, 홍보위원회"
                  style={styles.input}
                />
              </div>
            )}

            <div style={styles.formGroup}>
              <label style={styles.label}>요청 사유</label>
              <textarea
                value={newRequest.reason}
                onChange={(e) => setNewRequest({ ...newRequest, reason: e.target.value })}
                placeholder="위원회 변경이 필요한 사유를 상세히 작성해 주세요."
                style={styles.textarea}
                rows={5}
              />
            </div>

            <div style={styles.formActions}>
              <button
                style={styles.submitButton}
                onClick={handleSubmitRequest}
                disabled={!newRequest.reason || (newRequest.committeeType === 'other' && !newRequest.committeeName)}
              >
                요청 제출
              </button>
              <p style={styles.formNote}>
                * 제출된 요청은 사이트 운영자가 검토 후 승인/반려 처리합니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '24px 32px',
  },
  header: {
    marginBottom: '24px',
  },
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  subtitle: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: '8px 0 0 0',
  },
  infoBanner: {
    display: 'flex',
    gap: '16px',
    padding: '16px 20px',
    backgroundColor: colors.primaryLight,
    borderRadius: '12px',
    marginBottom: '24px',
  },
  infoIcon: {
    fontSize: '24px',
    flexShrink: 0,
  },
  infoContent: {},
  infoText: {
    fontSize: '14px',
    color: colors.neutral700,
    margin: '8px 0 0 0',
    lineHeight: 1.6,
  },
  tabs: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    borderBottom: `1px solid ${colors.neutral200}`,
    paddingBottom: '12px',
  },
  tab: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    padding: '10px 20px',
    backgroundColor: 'transparent',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  tabActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
  },
  content: {},
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 8px 0',
  },
  sectionDesc: {
    fontSize: '14px',
    color: colors.neutral500,
    margin: '0 0 20px 0',
  },
  committeeGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
    gap: '20px',
    marginBottom: '24px',
  },
  committeeCard: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    padding: '20px',
  },
  committeeHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '12px',
  },
  committeeIcon: {
    fontSize: '28px',
  },
  committeeName: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  committeeDesc: {
    fontSize: '14px',
    color: colors.neutral600,
    margin: '0 0 16px 0',
  },
  functionList: {},
  functionTitle: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  functionItems: {
    margin: '8px 0 0 0',
    paddingLeft: '20px',
  },
  functionItem: {
    fontSize: '13px',
    color: colors.neutral700,
    marginBottom: '4px',
  },
  noteBox: {
    backgroundColor: colors.neutral50,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '8px',
    padding: '16px',
    fontSize: '14px',
    color: colors.neutral700,
  },
  filterBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginBottom: '20px',
  },
  filterLabel: {
    fontSize: '14px',
    color: colors.neutral600,
    marginRight: '8px',
  },
  filterButton: {
    padding: '6px 16px',
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '20px',
    fontSize: '13px',
    color: colors.neutral600,
    cursor: 'pointer',
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    color: colors.white,
  },
  requestList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '16px',
  },
  requestCard: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    padding: '20px',
  },
  requestHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '12px',
  },
  requestType: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  requestTypeIcon: {
    fontSize: '18px',
  },
  requestTypeLabel: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
  },
  badge: {
    padding: '4px 12px',
    borderRadius: '20px',
    fontSize: '12px',
    fontWeight: 500,
  },
  requestBody: {
    marginBottom: '12px',
  },
  requestCommittee: {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.neutral900,
    marginBottom: '8px',
  },
  requestReason: {
    fontSize: '14px',
    color: colors.neutral600,
    margin: 0,
    lineHeight: 1.6,
  },
  requestFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: '12px',
    borderTop: `1px solid ${colors.neutral100}`,
  },
  requestMeta: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  requestReview: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  reviewComment: {
    marginTop: '12px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    fontSize: '13px',
    color: colors.neutral700,
  },
  emptyState: {
    textAlign: 'center',
    padding: '40px',
    color: colors.neutral500,
    fontSize: '14px',
  },
  formCard: {
    backgroundColor: colors.white,
    border: `1px solid ${colors.neutral200}`,
    borderRadius: '12px',
    padding: '28px',
    maxWidth: '600px',
  },
  formTitle: {
    fontSize: '18px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 24px 0',
  },
  formGroup: {
    marginBottom: '20px',
  },
  label: {
    display: 'block',
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral700,
    marginBottom: '8px',
  },
  radioGroup: {
    display: 'flex',
    gap: '20px',
  },
  radioLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: colors.neutral700,
    cursor: 'pointer',
  },
  radio: {
    width: '16px',
    height: '16px',
  },
  select: {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    backgroundColor: colors.white,
  },
  input: {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    boxSizing: 'border-box',
  },
  textarea: {
    width: '100%',
    padding: '12px 16px',
    border: `1px solid ${colors.neutral300}`,
    borderRadius: '8px',
    fontSize: '14px',
    resize: 'vertical',
    boxSizing: 'border-box',
  },
  formActions: {
    marginTop: '24px',
  },
  submitButton: {
    padding: '12px 32px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: 500,
    cursor: 'pointer',
  },
  formNote: {
    fontSize: '13px',
    color: colors.neutral500,
    marginTop: '12px',
  },
};
