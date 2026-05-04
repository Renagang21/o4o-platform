/**
 * CourseStructureAiModal — 강의 구조(레슨 목록) AI 생성 모달
 *
 * WO-O4O-LMS-COURSE-STRUCTURE-AI-V2
 *
 * 정책:
 *  - 자동 저장 금지. 사용자가 체크 → "선택한 레슨 추가" 클릭 시에만 createLesson 호출
 *  - 입력: URL 또는 주제 텍스트 (탭 전환)
 *  - 출력: 5~8개 레슨 (제목 + 요약)
 *  - 본문 / 영상 / 퀴즈 / 과제 자동 생성하지 않음
 */

import React, { useState } from 'react';

const API_BASE_URL =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_API_BASE_URL) ||
  'https://api.neture.co.kr';

export interface GeneratedLesson {
  title: string;
  summary: string;
}

export interface CourseStructureAiModalProps {
  open: boolean;
  onClose: () => void;
  /** 사용자가 선택 후 "추가" 클릭 시 호출. 호출자가 createLesson 일괄 호출. */
  onConfirm: (selected: GeneratedLesson[]) => Promise<void>;
}

type SourceTab = 'topic' | 'url';

export default function CourseStructureAiModal({ open, onClose, onConfirm }: CourseStructureAiModalProps) {
  const [tab, setTab] = useState<SourceTab>('topic');
  const [topic, setTopic] = useState('');
  const [url, setUrl] = useState('');
  const [generating, setGenerating] = useState(false);
  const [lessons, setLessons] = useState<GeneratedLesson[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [adding, setAdding] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  if (!open) return null;

  const handleClose = () => {
    setTab('topic');
    setTopic('');
    setUrl('');
    setLessons([]);
    setSelected(new Set());
    setErr(null);
    setGenerating(false);
    setAdding(false);
    onClose();
  };

  const handleGenerate = async () => {
    setErr(null);
    const inputValue = tab === 'topic' ? topic.trim() : url.trim();
    if (!inputValue) {
      setErr(tab === 'topic' ? '주제를 입력해 주세요.' : 'URL을 입력해 주세요.');
      return;
    }
    if (tab === 'url') {
      try { new URL(inputValue); } catch {
        setErr('올바른 URL 형식이 아닙니다. (예: https://example.com)');
        return;
      }
    }

    setGenerating(true);
    setLessons([]);
    setSelected(new Set());

    try {
      const res = await fetch(`${API_BASE_URL}/api/ai/course-structure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ input: inputValue, type: tab }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || '강의 구조 생성에 실패했습니다.');
      }
      const list: GeneratedLesson[] = Array.isArray(data.lessons) ? data.lessons : [];
      setLessons(list);
      // 기본 모두 선택 (사용자가 체크 해제할 수 있음)
      setSelected(new Set(list.map((_, i) => i)));
    } catch (e: any) {
      setErr(e?.message || '강의 구조 생성 중 오류가 발생했습니다.');
    } finally {
      setGenerating(false);
    }
  };

  const toggleSelect = (idx: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleAdd = async () => {
    if (selected.size === 0) {
      setErr('추가할 레슨을 1개 이상 선택해 주세요.');
      return;
    }
    setErr(null);
    setAdding(true);
    try {
      const picked = Array.from(selected)
        .sort((a, b) => a - b) // 원본 순서 유지
        .map((i) => lessons[i])
        .filter(Boolean);
      await onConfirm(picked);
      handleClose();
    } catch (e: any) {
      setErr(e?.response?.data?.error || e?.message || '레슨 추가에 실패했습니다.');
    } finally {
      setAdding(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div onClick={!adding && !generating ? handleClose : undefined} style={s.backdrop} />

      {/* Modal */}
      <div style={s.modal}>
        {/* Header */}
        <div style={s.header}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: 18 }}>🧱</span>
            <span style={{ fontWeight: 600, fontSize: 15, color: '#111827' }}>AI로 강의 구조 만들기</span>
          </div>
          <button type="button" onClick={handleClose} style={s.closeBtn} disabled={adding || generating}>×</button>
        </div>

        {/* Body */}
        <div style={s.body}>
          {/* 입력 단계 — 결과가 없을 때 표시 */}
          {lessons.length === 0 && (
            <>
              <div style={s.tabs}>
                {(['topic', 'url'] as SourceTab[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setTab(t); setErr(null); }}
                    style={{
                      ...s.tab,
                      ...(tab === t ? s.tabActive : {}),
                    }}
                  >
                    {t === 'topic' ? '주제로' : 'URL로'}
                  </button>
                ))}
              </div>

              {tab === 'topic' ? (
                <div style={s.field}>
                  <label style={s.label}>강의 주제</label>
                  <textarea
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="예: '약사 신규 직원 OJT', '글로보아이 30일 학습 가이드'"
                    rows={3}
                    style={s.textarea}
                  />
                  <p style={s.hint}>학습자가 무엇을 배워야 하는지 한 두 줄로 작성하세요.</p>
                </div>
              ) : (
                <div style={s.field}>
                  <label style={s.label}>참고 URL</label>
                  <input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/article"
                    style={s.input}
                  />
                  <p style={s.hint}>해당 URL의 본문을 분석하여 5~8개의 레슨 구조를 제안합니다.</p>
                </div>
              )}

              <button
                type="button"
                onClick={handleGenerate}
                disabled={generating || (tab === 'topic' ? !topic.trim() : !url.trim())}
                style={{
                  ...s.primaryBtn,
                  ...(generating || (tab === 'topic' ? !topic.trim() : !url.trim()) ? s.primaryBtnDisabled : {}),
                }}
              >
                {generating ? '생성 중...' : '✨ 강의 구조 생성'}
              </button>
            </>
          )}

          {/* 결과 단계 — 레슨 목록 + 체크 */}
          {lessons.length > 0 && (
            <>
              <div style={s.resultHeader}>
                <span style={{ color: '#16a34a', fontSize: 13 }}>✓</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: '#15803d' }}>
                  {lessons.length}개의 레슨 후보 — 추가할 레슨을 선택하세요
                </span>
              </div>

              <div style={s.lessonList}>
                {lessons.map((l, i) => (
                  <label key={i} style={s.lessonRow}>
                    <input
                      type="checkbox"
                      checked={selected.has(i)}
                      onChange={() => toggleSelect(i)}
                      style={{ marginTop: 4, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.lessonTitleText}>{l.title}</div>
                      {l.summary && <div style={s.lessonSummaryText}>{l.summary}</div>}
                    </div>
                  </label>
                ))}
              </div>

              <div style={s.selectActions}>
                <button type="button" onClick={() => setSelected(new Set(lessons.map((_, i) => i)))} style={s.linkBtn}>
                  모두 선택
                </button>
                <button type="button" onClick={() => setSelected(new Set())} style={s.linkBtn}>
                  모두 해제
                </button>
                <button type="button" onClick={() => { setLessons([]); setSelected(new Set()); }} style={s.linkBtn}>
                  ← 다시 입력
                </button>
              </div>
            </>
          )}

          {err && <div style={s.error}>{err}</div>}

          <p style={s.disclaimer}>
            AI가 생성한 구조는 참고용입니다. 추가 후 각 레슨의 본문/영상은 따로 편집할 수 있습니다.
          </p>
        </div>

        {/* Footer */}
        <div style={s.footer}>
          <button type="button" onClick={handleClose} disabled={adding || generating} style={s.cancelBtn}>
            취소
          </button>
          {lessons.length > 0 && (
            <button
              type="button"
              onClick={handleAdd}
              disabled={adding || selected.size === 0}
              style={{
                ...s.primaryBtn,
                ...(adding || selected.size === 0 ? s.primaryBtnDisabled : {}),
                marginTop: 0,
              }}
            >
              {adding ? '추가 중...' : `선택한 레슨 추가 (${selected.size})`}
            </button>
          )}
        </div>
      </div>
    </>
  );
}

const s: Record<string, React.CSSProperties> = {
  backdrop: { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 1100 },
  modal: {
    position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
    width: 600, maxWidth: '92vw', maxHeight: '85vh',
    background: 'white', borderRadius: 12, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', zIndex: 1101,
    display: 'flex', flexDirection: 'column',
  },
  header: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid #e5e7eb', flexShrink: 0 },
  closeBtn: { border: 'none', background: 'none', cursor: 'pointer', fontSize: 20, color: '#6b7280', lineHeight: 1 },
  body: { padding: 20, display: 'flex', flexDirection: 'column' as const, gap: 16, overflowY: 'auto' as const },
  tabs: { display: 'flex', border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden' },
  tab: { flex: 1, padding: '8px 12px', fontSize: 13, fontWeight: 400, background: '#f9fafb', color: '#6b7280', border: 'none', cursor: 'pointer' },
  tabActive: { background: '#4f46e5', color: 'white', fontWeight: 600 },
  field: { display: 'flex', flexDirection: 'column' as const, gap: 6 },
  label: { fontSize: 13, fontWeight: 500, color: '#374151' },
  input: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, boxSizing: 'border-box' as const },
  textarea: { width: '100%', padding: '10px 12px', border: '1px solid #d1d5db', borderRadius: 6, fontSize: 14, fontFamily: 'inherit', resize: 'vertical' as const, boxSizing: 'border-box' as const },
  hint: { fontSize: 12, color: '#9ca3af', margin: '4px 0 0' },
  primaryBtn: { padding: '10px 20px', background: '#4f46e5', color: 'white', border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 },
  primaryBtnDisabled: { background: '#d1d5db', cursor: 'not-allowed' },
  resultHeader: { padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 6 },
  lessonList: { display: 'flex', flexDirection: 'column' as const, gap: 8, maxHeight: 320, overflowY: 'auto' as const },
  lessonRow: { display: 'flex', gap: 10, padding: 12, border: '1px solid #e5e7eb', borderRadius: 8, cursor: 'pointer', alignItems: 'flex-start', background: 'white' },
  lessonTitleText: { fontSize: 14, fontWeight: 600, color: '#111827', marginBottom: 4 },
  lessonSummaryText: { fontSize: 13, color: '#6b7280', lineHeight: 1.5 },
  selectActions: { display: 'flex', gap: 12, alignItems: 'center', fontSize: 12 },
  linkBtn: { padding: '4px 8px', fontSize: 12, color: '#4f46e5', background: 'transparent', border: 'none', cursor: 'pointer', textDecoration: 'underline' },
  error: { padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 6, fontSize: 13, color: '#dc2626' },
  disclaimer: { fontSize: 11, color: '#9ca3af', margin: 0, textAlign: 'center' as const },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '12px 20px', borderTop: '1px solid #e5e7eb', background: '#f9fafb', flexShrink: 0 },
  cancelBtn: { padding: '8px 16px', border: '1px solid #d1d5db', borderRadius: 6, background: 'white', fontSize: 14, cursor: 'pointer', color: '#374151' },
};
