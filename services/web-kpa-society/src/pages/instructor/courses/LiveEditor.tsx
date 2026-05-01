/**
 * LiveEditor — 강사용 라이브 에디터
 *
 * WO-O4O-LMS-LIVE-MINIMAL-V1
 *
 * 최소 구조: 시작/종료 일시 + YouTube URL.
 * 별도 테이블 없음 — lms_lessons.liveStartAt/liveEndAt/liveUrl 직접 사용.
 */

import React, { useEffect, useState, useCallback } from 'react';
import { lmsInstructorApi, type LiveDto } from '../../../api/lms-instructor';

interface Props {
  lessonId: string;
}

const s: Record<string, React.CSSProperties> = {
  wrap: { marginTop: 24, padding: 16, background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10 },
  title: { fontSize: 14, fontWeight: 700, color: '#374151', marginBottom: 12 },
  field: { display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 },
  label: { fontSize: 13, fontWeight: 600, color: '#374151' },
  input: { padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, color: '#111827', outline: 'none' },
  saveBtn: { padding: '8px 18px', background: '#4f46e5', color: '#fff', border: 'none', borderRadius: 7, fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  msg: { fontSize: 13, marginLeft: 10 },
  hint: { fontSize: 12, color: '#6b7280', marginTop: 4 },
  row: { display: 'flex', gap: 12 },
  rowField: { flex: 1, display: 'flex', flexDirection: 'column' as const, gap: 6 },
};

function toLocalInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isYoutubeUrl(input: string): boolean {
  if (!input) return false;
  try {
    const u = new URL(input.trim());
    return ['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(u.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export default function LiveEditor({ lessonId }: Props) {
  const [live, setLive] = useState<LiveDto | null>(null);
  const [startLocal, setStartLocal] = useState('');
  const [endLocal, setEndLocal] = useState('');
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lmsInstructorApi.getLiveForLesson(lessonId);
      const l = (res as any).data?.data?.live ?? null;
      if (l) {
        setLive(l);
        setStartLocal(toLocalInput(l.liveStartAt));
        setEndLocal(toLocalInput(l.liveEndAt));
        setUrl(l.liveUrl || '');
      }
    } catch {
      // 404 = 아직 미설정
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async () => {
    setMsg(null);
    if (!startLocal || !endLocal || !url.trim()) {
      setMsg('시작/종료 일시와 YouTube URL을 모두 입력하세요.'); return;
    }
    const start = new Date(startLocal);
    const end = new Date(endLocal);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start >= end) {
      setMsg('시작 시간은 종료 시간보다 빨라야 합니다.'); return;
    }
    if (!isYoutubeUrl(url)) {
      setMsg('YouTube URL만 허용됩니다 (youtube.com 또는 youtu.be).'); return;
    }

    setSaving(true);
    try {
      const res = await lmsInstructorApi.upsertLive(lessonId, {
        liveStartAt: start.toISOString(),
        liveEndAt: end.toISOString(),
        liveUrl: url.trim(),
      });
      const saved = (res as any).data?.data?.live ?? null;
      if (saved) setLive(saved);
      setMsg('저장되었습니다.');
      setTimeout(() => setMsg(null), 2000);
    } catch (e: any) {
      setMsg(e?.response?.data?.error || '저장 실패');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div style={s.wrap}>라이브 정보를 불러오는 중…</div>;

  return (
    <div style={s.wrap}>
      <div style={s.title}>라이브 설정</div>

      <div style={s.row}>
        <div style={s.rowField}>
          <label style={s.label}>시작 일시</label>
          <input
            style={s.input}
            type="datetime-local"
            value={startLocal}
            onChange={(e) => setStartLocal(e.target.value)}
          />
        </div>
        <div style={s.rowField}>
          <label style={s.label}>종료 일시</label>
          <input
            style={s.input}
            type="datetime-local"
            value={endLocal}
            onChange={(e) => setEndLocal(e.target.value)}
          />
        </div>
      </div>

      <div style={s.field}>
        <label style={s.label}>YouTube URL</label>
        <input
          style={s.input}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.youtube.com/watch?v=..."
        />
        <div style={s.hint}>youtube.com 또는 youtu.be URL만 허용됩니다.</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', marginTop: 4 }}>
        <button style={s.saveBtn} disabled={saving} onClick={handleSave}>
          {saving ? '저장 중…' : live ? '라이브 수정' : '라이브 저장'}
        </button>
        {msg && (
          <span style={{ ...s.msg, color: msg === '저장되었습니다.' ? '#10b981' : '#ef4444' }}>{msg}</span>
        )}
      </div>

      <div style={{ ...s.hint, marginTop: 10 }}>
        예정 → 안내 / 진행중 → 참여 버튼 / 종료 → 다시보기로 자동 표시됩니다.
      </div>
    </div>
  );
}
