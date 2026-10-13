import { JSDOM } from 'jsdom';
import { blocksToHtml, htmlToForumBlocks } from '../../../../packages/content-editor/src/components/ai-content-format';
import { buildCommunitySavePayload, buildStoreSavePayload, buildProductionMaterialSavePayload } from '../../../../packages/content-editor/src/components/ai-content-save-payload';

describe('AiContentModal internal format conversion', () => {
  const dom = new JSDOM('');
  const originalParser = globalThis.DOMParser;
  const originalNode = globalThis.Node;

  beforeAll(() => {
    globalThis.DOMParser = dom.window.DOMParser;
    globalThis.Node = dom.window.Node as unknown as typeof Node;
  });
  afterAll(() => {
    globalThis.DOMParser = originalParser;
    globalThis.Node = originalNode;
    dom.window.close();
  });

  it.each(['', '  ', '\n'])('empty HTML creates no blocks: %j', html => {
    expect(htmlToForumBlocks(html)).toEqual([]);
  });

  it('preserves element positions, heading level and paragraph inline HTML', () => {
    expect(htmlToForumBlocks('TEXT<h3>Heading</h3><p>Hello <strong>world</strong></p>')).toEqual([
      { id: 'b1', type: 'heading', content: 'Heading', attributes: { level: 3 } },
      { id: 'b2', type: 'paragraph', content: 'Hello <strong>world</strong>' },
    ]);
  });

  it('keeps ordered lists, trimmed items, quotes and fallback element content', () => {
    expect(htmlToForumBlocks('<ol><li> One </li><li> </li><li>Two</li></ol><blockquote> Quote </blockquote><section><em>Other</em></section>')).toEqual([
      { id: 'b0', type: 'list', content: { items: ['One', 'Two'] }, attributes: { ordered: true } },
      { id: 'b1', type: 'quote', content: 'Quote' },
      { id: 'b2', type: 'paragraph', content: '<em>Other</em>' },
    ]);
  });

  it('empty paragraphs/lists are skipped and YouTube markers keep the iframe source', () => {
    expect(htmlToForumBlocks('<p> </p><ul><li> </li></ul><div data-youtube-video="true"><iframe src="https://example.invalid/embed/video"></iframe></div>')).toEqual([
      { id: 'b2', type: 'paragraph', content: '[YouTube: https://example.invalid/embed/video]' },
    ]);
  });

  it('URL blocks preserve markup, defaults, lists and nested group/columns', () => {
    expect(blocksToHtml([
      { type: 'o4o/heading', content: 'Heading' },
      { type: 'o4o/paragraph', content: '<strong>Body</strong>' },
      { type: 'o4o/list', content: '<li>One</li>', attributes: { ordered: true } },
      { type: 'o4o/group', innerBlocks: [{ type: 'o4o/columns', innerBlocks: [{ type: 'o4o/paragraph', content: 'Nested' }] }] },
    ])).toBe('<h2>Heading</h2>\n<p><strong>Body</strong></p>\n<ol><li>One</li></ol>\n<div><div><p>Nested</p></div></div>');
  });

  it('YouTube watch URL keeps the TipTap wrapper and image src/alt fallback', () => {
    expect(blocksToHtml([
      { type: 'o4o/youtube', attributes: { url: 'https://www.youtube.com/watch?v=fixture' } },
      { type: 'o4o/image', attributes: { src: 'https://example.invalid/image.png', alt: 'Fixture' } },
    ])).toBe('<div data-youtube-video><iframe src="https://www.youtube.com/embed/fixture" frameborder="0" allowfullscreen></iframe></div>\n<img src="https://example.invalid/image.png" alt="Fixture" style="max-width:100%;" />');
  });

  it('missing media is omitted, unknown blocks keep text, and empty groups stay empty', () => {
    expect(blocksToHtml([
      { type: 'o4o/youtube' }, { type: 'o4o/image' }, { type: 'o4o/group' },
      { type: 'unknown', content: 'Fallback' },
    ])).toBe('<p>Fallback</p>');
  });

  it('community/store keep different fallback shapes and forum omission', () => {
    expect(buildCommunitySavePayload('plain text', ' ', '')).toEqual({
      title: 'AI 생성 콘텐츠', content: 'plain text', type: 'discussion',
    });
    expect(buildStoreSavePayload('plain text', ' Title ')).toEqual({
      title: 'Title', contentJson: { html: 'plain text' },
    });
    expect(buildCommunitySavePayload('<p>Body</p>', ' Title ', 'fixture-forum')).toEqual({
      title: 'Title', content: [{ id: 'b0', type: 'paragraph', content: 'Body' }],
      type: 'discussion', forumId: 'fixture-forum',
    });
  });

  it.each([['pop', 'pop'], ['store_qr', 'qr'], ['blog', null], ['custom', null]])(
    'material category %s maps to usageType %s without adding metadata', (category, usageType) => {
      expect(buildProductionMaterialSavePayload({ html: '<p>Body</p>', summary: '' }, ' ', category)).toEqual({
        title: 'AI 생성 매장 제작 자료', description: null, assetType: 'content',
        htmlContent: '<p>Body</p>', category, usageType, sourceType: 'generated',
      });
    },
  );

  it('material keeps explicit source/template metadata and summary', () => {
    const sourceMetadata = { sourceContentId: 'fixture-source', sourceTitle: 'Source', sourceOrigin: 'fixture' };
    expect(buildProductionMaterialSavePayload({ html: '<p>Body</p>', summary: 'Summary' }, ' Title ', 'pop', sourceMetadata, 'fixture-template')).toMatchObject({
      title: 'Title', description: 'Summary', sourceMetadata, templateId: 'fixture-template',
    });
  });

});
