// @vitest-environment node
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { renderHostHtml, SEO_PROFILES } from '../../../tools/hostStaticSeo';
import { HOST_ORIGIN, MAIN_ORIGIN } from '../../lib/hostIdentity';
import { O4O_BRAND_TITLE, SUBHOST_HOME_SEO } from '../seoData';

const source = readFileSync(new URL('../../../index.html', import.meta.url), 'utf8');
const built = source.replace('/src/main.tsx', '/assets/index-buildhash.js')
  .replace('</head>', '<link rel="stylesheet" href="/assets/index-buildhash.css"></head>');

describe('crawler-visible host HTML', () => {
  it.each(SEO_PROFILES)('%s receives its home identity with the same assets', (profile) => {
    const html = renderHostHtml(built, profile, true);
    const title = profile === 'main' ? O4O_BRAND_TITLE : SUBHOST_HOME_SEO[profile].title;
    const origin = profile === 'main' ? MAIN_ORIGIN : HOST_ORIGIN[profile];
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toContain(`property="og:title" content="${title}"`);
    expect(html).toContain(`property="og:url" content="${origin}/"`);
    expect(html).toContain(`rel="canonical" href="${origin}"`);
    expect(html).toContain('/assets/index-buildhash.js');
    expect(html).toContain('/assets/index-buildhash.css');
    expect(html).not.toContain('og:image');
  });

  it.each(SEO_PROFILES)('%s SPA fallback cannot canonicalize a private path to home', (profile) => {
    const home = renderHostHtml(built, profile, true);
    const spa = renderHostHtml(home, profile, false);
    expect(spa).not.toContain('rel="canonical"');
    expect(spa).not.toContain('property="og:url"');
    expect(spa).toContain('/assets/index-buildhash.js');
  });

  it('fails the build if the HTML template loses or duplicates an SEO slot', () => {
    expect(() => renderHostHtml(built.replace(/<title>.*?<\/title>/, ''), 'main', true)).toThrow();
    expect(() => renderHostHtml(built.replace('</head>', '<title>Duplicate</title></head>'), 'supplier', true)).toThrow();
  });
});
