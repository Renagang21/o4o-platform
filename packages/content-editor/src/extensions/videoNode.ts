/**
 * VideoNode — HTML5 <video> 블록 노드 + 표시 CSS
 *
 * WO-O4O-CONTENT-EDITOR-VIDEO-STANDARDIZATION-V1
 *
 * sourceType 3종 중 o4o_storage / external 을 HTML5 <video> 로 삽입/보존한다.
 *   - youtube/vimeo 는 기존 @tiptap/extension-youtube 경로 유지(하위호환) — 이 노드가 담당하지 않음.
 * 정식 parse/render/serialize 하므로 삽입 → 저장 → 재로드 round-trip 보존.
 *
 * 비목표(WO 준수): 자동 업로드/다운로드/인코딩/썸네일 생성/autoplay·loop·muted 정책 없음.
 * poster 는 Media Library 가 thumbnailUrl 을 줄 때만 사용(생성하지 않음).
 */
import { Node, mergeAttributes } from '@tiptap/core';

export type VideoSourceType = 'o4o_storage' | 'external';

export interface SetVideoOptions {
  src: string;
  poster?: string | null;
  sourceType?: VideoSourceType;
  title?: string | null;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    o4oVideo: {
      /** HTML5 <video> 삽입 (o4o_storage / external) */
      setVideo: (options: SetVideoOptions) => ReturnType;
    };
  }
}

export const VideoNode = Node.create({
  name: 'o4oVideo',
  group: 'block',
  atom: true,
  draggable: true,
  selectable: true,

  addAttributes() {
    return {
      src: { default: null },
      poster: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('poster'),
        renderHTML: (attrs: Record<string, any>) => (attrs.poster ? { poster: attrs.poster } : {}),
      },
      sourceType: {
        default: 'external',
        parseHTML: (el: HTMLElement) => el.getAttribute('data-source-type') || 'external',
        renderHTML: (attrs: Record<string, any>) =>
          attrs.sourceType ? { 'data-source-type': attrs.sourceType } : {},
      },
      title: {
        default: null,
        parseHTML: (el: HTMLElement) => el.getAttribute('title'),
        renderHTML: (attrs: Record<string, any>) => (attrs.title ? { title: attrs.title } : {}),
      },
    };
  },

  // 마커 없이 <video> 태그를 이 노드로 해석 (YouTube iframe 은 별도 확장 담당)
  parseHTML() {
    return [{ tag: 'video[src]' }, { tag: 'video' }];
  },

  renderHTML({ HTMLAttributes }) {
    // controls 고정(재생 컨트롤), playsinline(모바일 인라인 재생). autoplay/loop/muted 없음(WO 비목표).
    return [
      'video',
      mergeAttributes(
        { class: 'editor-video', controls: 'controls', playsinline: 'true', preload: 'metadata' },
        HTMLAttributes,
      ),
    ];
  },

  addCommands() {
    return {
      setVideo:
        (options: SetVideoOptions) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: options }),
    };
  },
});

/**
 * <video> 표시 CSS — 편집기와 ContentRenderer 양쪽 동일 주입(WO-4 정합 원칙).
 * 반응형(부모 폭 100%, max 640px, 16:9), poster 표시.
 */
export const VIDEO_STYLES = `
video.editor-video { display: block; width: 100%; max-width: 640px; height: auto; aspect-ratio: 16 / 9; margin: 12px 0; border-radius: 6px; background: #000; }
`;
