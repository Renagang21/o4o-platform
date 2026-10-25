/** Optional lesson metadata projection; never grants access to protected lessons. */
export interface LmsCaptionTrack { src: string; srcLang: string; label: string }
export function validCaptionTrack(value: unknown): value is LmsCaptionTrack {
  if (!value || typeof value !== 'object') return false;
  const row = value as Record<string, unknown>;
  if (typeof row.src !== 'string' || typeof row.label !== 'string' || !row.label.trim() || row.label.length > 80
    || typeof row.srcLang !== 'string' || !/^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(row.srcLang)) return false;
  try { const url = new URL(row.src); return url.protocol === 'https:' && !url.username && !url.password && /\.vtt$/i.test(url.pathname); }
  catch { return false; }
}
export function readCaptionTracks(value: unknown): LmsCaptionTrack[] {
  if (!Array.isArray(value)) return [];
  return value.slice(0, 8).filter(validCaptionTrack).map(({ src, srcLang, label }) => ({ src, srcLang, label }));
}
