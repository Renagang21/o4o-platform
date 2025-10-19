interface VideoInfo {
    title?: string;
    description?: string;
    duration?: number;
    thumbnailUrl?: string;
    publishedAt?: string;
}
export declare class VideoHelper {
    static extractVideoId(url: string, type: 'youtube' | 'vimeo'): string | null;
    static generateThumbnailUrl(videoId: string, type: 'youtube' | 'vimeo'): string;
    static getVideoInfo(videoId: string, type: 'youtube' | 'vimeo'): Promise<VideoInfo | null>;
    private static getYouTubeInfo;
    private static getVimeoInfo;
    private static parseYouTubeDuration;
    static validateVideoUrl(url: string, type: 'youtube' | 'vimeo'): boolean;
    static isVideoAccessible(url: string): Promise<boolean>;
    static formatDuration(seconds: number): string;
}
export {};
//# sourceMappingURL=videoHelper.d.ts.map