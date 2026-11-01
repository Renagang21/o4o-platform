export function parseHostedVideo(value: string): { sourceType: 'youtube' | 'vimeo'; embedId: string; sourceUrl: string } | null {
  try {
    const u = new URL(value), host = u.hostname.toLowerCase(), parts = u.pathname.split('/').filter(Boolean);
    if (!['http:', 'https:'].includes(u.protocol) || u.username || u.password) return null;
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be', 'www.youtu.be', 'www.youtube-nocookie.com'].includes(host)) {
      const pathId = ['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : null;
      const id = host.endsWith('youtu.be') ? parts[0] : u.searchParams.get('v') || pathId;
      return id && /^[\w-]{11}$/.test(id) ? { sourceType: 'youtube', embedId: id, sourceUrl: `https://www.youtube.com/watch?v=${id}` } : null;
    }
    if (['vimeo.com', 'www.vimeo.com', 'player.vimeo.com'].includes(host)) {
      const id = parts.find(part => /^\d+$/.test(part));
      return id ? { sourceType: 'vimeo', embedId: id, sourceUrl: `https://vimeo.com/${id}` } : null;
    }
  } catch { /* Invalid addresses are reported to the editor. */ }
  return null;
}
