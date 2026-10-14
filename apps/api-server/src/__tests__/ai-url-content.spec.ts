import { fetchUrlContent, fetchUrlText, extractHtmlTitle, stripHtml, deriveTitleFromBlocks, detectUsageConditions } from '../routes/ai-proxy/url-content.js';
import { performance } from 'node:perf_hooks';

const originalFetch = global.fetch;
it.each(['a <b>word</b> z', 'a <> b', 'a <<xyz> b', 'a <missing', 'a ><b>word</b>'])('preserves nonempty tag stripping for malformed markup: %s', (source) => {
  const expected = source.replace(/<[^>]+>/g, ' ').replace(/[ \t]+/g, ' ').trim();
  expect(stripHtml(source)).toBe(expected);
  const title = source.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  expect(deriveTitleFromBlocks([{ type: 'o4o/heading', content: source }])).toBe(title);
});
it('processes a large unterminated HTML suffix without quadratic rescanning', () => {
  const source = '<'.repeat(100_000);
  const started = performance.now();
  expect(stripHtml(source)).toBe(source.slice(0, 6000));
  expect(deriveTitleFromBlocks([{ type: 'o4o/heading', content: source }])).toBe(source.slice(0, 80));
  expect(performance.now() - started).toBeLessThan(1000);
});
afterEach(() => { global.fetch = originalFetch; });
it('keeps title extraction separate from script-free source text and usage notices', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/html' }), text: async () => '<html><head><title>안내 &amp; 공지</title><script>secretScript()</script></head><body><p>매장에서활용하는자료의처리절차를 자세히 설명합니다.</p><p>무단 복제 금지</p></body></html>' })) as any;
  const content = await fetchUrlContent('https://example.com/article');
  expect(content.title).toBe('안내 & 공지');
  expect(content.text).toContain('매장에서활용하는자료의처리절차를 자세히 설명합니다.');
  expect(content.text).not.toContain('secretScript');
  expect(content.usageWarning?.detected).toBe(true);
  expect(content.usageWarning?.snippets.some(s => s.includes('무단'))).toBe(true);
  expect(global.fetch).toHaveBeenCalledTimes(1);
});
it('retains plain-text handling for LMS source collection', async () => {
  global.fetch = jest.fn(async () => ({ ok: true, headers: new Headers({ 'content-type': 'text/plain' }), text: async () => '교육 자료 원문' })) as any;
  expect(await fetchUrlText('https://example.com/source.txt')).toBe('교육 자료 원문');
});
it('propagates unsuccessful fetch instead of making up source content', async () => {
  global.fetch = jest.fn(async () => ({ ok: false, status: 503, statusText: 'Unavailable' })) as any;
  await expect(fetchUrlContent('https://example.com/article')).rejects.toThrow('503');
});
it('keeps fallback title precedence and strips hidden markup', () => {
  expect(extractHtmlTitle('<meta content="대체 제목" property="og:title">')).toBe('대체 제목');
  expect(deriveTitleFromBlocks([{ type: 'o4o/heading', content: '제목' }, { type: 'o4o/paragraph', content: '본문' }])).toBe('제목');
  expect(stripHtml('<style>hiddenCss</style><script>hiddenScript</script><p>보이는 자료</p>')).toContain('보이는 자료');
  expect(stripHtml('<script>hiddenScript</script><p>자료</p>')).not.toContain('hiddenScript');
  expect(detectUsageConditions('일반적인 안내 자료').detected).toBe(false);
});
