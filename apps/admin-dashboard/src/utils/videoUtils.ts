/**
 * Digital Signage Video Utilities
 * YouTube/Vimeo URL 처리 및 비디오 정보 추출
 */

interface VideoInfo {
  type: 'youtube' | 'vimeo' | 'unknown';
  id: string;
  embedUrl: string;
  thumbnailUrl?: string;
  title?: string;
  duration?: string;
}

/**
 * YouTube URL에서 비디오 ID 추출
 */
export function getYouTubeVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/v\/([^&\n?#]+)/,
    /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * Vimeo URL에서 비디오 ID 추출
 */
export function getVimeoVideoId(url: string): string | null {
  const patterns = [
    /vimeo\.com\/(\d+)/,
    /player\.vimeo\.com\/video\/(\d+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
}

/**
 * YouTube 플레이리스트 ID 추출
 */
export function getYouTubePlaylistId(url: string): string | null {
  const pattern = /[?&]list=([^&\n?#]+)/;
  const match = url.match(pattern);
  return match ? match[1] : null;
}

/**
 * 비디오 URL 분석 및 정보 추출
 */
export function parseVideoUrl(url: string): VideoInfo {
  // YouTube 확인
  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return {
      type: 'youtube',
      id: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${youtubeId}`,
      thumbnailUrl: `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
    };
  }

  // Vimeo 확인
  const vimeoId = getVimeoVideoId(url);
  if (vimeoId) {
    return {
      type: 'vimeo',
      id: vimeoId,
      embedUrl: `https://player.vimeo.com/video/${vimeoId}`,
      // Vimeo 썸네일은 API 호출이 필요함
    };
  }

  return {
    type: 'unknown',
    id: '',
    embedUrl: url,
  };
}

/**
 * 임베드 코드 생성
 */
export function generateEmbedCode(
  videoInfo: VideoInfo,
  options: {
    width?: number;
    height?: number;
    autoplay?: boolean;
    muted?: boolean;
    loop?: boolean;
    controls?: boolean;
  } = {}
): string {
  const {
    width = 1920,
    height = 1080,
    autoplay = false,
    muted = true, // 자동재생시 필수
    loop = false,
    controls = true,
  } = options;

  let src = videoInfo.embedUrl;
  const params: string[] = [];

  if (videoInfo.type === 'youtube') {
    if (autoplay) params.push('autoplay=1');
    if (muted) params.push('mute=1');
    if (loop) params.push(`loop=1&playlist=${videoInfo.id}`);
    if (!controls) params.push('controls=0');
    params.push('rel=0'); // 관련 동영상 숨기기
    params.push('modestbranding=1'); // YouTube 로고 최소화
  } else if (videoInfo.type === 'vimeo') {
    if (autoplay) params.push('autoplay=1');
    if (muted) params.push('muted=1');
    if (loop) params.push('loop=1');
    if (!controls) params.push('controls=0');
    params.push('byline=0'); // 제작자 정보 숨기기
    params.push('title=0'); // 제목 숨기기
  }

  if (params.length > 0) {
    src += '?' + params.join('&');
  }

  return `<iframe 
    src="${src}" 
    width="${width}" 
    height="${height}" 
    frameborder="0" 
    allow="autoplay; fullscreen; picture-in-picture" 
    allowfullscreen
    style="width: 100%; height: 100%; object-fit: cover;"
  ></iframe>`;
}

/**
 * 비디오 URL 유효성 검사
 */
export function isValidVideoUrl(url: string): boolean {
  if (!url) return false;
  
  try {
    new URL(url); // 유효한 URL인지 확인
    const videoInfo = parseVideoUrl(url);
    return videoInfo.type !== 'unknown';
  } catch {
    return false;
  }
}

/**
 * 플레이리스트 URL인지 확인
 */
export function isPlaylistUrl(url: string): boolean {
  return !!getYouTubePlaylistId(url);
}

/**
 * 시간 형식 변환 (초 -> mm:ss 또는 hh:mm:ss)
 */
export function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

/**
 * YouTube API를 통한 비디오 정보 가져오기 (API 키 필요)
 */
export async function fetchYouTubeVideoInfo(
  videoId: string,
  apiKey: string
): Promise<{ title: string; duration: string } | null> {
  try {
    const response = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`
    );
    const data = await response.json();
    
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const duration = item.contentDetails.duration; // ISO 8601 형식
      
      // PT1M13S -> 1:13 변환
      const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
      if (match) {
        const hours = parseInt(match[1] || '0');
        const minutes = parseInt(match[2] || '0');
        const seconds = parseInt(match[3] || '0');
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;
        
        return {
          title: item.snippet.title,
          duration: formatDuration(totalSeconds),
        };
      }
    }
  } catch (error: any) {
    // Error logging - use proper error handler
  }
  
  return null;
}

/**
 * 여러 비디오 URL을 한번에 처리
 */
export function parseMultipleVideoUrls(urls: string[]): VideoInfo[] {
  return urls
    .filter((url: any) => url.trim())
    .map((url: any) => parseVideoUrl(url.trim()))
    .filter((info: any) => info.type !== 'unknown');
}

/**
 * Digital Signage용 자동재생 설정으로 임베드 코드 생성
 */
export function generateSignageEmbed(videoUrl: string): string {
  const videoInfo = parseVideoUrl(videoUrl);
  
  if (videoInfo.type === 'unknown') {
    return '';
  }

  // Digital Signage는 자동재생, 무음, 반복재생, 컨트롤 숨김이 기본
  return generateEmbedCode(videoInfo, {
    autoplay: true,
    muted: true,
    loop: true,
    controls: false,
  });
}