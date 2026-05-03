/**
 * AssignmentEditor — 강사용 과제 에디터
 *
 * WO-O4O-LMS-ASSIGNMENT-MINIMAL-V1
 *
 * 최소 구조: 설명(textarea) + 마감일(optional). 제출 방식 = text 고정.
 * Quiz Builder와 동일하게 lesson 편집 모달 안에 mount.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lmsInstructorApi, type AssignmentDto } from '../../../api/lms-instructor';

interface Props {
  lessonId: string;
}

const s: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 24, padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10 },
  title: { fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  textarea: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none', resize: 'vertical', minHeight: 100 },
  input: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none' },
  saveBtn: { padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  msg: { fontSize: 13, marginLeft: 10 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 4 },
};

// 'YYYY-MM-DDTHH:mm' for <input type="datetime-local">
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function AssignmentEditor({ lessonId }: Props) {
  // WO-O4O-LMS-ASSIGNMENT-GRADING-V1: courseId from URL for submission grading entry
  const { id: courseId } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<AssignmentDto | null>(null);
  const [instructions, setInstructions] = useState('');
  const [dueLocal, setDueLocal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lmsInstructorApi.getAssignmentForLesson(lessonId);
      const a = (res as any).data?.data?.assignment ?? null;
      if (a) {
        setAssignment(a);
        setInstructions(a.instructions || '');
        setDueLocal(toLocalInput(a.dueDate));
      }
    } catch {
      // 404 = 아직 없음
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const dueDate = dueLocal ? new Date(dueLocal).toISOString() : null;
      const res = await lmsInstructorApi.upsertAssignment({
        lessonId,
        instructions: instructions.trim() || null,
        dueDate,
      });
      const saved = (res as any).data?.data?.assignment ?? null;
      if (saved) setAssignment(saved);
      setMsg('저장되었습니다.');
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setMsg(e?.response?.data?.error || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={s.wrap}>과제 정보를 불러오는 중…</div>;

  return (
    <div style={s.wrap}>
      <div style={s.title}>과제 설정</div>

      <div style={s.field}>
        <label style={s.label}>과제 설명</label>
        <textarea
          style={s.textarea}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="수강자에게 보여줄 과제 설명을 입력하세요."
        />
      </div>

      <div style={s.field}>
        <label style={s.label}>마감일 (선택)</label>
        <input
          style={s.input}
          type="datetime-local"
          value={dueLocal}
          onChange={(e) => setDueLocal(e.target.value)}
        />
        <div style={s.hint}>비워두면 마감일 없이 운영됩니다.</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
        <button style={s.saveBtn} disabled={saving} onClick={handleSave}>
          {saving ? '저장 중…' : assignment ? '과제 수정' : '과제 저장'}
        </button>
        {msg && (
          <span style={{ ...s.msg, color: msg === '저장되었습니다.' ? '#10b981' : '#ef4444' }}>{msg}</span>
        )}
      </div>

      <div style={{ ...s.hint, marginTop: 10 }}>
        제출 방식은 텍스트 입력만 지원합니다. 파일 업로드는 후속 단계에서 추가됩니다.
      </div>

      {/* WO-O4O-LMS-ASSIGNMENT-GRADING-V1: 채점 페이지 진입점 */}
      {assignment && courseId && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
          <button
            style={{
              padding: '7px 14px',
              fontSize: 13,
              fontWeight: 500,
              color: '#4f46e5',
              backgroundColor: 'transparent',
              border: '1px solid #4f46e5',
              borderRadius: 7,
              cursor: 'pointer',
            }}
            onClick={() => navigate(`/instructor/courses/${courseId}/lessons/${lessonId}/submissions`)}
          >
            📝 제출물 채점
          </button>
          <span style={{ ...s.hint, marginLeft: 10 }}>
            학생 제출물 확인 / 점수 입력 / 피드백 / 재제출 요청
          </span>
        </div>
      )}
    </div>
  );
}
