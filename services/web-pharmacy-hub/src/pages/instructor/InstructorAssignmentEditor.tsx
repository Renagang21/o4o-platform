/**
 * InstructorAssignmentEditor — 강사용 과제 편집기 (Pharmacy-Hub)
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §4 (#40)
 *   과제 유형 레슨의 지시문·마감일을 정의하고, 제출물 채점 화면으로 넘어간다.
 *   계약은 공통 `/api/v1/lms/{lessons/:id/assignment, assignments}` 이고
 *   제출 방식은 backend 계약대로 text 고정이다 — 파일 업로드 UI 를 만들지 않는다.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { lmsApi } from '../../api/lms';
import type { InstructorAssignment } from '../../api/lms';

const C = { primary: '#0d9488', primaryDark: '#0f766e' };

const s: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 24, padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10 },
  title: { fontSize: 14, fontWeight: 700, color: C.primaryDark, marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  textarea: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none', resize: 'vertical', minHeight: 100 },
  input: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none' },
  saveBtn: { padding: '8px 18px', background: C.primary, color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  gradeBtn: { padding: '7px 14px', fontSize: 13, fontWeight: 500, color: C.primaryDark, background: 'transparent', border: `1px solid ${C.primary}`, borderRadius: 7, cursor: 'pointer' },
  msg: { fontSize: 13, marginLeft: 10 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 4 },
};

/** 'YYYY-MM-DDTHH:mm' — <input type="datetime-local"> 표시용. */
function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface Props {
  lessonId: string;
  courseId: string;
}

export default function InstructorAssignmentEditor({ lessonId, courseId }: Props) {
  const navigate = useNavigate();
  const [assignment, setAssignment] = useState<InstructorAssignment | null>(null);
  const [instructions, setInstructions] = useState('');
  const [dueLocal, setDueLocal] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const a = await lmsApi.instructorGetAssignmentForLesson(lessonId);
      if (a) {
        setAssignment(a);
        setInstructions(a.instructions || '');
        setDueLocal(toLocalInput(a.dueDate));
      }
    } catch {
      // 과제 미생성 — 신규 작성 모드로 둔다.
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    if (!instructions.trim()) {
      setMsg('과제 지시문을 입력하세요.');
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const saved = await lmsApi.instructorUpsertAssignment({
        lessonId,
        instructions: instructions.trim(),
        dueDate: dueLocal ? new Date(dueLocal).toISOString() : null,
      });
      if (saved) setAssignment(saved);
      setMsg('저장되었습니다.');
    } catch (e: any) {
      setMsg(e?.response?.data?.error || '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={{ color: '#9ca3af', fontSize: 13, marginTop: 16 }}>과제를 불러오는 중...</div>;

  return (
    <div style={s.wrap}>
      <div style={s.title}>과제 설정 {assignment ? '(수정)' : '(신규)'}</div>

      <div style={s.field}>
        <label style={s.label}>과제 지시문</label>
        <textarea
          style={s.textarea}
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="수강자가 무엇을 제출해야 하는지 설명하세요."
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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
        <button type="button" style={s.saveBtn} disabled={saving} onClick={handleSave}>
          {saving ? '저장 중...' : assignment ? '과제 수정' : '과제 저장'}
        </button>
        {msg && (
          <span style={{ ...s.msg, color: msg === '저장되었습니다.' ? '#10b981' : '#ef4444' }}>{msg}</span>
        )}
      </div>

      <div style={{ ...s.hint, marginTop: 10 }}>
        제출 방식은 텍스트 입력만 지원합니다(공통 계약).
      </div>

      {assignment && (
        <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #e5e7eb' }}>
          <button
            type="button"
            style={s.gradeBtn}
            onClick={() => navigate(`/instructor/courses/${courseId}/lessons/${lessonId}/submissions`)}
          >
            제출물 채점
          </button>
          <span style={{ ...s.hint, marginLeft: 10 }}>
            제출물 확인 / 점수 입력 / 피드백 / 재제출 요청
          </span>
        </div>
      )}
    </div>
  );
}
