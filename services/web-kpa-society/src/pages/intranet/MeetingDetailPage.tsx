/**
 * MeetingDetailPage - 회의 상세
 * Work Order 5: 참여자 지정, 회의 자료 첨부, 회의 결과 메모
 */

import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { toast } from '@o4o/error-handling';
import { IntranetHeader } from '../../components/intranet';
import { useAuth } from '../../contexts/AuthContext';
import { colors } from '../../styles/theme';

interface Participant {
  id: string;
  name: string;
  role: string;
  attendance?: 'confirmed' | 'pending' | 'declined';
}

interface Attachment {
  id: string;
  name: string;
  size: string;
  type: string;
}

export function MeetingDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const userRole = user?.roles[0] || 'member';
  const canEdit = ['officer', 'chair', 'admin'].includes(userRole);

  // 샘플 회의 데이터
  const meeting = {
    id: id || '1',
    title: '1월 정기 이사회',
    date: '2025-01-10',
    time: '14:00 ~ 16:00',
    location: '본회의실 (3층)',
    status: 'scheduled' as const,
    description: `1월 정기 이사회를 개최합니다.

주요 안건:
1. 2024년 결산 보고
2. 2025년 사업계획 심의
3. 회칙 개정안 심의
4. 기타 안건`,
    participants: [
      { id: '1', name: '김지부장', role: '지부장', attendance: 'confirmed' },
      { id: '2', name: '이부지부장', role: '부지부장', attendance: 'confirmed' },
      { id: '3', name: '박총무', role: '총무', attendance: 'confirmed' },
      { id: '4', name: '최재무', role: '재무', attendance: 'pending' },
      { id: '5', name: '정이사', role: '이사', attendance: 'pending' },
    ] as Participant[],
    attachments: [
      { id: '1', name: '2024년 결산보고서.pdf', size: '2.5MB', type: 'pdf' },
      { id: '2', name: '2025년 사업계획(안).pdf', size: '1.8MB', type: 'pdf' },
      { id: '3', name: '회칙 개정안.hwp', size: '156KB', type: 'hwp' },
    ] as Attachment[],
    minutes: '',
    createdBy: '사무국',
    createdAt: '2025-01-03',
  };

  const [minutes, setMinutes] = useState(meeting.minutes);

  const getStatusBadge = (status: string) => {
    const config: Record<string, { bg: string; label: string }> = {
      scheduled: { bg: colors.primary, label: '예정' },
      ongoing: { bg: colors.accentYellow, label: '진행중' },
      completed: { bg: colors.neutral400, label: '완료' },
    };
    const { bg, label } = config[status];
    return <span style={{ ...styles.badge, backgroundColor: bg }}>{label}</span>;
  };

  const getAttendanceBadge = (attendance?: string) => {
    const config: Record<string, { bg: string; label: string }> = {
      confirmed: { bg: colors.accentGreen, label: '참석' },
      pending: { bg: colors.accentYellow, label: '대기' },
      declined: { bg: colors.accentRed, label: '불참' },
    };
    const { bg, label } = config[attendance || 'pending'];
    return <span style={{ ...styles.attendanceBadge, backgroundColor: bg }}>{label}</span>;
  };

  const handleSaveMinutes = () => {
    toast.info('회의록 저장 (UI 데모)');
  };

  return (
    <div>
      <IntranetHeader
        title="회의"
        subtitle="회의 상세"
        actions={
          <Link to="/intranet/meetings" style={styles.backButton}>
            ← 목록으로
          </Link>
        }
      />

      <div style={styles.content}>
        <div style={styles.mainGrid}>
          {/* 회의 정보 */}
          <div style={styles.mainSection}>
            <div style={styles.card}>
              <div style={styles.cardHeader}>
                <h1 style={styles.title}>{meeting.title}</h1>
                {getStatusBadge(meeting.status)}
              </div>

              <div style={styles.infoGrid}>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>📅 일시</span>
                  <span style={styles.infoValue}>{meeting.date} {meeting.time}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>📍 장소</span>
                  <span style={styles.infoValue}>{meeting.location}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>👤 작성자</span>
                  <span style={styles.infoValue}>{meeting.createdBy}</span>
                </div>
                <div style={styles.infoItem}>
                  <span style={styles.infoLabel}>📝 작성일</span>
                  <span style={styles.infoValue}>{meeting.createdAt}</span>
                </div>
              </div>

              <div style={styles.descriptionSection}>
                <h3 style={styles.sectionTitle}>회의 안건</h3>
                <pre style={styles.description}>{meeting.description}</pre>
              </div>

              {/* 첨부파일 */}
              {meeting.attachments.length > 0 && (
                <div style={styles.attachmentSection}>
                  <h3 style={styles.sectionTitle}>📎 회의 자료</h3>
                  <div style={styles.attachmentList}>
                    {meeting.attachments.map((file) => (
                      <a key={file.id} href="#" style={styles.attachmentItem}>
                        <span style={styles.fileIcon}>
                          {file.type === 'pdf' ? '📄' : '📝'}
                        </span>
                        <span style={styles.fileName}>{file.name}</span>
                        <span style={styles.fileSize}>{file.size}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* 회의록 (완료된 회의만) */}
              {canEdit && (
                <div style={styles.minutesSection}>
                  <h3 style={styles.sectionTitle}>📋 회의 결과 메모</h3>
                  <textarea
                    value={minutes}
                    onChange={(e) => setMinutes(e.target.value)}
                    placeholder="회의 결과를 기록하세요..."
                    style={styles.minutesInput}
                    rows={8}
                  />
                  <button style={styles.saveButton} onClick={handleSaveMinutes}>
                    저장
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 참석자 목록 */}
          <div style={styles.sideSection}>
            <div style={styles.card}>
              <h3 style={styles.cardTitle}>👥 참석자 ({meeting.participants.length}명)</h3>
              <div style={styles.participantList}>
                {meeting.participants.map((p) => (
                  <div key={p.id} style={styles.participantItem}>
                    <div style={styles.participantAvatar}>
                      {p.name.charAt(0)}
                    </div>
                    <div style={styles.participantInfo}>
                      <div style={styles.participantName}>{p.name}</div>
                      <div style={styles.participantRole}>{p.role}</div>
                    </div>
                    {getAttendanceBadge(p.attendance)}
                  </div>
                ))}
              </div>
            </div>

            {/* 관리 버튼 */}
            {canEdit && (
              <div style={styles.card}>
                <h3 style={styles.cardTitle}>⚙️ 관리</h3>
                <div style={styles.actionButtons}>
                  <button style={styles.editButton}>수정</button>
                  <button style={styles.deleteButton}>삭제</button>
                </div>
              </div>
            )}
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
  backButton: {
    padding: '10px 16px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    textDecoration: 'none',
    borderRadius: '8px',
    fontSize: '14px',
  },
  mainGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 320px',
    gap: '24px',
  },
  mainSection: {},
  sideSection: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
  },
  card: {
    backgroundColor: colors.white,
    borderRadius: '12px',
    padding: '24px',
    boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
  },
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    marginBottom: '20px',
  },
  title: {
    fontSize: '22px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: 0,
  },
  badge: {
    padding: '4px 12px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 500,
  },
  infoGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '16px',
    padding: '20px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    marginBottom: '24px',
  },
  infoItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  infoLabel: {
    fontSize: '13px',
    color: colors.neutral500,
  },
  infoValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral800,
  },
  sectionTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 12px 0',
  },
  descriptionSection: {
    marginBottom: '24px',
  },
  description: {
    fontFamily: 'inherit',
    fontSize: '14px',
    lineHeight: 1.7,
    color: colors.neutral700,
    whiteSpace: 'pre-wrap',
    margin: 0,
    padding: '16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  attachmentSection: {
    marginBottom: '24px',
  },
  attachmentList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  attachmentItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
    textDecoration: 'none',
    color: colors.neutral800,
  },
  fileIcon: {
    fontSize: '20px',
  },
  fileName: {
    flex: 1,
    fontSize: '14px',
  },
  fileSize: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  minutesSection: {
    paddingTop: '20px',
    borderTop: `1px solid ${colors.neutral200}`,
  },
  minutesInput: {
    width: '100%',
    padding: '12px 16px',
    borderRadius: '8px',
    border: `1px solid ${colors.neutral300}`,
    fontSize: '14px',
    lineHeight: 1.6,
    resize: 'vertical',
    boxSizing: 'border-box',
    marginBottom: '12px',
  },
  saveButton: {
    padding: '10px 24px',
    backgroundColor: colors.primary,
    color: colors.white,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    color: colors.neutral900,
    margin: '0 0 16px 0',
  },
  participantList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  participantItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px',
    backgroundColor: colors.neutral50,
    borderRadius: '8px',
  },
  participantAvatar: {
    width: '36px',
    height: '36px',
    backgroundColor: colors.primary,
    color: colors.white,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '14px',
    fontWeight: 600,
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: '14px',
    fontWeight: 500,
    color: colors.neutral900,
  },
  participantRole: {
    fontSize: '12px',
    color: colors.neutral500,
  },
  attendanceBadge: {
    padding: '4px 8px',
    color: colors.white,
    borderRadius: '4px',
    fontSize: '10px',
    fontWeight: 500,
  },
  actionButtons: {
    display: 'flex',
    gap: '8px',
  },
  editButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: colors.neutral200,
    color: colors.neutral700,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
  deleteButton: {
    flex: 1,
    padding: '10px',
    backgroundColor: colors.neutral100,
    color: colors.accentRed,
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    cursor: 'pointer',
  },
};
