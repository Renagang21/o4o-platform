/**
 * GuideContentsManager — 공통 운영자 안내 문구 관리 페이지
 *
 * WO-O4O-OPERATOR-GUIDE-CONTENTS-CORE-EXTRACTION-V1
 *
 * 4개 서비스(KPA / GlycoPharm / K-Cosmetics / Neture)에서
 * 동일 UI로 안내 문구를 관리하기 위한 공통 모듈.
 *
 * serviceKey / config / client 를 props로 주입받아 동작하며,
 * 데이터는 (serviceKey, config.pageKey, sectionKey) 튜플로 격리된다.
 *
 * 저장 형식 (sectionKey 별 JSON.stringify 후 단일 문자열):
 *   { title, description, steps[], variant }
 *
 * fallback 정책:
 *   - JSON parse 실패한 기존 plain text 항목은 안내 후 description에 임시 표시,
 *     저장 시 JSON 형식으로 덮어씀.
 *   - 빈 응답 / API 실패 시 빈 폼.
 */

import { useEffect, useMemo, useState } from 'react';
import { GuideBlock } from '@o4o/shared-space-ui';
import type { GuideBlockVariant } from '@o4o/shared-space-ui';
import type {
  GuideContentsManagerProps,
  GuideSection,
} from './types';

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

const DEFAULT_VARIANT_OPTIONS: { value: GuideBlockVariant; label: string }[] = [
  { value: 'info',    label: 'Info (정보)' },
  { value: 'warning', label: 'Warning (주의)' },
  { value: 'success', label: 'Success (완료)' },
  { value: 'neutral', label: 'Neutral (중립)' },
];

const isVariant = (v: unknown): v is GuideBlockVariant =>
  v === 'info' || v === 'warning' || v === 'success' || v === 'neutral';

const buildEmptyForms = (sections: GuideSection[]): Record<string, GuideForm> => {
  const out: Record<string, GuideForm> = {};
  for (const s of sections) out[s.key] = { ...EMPTY_FORM };
  return out;
};

export function GuideContentsManager({ serviceKey, config, client }: GuideContentsManagerProps) {
  const { pageKey, sections } = config;
  const variantOptions = config.variantOptions ?? DEFAULT_VARIANT_OPTIONS;

  const initialActive = sections[0]?.key ?? '';
  const [activeKey, setActiveKey] = useState<string>(initialActive);
  const [forms, setForms] = useState<Record<string, GuideForm>>(() => buildEmptyForms(sections));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  // 초기 fetch — 캐시 무효화 후 fresh 조회
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    client.clearGuidePageCache(serviceKey, pageKey);
    client.fetchGuidePageContent(serviceKey, pageKey)
      .then((sectionData) => {
        if (cancelled) return;
        setForms(() => {
          const next = buildEmptyForms(sections);
          for (const s of sections) {
            const raw = sectionData[s.key];
            if (!raw) continue;
            // JSON parse 시도
            try {
              const obj = JSON.parse(raw);
              if (obj && typeof obj === 'object') {
                const o = obj as Record<string, unknown>;
                next[s.key] = {
                  title:       typeof o.title === 'string' ? o.title : '',
                  description: typeof o.description === 'string' ? o.description : '',
                  stepsRaw:    Array.isArray(o.steps)
                    ? (o.steps as unknown[]).filter((x): x is string => typeof x === 'string').join('\n')
                    : '',
                  variant:     isVariant(o.variant) ? o.variant : 'info',
                  hasLegacy:   false,
                };
                continue;
              }
            } catch {
              /* parse 실패 → legacy 처리 */
            }
            // legacy plain text — description에 임시 표시
            next[s.key] = {
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
  }, [serviceKey, pageKey, sections, client]);

  const current = forms[activeKey] ?? EMPTY_FORM;

  const update = (patch: Partial<GuideForm>) => {
    setForms((prev) => ({
      ...prev,
      [activeKey]: { ...(prev[activeKey] ?? EMPTY_FORM), ...patch, hasLegacy: false },
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
      await client.saveGuideContent(serviceKey, pageKey, activeKey, JSON.stringify(payload));
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
          화면 안에 표시되는 도움말 문구를 관리합니다. 섹션별로 안내 문구를 수정할 수 있습니다.
        </p>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, borderBottom: '1px solid #e2e8f0', marginBottom: 20 }}>
        {sections.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => { setActiveKey(s.key); setSavedAt(null); setErr(null); }}
            style={{
              padding: '10px 16px',
              border: 'none',
              borderBottom: activeKey === s.key ? '2px solid #4f46e5' : '2px solid transparent',
              background: 'transparent',
              fontSize: 14,
              fontWeight: activeKey === s.key ? 600 : 500,
              color: activeKey === s.key ? '#4f46e5' : '#64748b',
              cursor: 'pointer',
              marginBottom: -1,
            }}
          >
            {s.label}
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
                {variantOptions.map((o) => (
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
              실제 화면 본문에 같은 모양으로 표시됩니다.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default GuideContentsManager;
