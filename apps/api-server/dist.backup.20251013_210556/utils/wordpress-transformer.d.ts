/**
 * WordPress REST API 형식으로 데이터를 변환하는 유틸리티
 */
import { CustomPost } from '../entities/CustomPost';
interface WordPressPost {
    id: number;
    date: string;
    date_gmt: string;
    guid: {
        rendered: string;
    };
    modified: string;
    modified_gmt: string;
    slug: string;
    status: string;
    type: string;
    link: string;
    title: {
        rendered: string;
    };
    content: {
        rendered: string;
        protected: boolean;
    };
    excerpt: {
        rendered: string;
        protected: boolean;
    };
    author: number;
    featured_media: number;
    comment_status: string;
    ping_status: string;
    sticky: boolean;
    template: string;
    format: string;
    meta: any[];
    categories: number[];
    tags: number[];
    acf?: Record<string, any>;
    _embedded?: {
        author?: Array<{
            id: number;
            name: string;
            url: string;
            description: string;
            link: string;
            slug: string;
            avatar_urls: Record<string, string>;
        }>;
        'wp:featuredmedia'?: Array<{
            id: number;
            date: string;
            slug: string;
            type: string;
            link: string;
            title: {
                rendered: string;
            };
            author: number;
            alt_text: string;
            caption: {
                rendered: string;
            };
            description: {
                rendered: string;
            };
            media_type: string;
            mime_type: string;
            media_details: {
                width: number;
                height: number;
                file: string;
                sizes: Record<string, any>;
            };
            source_url: string;
        }>;
        'wp:term'?: Array<Array<{
            id: number;
            link: string;
            name: string;
            slug: string;
            taxonomy: string;
        }>>;
    };
}
export declare class WordPressTransformer {
    /**
     * CustomPost를 WordPress REST API 형식으로 변환
     */
    static transformCustomPost(customPost: CustomPost, options?: {
        includeContent?: boolean;
        includeEmbedded?: boolean;
        baseUrl?: string;
    }): WordPressPost;
    /**
     * CustomPost 배열을 WordPress REST API 형식으로 변환
     */
    static transformCustomPosts(customPosts: CustomPost[], options?: Parameters<typeof WordPressTransformer.transformCustomPost>[1]): WordPressPost[];
    /**
     * ACF 필드 값을 WordPress ACF 형식으로 변환
     */
    private static transformACFFields;
    /**
     * WordPress 검색/필터 파라미터를 TypeORM 쿼리로 변환
     */
    static transformQueryParams(params: any): any;
}
export {};
//# sourceMappingURL=wordpress-transformer.d.ts.map