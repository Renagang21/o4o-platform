/**
 * PopAiContentPanel — Step 2 가져온 POP 문구
 * WO-O4O-MY-STORE-POP-COMPOSER-KCOS-GP-COMMONIZATION-V1
 *
 * WO-O4O-GP-KCOS-POP-QR-BLOG-AI-ENTRY-REMOVE-V1 유지: 페이지형 AI 문구 생성 진입 없음.
 * 가져온 POP(prefill) 문구가 있을 때만 노출된다.
 */

import { Save } from 'lucide-react';
import {
  popAiPreviewStyle,
  popSaveContentBtnStyle,
  popSectionHeaderStyle,
  popSectionStyle,
  popStepBadgeStyle,
} from './popStyles';
import type { PopAccentTheme, PopAiContent } from './types';

export interface PopAiContentPanelProps {
  accent: PopAccentTheme;
  content: PopAiContent;
  saving: boolean;
  saveButtonTitle: string;
  onSave: () => void;
  onClear: () => void;
}

export function PopAiContentPanel({
  accent, content, saving, saveButtonTitle, onSave, onClear,
}: PopAiContentPanelProps) {
  return (
    <section style={popSectionStyle}>
      <div style={popSectionHeaderStyle}>
        <span style={popStepBadgeStyle(accent)}>2</span>
        <span style={{ fontWeight: 600, color: '#1e293b' }}>가져온 POP 문구</span>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {/* WO-O4O-POP-SAVE-AS-CONTENT-V1: POP 콘텐츠로 저장 (재편집·재제작) */}
        <button
          onClick={onSave}
          disabled={saving}
          style={popSaveContentBtnStyle}
          title={saveButtonTitle}
        >
          <Save size={14} />
          {saving ? '저장 중...' : 'POP 콘텐츠로 저장'}
        </button>
        <button
          onClick={onClear}
          style={{ fontSize: 12, color: '#94a3b8', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
        >
          문구 제거
        </button>
      </div>

      <div style={popAiPreviewStyle}>
        <p style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 8 }}>
          가져온 POP 문구 ({content.title && '제목 포함'})
        </p>
        {content.title && (
          <p style={{ fontSize: 14, fontWeight: 600, color: '#1e293b', marginBottom: 6 }}>{content.title}</p>
        )}
        {content.shortText && (
          <p style={{ fontSize: 13, color: '#475569', marginBottom: 6 }}>{content.shortText}</p>
        )}
        {content.bullets.length > 0 && (
          <ul style={{ fontSize: 13, color: '#64748b', paddingLeft: 18, margin: 0 }}>
            {content.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        )}
      </div>
    </section>
  );
}
