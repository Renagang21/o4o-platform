/**
 * JSON-LD 구조화 데이터 DOM 조작 유틸
 *
 * WO-O4O-BLOG-SEO-JSONLD-CANONICAL-V1
 *
 * 방식: <script type="application/ld+json" data-jsonld-id="{id}"> 태그를 head에 삽입/갱신/제거.
 * data-jsonld-id 로 복수 JSON-LD 블록을 독립 관리 가능.
 *
 * 안전 정책:
 *   - undefined/null 필드는 객체에 포함하지 않음 → invalid JSON 방지
 *   - 빈 object 도 삽입하지 않음 (headline 없으면 skip)
 */

/** id 키로 JSON-LD script 태그 삽입/갱신 */
export function insertJsonLd(id: string, data: Record<string, unknown>): void {
  if (typeof document === 'undefined') return;
  const selector = `script[data-jsonld-id="${id}"]`;
  let el = document.head.querySelector<HTMLScriptElement>(selector);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-jsonld-id', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** id 키로 JSON-LD script 태그 제거 (없으면 no-op) */
export function removeJsonLd(id: string): void {
  if (typeof document === 'undefined') return;
  document.head.querySelector(`script[data-jsonld-id="${id}"]`)?.remove();
}

// ─── Article JSON-LD builder ──────────────────────────────────────────────────

interface ArticleJsonLdOptions {
  title: string | null;
  description?: string | null;
  url?: string | null;
  image?: string | null;
  author?: string | null;
  publishedAt?: string | null;
  modifiedAt?: string | null;
}

/**
 * schema.org Article JSON-LD 객체 생성.
 * 값 없는 필드는 생략 — invalid JSON-LD 방지.
 */
export function buildArticleJsonLd(opts: ArticleJsonLdOptions): Record<string, unknown> {
  const ld: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Article',
  };
  if (opts.title) ld['headline'] = opts.title;
  if (opts.description) ld['description'] = opts.description;
  if (opts.author) ld['author'] = { '@type': 'Person', name: opts.author };
  if (opts.publishedAt) ld['datePublished'] = opts.publishedAt;
  if (opts.modifiedAt) ld['dateModified'] = opts.modifiedAt;
  if (opts.image) ld['image'] = opts.image;
  if (opts.url) ld['mainEntityOfPage'] = { '@type': 'WebPage', '@id': opts.url };
  return ld;
}
