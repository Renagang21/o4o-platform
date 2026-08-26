/**
 * WO-O4O-SIGNAGE-PLAYER-CONTENT-RENDER-KIND-V1
 *
 * 결함:
 *   `GET /api/v1/channels/:id/contents` 의 `content.type` 은 CMS 의 **의미적 분류**다
 *   (`hero | notice | news | featured | promo | event | guide | knowledge`).
 *   player 의 `ContentRenderer` 와 `getContentDuration` 은 이 값을
 *   `image | video | html | text` 로 기대하고 분기하고 있었다.
 *   두 어휘는 **어떤 값에서도 만나지 않는다** →
 *     · 모든 콘텐츠가 fallback(제목+요약)으로만 렌더되고
 *     · video 가 자기 재생 길이를 쓰지 못한 채 기본 duration 으로 넘어갔다.
 *
 *   이는 channel code lookup 결함(CODE-LOOKUP-CONTRACT-CLOSURE-V1)과 원인이 다른
 *   **독립 결함**이다. lookup 수렴 이후에도 그대로 남아 있었다.
 *
 * 수정:
 *   렌더 방식을 type 이 아니라 **실제로 존재하는 필드**로 판정한다.
 *   판정에 쓰는 필드는 기존 renderer 의 각 분기가 이미 보고 있던 것과 동일하다.
 */
import fs from 'fs';
import path from 'path';

import {
  resolveContentRenderKind,
  type RenderableContent,
} from '../../../../services/signage-player-web/src/api/content-render-kind';

const PLAYER_SRC = path.resolve(__dirname, '../../../../services/signage-player-web/src');

function content(over: Partial<RenderableContent> = {}): RenderableContent {
  return { contentType: 'hero', title: 'x', ...over } as RenderableContent;
}

// ============================================================================
// 1. CMS 의미적 type 은 렌더 방식이 아니다
// ============================================================================
describe('resolveContentRenderKind: CMS content.type 에 좌우되지 않는다', () => {
  const CMS_TYPES = ['hero', 'notice', 'news', 'featured', 'promo', 'event', 'guide', 'knowledge'];

  it.each(CMS_TYPES)('type=%s 여도 이미지 필드가 있으면 image 다', (t) => {
    expect(resolveContentRenderKind(content({ contentType: t, featuredImage: 'https://x/a.png' }))).toBe(
      'image'
    );
  });

  it.each(CMS_TYPES)('type=%s 여도 metadata.videoUrl 이 있으면 video 다', (t) => {
    expect(
      resolveContentRenderKind(content({ contentType: t, metadata: { videoUrl: 'https://x/a.mp4' } }))
    ).toBe('video');
  });

  it('미디어 필드가 없으면 text 다 (fallback 이 기본값이 아니다)', () => {
    expect(resolveContentRenderKind(content({ body: '<p>hi</p>' }))).toBe('text');
    expect(resolveContentRenderKind(content())).toBe('text');
  });
});

// ============================================================================
// 2. 우선순위 — 기존 renderer 분기가 보던 필드와 동일하다
// ============================================================================
describe('resolveContentRenderKind: 판정 우선순위', () => {
  it('video 가 이미지보다 우선한다 (video 는 자기 길이를 써야 한다)', () => {
    expect(
      resolveContentRenderKind(
        content({ featuredImage: 'https://x/a.png', metadata: { videoUrl: 'https://x/a.mp4' } })
      )
    ).toBe('video');
  });

  it('metadata.htmlUrl / metadata.url 은 html 이다', () => {
    expect(resolveContentRenderKind(content({ metadata: { htmlUrl: 'https://x/a.html' } }))).toBe('html');
    expect(resolveContentRenderKind(content({ metadata: { url: 'https://x/a.html' } }))).toBe('html');
  });

  it('metadata.imageUrl 만 있어도 image 다', () => {
    expect(resolveContentRenderKind(content({ metadata: { imageUrl: 'https://x/a.png' } }))).toBe('image');
  });

  it('빈 문자열/비문자열 metadata 값은 무시한다', () => {
    expect(resolveContentRenderKind(content({ metadata: { videoUrl: '' } }))).toBe('text');
    expect(resolveContentRenderKind(content({ metadata: { videoUrl: 123 as unknown as string } }))).toBe(
      'text'
    );
  });

  it('metadata 가 null 이어도 throw 하지 않는다', () => {
    expect(resolveContentRenderKind(content({ metadata: null }))).toBe('text');
  });
});

// ============================================================================
// 3. 정적 회귀 가드 — contentType 분기로 되돌아가지 않는다
// ============================================================================
describe('STATIC: player 는 contentType 으로 렌더 방식을 판정하지 않는다', () => {
  const stripComments = (src: string) =>
    src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

  const renderer = stripComments(fs.readFileSync(path.join(PLAYER_SRC, 'components/ContentRenderer.tsx'), 'utf-8'));
  const client = stripComments(fs.readFileSync(path.join(PLAYER_SRC, 'api/channels.ts'), 'utf-8'));
  const page = stripComments(fs.readFileSync(path.join(PLAYER_SRC, 'pages/ChannelPlayerPage.tsx'), 'utf-8'));

  it('ContentRenderer 는 resolveContentRenderKind 로 분기한다', () => {
    expect(renderer).toMatch(/resolveContentRenderKind/);
    expect(renderer).not.toMatch(/switch\s*\(\s*contentType\s*\)/);
  });

  it("getContentDuration 이 contentType === 'video' 로 판정하지 않는다", () => {
    expect(client).not.toMatch(/contentType\s*===\s*'video'/);
    expect(client).toMatch(/resolveContentRenderKind/);
  });

  it('ChannelPlayerPage 의 video 분기도 동일한 판정을 쓴다', () => {
    expect(page).not.toMatch(/contentType\s*===\s*'video'/);
    expect(page).toMatch(/resolveContentRenderKind/);
  });

  it('판정 모듈은 번들러 전용 구문을 쓰지 않는다 (서버 테스트에서 import 가능해야 한다)', () => {
    const mod = stripComments(
      fs.readFileSync(path.join(PLAYER_SRC, 'api/content-render-kind.ts'), 'utf-8')
    );
    expect(mod).not.toMatch(/import\.meta/);
  });
});
