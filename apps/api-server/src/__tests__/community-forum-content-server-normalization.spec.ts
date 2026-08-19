/**
 * Forum content server-side normalization regression test
 *
 * WO-O4O-COMMUNITY-CROSSSERVICE-FINAL-RECENSUS-AND-RESIDUAL-COMMONIZATION-AUDIT-V1 §7-C
 *
 * 닫으려는 결함: 공통 write 계약(`POST/PUT /forum/posts`)은 HTML string content 를
 * 허용하는데, 백엔드가 `@o4o/forum-core.normalizeContent()` (브라우저 `DOMParser` 의존)
 * 를 호출해 Node 런타임에서 `DOMParser is not defined` 500 이 났다.
 * → KPA/K-Cosmetics/GlycoPharm 처럼 HTML 을 그대로 보내는 서비스에서 글쓰기가 실패했다.
 *
 * 저장 포맷(Block[]) 은 바뀌지 않는다. 같은 매핑을 서버에서 수행하는지 고정한다.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  htmlToBlocksServer,
  normalizeForumContentServer,
} from '../utils/forumContentServer.js';

describe('forum content server normalization', () => {
  it('DOMParser 없이 HTML 을 Block[] 로 변환한다', () => {
    expect(typeof (globalThis as any).DOMParser).toBe('undefined');

    const blocks = htmlToBlocksServer(
      '<p>첫 문단</p><h2>제목</h2><ul><li>a</li><li>b</li></ul><hr>',
    );

    expect(blocks.map((b) => b.type)).toEqual(['paragraph', 'heading', 'list', 'divider']);
    expect(blocks[0].content).toBe('첫 문단');
    expect(blocks[1].attributes?.level).toBe(2);
    expect(blocks[2].content).toEqual({ items: ['a', 'b'] });
    expect(blocks[2].attributes?.ordered).toBe(false);
  });

  it('img · pre · blockquote 매핑이 forum-core 와 같다', () => {
    const blocks = htmlToBlocksServer(
      '<blockquote>인용</blockquote><pre><code>const a = 1;</code></pre><img src="/x.png" alt="x">',
    );

    expect(blocks[0]).toMatchObject({ type: 'quote', content: '인용' });
    expect(blocks[1]).toMatchObject({ type: 'code', content: 'const a = 1;' });
    expect(blocks[2]).toMatchObject({
      type: 'image',
      attributes: { src: '/x.png', alt: 'x' },
    });
  });

  it('Block[] 는 그대로, plain text 는 paragraph 로 정규화한다', () => {
    const blocks = [{ id: 'block-0', type: 'paragraph', content: 'x' }];
    expect(normalizeForumContentServer(blocks)).toBe(blocks);

    expect(normalizeForumContentServer('그냥 텍스트')).toEqual([
      { id: 'block-0', type: 'paragraph', content: '그냥 텍스트' },
    ]);

    expect(normalizeForumContentServer(undefined)).toEqual([]);
    expect(normalizeForumContentServer(null)).toEqual([]);
  });

  it('ForumPostController 는 DOMParser 의존 normalizeContent 를 import 하지 않는다', () => {
    const source = fs.readFileSync(
      path.join(__dirname, '../controllers/forum/ForumPostController.ts'),
      'utf-8',
    );

    expect(source).toContain("from '../../utils/forumContentServer.js'");
    expect(source).not.toMatch(/import\s*{[^}]*\bnormalizeContent\b[^}]*}\s*from\s*'@o4o\/forum-core'/);
  });
});
