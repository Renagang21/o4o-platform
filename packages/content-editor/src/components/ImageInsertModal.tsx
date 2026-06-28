/**
 * ImageInsertModal — 이미지 삽입 설정 모달
 *
 * WO-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1
 *
 * 라이브러리/URL/명시 업로드로 URL 을 받은 뒤, 삽입 전에 표시 폭/정렬을 선택한다.
 * (클립보드 직접 붙여넣기는 모달 없이 기본값으로 즉시 삽입 — 버블 메뉴로 변경)
 */
import { useState, useEffect } from 'react';
import type { CSSProperties } from 'react';
import {
  DISPLAY_WIDTHS,
  IMAGE_ALIGNS,
  DISPLAY_WIDTH_LABEL,
  IMAGE_ALIGN_LABEL,
  type DisplayWidth,
  type ImageAlign,
} from '../extensions/displayImage';

interface ImageInsertModalProps {
  open: boolean;
  url: string | null;
  defaultWidth: DisplayWidth;
  defaultAlign: ImageAlign;
  onInsert: (displayWidth: DisplayWidth, align: ImageAlign) => void;
  onCancel: () => void;
}

export function ImageInsertModal({ open, url, defaultWidth, defaultAlign, onInsert, onCancel }: ImageInsertModalProps) {
  const [width, setWidth] = useState<DisplayWidth>(defaultWidth);
  const [align, setAlign] = useState<ImageAlign>(defaultAlign);

  useEffect(() => {
    if (open) { setWidth(defaultWidth); setAlign(defaultAlign); }
  }, [open, defaultWidth, defaultAlign]);

  if (!open || !url) return null;

  return (
    <div style={styles.overlay} onClick={onCancel}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div style={styles.header}>
          <h3 style={styles.title}>이미지 삽입</h3>
          <button style={styles.closeBtn} onClick={onCancel} type="button">✕</button>
        </div>

        <div style={styles.previewBox}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt="미리보기" style={styles.previewImg} />
        </div>

        <div style={styles.field}>
          <label style={styles.label}>표시 폭</label>
          <div style={styles.options}>
            {DISPLAY_WIDTHS.map((w) => (
              <button
                key={w}
                type="button"
                style={{ ...styles.option, ...(width === w ? styles.optionActive : {}) }}
                onClick={() => setWidth(w)}
              >
                {DISPLAY_WIDTH_LABEL[w]}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.field}>
          <label style={styles.label}>정렬</label>
          <div style={styles.options}>
            {IMAGE_ALIGNS.map((a) => (
              <button
                key={a}
                type="button"
                style={{ ...styles.option, ...(align === a ? styles.optionActive : {}) }}
                onClick={() => setAlign(a)}
              >
                {IMAGE_ALIGN_LABEL[a]}
              </button>
            ))}
          </div>
        </div>

        <div style={styles.footer}>
          <button type="button" style={styles.cancelBtn} onClick={onCancel}>취소</button>
          <button type="button" style={styles.insertBtn} onClick={() => onInsert(width, align)}>삽입</button>
        </div>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  overlay: { position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000 },
  modal: { backgroundColor: 'white', borderRadius: 12, width: '90%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.15)' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px', borderBottom: '1px solid #e5e7eb' },
  title: { margin: 0, fontSize: 16, fontWeight: 600, color: '#1e293b' },
  closeBtn: { background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: '#94a3b8', padding: '4px 8px' },
  previewBox: { padding: '16px 20px', display: 'flex', justifyContent: 'center', background: '#f8fafc' },
  previewImg: { maxWidth: '100%', maxHeight: 200, borderRadius: 8, objectFit: 'contain' },
  field: { padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: 6 },
  label: { fontSize: 12, fontWeight: 600, color: '#475569' },
  options: { display: 'flex', flexWrap: 'wrap', gap: 6 },
  option: { padding: '6px 12px', fontSize: 12, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 16, background: 'white', color: '#64748b', cursor: 'pointer' },
  optionActive: { background: '#eff6ff', borderColor: '#93c5fd', color: '#2563eb' },
  footer: { display: 'flex', justifyContent: 'flex-end', gap: 8, padding: '16px 20px' },
  cancelBtn: { padding: '8px 20px', fontSize: 13, fontWeight: 500, border: '1px solid #e2e8f0', borderRadius: 6, background: 'white', color: '#475569', cursor: 'pointer' },
  insertBtn: { padding: '8px 24px', fontSize: 13, fontWeight: 600, border: 'none', borderRadius: 6, background: '#2563eb', color: 'white', cursor: 'pointer' },
};
