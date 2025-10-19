import { PermalinkSettings } from '../entities/Settings';
import { Post } from '../entities/Post';
export interface ParsedUrl {
    type: 'post' | 'page' | 'category' | 'tag' | 'custom';
    id?: string;
    slug?: string;
    year?: number;
    month?: number;
    day?: number;
    postType?: string;
}
export interface UrlPreview {
    type: string;
    example: string;
    seoScore: number;
    warnings: string[];
}
export interface RedirectRule {
    from: string;
    to: string;
    statusCode: number;
}
export declare class PermalinkService {
    private settingsRepository;
    private postRepository;
    private pageRepository;
    private categoryRepository;
    private tagRepository;
    private customPostTypeRepository;
    private readonly patterns;
    private readonly stopWords;
    /**
     * Permalink 설정 가져오기
     */
    getPermalinkSettings(): Promise<PermalinkSettings>;
    /**
     * Permalink 설정 저장
     */
    savePermalinkSettings(settings: PermalinkSettings): Promise<{
        success: boolean;
        errors?: string[];
    }>;
    /**
     * URL 생성 (향상된 버전)
     */
    generatePostUrl(post: Post, structure?: string): Promise<string>;
    /**
     * URL 파싱 및 콘텐츠 매칭
     */
    parseUrl(path: string, structure?: string): Promise<ParsedUrl | null>;
    /**
     * URL 미리보기 생성 (SEO 점수 포함)
     */
    generateUrlPreviews(structure: string): Promise<UrlPreview[]>;
    /**
     * 설정 검증 (보완된 버전)
     */
    validatePermalinkSettings(settings: PermalinkSettings): Promise<{
        valid: boolean;
        errors: string[];
    }>;
    /**
     * 리다이렉트 규칙 생성
     */
    generateRedirectRules(oldStructure: string, newStructure: string): Promise<RedirectRule[]>;
    private getDefaultPermalinkSettings;
    private removeStopWordsFromSlug;
    private generatePostPreview;
    private generateCategoryPreview;
    private generateTagPreview;
    private calculateSeoScore;
    private generateSeoWarnings;
    private checkCustomPostTypeConflicts;
}
export declare const permalinkService: PermalinkService;
//# sourceMappingURL=permalink.service.d.ts.map