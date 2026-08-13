/**
 * PopLayoutTemplateSection — Step 3 레이아웃 및 템플릿
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * 템플릿 목록은 서비스 config 다 — 라벨/설명이 서비스마다 다르다(매장 전문형 ↔ 약국 전문형).
 */

import {
  popSectionHeaderStyle,
  popSectionStyle,
  popSelectableStyle,
  popStepBadgeStyle,
} from './popStyles';
import type { PopAccentTheme, PopLayout, PopTemplateOption } from './types';

const LAYOUTS: PopLayout[] = ['A4', 'A5'];

export interface PopLayoutTemplateSectionProps {
  accent: PopAccentTheme;
  layout: PopLayout;
  onLayoutChange: (layout: PopLayout) => void;
  templates: PopTemplateOption[];
  templateId: string;
  onTemplateChange: (id: string) => void;
}

export function PopLayoutTemplateSection({
  accent, layout, onLayoutChange, templates, templateId, onTemplateChange,
}: PopLayoutTemplateSectionProps) {
  const optionStyle = (selected: boolean, padding: string) => ({
    ...popSelectableStyle(accent, selected),
    padding,
    borderRadius: 8,
    color: selected ? accent.color : '#64748b',
    fontWeight: selected ? 600 : 400,
    fontSize: 14,
    cursor: 'pointer' as const,
  });

  return (
    <section style={popSectionStyle}>
      <div style={popSectionHeaderStyle}>
        <span style={popStepBadgeStyle(accent)}>3</span>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>레이아웃 및 템플릿</span>
      </div>

      <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {/* Layout */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>레이아웃</p>
          <div style={{ display: 'flex', gap: 8 }}>
            {LAYOUTS.map((l) => (
              <button key={l} onClick={() => onLayoutChange(l)} style={optionStyle(layout === l, '8px 20px')}>
                {l}
              </button>
            ))}
          </div>
        </div>

        {/* Template */}
        <div>
          <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', marginBottom: 8 }}>템플릿</p>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {templates.map((t) => (
              <button
                key={t.id}
                onClick={() => onTemplateChange(t.id)}
                title={t.desc}
                style={optionStyle(templateId === t.id, '8px 16px')}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
