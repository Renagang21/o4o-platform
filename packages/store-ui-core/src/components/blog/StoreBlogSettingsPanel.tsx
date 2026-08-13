/**
 * StoreBlogSettingsPanel — 블로그 identity 설정 화면 (공통)
 * WO-O4O-MY-STORE-REMAINING-VIEW-DUPLICATION-ZERO-CLEANUP-V1
 * 원본 계약: WO-O4O-KPA-STORE-BLOG-META-V1 (blogName / description / heroImage / defaultTemplate)
 *
 * 서비스별로 다른 것은 **문구와 대표 이미지 업로드 지원 여부**뿐이었다.
 *   - 문구: labels 로 주입 (원문 그대로. 어느 한쪽으로 일괄 치환하지 않는다)
 *   - 업로드 버튼: heroUploadSlot 이 있는 서비스(KPA)만 렌더 — 없는 서비스에 새로 추가하지 않는다
 */

import type { ReactNode } from 'react';
import {
  storeBlogBtnStyle,
  storeBlogLabelStyle,
  storeBlogInputStyle,
  type StoreBlogSettings,
  type StoreBlogSettingsForm,
} from './storeBlogTypes';

export interface StoreBlogSettingsPanelLabels {
  /** 화면 설명 — 서비스별 원문 유지 */
  subtitle: string;
  blogNamePlaceholder: string;
  descriptionPlaceholder: string;
  heroImagePlaceholder: string;
  /** 대표 이미지 하단 안내 (없는 서비스는 생략) */
  heroImageHint?: string;
}

export interface StoreBlogSettingsPanelProps {
  form: StoreBlogSettingsForm;
  onFormChange: (updater: (prev: StoreBlogSettingsForm) => StoreBlogSettingsForm) => void;
  settings: StoreBlogSettings | null;
  loading: boolean;
  saving: boolean;
  message: { kind: 'success' | 'error'; text: string } | null;
  labels: StoreBlogSettingsPanelLabels;
  onSave: () => void;
  onBack: () => void;
  /** 대표 이미지 업로드 slot (KPA 만 보유) */
  heroUploadSlot?: ReactNode;
}

export function StoreBlogSettingsPanel({
  form,
  onFormChange,
  settings,
  loading,
  saving,
  message,
  labels,
  onSave,
  onBack,
  heroUploadSlot,
}: StoreBlogSettingsPanelProps) {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '24px' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 700, color: '#1e293b' }}>블로그 설정</h1>
        <button onClick={onBack} style={{ ...storeBlogBtnStyle, backgroundColor: '#f1f5f9', color: '#475569' }}>
          돌아가기
        </button>
      </div>

      <p style={{ fontSize: 13, color: '#64748b', marginBottom: 24, lineHeight: 1.6 }}>
        {labels.subtitle}
      </p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>불러오는 중...</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={storeBlogLabelStyle}>블로그 이름</label>
            <input
              type="text"
              value={form.blogName}
              onChange={(e) => onFormChange((f) => ({ ...f, blogName: e.target.value }))}
              placeholder={labels.blogNamePlaceholder}
              style={storeBlogInputStyle}
            />
          </div>
          <div>
            <label style={storeBlogLabelStyle}>소개</label>
            <textarea
              value={form.description}
              onChange={(e) => onFormChange((f) => ({ ...f, description: e.target.value }))}
              placeholder={labels.descriptionPlaceholder}
              rows={3}
              style={{ ...storeBlogInputStyle, resize: 'vertical', fontFamily: 'inherit' }}
            />
          </div>
          <div>
            <label style={storeBlogLabelStyle}>대표 이미지</label>
            {heroUploadSlot ? (
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                <input
                  type="text"
                  value={form.heroImage}
                  onChange={(e) => onFormChange((f) => ({ ...f, heroImage: e.target.value }))}
                  placeholder={labels.heroImagePlaceholder}
                  style={{ ...storeBlogInputStyle, flex: 1 }}
                />
                {heroUploadSlot}
              </div>
            ) : (
              <input
                type="text"
                value={form.heroImage}
                onChange={(e) => onFormChange((f) => ({ ...f, heroImage: e.target.value }))}
                placeholder={labels.heroImagePlaceholder}
                style={storeBlogInputStyle}
              />
            )}
            {form.heroImage && (
              <div style={{ marginTop: 8 }}>
                <img
                  src={form.heroImage}
                  alt="대표 이미지 미리보기"
                  style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, border: '1px solid #e2e8f0' }}
                />
              </div>
            )}
            {labels.heroImageHint && (
              <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 6 }}>{labels.heroImageHint}</p>
            )}
          </div>
          <div>
            <label style={storeBlogLabelStyle}>기본 템플릿</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['professional', 'modern'] as const).map((t) => (
                <label
                  key={t}
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: `1px solid ${form.defaultTemplate === t ? '#3b82f6' : '#e2e8f0'}`,
                    backgroundColor: form.defaultTemplate === t ? '#eff6ff' : '#fff',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <input
                    type="radio"
                    name="defaultTemplate"
                    value={t}
                    checked={form.defaultTemplate === t}
                    onChange={() => onFormChange((f) => ({ ...f, defaultTemplate: t }))}
                  />
                  <span style={{ fontSize: 14, fontWeight: 600, color: '#1e293b' }}>
                    {t === 'professional' ? 'Professional' : 'Modern'}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {message && (
            <div
              style={{
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 13,
                color: message.kind === 'success' ? '#15803d' : '#dc2626',
                background: message.kind === 'success' ? '#f0fdf4' : '#fef2f2',
                border: `1px solid ${message.kind === 'success' ? '#86efac' : '#fecaca'}`,
              }}
            >
              {message.text}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
            <button
              onClick={onSave}
              disabled={saving}
              style={{ ...storeBlogBtnStyle, backgroundColor: '#3b82f6', color: '#fff', opacity: saving ? 0.6 : 1 }}
            >
              {saving ? '저장 중...' : '저장'}
            </button>
          </div>

          {settings && (
            <p style={{ fontSize: 11, color: '#94a3b8', textAlign: 'right' }}>
              마지막 수정: {new Date(settings.updatedAt).toLocaleString('ko-KR')}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
