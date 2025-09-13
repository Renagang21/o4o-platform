import axios from 'axios';

interface VideoInfo {
  title?: string;
  description?: string;
  duration?: number;
  thumbnailUrl?: string;
  publishedAt?: string;
}

export class VideoHelper {
  static extractVideoId(url: string, type: 'youtube' | 'vimeo'): string | null {
    if (type === 'youtube') {
      const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
        /youtube\.com\/watch\?.*v=([^&\n?#]+)/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
    } else if (type === 'vimeo') {
      const patterns = [
        /vimeo\.com\/(\d+)/,
        /vimeo\.com\/channels\/[^/]+\/(\d+)/,
        /vimeo\.com\/groups\/[^/]+\/videos\/(\d+)/
      ];
      
      for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
          return match[1];
        }
      }
    }
    
    return null;
  }

  static generateThumbnailUrl(videoId: string, type: 'youtube' | 'vimeo'): string {
    if (type === 'youtube') {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    } else if (type === 'vimeo') {
      return `https://vumbnail.com/${videoId}.jpg`;
    }
    
    return '';
  }

  static async getVideoInfo(videoId: string, type: 'youtube' | 'vimeo'): Promise<VideoInfo | null> {
    try {
      if (type === 'youtube') {
        return await this.getYouTubeInfo(videoId);
      } else if (type === 'vimeo') {
        return await this.getVimeoInfo(videoId);
      }
    } catch (error: any) {
      // Error log removed
    }
    
    return null;
  }

  private static async getYouTubeInfo(videoId: string): Promise<VideoInfo | null> {
    const apiKey = process.env.YOUTUBE_API_KEY;
    if (!apiKey) {
      // Warning log removed
      return null;
    }

    try {
      const response = await axios.get(
        `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`
      );

      const video = response.data.items?.[0];
      if (!video) {
        return null;
      }

      const duration = this.parseYouTubeDuration(video.contentDetails?.duration);
      
      return {
        title: video.snippet?.title,
        description: video.snippet?.description,
        duration,
        thumbnailUrl: video.snippet?.thumbnails?.maxres?.url || 
                     video.snippet?.thumbnails?.high?.url ||
                     `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
        publishedAt: video.snippet?.published_at
      };
    } catch (error: any) {
      // Error log removed
      return null;
    }
  }

  private static async getVimeoInfo(videoId: string): Promise<VideoInfo | null> {
    try {
      const response = await axios.get(`https://vimeo.com/api/v2/video/${videoId}.json`);
      const video = response.data?.[0];
      
      if (!video) {
        return null;
      }

      return {
        title: video.title,
        description: video.description,
        duration: video.duration,
        thumbnailUrl: video.thumbnail_large,
        publishedAt: video.upload_date
      };
    } catch (error: any) {
      // Error log removed
      return null;
    }
  }

  private static parseYouTubeDuration(duration: string): number {
    if (!duration) return 0;
    
    const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    if (!match) return 0;
    
    const hours = parseInt(match[1] || '0', 10);
    const minutes = parseInt(match[2] || '0', 10);
    const seconds = parseInt(match[3] || '0', 10);
    
    return hours * 3600 + minutes * 60 + seconds;
  }

  static validateVideoUrl(url: string, type: 'youtube' | 'vimeo'): boolean {
    const videoId = this.extractVideoId(url, type);
    return videoId !== null;
  }

  static isVideoAccessible(url: string): Promise<boolean> {
    return new Promise((resolve) => {
      axios.head(url, { timeout: 5000 })
        .then(() => resolve(true))
        .catch(() => resolve(false));
    });
  }

  static formatDuration(seconds: number): string {
    if (seconds < 60) {
      return `${seconds}s`;
    } else if (seconds < 3600) {
      const minutes = Math.floor(seconds / 60);
      const remainingSeconds = seconds % 60;
      return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
    } else {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const remainingSeconds = seconds % 60;
      
      let result = `${hours}h`;
      if (minutes > 0) result += ` ${minutes}m`;
      if (remainingSeconds > 0) result += ` ${remainingSeconds}s`;
      
      return result;
    }
  }
}