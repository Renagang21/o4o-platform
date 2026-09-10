/**
 * POP V2 편집 화면 (공통 Core)
 * WO-O4O-STORE-POP-V2-CANONICAL-REBUILD-KPA-PH-V1
 *
 *   대상 선택 → 콘텐츠 결정 → 템플릿 → 편집 → 저장 → 미리보기 → PDF/PNG
 *
 * QR 은 "지면에 QR 을 넣는" 선택일 뿐이며 매장 Placement 와 동일시하지 않는다(이번 범위 밖).
 */

import type { CSSProperties } from 'react';
import type {
  PopV2AccentTheme,
  PopV2ContentType,
  PopV2Document,
  PopV2TemplateOption,
} from './types';
import { POP_V2_CONTENT_TYPE_LABELS, POP_V2_RESOLVED_FROM_LABELS } from './types';
import { usePopV2Editor } from './usePopV2Editor';
import type { UsePopV2EditorOptions } from './usePopV2Editor';
import { popPageStyle, popSectionStyle, popStepBadgeStyle } from '../pop/popStyles';

export interface StorePopV2EditorViewProps extends UsePopV2EditorOptions {
  accent: PopV2AccentTheme;
  templates: PopV2TemplateOption[];
  onBack: () => void;
  onSaved?: (doc: PopV2Document) => void;
}

const labelStyle: CSSProperties = {
  display: 'block',
  fontSize: 12,
  fontWeight: 600,
  color: '#475569',
  marginBottom: 6,
};

const inputStyle: CSSProperties = {
  width: '100%',
  padding: '9px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 14,
  color: '#0f172a',
  boxSizing: 'border-box',
};

const mutedStyle: CSSProperties = { fontSize: 12, color: '#94a3b8' };

const smallBtnStyle: CSSProperties = {
  padding: '6px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  fontSize: 12,
  color: '#475569',
  backgroundColor: '#fff',
  cursor: 'pointer',
};

function chipStyle(accent: PopV2AccentTheme, selected: boolean): CSSProperties {
  return {
    padding: '8px 14px',
    border: `1px solid ${selected ? accent.color : '#e2e8f0'}`,
    borderRadius: 999,
    backgroundColor: selected ? accent.softBg : '#fff',
    color: selected ? accent.color : '#475569',
    fontSize: 13,
    fontWeight: selected ? 600 : 400,
    cursor: 'pointer',
  };
}

const CONTENT_TYPES = Object.keys(POP_V2_CONTENT_TYPE_LABELS) as PopV2ContentType[];

export function StorePopV2EditorView(props: StorePopV2EditorViewProps) {
  const { accent, templates, onBack } = props;
  const s = usePopV2Editor(props);

  if (s.loading) {
    return (
      <div style={popPageStyle}>
        <div style={mutedStyle}>POP 을 불러오는 중…</div>
      </div>
    );
  }

  if (s.loadError) {
    return (
      <div style={popPageStyle}>
        <div style={{ color: '#dc2626', fontSize: 13 }}>{s.loadError}</div>
        <button type="button" onClick={onBack} style={{ ...smallBtnStyle, marginTop: 12 }}>
          목록으로
        </button>
      </div>
    );
  }

  return (
    <div style={popPageStyle}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button type="button" onClick={onBack} style={smallBtnStyle}>
          ← 목록
        </button>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: '#0f172a', margin: 0 }}>
          {s.documentId ? 'POP 수정' : '새 POP 만들기'}
        </h1>
      </div>

      {/* 1. 대상 선택 */}
      <section style={popSectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={popStepBadgeStyle(accent)}>1</span>
          <strong style={{ fontSize: 14, color: '#0f172a' }}>무엇으로 POP 을 만들까요?</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => s.chooseKind('content')}
            style={chipStyle(accent, s.popKind === 'content')}
          >
            내 매장 콘텐츠
          </button>
          <button
            type="button"
            onClick={() => s.chooseKind('product')}
            style={chipStyle(accent, s.popKind === 'product')}
          >
            상품
          </button>
        </div>

        {s.popKind === 'content' && (
          <div style={{ marginTop: 16 }}>
            <span style={labelStyle}>POP 유형</span>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {CONTENT_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => s.setContentType(t)}
                  style={chipStyle(accent, s.contentType === t)}
                >
                  {POP_V2_CONTENT_TYPE_LABELS[t]}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* 2. 사용할 콘텐츠 결정 */}
      <section style={popSectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={popStepBadgeStyle(accent)}>2</span>
          <strong style={{ fontSize: 14, color: '#0f172a' }}>사용할 콘텐츠</strong>
        </div>

        {s.popKind === 'content' ? (
          <>
            {s.contentCandidatesLoading && <div style={mutedStyle}>불러오는 중…</div>}
            {!s.contentCandidatesLoading && s.contentCandidates.length === 0 && (
              <div style={mutedStyle}>
                POP 으로 만들 수 있는 내 매장 콘텐츠가 없습니다. 콘텐츠를 먼저 등록해 주세요.
              </div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {s.contentCandidates.map((c) => {
                const selected = s.sources.some((x) => x.id === c.id && x.origin === c.origin);
                return (
                  <button
                    key={`${c.origin}:${c.id}`}
                    type="button"
                    onClick={() => void s.pickContentSource(c.origin, c.id)}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      border: `1px solid ${selected ? accent.color : '#e2e8f0'}`,
                      borderRadius: 8,
                      backgroundColor: selected ? accent.softBg : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{c.title}</div>
                    {c.excerpt && <div style={{ ...mutedStyle, marginTop: 4 }}>{c.excerpt}</div>}
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <>
            {s.productOptions.length === 0 && (
              <div style={mutedStyle}>선택할 수 있는 상품이 없습니다.</div>
            )}
            <div style={{ display: 'grid', gap: 8 }}>
              {s.productOptions.map((p) => {
                const selected = s.sources.some((x) => x.id === p.id);
                return (
                  <button
                    key={`${p.sourceType}:${p.id}`}
                    type="button"
                    onClick={() => void s.pickProductSource(p.id, p.sourceType)}
                    style={{
                      textAlign: 'left',
                      padding: 12,
                      border: `1px solid ${selected ? accent.color : '#e2e8f0'}`,
                      borderRadius: 8,
                      backgroundColor: selected ? accent.softBg : '#fff',
                      cursor: 'pointer',
                    }}
                  >
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{p.title}</div>
                    {p.subtitle && <div style={{ ...mutedStyle, marginTop: 4 }}>{p.subtitle}</div>}
                  </button>
                );
              })}
            </div>
          </>
        )}

        {s.resolvedFrom && (
          <div style={{ ...mutedStyle, marginTop: 12 }}>
            기본 문구 출처: {POP_V2_RESOLVED_FROM_LABELS[s.resolvedFrom]}
          </div>
        )}
      </section>

      {/* 3. 템플릿 */}
      <section style={popSectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={popStepBadgeStyle(accent)}>3</span>
          <strong style={{ fontSize: 14, color: '#0f172a' }}>템플릿과 용지</strong>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => s.setTemplateId(t.id)}
              style={chipStyle(accent, s.templateId === t.id)}
              title={t.desc}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['A4', 'A5'] as const).map((l) => (
            <button
              key={l}
              type="button"
              onClick={() => s.setLayout(l)}
              style={chipStyle(accent, s.layout === l)}
            >
              {l}
            </button>
          ))}
        </div>
      </section>

      {/* 4. 편집 */}
      <section style={popSectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <span style={popStepBadgeStyle(accent)}>4</span>
          <strong style={{ fontSize: 14, color: '#0f172a' }}>내용 편집</strong>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>POP 이름 (관리용)</label>
          <input
            style={inputStyle}
            value={s.title}
            onChange={(e) => s.setTitle(e.target.value)}
            placeholder="예: 환절기 면역 건강정보 POP"
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>지면 제목</label>
          <input
            style={inputStyle}
            value={s.fields.title}
            onChange={(e) => s.setField('title', e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>핵심 문구</label>
          <input
            style={inputStyle}
            value={s.fields.shortText}
            onChange={(e) => s.setField('shortText', e.target.value)}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>강조 항목</label>
          {s.fields.bullets.map((b, i) => (
            <div key={i} style={{ display: 'flex', gap: 6, marginBottom: 6 }}>
              <input style={inputStyle} value={b} onChange={(e) => s.setBullet(i, e.target.value)} />
              <button type="button" onClick={() => s.removeBullet(i)} style={smallBtnStyle}>
                삭제
              </button>
            </div>
          ))}
          <button type="button" onClick={s.addBullet} style={smallBtnStyle}>
            + 항목 추가
          </button>
        </div>

        <div style={{ marginBottom: 12 }}>
          <label style={labelStyle}>본문</label>
          <textarea
            style={{ ...inputStyle, minHeight: 140, resize: 'vertical' }}
            value={s.fields.longText}
            onChange={(e) => s.setField('longText', e.target.value)}
          />
        </div>

        <div>
          <label style={labelStyle}>QR 삽입 (선택)</label>
          <select
            style={inputStyle}
            value={s.qrCodeId ?? ''}
            onChange={(e) => s.setQrCodeId(e.target.value || null)}
          >
            <option value="">넣지 않음</option>
            {s.qrOptions.map((q) => (
              <option key={q.id} value={q.id}>
                {q.title}
              </option>
            ))}
          </select>
          <div style={{ ...mutedStyle, marginTop: 6 }}>
            지면에 QR 을 인쇄하는 선택입니다. 매장 어디에 붙일지(Placement)는 아직 다루지 않습니다.
          </div>
        </div>
      </section>

      {/* 5. 저장 / 출력 */}
      <section style={{ ...popSectionStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
        <button
          type="button"
          disabled={!s.canSave}
          onClick={() => void s.save()}
          style={{
            padding: '10px 20px',
            border: 'none',
            borderRadius: 8,
            backgroundColor: s.canSave ? accent.color : '#cbd5e1',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: s.canSave ? 'pointer' : 'not-allowed',
          }}
        >
          {s.saving ? '저장 중…' : '저장'}
        </button>
        <button
          type="button"
          disabled={!!s.rendering}
          onClick={() => void s.render('pdf')}
          style={smallBtnStyle}
        >
          {s.rendering === 'pdf' ? 'PDF 만드는 중…' : 'PDF 출력'}
        </button>
        <button
          type="button"
          disabled={!!s.rendering}
          onClick={() => void s.render('png')}
          style={smallBtnStyle}
        >
          {s.rendering === 'png' ? 'PNG 만드는 중…' : 'PNG 출력'}
        </button>
        {s.lastOutputUrl && (
          <a
            href={s.lastOutputUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{ ...mutedStyle, marginLeft: 4 }}
          >
            최근 산출물 열기
          </a>
        )}
      </section>
    </div>
  );
}
