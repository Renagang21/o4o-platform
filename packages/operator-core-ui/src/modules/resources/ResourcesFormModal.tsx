/**
 * ResourcesFormModal — 공통 자료 등록/편집 폼
 *
 * WO-O4O-PHARMACYHUB-COMMUNITY-AND-MY-STORE-FULL-PARITY-CLOSURE-V1 §3
 *
 * lifecycle.form 이 있는 원장만 사용한다. 필드 노출은 `form.fields` 가 결정하고
 * 본문 편집기는 주입받는다(공통 모듈은 편집기 구현을 모른다).
 * 서비스 분기 없음 — serviceKey 를 참조하지 않는다.
 */

import { useLayoutEffect, useState, useRef } from 'react';
import type React from 'react';
import { Loader2, X } from 'lucide-react';
import { toast } from '@o4o/error-handling';
import type { ResourcesFormConfig, ResourcesFormValue, ResourcesNouns } from './types';
import { DEFAULT_RESOURCES_NOUNS } from './types';

export interface ResourcesFormModalProps {
  open: boolean;
  config: ResourcesFormConfig;
  /** 편집 모드의 초기값. 없으면 신규 등록. */
  initial?: ResourcesFormValue | null;
  /** 편집 초기값 로딩 중 여부. */
  loading?: boolean;
  onClose: () => void;
  onSubmit: (value: ResourcesFormValue) => Promise<void>;
  /** 도메인 명사. 미지정 시 기존 문구("자료")를 그대로 쓴다. */
  nouns?: ResourcesNouns;
  error?: string | null;
}

const EMPTY: ResourcesFormValue = { title: '', summary: '', body: '', linkUrl: '', linkText: '' };

export function ResourcesFormModal({
  open,
  config,
  initial,
  loading = false,
  onClose,
  onSubmit,
  nouns = DEFAULT_RESOURCES_NOUNS,
  error,
}: ResourcesFormModalProps) {
  const [value, setValue] = useState<ResourcesFormValue>(EMPTY);
  const [saving, setSaving] = useState(false);
  const submitting = useRef(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useLayoutEffect(() => {
    if (!open) return;
    setSubmitError(null);
    setValue(initial ? { ...EMPTY, ...initial } : EMPTY);
  }, [open, initial]);

  if (!open) return null;

  const Editor = config.RichTextEditor;
  const isEdit = !!initial;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting.current || loading) return;
    if (!value.title.trim()) {
      toast.error('제목을 입력해 주세요');
      return;
    }
    submitting.current = true; setSubmitError(null); setSaving(true);
    try {
      await onSubmit({ ...value, title: value.title.trim() });
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '저장에 실패했습니다');
    } finally {
      submitting.current = false; setSaving(false);
    }
  };

  return (
    <div style={overlayStyle} role="dialog" aria-modal="true" aria-label={isEdit ? `${nouns.entity} 편집` : `${nouns.entity} 등록`}>
      <div style={panelStyle}>
        <div style={headerStyle}>
          <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1e293b', margin: 0 }}>
            {isEdit ? `${nouns.entity} 편집` : (config.createLabel ?? `새 ${nouns.entity}`)}
          </h2>
          <button type="button" disabled={saving} onClick={() => { if (!submitting.current) onClose(); }} style={iconBtnStyle} aria-label="닫기">
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 48, textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={24} className="animate-spin" style={{ margin: '0 auto 10px' }} />
            <p style={{ fontSize: 13 }}>{nouns.entity}를 불러오는 중...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ padding: 20, overflowY: 'auto' }}>
            {(error || submitError) && <p role="alert" style={{ color: '#b91c1c' }}>{error || submitError}</p>}
            <fieldset disabled={saving} style={{ border: 0, padding: 0, margin: 0 }}>
            <label style={labelStyle}>
              제목 <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <input
              type="text"
              value={value.title}
              onChange={(e) => { const next = e.target.value; setValue((v) => ({ ...v, title: next })); }}
              placeholder={`${nouns.entity} 제목`}
              style={inputStyle}
            />

            {config.fields.summary && (
              <>
                <label style={labelStyle}>요약</label>
                <textarea
                  value={value.summary ?? ''}
                  onChange={(e) => { const next = e.target.value; setValue((v) => ({ ...v, summary: next })); }}
                  placeholder="목록에 표시할 한 줄 요약"
                  rows={2}
                  style={{ ...inputStyle, resize: 'vertical' as const }}
                />
              </>
            )}

            {config.fields.body && Editor && (
              <>
                <label style={labelStyle}>본문</label>
                <div style={{ marginBottom: 14 }}>
                  <Editor
                    value={value.body ?? ''}
                    onChange={(v) => setValue((prev) => ({ ...prev, body: v.html }))}
                    preset="full"
                    minHeight="260px"
                    placeholder={`${nouns.entity} 본문을 작성하세요`}
                  />
                </div>
              </>
            )}

            {config.fields.link && (
              <>
                <label style={labelStyle}>외부 링크</label>
                <input
                  type="url"
                  value={value.linkUrl ?? ''}
                  onChange={(e) => { const next = e.target.value; setValue((v) => ({ ...v, linkUrl: next })); }}
                  placeholder="https://"
                  style={inputStyle}
                />
                <label style={labelStyle}>링크 표시 문구</label>
                <input
                  type="text"
                  value={value.linkText ?? ''}
                  onChange={(e) => { const next = e.target.value; setValue((v) => ({ ...v, linkText: next })); }}
                  placeholder="예) 원문 보기"
                  style={inputStyle}
                />
              </>
            )}

            {!isEdit && config.createHint && (
              <p style={{ fontSize: 12, color: '#64748b', margin: '4px 0 14px' }}>{config.createHint}</p>
            )}

            </fieldset>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 8 }}>
              <button type="button" disabled={saving} onClick={() => { if (!submitting.current) onClose(); }} style={cancelBtnStyle}>
                취소
              </button>
              <button type="submit" disabled={saving} style={{ ...submitBtnStyle, opacity: saving ? 0.6 : 1 }}>
                {saving ? '저장 중...' : '저장'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed',
  inset: 0,
  backgroundColor: 'rgba(15, 23, 42, 0.45)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 16,
};

const panelStyle: React.CSSProperties = {
  backgroundColor: '#fff',
  borderRadius: 12,
  width: '100%',
  maxWidth: 720,
  maxHeight: '90vh',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const headerStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '16px 20px',
  borderBottom: '1px solid #e2e8f0',
};

const iconBtnStyle: React.CSSProperties = {
  border: 'none',
  background: 'transparent',
  color: '#64748b',
  cursor: 'pointer',
  padding: 4,
  lineHeight: 0,
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: 13,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 6,
};

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '8px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  marginBottom: 14,
  boxSizing: 'border-box' as const,
  outline: 'none',
};

const cancelBtnStyle: React.CSSProperties = {
  padding: '8px 16px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  color: '#64748b',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

const submitBtnStyle: React.CSSProperties = {
  padding: '8px 18px',
  backgroundColor: '#2563eb',
  color: '#fff',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 600,
  border: 'none',
  cursor: 'pointer',
};
