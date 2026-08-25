/**
 * InstructorSubmissionsPage — /instructor/courses/:courseId/lessons/:lessonId/submissions
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#40)
 *   강사가 과제 제출물을 확인하고 채점·피드백·재제출 요청을 입력한다.
 *   계약은 공통 `/api/v1/lms/instructor/{lessons/:id/submissions, submissions/:id/grade}`
 *   (requireInstructor · 서비스 중립) 이며 PH 전용 endpoint 를 만들지 않는다.
 *
 * 정책(백엔드 소관 — 화면이 재해석하지 않는다):
 *   - 제출 = 레슨 진도 완료 인정
 *   - 채점 = 평가·피드백 축이며 수료·수료증·크레딧 조건이 아니다
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { lmsApi } from '../../api/lms';
import type { GradingStatus, InstructorSubmission } from '../../api/lms';

const C = { primary: '#0d9488', primaryDark: '#0f766e' };

const STATUS_BADGE: Record<GradingStatus, { label: string; bg: string; color: string }> = {
  ungraded: { label: '미채점', bg: '#f3f4f6', color: '#374151' },
  graded: { label: '채점 완료', bg: '#dcfce7', color: '#15803d' },
  returned: { label: '재제출 요청', bg: '#fef3c7', color: '#92400e' },
};

export default function InstructorSubmissionsPage() {
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
      setItems(await lmsApi.instructorListLessonSubmissions(lessonId));
    } catch (e: any) {
      setError(e?.response?.data?.error || e?.message || '제출물을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  if (loading) return <div style={s.loading}>제출물을 불러오는 중...</div>;

  return (
    <div style={s.container}>
      <div style={s.headerRow}>
        <button type="button" style={s.backBtn} onClick={() => navigate(`/instructor/courses/${courseId}`)}>
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
                <th style={s.th}>수강자</th>
                <th style={s.th}>제출일</th>
                <th style={s.th}>채점 상태</th>
                <th style={s.th}>점수</th>
                <th style={s.th} />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const badge = STATUS_BADGE[row.gradingStatus] ?? STATUS_BADGE.ungraded;
                return (
                  <tr key={row.id} style={s.tr}>
                    <td style={s.td}>{row.userName}</td>
                    <td style={s.td}>{new Date(row.submittedAt).toLocaleString('ko-KR')}</td>
                    <td style={s.td}>
                      <span style={{
                        padding: '2px 8px', borderRadius: 10, fontSize: 12, fontWeight: 600,
                        backgroundColor: badge.bg, color: badge.color,
                      }}>
                        {badge.label}
                      </span>
                    </td>
                    <td style={s.td}>{row.score !== null ? `${row.score} / 100` : '-'}</td>
                    <td style={s.td}>
                      <button type="button" style={s.gradeBtn} onClick={() => setEditing(row)}>
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
          onSaved={(next) => {
            setItems((prev) => prev.map((it) => (it.id === next.id ? next : it)));
            setEditing(null);
          }}
        />
      )}
    </div>
  );
}

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
  const [scoreInput, setScoreInput] = useState(
    submission.score !== null && submission.score !== undefined ? String(submission.score) : '',
  );
  const [feedback, setFeedback] = useState(submission.feedback ?? '');
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
    } else if (!feedback.trim()) {
      setErr('재제출 요청 시 피드백 메시지가 필요합니다.');
      return;
    }

    setSaving(true);
    try {
      const updated = await lmsApi.instructorGradeSubmission(submission.id, {
        gradingStatus,
        score: gradingStatus === 'graded' ? parseInt(scoreInput, 10) : null,
        feedback: feedback.trim() || null,
      });
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
            placeholder="수강자에게 전달할 피드백을 입력하세요."
          />
        </div>

        {err && <div style={s.modalError}>{err}</div>}

        <div style={s.actions}>
          <button type="button" style={s.cancelBtn} onClick={onClose} disabled={saving}>취소</button>
          <button
            type="button"
            style={{ ...s.saveBtn, opacity: saving ? 0.6 : 1 }}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? '저장 중...' : '저장'}
          </button>
        </div>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  container: { maxWidth: 900, margin: '0 auto', padding: '32px 20px' },
  loading: { padding: 60, textAlign: 'center', color: '#9ca3af' },
  headerRow: { display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 },
  backBtn: { padding: '6px 12px', fontSize: 13, color: '#4b5563', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer' },
  title: { fontSize: 22, fontWeight: 700, color: '#111827', margin: 0 },
  error: { padding: '12px 16px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, color: '#dc2626', marginBottom: 16, fontSize: 14 },
  empty: { padding: 48, textAlign: 'center', color: '#6b7280', background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' },
  tableCard: { background: '#fff', borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', overflow: 'hidden' },
  table: { width: '100%', borderCollapse: 'collapse' },
  th: { textAlign: 'left', padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#4b5563', background: '#f9fafb', borderBottom: '1px solid #e5e7eb' },
  tr: { borderBottom: '1px solid #f3f4f6' },
  td: { padding: '12px 16px', fontSize: 14, color: '#1f2937' },
  gradeBtn: { padding: '5px 12px', fontSize: 12, fontWeight: 500, color: C.primaryDark, background: 'transparent', border: `1px solid ${C.primary}`, borderRadius: 6, cursor: 'pointer' },
  modalOverlay: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 },
  modal: { background: '#fff', borderRadius: 12, padding: 28, width: 560, maxWidth: '92vw', maxHeight: '85vh', overflowY: 'auto' },
  modalTitle: { fontSize: 18, fontWeight: 700, color: '#111827', marginBottom: 20 },
  field: { marginBottom: 16 },
  label: { display: 'block', fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 },
  contentBox: { padding: 12, background: '#f9fafb', borderRadius: 8, fontSize: 14, color: '#1f2937', whiteSpace: 'pre-wrap', maxHeight: 180, overflowY: 'auto', border: '1px solid #e5e7eb' },
  radio: { fontSize: 14, color: '#374151', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer' },
  input: { width: '100%', padding: '9px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, boxSizing: 'border-box' },
  textarea: { width: '100%', padding: '9px 12px', fontSize: 14, border: '1px solid #d1d5db', borderRadius: 6, resize: 'vertical', minHeight: 100, boxSizing: 'border-box' },
  modalError: { padding: '8px 12px', background: '#fef2f2', color: '#dc2626', fontSize: 13, borderRadius: 6, marginBottom: 12 },
  actions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 },
  cancelBtn: { padding: '9px 18px', fontSize: 14, color: '#4b5563', background: '#f3f4f6', border: 'none', borderRadius: 6, cursor: 'pointer' },
  saveBtn: { padding: '9px 18px', fontSize: 14, fontWeight: 500, color: '#fff', background: C.primary, border: 'none', borderRadius: 6, cursor: 'pointer' },
};
