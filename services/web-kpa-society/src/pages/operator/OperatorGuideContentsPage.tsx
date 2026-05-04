/**
 * OperatorGuideContentsPage — /operator/guide-contents
 *
 * WO-O4O-GUIDE-CONTENT-EDITOR-UI-V1
 *
 * 운영자가 GuideBlock 안내 문구를 폼으로 수정.
 * 1차 대상: KPA-Society LMS 레슨 생성/편집 화면 (5종: article/video/quiz/assignment/live).
 *
 * 저장 형식:
 *   POST /api/v1/guide/contents
 *   serviceKey='kpa-society', pageKey='lms.lesson.editor', sectionKey={lessonType}
 *   content = JSON.stringify({ title, description, steps[], variant })
 *
 * fallback 정책:
 *   - JSON parse 실패한 기존 plain text 항목은 안내 후 description에 임시 표시,
 *     저장 시 JSON 형식으로 덮어씀.
 *   - 빈 응답 / API 실패 시 빈 폼.
 */

import { useEffect, useMemo, useState } from 'react';
import { GuideBlock } from '@o4o/shared-space-ui';
import type { GuideBlockVariant } from '@o4o/shared-space-ui';
import { fetchGuidePageContent, saveGuideContent, clearGuidePageCache } from '../../api/guideContent';

const SERVICE_KEY = 'kpa-society';
const PAGE_KEY = 'lms.lesson.editor';

const TYPES = [
  { key: 'article', label: '문서' },
  { key: 'video', label: '동영상' },
  { key: 'quiz', label: '퀴즈' },
  { key: 'assignment', label: '과제' },
  { key: 'live', label: '라이브' },
] as const;

type LessonTypeKey = (typeof TYPES)[number]['key'];

interface GuideForm {
  title: string;
  description: string;
  /** textarea raw — 저장 시 줄 단위 split */
  stepsRaw: string;
  variant: GuideBlockVariant;
  /** JSON parse 실패한 기존 plain text 형식 */
  hasLegacy: boolean;
}

const EMPTY_FORM: GuideForm = {
  title: '',
  description: '',
  stepsRaw: '',
  variant: 'info',
  hasLegacy: false,
};

const VARIANT_OPTIONS: { value: GuideBlockVariant; label: string }[] = [
  { value: 'info',    label: 'Info (정보)' },
  { value: 'warning', label: 'Warning (주의)' },
  { value: 'success', label: 'Success (완료)' },
  { value: 'neutral', label: 'Neutral (중립)' },
];

const isVariant = (v: unknown): v is GuideBlockVariant =>
  v === 'info' || v === 'warning' || v === 'success' || v === 'neutral';

export default function OperatorGuideContentsPage() {
  const [activeType, setActiveType] = useState<LessonTypeKey>('article');
  const [forms, setForms] = useState<Record<LessonTypeKey, GuideForm>>({
    article:    { ...EMPTY_FORM },
    video:      { ...EMPTY_FORM },
    quiz:       { ...EMPTY_FORM },
    assignment: { ...EMPTY_FORM },
    live:       { ...EMPTY_FORM },
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 초기 fetch — 캐시 무효화 후 fresh 조회
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    clearGuidePageCache(SERVICE_KEY, PAGE_KEY);
    fetchGuidePageContent(SERVICE_KEY, PAGE_KEY)
      .then((sections) => {
        if (cancelled) return;
        setForms((prev) => {
          const next = { ...prev };
          for (const t of TYPES) {
            const raw = sections[t.key];
            if (!raw) {
              next[t.key] = { ...EMPTY_FORM };
              continue;
            }
            // JSON parse 시도
            try {
              const obj = JSON.parse(raw);
              if (obj && typeof obj === 'object') {
                const o = obj as Record<string, unknown>;
                next[t.key] = {
                  title:       typeof o.title === 'string' ? o.title : '',
                  description: typeof o.description === 'string' ? o.description : '',
                  stepsRaw:    Array.isArray(o.steps)
                    ? (o.steps as unknown[]).filter((s): s is string => typeof s === 'string').join('\n')
                    : '',
                  variant:     isVariant(o.variant) ? o.variant : 'info',
                  hasLegacy:   false,
                };
                continue;
              }
            } catch {
              /* parse 실패 → 아래 legacy 처리 */
            }
            // legacy plain text — description에 임시 표시
            next[t.key] = {
              title:       '',
              description: raw,
              stepsRaw:    '',
              variant:     'info',
              hasLegacy:   true,
            };
          }
          return next;
        });
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setErr((e as { message?: string })?.message ?? '데이터를 불러오지 못했습니다.');
        setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const current = forms[activeType];

  const update = (patch: Partial<GuideForm>) => {
    setForms((prev) => ({
      ...prev,
      [activeType]: { ...prev[activeType], ...patch, hasLegacy: false },
    }));
    setSavedAt(null);
  };

  const stepsArray = useMemo(
    () => current.stepsRaw.split('\n').map((s) => s.trim()).filter(Boolean),
    [current.stepsRaw],
  );

  const handleSave = async () => {
    setSaving(true);
    setErr(null);
    try {
      const payload = {
        title: current.title.trim(),
        description: current.description.trim(),
        steps: stepsArray,
        variant: current.variant,
      };
      await saveGuideContent(SERVICE_KEY, PAGE_KEY, activeType, JSON.stringify(payload));
      setSavedAt(new Date().toLocaleTimeString('ko-KR'));
    } catch (e) {
      setErr((e as { message?: string })?.message ?? '저장에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 20px' }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', margin: 0 }}>안내 문구 관리</h1>
        <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
          화면 안에 표시되는 도움말 문구를 관리합니다. LMS 레슨 작성 화면의 유형별 안내 문구를 수정할 수 있습니다.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        {TYPES.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => { setActiveType(t.key); setSavedAt(null); setErr(null); }}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeType === t.key ? '2px solid #4f46e5' : '2px solid transparent',
              background: 'transparent',
              fontSize: 14,
              fontWeight: activeType === t.key ? 600 : 500,
              color: activeType === t.key ? '#4f46e5' : '#64748b',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>불러오는 중…</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: 24 }}>
          {/* Form */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {current.hasLegacy && (
              <div style={{ padding: '8px 12px', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: 8, fontSize: 12, color: '#92400e' }}>
                기존 텍스트 형식으로 저장된 데이터입니다. 저장하면 JSON 형식으로 덮어씁니다.
              </div>
            )}

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>제목</label>
              <input
                type="text"
                value={current.title}
                onChange={(e) => update({ title: e.target.value })}
                placeholder="예: 퀴즈 레슨입니다."
                style={{ width: '100%', padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, boxSizing: 'border-box', outline: 'none' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>설명</label>
              <textarea
                value={current.description}
                onChange={(e) => update({ description: e.target.value })}
                placeholder="예: 이 화면에서는 퀴즈에 대한 설명을 작성합니다."
                rows={3}
                style={{ width: '100%', padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>
                단계 <span style={{ fontWeight: 400, color: '#94a3b8' }}>(한 줄에 하나씩)</span>
              </label>
              <textarea
                value={current.stepsRaw}
                onChange={(e) => update({ stepsRaw: e.target.value })}
                placeholder={'예:\n저장 후 문제와 정답을 설정할 수 있습니다.\n문제와 정답은 저장 다음 단계에서 입력합니다.'}
                rows={5}
                style={{ width: '100%', padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, boxSizing: 'border-box', outline: 'none', resize: 'vertical' }}
              />
            </div>

            <div>
              <label style={{ fontSize: 13, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 6 }}>색상 톤</label>
              <select
                value={current.variant}
                onChange={(e) => update({ variant: e.target.value as GuideBlockVariant })}
                style={{ padding: '9px 13px', border: '1px solid #d1d5db', borderRadius: 7, fontSize: 14, background: '#fff', outline: 'none', minWidth: 200 }}
              >
                {VARIANT_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>

            {err && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{err}</p>}
            {savedAt && <p style={{ color: '#15803d', fontSize: 13, margin: 0 }}>저장됨 — {savedAt}</p>}

            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                style={{
                  padding: '9px 18px',
                  background: saving ? '#c4b5fd' : '#4f46e5',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 7,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: saving ? 'not-allowed' : 'pointer',
                }}
              >
                {saving ? '저장 중…' : '저장'}
              </button>
            </div>
          </div>

          {/* Preview */}
          <div>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 8 }}>미리보기</div>
            <GuideBlock
              variant={current.variant}
              title={current.title.trim() || undefined}
              description={current.description.trim() || undefined}
              steps={stepsArray.length > 0 ? stepsArray : undefined}
            />
            <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 8 }}>
              레슨 생성/편집 화면 본문 입력 위에 같은 모양으로 표시됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
