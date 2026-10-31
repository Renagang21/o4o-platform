import { hostedVideo } from '@o4o/tablet-kiosk-core/video-embed';

export function videoPreviewUrl(value: string): string | null {
  const video = hostedVideo(value);
  return video ? video.provider === 'youtube' ? `https://www.youtube-nocookie.com/embed/${video.id}` : `https://player.vimeo.com/video/${video.id}?dnt=1` : null;
}
