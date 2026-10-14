import type { Plugin } from 'vite';
import { MAIN_ORIGIN, HOST_ORIGIN, type HostProfile } from '../src/lib/hostIdentity';
import { O4O_BRAND_TITLE, O4O_BRAND_DESCRIPTION, SUBHOST_HOME_SEO } from '../src/config/seoData';

export const SEO_PROFILES = ['main', 'supplier', 'funding', 'community'] as const;

const escapeHtml = (value: string) => value.replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]!);

/** Keep Vite's actual script/style tags; only replace the existing SEO head. */
export function renderHostHtml(html: string, profile: HostProfile, home: boolean): string {
  const seo = profile === 'main'
    ? { title: O4O_BRAND_TITLE, description: O4O_BRAND_DESCRIPTION }
    : SUBHOST_HOME_SEO[profile];
  const origin = profile === 'main' ? MAIN_ORIGIN : HOST_ORIGIN[profile];
  const replaceOne = (pattern: RegExp, replacement: string) => {
    const matches = html.match(new RegExp(pattern.source, 'g'));
    if (matches?.length !== 1) throw new Error(`Static SEO expected one ${pattern.source}`);
    html = html.replace(pattern, () => replacement);
  };
  replaceOne(/<title>[^<]*<\/title>/, `<title>${escapeHtml(seo.title)}</title>`);
  for (const [attribute, name, value] of [
    ['name', 'description', seo.description ?? ''],
    ['property', 'og:title', seo.title],
    ['property', 'og:description', seo.description ?? ''],
    ['property', 'og:url', `${origin}/`],
  ]) {
    replaceOne(new RegExp(String.raw`<meta ${attribute}="${name}" content="[^"]*"\s*/?>`),
      `<meta ${attribute}="${name}" content="${escapeHtml(value)}" />`);
  }
  // Root URL metadata must never leak into a deep SPA path. Its actual URL
  // is unknown at build time; SeoWatcher supplies it after client navigation.
  html = html.replace(/<link rel="canonical"[^>]*>/g, '');
  if (home) html = html.replace('</head>', `  <link rel="canonical" href="${origin}" />\n  </head>`);
  else html = html.replace(/<meta property="og:url"[^>]*>/g, '');
  return html;
}

/** Run after Vite emits index.html so every host uses the same hashed assets. */
export function hostStaticSeo(): Plugin {
  return {
    name: 'neture-host-static-seo',
    apply: 'build',
    enforce: 'post',
    generateBundle(_options, bundle) {
      const index = bundle['index.html'];
      if (index?.type !== 'asset' || typeof index.source !== 'string') {
        throw new Error('Static SEO requires Vite index.html');
      }
      const html = index.source;
      index.source = renderHostHtml(html, 'main', true);
      for (const profile of SEO_PROFILES) {
        for (const home of [true, false]) {
          this.emitFile({
            type: 'asset',
            fileName: `__seo/${profile}-${home ? 'home' : 'spa'}.html`,
            source: renderHostHtml(html, profile, home),
          });
        }
      }
    },
  };
}
