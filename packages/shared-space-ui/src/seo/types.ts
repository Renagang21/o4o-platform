/**
 * SEO types — WO-O4O-KPA-NETURE-SEO-REGISTRY-USEPAGESEO-V1
 *
 * PageSeoConfig: 단일 페이지 SEO 설정.
 * SeoRegistry: path → PageSeoConfig 매핑 (서비스별 seoRegistry.ts 에서 사용).
 */

export interface PageSeoConfig {
  /** <title> */
  title: string;
  /** <meta name="description"> */
  description?: string;
  /** <meta property="og:type"> — 기본 'website' */
  ogType?: 'website' | 'article' | 'profile';
  /** <meta property="og:image"> — 절대 URL */
  ogImage?: string;
}

/** path(string) → PageSeoConfig 매핑. exact match 전용. */
export type SeoRegistry = Record<string, PageSeoConfig>;
