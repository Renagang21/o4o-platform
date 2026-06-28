/**
 * DisplayImage — 표시 폭/정렬 속성을 가진 이미지 노드
 *
 * WO-O4O-STANDARD-EDITOR-IMAGE-DISPLAY-WIDTH-V1
 *
 * @tiptap/extension-image 를 확장하여 고정 enum 표시 폭(displayWidth)과 정렬(align)을
 * 정식 attribute 로 저장/parse/render 한다. 임의 CSS 입력은 받지 않는다.
 *
 * - displayWidth: full(본문 폭=100%) / 75 / 50 / 25 / original(원본)
 * - align: left / center / right
 * - legacyWidth: 기존 width="240"·inline width 보존(사용자가 폭을 바꾸기 전까지 표시 유지).
 *               displayWidth 가 설정되면 legacy width 는 제거(정규화).
 *
 * 폭/정렬의 실제 표현은 클래스(img-w-*, img-align-*) + CSS(IMAGE_DISPLAY_STYLES)로 한다.
 */
import Image from '@tiptap/extension-image';
import { mergeAttributes } from '@tiptap/core';

export const DISPLAY_WIDTHS = ['full', '75', '50', '25', 'original'] as const;
export const IMAGE_ALIGNS = ['left', 'center', 'right'] as const;
export type DisplayWidth = (typeof DISPLAY_WIDTHS)[number];
export type ImageAlign = (typeof IMAGE_ALIGNS)[number];

export const DISPLAY_WIDTH_LABEL: Record<DisplayWidth, string> = {
  full: '본문 폭',
  '75': '크게 (75%)',
  '50': '보통 (50%)',
  '25': '작게 (25%)',
  original: '원본 크기',
};

export const IMAGE_ALIGN_LABEL: Record<ImageAlign, string> = {
  left: '왼쪽',
  center: '가운데',
  right: '오른쪽',
};

function isDisplayWidth(v: unknown): v is DisplayWidth {
  return typeof v === 'string' && (DISPLAY_WIDTHS as readonly string[]).includes(v);
}
function isAlign(v: unknown): v is ImageAlign {
  return typeof v === 'string' && (IMAGE_ALIGNS as readonly string[]).includes(v);
}

export const DisplayImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      displayWidth: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          const v = el.getAttribute('data-display-width');
          return isDisplayWidth(v) ? v : null;
        },
        renderHTML: (attrs: Record<string, any>) =>
          attrs.displayWidth ? { 'data-display-width': attrs.displayWidth } : {},
      },
      align: {
        default: 'center',
        parseHTML: (el: HTMLElement) => {
          const v = el.getAttribute('data-align');
          return isAlign(v) ? v : 'center';
        },
        renderHTML: (attrs: Record<string, any>) => ({ 'data-align': attrs.align || 'center' }),
      },
      // legacy width 보존: data-display-width 가 없을 때만 캡처 (기존 좁은 이미지 표시 유지)
      legacyWidth: {
        default: null,
        parseHTML: (el: HTMLElement) => {
          if (el.getAttribute('data-display-width')) return null;
          return el.getAttribute('width') || el.style.width || null;
        },
        renderHTML: (attrs: Record<string, any>) => {
          // displayWidth 가 정해지면 legacy width 제거(정규화)
          if (attrs.displayWidth) return {};
          return attrs.legacyWidth ? { width: attrs.legacyWidth } : {};
        },
      },
    };
  },

  renderHTML({ HTMLAttributes }) {
    const dw = HTMLAttributes['data-display-width'];
    const al = HTMLAttributes['data-align'] || 'center';
    const classes = ['editor-image'];
    if (dw) classes.push(`img-w-${dw}`);
    classes.push(`img-align-${al}`);
    return [
      'img',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, { class: classes.join(' ') }),
    ];
  },
});

/**
 * 폭/정렬 표현 CSS — 편집기와 ContentRenderer 에 동일 적용(WO 원칙).
 * 본문 폭(full): width/max-width 100% + height auto + 비율 유지 + 가로 넘침 없음.
 * original: 내장 크기(natural) 이되 부모 넘침 방지(max-width 100%).
 * 정렬: display block + margin 기반.
 */
export const IMAGE_DISPLAY_STYLES = `
img.editor-image { height: auto; display: block; max-width: 100%; border-radius: 8px; margin-top: 1em; margin-bottom: 1em; }
img.editor-image.img-w-full { width: 100%; max-width: 100%; }
img.editor-image.img-w-75 { width: 75%; max-width: 100%; }
img.editor-image.img-w-50 { width: 50%; max-width: 100%; }
img.editor-image.img-w-25 { width: 25%; max-width: 100%; }
img.editor-image.img-w-original { width: auto; max-width: 100%; }
img.editor-image.img-align-left { margin-left: 0; margin-right: auto; }
img.editor-image.img-align-center { margin-left: auto; margin-right: auto; }
img.editor-image.img-align-right { margin-left: auto; margin-right: 0; }
`;
