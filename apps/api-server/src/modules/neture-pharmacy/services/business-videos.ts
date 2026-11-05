import { parseHostedVideo } from '../../../routes/signage/services/hosted-video-source.js';

export function businessVideos(content: { educationUrl?: unknown; attachments?: unknown }) {
  const candidates = [content.educationUrl, ...(Array.isArray(content.attachments) ? content.attachments.map(item => {
    if (typeof item === 'string') return item;
    if (item && typeof item === 'object') return item.url ?? item.sourceUrl;
    return null;
  }) : [])];
  const seen = new Set<string>();
  return candidates.flatMap(value => {
    const video = typeof value === 'string' ? parseHostedVideo(value) : null;
    if (!video || seen.has(video.sourceUrl)) return [];
    seen.add(video.sourceUrl);
    return [video];
  });
}
