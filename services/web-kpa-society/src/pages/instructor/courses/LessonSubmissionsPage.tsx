/**
 * LessonSubmissionsPage — /instructor/courses/:courseId/lessons/:lessonId/submissions
 *
 * WO-O4O-LMS-ASSIGNMENT-GRADING-V1
 *
 * 강사가 특정 lesson의 과제 제출물을 보고 채점/피드백을 입력한다.
 * 정책:
 *   - submission == lesson 진도 완료 인정 (변경 없음)
 *   - grading == 평가/피드백 데이터 (수료/인증서/Credit 조건 아님)
 *   - 'returned' 또는 낮은 점수도 이미 지급된 Credit은 회수하지 않음
 */

import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  lmsInstructorApi,
  type InstructorSubmission,
  type GradingStatus,
} from '../../../api/lms-instructor';
import { colors, typography } from '../../../styles/theme';

const STATUS_BADGE: Record<GradingStatus, { label: string; bg: string; color: string }> = {
  ungraded: { label: '미채점', bg: '#f3f4f6', color: '#374151' },
  graded:   { label: '채점 완료', bg: '#dcfce7', color: '#15803d' },
  returned: { label: '재제출 요청', bg: '#fef3c7', color: '#92400e' },
};

export default function LessonSubmissionsPage() {
  const { courseId, lessonId } = useParams<{ courseId: string; lessonId: string }>();
  const navigate = useNavigate();

  const [items, setItems] = useState<InstructorSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<InstructorSubmission | null>(null);

  const load = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await lmsInstructorApi.listLessonSubmissions(lessonId);
      const list = (res as any).data?.data?.items ?? [];
      setItems(list);
    } catch (e: any) {
      const beMsg = e?.response?.data?.error || e?.message;
      setError(beMsg || '제출물을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  const handleGraded = async (next: InstructorSubmission) => {
    setItems((prev) => prev.map((it) => (it.id === next.id ? next : it)));
    setEditing(null);
  };

  if (loading) return <div style={s.loading}>제출물을 불러오는 중…</div>;

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <button style={s.backBtn} onClick={() => navigate(`/instructor/courses/${courseId}`)}>
          ← 강의 편집으로
        </button>
        <h1 style={s.title}>과제 제출물</h1>
      </div>

      {error && <div style={s.error}>{error}</div>}

      {items.length === 0 ? (
        <div style={s.empty}>아직 제출된 과제가 없습니다.</div>
      ) : (
        <div style={s.tableCard}>
          <table style={s.table}>
            <thead>
              <tr>
                <th style={s.th}>학생</th>
                <th style={s.th}>제출일</th>
                <th style={s.th}>채점 상태</th>
                <th style={s.th}>점수</th>
                <th style={s.th}></th>
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const badge = STATUS_BADGE[row.gradingStatus];
                return (
                  <tr key={row.id} style={s.tr}>
                    <td style={s.td}>{row.userName}</td>
                    <td style={s.td}>{new Date(row.submittedAt).toLocaleString('ko-KR')}</td>
                    <td style={s.td}>
                      <span style={{
                        padding: '2px 8px',
                        borderRadius: '10px',
                        fontSize: '12px',
                        fontWeight: 600,
                        backgroundColor: badge.bg,
                        color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={s.td}>{row.score !== null ? `${row.score} / 100` : '-'}</td>
                    <td style={s.td}>
                      <button style={s.gradeBtn} onClick={() => setEditing(row)}>
                        {row.gradingStatus === 'ungraded' ? '채점' : '재채점'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <GradingModal
          submission={editing}
          onClose={() => setEditing(null)}
          onSaved={handleGraded}
        />
      )}
    </div>
  );
}

// ── 채점 모달 ────────────────────────────────────────────────
function GradingModal({
  submission,
  onClose,
  onSaved,
}: {
  submission: InstructorSubmission;
  onClose: () => void;
  onSaved: (next: InstructorSubmission) => void;
}) {
  const [gradingStatus, setGradingStatus] = useState<'graded' | 'returned'>(
    submission.gradingStatus === 'returned' ? 'returned' : 'graded',
  );
  const [scoreInput, setScoreInput] = useState<string>(
    submission.score !== null && submission.score !== undefined ? String(submission.score) : '',
  );
  const [feedback, setFeedback] = useState<string>(submission.feedback ?? '');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const handleSave = async () => {
    setErr(null);
    if (gradingStatus === 'graded') {
      const n = parseInt(scoreInput, 10);
      if (Number.isNaN(n) || n < 0 || n > 100) {
        setErr('점수는 0~100 정수로 입력하세요.');
        return;
      }
    } else if (gradingStatus === 'returned') {
      if (!feedback.trim()) {
        setErr('재제출 요청 시 피드백 메시지가 필요합니다.');
        return;
      }
    }

    setSaving(true);
    try {
      const res = await lmsInstructorApi.gradeSubmission(submission.id, {
        gradingStatus,
        score: gradingStatus === 'graded' ? parseInt(scoreInput, 10) : null,
        feedback: feedback.trim() || null,
      });
      const updated = (res as any).data?.data?.submission ?? null;
      if (updated) {
        onSaved({
          ...submission,
          gradingStatus: updated.gradingStatus,
          score: updated.score,
          feedback: updated.feedback,
          gradedAt: updated.gradedAt,
          gradedBy: updated.gradedBy,
        });
      } else {
        onClose();
      }
    } catch (e: any) {
      setErr(e?.response?.data?.error || '채점 저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <h2 style={s.modalTitle}>{submission.userName} — 과제 채점</h2>

        <div style={s.field}>
          <label style={s.label}>제출 내용</label>
          <div style={s.contentBox}>{submission.content || '(빈 제출)'}</div>
        </div>

        <div style={s.field}>
          <label style={s.label}>처리 유형</label>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={s.radio}>
              <input type="radio" checked={gradingStatus === 'graded'} onChange={() => setGradingStatus('graded')} />
              채점 완료 (점수 부여)
            </label>
            <label style={s.radio}>
              <input type="radio" checked={gradingStatus === 'returned'} onChange={() => setGradingStatus('returned')} />
              재제출 요청
            </label>
          </div>
        </div>

        {gradingStatus === 'graded' && (
          <div style={s.field}>
            <label style={s.label}>점수 (0–100)</label>
            <input
              type="number"
              min={0}
              max={100}
              step={1}
              value={scoreInput}
              onChange={(e) => setScoreInput(e.target.value)}
              style={s.input}
            />
          </div>
        )}

        <div style={s.field}>
          <label style={s.label}>피드백 {gradingStatus === 'returned' ? '(필수)' : '(선택)'}</label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            style={s.textarea}
            placeholder="학생에게 전달할 피드백을 입력하세요."
          />
        </div>

        {err && <div style={s.modalError}>{err}</div>}

        <div style={s.actions}>
          <button style={s.cancelBtn} onClick={onClose} disabled={saving}>취소</button>
          <button style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { padding: '24px 0' },
  loading: { padding: 60, textAlign: 'center', color: colors.neutral400 },
  headerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn: {
    padding: '6px 12px', fontSize: 13, color: colors.neutral600,
    backgroundColor: colors.neutral100, border: 'none', borderRadius: 6, cursor: 'pointer',
  },
  title: { fontSize: 22, fontWeight: 700, color: colors.neutral900, margin: 0 },
  error: { padding: '12px 16px', backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', marginBottom: 16, fontSize: 14 },
  empty: { padding: 48, textAlign: 'center', color: colors.neutral500, backgroundColor: colors.white, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  tableCard: { backgroundColor: colors.white, borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: colors.neutral600, backgroundColor: colors.neutral50, borderBottom: `1px solid ${colors.neutral200}` },
  tr: { borderBottom: `1px solid ${colors.neutral100}` },
  td: { padding: '12px 16px', fontSize: 14, color: colors.neutral800 },
  gradeBtn: {
    padding: '5px 12px', fontSize: 12, fontWeight: 500,
    color: colors.primary, backgroundColor: 'transparent',
    border: `1px solid ${colors.primary}`, borderRadius: 6, cursor: 'pointer',
  },
  modalOverlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { backgroundColor: colors.white, borderRadius: 12, padding: 28, width: 560, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto' as const },
  modalTitle: { fontSize: 18, fontWeight: 700, color: colors.neutral900, marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: colors.neutral700, marginBottom: 6 },
  contentBox: { padding: 12, backgroundColor: colors.neutral50, borderRadius: 8, fontSize: 14, color: colors.neutral800, whiteSpace: 'pre-wrap' as const, maxHeight: 180, overflowY: 'auto' as const, border: `1px solid ${colors.neutral200}` },
  radio: { ...typography.bodyM, color: colors.neutral700, display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  input: { width: '100%', padding: '9px 12px', fontSize: 14, border: `1px solid ${colors.neutral300}`, borderRadius: 6, boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: '9px 12px', fontSize: 14, border: `1px solid ${colors.neutral300}`, borderRadius: 6, resize: 'vertical' as const, minHeight: 100, boxSizing: 'border-box' as const },
  modalError: { padding: '8px 12px', backgroundColor: '#fef2f2', color: '#dc2626', fontSize: 13, borderRadius: 6, marginBottom: 12 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { padding: '9px 18px', fontSize: 14, color: colors.neutral600, backgroundColor: colors.neutral100, border: 'none', borderRadius: 6, cursor: 'pointer' },
  saveBtn: { padding: '9px 18px', fontSize: 14, fontWeight: 500, color: colors.white, backgroundColor: colors.primary, border: 'none', borderRadius: 6, cursor: 'pointer' },
};
