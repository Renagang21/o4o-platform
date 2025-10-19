"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideoHelper = void 0;
const axios_1 = __importDefault(require("axios"));
class VideoHelper {
    static extractVideoId(url, type) {
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
        }
        else if (type === 'vimeo') {
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
    static generateThumbnailUrl(videoId, type) {
        if (type === 'youtube') {
            return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
        }
        else if (type === 'vimeo') {
            return `https://vumbnail.com/${videoId}.jpg`;
        }
        return '';
    }
    static async getVideoInfo(videoId, type) {
        try {
            if (type === 'youtube') {
                return await this.getYouTubeInfo(videoId);
            }
            else if (type === 'vimeo') {
                return await this.getVimeoInfo(videoId);
            }
        }
        catch (error) {
            // Error log removed
        }
        return null;
    }
    static async getYouTubeInfo(videoId) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l;
        const apiKey = process.env.YOUTUBE_API_KEY;
        if (!apiKey) {
            // Warning log removed
            return null;
        }
        try {
            const response = await axios_1.default.get(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&key=${apiKey}&part=snippet,contentDetails`);
            const video = (_a = response.data.items) === null || _a === void 0 ? void 0 : _a[0];
            if (!video) {
                return null;
            }
            const duration = this.parseYouTubeDuration((_b = video.contentDetails) === null || _b === void 0 ? void 0 : _b.duration);
            return {
                title: (_c = video.snippet) === null || _c === void 0 ? void 0 : _c.title,
                description: (_d = video.snippet) === null || _d === void 0 ? void 0 : _d.description,
                duration,
                thumbnailUrl: ((_g = (_f = (_e = video.snippet) === null || _e === void 0 ? void 0 : _e.thumbnails) === null || _f === void 0 ? void 0 : _f.maxres) === null || _g === void 0 ? void 0 : _g.url) ||
                    ((_k = (_j = (_h = video.snippet) === null || _h === void 0 ? void 0 : _h.thumbnails) === null || _j === void 0 ? void 0 : _j.high) === null || _k === void 0 ? void 0 : _k.url) ||
                    `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
                publishedAt: (_l = video.snippet) === null || _l === void 0 ? void 0 : _l.published_at
            };
        }
        catch (error) {
            // Error log removed
            return null;
        }
    }
    static async getVimeoInfo(videoId) {
        var _a;
        try {
            const response = await axios_1.default.get(`https://vimeo.com/api/v2/video/${videoId}.json`);
            const video = (_a = response.data) === null || _a === void 0 ? void 0 : _a[0];
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
        }
        catch (error) {
            // Error log removed
            return null;
        }
    }
    static parseYouTubeDuration(duration) {
        if (!duration)
            return 0;
        const match = duration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
        if (!match)
            return 0;
        const hours = parseInt(match[1] || '0', 10);
        const minutes = parseInt(match[2] || '0', 10);
        const seconds = parseInt(match[3] || '0', 10);
        return hours * 3600 + minutes * 60 + seconds;
    }
    static validateVideoUrl(url, type) {
        const videoId = this.extractVideoId(url, type);
        return videoId !== null;
    }
    static isVideoAccessible(url) {
        return new Promise((resolve) => {
            axios_1.default.head(url, { timeout: 5000 })
                .then(() => resolve(true))
                .catch(() => resolve(false));
        });
    }
    static formatDuration(seconds) {
        if (seconds < 60) {
            return `${seconds}s`;
        }
        else if (seconds < 3600) {
            const minutes = Math.floor(seconds / 60);
            const remainingSeconds = seconds % 60;
            return remainingSeconds > 0 ? `${minutes}m ${remainingSeconds}s` : `${minutes}m`;
        }
        else {
            const hours = Math.floor(seconds / 3600);
            const minutes = Math.floor((seconds % 3600) / 60);
            const remainingSeconds = seconds % 60;
            let result = `${hours}h`;
            if (minutes > 0)
                result += ` ${minutes}m`;
            if (remainingSeconds > 0)
                result += ` ${remainingSeconds}s`;
            return result;
        }
    }
}
exports.VideoHelper = VideoHelper;
//# sourceMappingURL=videoHelper.js.map