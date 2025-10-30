import { AppDataSource } from '../database/connection.js';
import { Settings, PermalinkSettings } from '../entities/Settings.js';
import { Post } from '../entities/Post.js';
import { Page } from '../entities/Page.js';
import { Category } from '../entities/Category.js';
import { Tag } from '../entities/Tag.js';
import { CustomPostType } from '../entities/CustomPostType.js';
import logger from '../utils/logger.js';

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

export class PermalinkService {
  private settingsRepository = AppDataSource.getRepository(Settings);
  private postRepository = AppDataSource.getRepository(Post);
  private pageRepository = AppDataSource.getRepository(Page);
  private categoryRepository = AppDataSource.getRepository(Category);
  private tagRepository = AppDataSource.getRepository(Tag);
  private customPostTypeRepository = AppDataSource.getRepository(CustomPostType);

  // URL 구조 패턴 정의 (보완된 버전)
  private readonly patterns = {
    '%year%': '(\\d{4})',
    '%monthnum%': '(\\d{1,2})',
    '%day%': '(\\d{1,2})',
    '%postname%': '([^/]+)',
    '%post_id%': '(\\d+)',
    '%category%': '([^/]+)',
    '%author%': '([^/]+)',
    '%post_type%': '([^/]+)'
  };

  // 불용어 목록 (SEO 최적화용)
  private readonly stopWords = [
    'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'has', 'he',
    'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the', 'to', 'was', 'were', 'will', 'with'
  ];

  /**
   * Permalink 설정 가져오기
   */
  async getPermalinkSettings(): Promise<PermalinkSettings> {
    try {
      const settings = await this.settingsRepository.findOne({
        where: { key: 'permalink', type: 'permalink' }
      });

      if (!settings || !settings.value) {
        return this.getDefaultPermalinkSettings();
      }

      return settings.value as PermalinkSettings;
    } catch (error) {
      logger.error('Failed to get permalink settings:', error);
      return this.getDefaultPermalinkSettings();
    }
  }

  /**
   * Permalink 설정 저장
   */
  async savePermalinkSettings(settings: PermalinkSettings): Promise<{ success: boolean; errors?: string[] }> {
    try {
      // 설정 검증
      const validation = await this.validatePermalinkSettings(settings);
      if (!validation.valid) {
        return { success: false, errors: validation.errors };
      }

      // 기존 설정과 비교하여 변경사항 확인
      const oldSettings = await this.getPermalinkSettings();
      const hasStructureChanged = oldSettings.structure !== settings.structure;

      // 설정 저장
      await this.settingsRepository.save({
        key: 'permalink',
        type: 'permalink',
        value: settings,
        description: 'Permalink structure settings'
      });

      // 구조가 변경된 경우 리다이렉트 규칙 생성
      if (hasStructureChanged && settings.autoFlushRules) {
        await this.generateRedirectRules(oldSettings.structure, settings.structure);
      }

      logger.info('Permalink settings saved successfully', { 
        oldStructure: oldSettings.structure, 
        newStructure: settings.structure 
      });

      return { success: true };
    } catch (error) {
      logger.error('Failed to save permalink settings:', error);
      return { success: false, errors: [error.message] };
    }
  }

  /**
   * URL 생성 (향상된 버전)
   */
  async generatePostUrl(post: Post, structure?: string): Promise<string> {
    const settings = await this.getPermalinkSettings();
    const urlStructure = structure || settings.structure;

    let url = urlStructure;
    const postDate = new Date(post.published_at || post.created_at);

    // 날짜 패턴 처리
    url = url.replace(/%year%/g, postDate.getFullYear().toString());
    url = url.replace(/%monthnum%/g, String(postDate.getMonth() + 1).padStart(2, '0'));
    url = url.replace(/%day%/g, String(postDate.getDate()).padStart(2, '0'));

    // 포스트명 처리 (불용어 제거 옵션 적용)
    let postname = post.slug;
    if (settings.removeStopWords) {
      postname = this.removeStopWordsFromSlug(postname);
    }
    url = url.replace(/%postname%/g, postname);

    // 기타 패턴 처리
    url = url.replace(/%post_id%/g, post.id);
    url = url.replace(/%author%/g, post.author?.name?.toLowerCase().replace(/\s+/g, '-') || 'author');

    // 카테고리 처리
    if (url.includes('%category%') && post.categories && post.categories.length > 0) {
      url = url.replace(/%category%/g, post.categories[0].slug);
    }

    // URL 길이 체크
    if (url.length > settings.maxUrlLength) {
      logger.warn(`Generated URL exceeds max length: ${url} (${url.length} > ${settings.maxUrlLength})`);
    }

    return url.startsWith('/') ? url : `/${url}`;
  }

  /**
   * URL 파싱 및 콘텐츠 매칭
   */
  async parseUrl(path: string, structure?: string): Promise<ParsedUrl | null> {
    const settings = await this.getPermalinkSettings();
    const urlStructure = structure || settings.structure;

    try {
      // 구조를 정규식으로 변환
      let regex = urlStructure;
      const paramNames: string[] = [];

      for (const [pattern, regexPattern] of Object.entries(this.patterns)) {
        if (regex.includes(pattern)) {
          regex = regex.replace(new RegExp(pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), regexPattern);
          paramNames.push(pattern.replace(/%/g, ''));
        }
      }

      // 경로 매칭
      const match = path.match(new RegExp(`^${regex}$`));
      if (!match) {
        return null;
      }

      // 매칭된 값들 파싱
      const parsedUrl: ParsedUrl = { type: 'post' };
      
      for (let i = 1; i < match.length; i++) {
        const paramName = paramNames[i - 1];
        const value = match[i];

        switch (paramName) {
          case 'year':
            parsedUrl.year = parseInt(value);
            break;
          case 'monthnum':
            parsedUrl.month = parseInt(value);
            break;
          case 'day':
            parsedUrl.day = parseInt(value);
            break;
          case 'postname':
            parsedUrl.slug = value;
            break;
          case 'post_id':
            parsedUrl.id = value;
            break;
          case 'category':
            parsedUrl.type = 'category';
            parsedUrl.slug = value;
            break;
          case 'post_type':
            parsedUrl.type = 'custom';
            parsedUrl.postType = value;
            break;
        }
      }

      return parsedUrl;
    } catch (error) {
      logger.error('Failed to parse URL:', error);
      return null;
    }
  }

  /**
   * URL 미리보기 생성 (SEO 점수 포함)
   */
  async generateUrlPreviews(structure: string): Promise<UrlPreview[]> {
    const previews: UrlPreview[] = [];

    // 게시글 미리보기
    const postPreview = await this.generatePostPreview(structure);
    previews.push(postPreview);

    // 카테고리 미리보기
    const categoryPreview = this.generateCategoryPreview(structure);
    previews.push(categoryPreview);

    // 태그 미리보기
    const tagPreview = this.generateTagPreview(structure);
    previews.push(tagPreview);

    return previews;
  }

  /**
   * 설정 검증 (보완된 버전)
   */
  async validatePermalinkSettings(settings: PermalinkSettings): Promise<{ valid: boolean; errors: string[] }> {
    const errors: string[] = [];

    // 구조 검증
    if (!settings.structure || settings.structure.trim().length === 0) {
      errors.push('Permalink structure cannot be empty');
    }

    // 필수 패턴 검증
    if (!settings.structure.includes('%postname%') && !settings.structure.includes('%post_id%')) {
      errors.push('Permalink structure must include either %postname% or %post_id%');
    }

    // 베이스 슬러그 검증
    if (!settings.categoryBase || settings.categoryBase.trim().length === 0) {
      errors.push('Category base cannot be empty');
    }

    if (!settings.tagBase || settings.tagBase.trim().length === 0) {
      errors.push('Tag base cannot be empty');
    }

    // 커스텀 포스트 타입과의 충돌 검사
    const conflicts = await this.checkCustomPostTypeConflicts(settings);
    errors.push(...conflicts);

    // URL 길이 검증
    if (settings.maxUrlLength < 30 || settings.maxUrlLength > 200) {
      errors.push('Max URL length must be between 30 and 200 characters');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * 리다이렉트 규칙 생성
   */
  async generateRedirectRules(oldStructure: string, newStructure: string): Promise<RedirectRule[]> {
    const rules: RedirectRule[] = [];

    try {
      // 게시글들의 리다이렉트 규칙 생성
      const posts = await this.postRepository.find({
        where: { status: 'publish' },
        take: 1000 // 대량 처리를 위한 제한
      });

      for (const post of posts) {
        const oldUrl = await this.generatePostUrl(post, oldStructure);
        const newUrl = await this.generatePostUrl(post, newStructure);

        if (oldUrl !== newUrl) {
          rules.push({
            from: oldUrl,
            to: newUrl,
            statusCode: 301
          });
        }
      }

      logger.info(`Generated ${rules.length} redirect rules for structure change`);
      return rules;
    } catch (error) {
      logger.error('Failed to generate redirect rules:', error);
      return [];
    }
  }

  // Private helper methods

  private getDefaultPermalinkSettings(): PermalinkSettings {
    return {
      structure: '/%postname%/',
      categoryBase: 'category',
      tagBase: 'tag',
      removeStopWords: false,
      maxUrlLength: 75,
      autoFlushRules: true,
      enableSeoWarnings: true
    };
  }

  private removeStopWordsFromSlug(slug: string): string {
    const words = slug.split('-');
    const filteredWords = words.filter(word => !this.stopWords.includes(word.toLowerCase()));
    return filteredWords.length > 0 ? filteredWords.join('-') : slug;
  }

  private async generatePostPreview(structure: string): Promise<UrlPreview> {
    // 샘플 포스트로 미리보기 생성
    const samplePost = {
      slug: 'sample-blog-post',
      published_at: new Date(),
      created_at: new Date(),
      id: '123',
      author: { name: 'John Doe' },
      categories: [{ slug: 'technology' }]
    } as any;

    const exampleUrl = await this.generatePostUrl(samplePost, structure);
    const seoScore = this.calculateSeoScore(structure, exampleUrl);
    const warnings = this.generateSeoWarnings(structure, exampleUrl);

    return {
      type: '게시글',
      example: exampleUrl,
      seoScore,
      warnings
    };
  }

  private generateCategoryPreview(structure: string): UrlPreview {
    const settings = this.getDefaultPermalinkSettings();
    const exampleUrl = `/${settings.categoryBase}/technology/`;
    
    return {
      type: '카테고리',
      example: exampleUrl,
      seoScore: 85, // 카테고리는 일반적으로 SEO 친화적
      warnings: []
    };
  }

  private generateTagPreview(structure: string): UrlPreview {
    const settings = this.getDefaultPermalinkSettings();
    const exampleUrl = `/${settings.tagBase}/javascript/`;
    
    return {
      type: '태그',
      example: exampleUrl,
      seoScore: 80,
      warnings: []
    };
  }

  private calculateSeoScore(structure: string, exampleUrl: string): number {
    let score = 100;

    // 날짜 포함 시 점수 감점
    if (structure.includes('%year%') || structure.includes('%monthnum%') || structure.includes('%day%')) {
      score -= 30;
    }

    // URL 길이에 따른 점수 감점
    if (exampleUrl.length > 75) {
      score -= Math.min(20, (exampleUrl.length - 75) * 2);
    }

    // 숫자 ID 사용 시 점수 감점
    if (structure.includes('%post_id%')) {
      score -= 15;
    }

    return Math.max(0, score);
  }

  private generateSeoWarnings(structure: string, exampleUrl: string): string[] {
    const warnings: string[] = [];

    if (structure.includes('%year%') || structure.includes('%monthnum%') || structure.includes('%day%')) {
      warnings.push('날짜가 포함된 URL은 콘텐츠를 오래된 것으로 보이게 할 수 있습니다');
      warnings.push('에버그린 콘텐츠에는 날짜 미포함을 권장합니다');
    }

    if (exampleUrl.length > 75) {
      warnings.push(`URL이 너무 깁니다 (${exampleUrl.length}자). 75자 이하를 권장합니다`);
    }

    if (structure.includes('%post_id%')) {
      warnings.push('숫자 ID는 SEO에 불리할 수 있습니다. %postname% 사용을 권장합니다');
    }

    return warnings;
  }

  private async checkCustomPostTypeConflicts(settings: PermalinkSettings): Promise<string[]> {
    const conflicts: string[] = [];

    try {
      const customPostTypes = await this.customPostTypeRepository.find();
      
      for (const cpt of customPostTypes) {
        // rewrite slug 충돌 검사
        const rewriteSlug = cpt.rewrite?.slug || cpt.slug;
        if (rewriteSlug) {
          if (settings.categoryBase === rewriteSlug) {
            conflicts.push(`Category base conflicts with custom post type: ${rewriteSlug}`);
          }
          if (settings.tagBase === rewriteSlug) {
            conflicts.push(`Tag base conflicts with custom post type: ${rewriteSlug}`);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to check custom post type conflicts:', error);
    }

    return conflicts;
  }
}

export const permalinkService = new PermalinkService();