/**
 * WordPress REST API 형식으로 데이터를 변환하는 유틸리티
 */

import { CustomPost } from '../entities/CustomPost';
import { User } from '../entities/User';

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
      title: { rendered: string };
      author: number;
      alt_text: string;
      caption: { rendered: string };
      description: { rendered: string };
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

export class WordPressTransformer {
  /**
   * CustomPost를 WordPress REST API 형식으로 변환
   */
  static transformCustomPost(
    customPost: CustomPost,
    options: {
      includeContent?: boolean;
      includeEmbedded?: boolean;
      baseUrl?: string;
    } = {}
  ): WordPressPost {
    const {
      includeContent = true,
      includeEmbedded = true,
      baseUrl = process.env.API_URL || 'http://localhost:4000'
    } = options;

    // 기본 WordPress Post 구조
    const wpPost: WordPressPost = {
      id: customPost.id as any, // UUID를 그대로 사용
      date: customPost.createdAt.toISOString(),
      date_gmt: customPost.createdAt.toISOString(),
      guid: {
        rendered: `${baseUrl}/cpt/${customPost.postType.slug}/posts/${customPost.id}`
      },
      modified: customPost.updatedAt.toISOString(),
      modified_gmt: customPost.updatedAt.toISOString(),
      slug: customPost.slug,
      status: customPost.status,
      type: customPost.postType.slug,
      link: `${baseUrl}/${customPost.postType.slug}/${customPost.slug}`,
      title: {
        rendered: customPost.title
      },
      content: {
        rendered: includeContent ? customPost.content : '',
        protected: false
      },
      excerpt: {
        rendered: customPost.meta?.seoDescription || '',
        protected: false
      },
      author: 1, // Default to 1 since authorId is UUID
      featured_media: 0, // Need to map from meta.thumbnail
      comment_status: 'closed',
      ping_status: 'closed',
      sticky: false,
      template: '',
      format: 'standard',
      meta: [],
      categories: [],
      tags: []
    };

    // ACF 필드 변환 (fields → acf)
    if (customPost.fields && Object.keys(customPost.fields).length > 0) {
      wpPost.acf = this.transformACFFields(customPost.fields, []);
    }

    // _embedded 정보 추가
    if (includeEmbedded) {
      wpPost._embedded = {};

      // Author 정보 - 현재는 authorId만 있으므로 기본 정보만 제공
      if (customPost.authorId) {
        wpPost._embedded.author = [{
          id: 1, // Default to 1 since authorId is UUID
          name: 'Unknown Author',
          url: `${baseUrl}/users/${customPost.authorId}`,
          description: '',
          link: `${baseUrl}/author/${customPost.authorId}`,
          slug: customPost.authorId,
          avatar_urls: {
            '24': `https://ui-avatars.com/api/?name=User&size=24`,
            '48': `https://ui-avatars.com/api/?name=User&size=48`,
            '96': `https://ui-avatars.com/api/?name=User&size=96`
          }
        }];
      }

      // Featured Media 정보 - meta.thumbnail 사용
      if (customPost.meta?.thumbnail) {
        wpPost._embedded['wp:featuredmedia'] = [{
          id: 0,
          date: new Date().toISOString(),
          slug: 'thumbnail',
          type: 'attachment',
          link: customPost.meta.thumbnail,
          title: { rendered: 'Thumbnail' },
          author: 1, // Default to 1 since authorId is UUID
          alt_text: '',
          caption: { rendered: '' },
          description: { rendered: '' },
          media_type: 'image',
          mime_type: 'image/jpeg',
          media_details: {
            width: 0,
            height: 0,
            file: customPost.meta.thumbnail,
            sizes: {}
          },
          source_url: customPost.meta.thumbnail
        }];
      }

      // Terms (Categories/Tags) 정보 - meta.tags 사용
      if (customPost.meta?.tags && customPost.meta.tags.length > 0) {
        wpPost._embedded['wp:term'] = [
          customPost.meta.tags.map((tag, index) => ({
            id: index + 1,
            link: `${baseUrl}/tag/${tag}`,
            name: tag,
            slug: tag.toLowerCase().replace(/\s+/g, '-'),
            taxonomy: 'post_tag'
          }))
        ];
      }
    }

    return wpPost;
  }

  /**
   * CustomPost 배열을 WordPress REST API 형식으로 변환
   */
  static transformCustomPosts(
    customPosts: CustomPost[],
    options?: Parameters<typeof WordPressTransformer.transformCustomPost>[1]
  ): WordPressPost[] {
    return customPosts.map((post: any) => this.transformCustomPost(post, options));
  }

  /**
   * ACF 필드 값을 WordPress ACF 형식으로 변환
   */
  private static transformACFFields(
    fieldValues: Record<string, any>,
    fieldGroups: any[]
  ): Record<string, any> {
    const acf: Record<string, any> = {};

    // 모든 필드 그룹의 필드를 플랫하게 만들기
    const allFields: any[] = [];
    fieldGroups.forEach((group: any) => {
      if (group.fields) {
        allFields.push(...group.fields);
      }
    });

    // fieldValues를 ACF 형식으로 변환
    Object.entries(fieldValues).forEach(([key, value]) => {
      const field = allFields.find((f: any) => f.name === key);
      
      if (field) {
        // 필드 타입에 따른 변환
        switch (field.type) {
          case 'image':
            // 이미지 필드는 ID 또는 객체로 저장
            acf[key] = typeof value === 'object' ? value : { ID: value };
            break;
          case 'gallery':
            // 갤러리는 이미지 ID 배열
            acf[key] = Array.isArray(value) ? value : [];
            break;
          case 'relation':
          case 'post_object':
            // 관계 필드는 ID 또는 객체 배열
            acf[key] = value;
            break;
          case 'true_false':
            // Boolean 값
            acf[key] = !!value;
            break;
          case 'number':
            // 숫자로 변환
            acf[key] = Number(value) || 0;
            break;
          case 'date':
          case 'datetime':
            // 날짜는 문자열로
            acf[key] = value ? new Date(value).toISOString() : null;
            break;
          case 'repeater':
            // 반복 필드는 배열로
            acf[key] = Array.isArray(value) ? value : [];
            break;
          default:
            // 기본적으로 그대로 전달
            acf[key] = value;
        }
      } else {
        // 필드 정의가 없어도 값은 전달
        acf[key] = value;
      }
    });

    return acf;
  }

  /**
   * WordPress 검색/필터 파라미터를 TypeORM 쿼리로 변환
   */
  static transformQueryParams(params: any) {
    const query: any = {
      where: {},
      order: {},
      take: params.per_page || 10,
      skip: ((params.page || 1) - 1) * (params.per_page || 10)
    };

    // 검색어
    if (params.search) {
      query.where.title = { $like: `%${params.search}%` };
    }

    // 상태 필터
    if (params.status) {
      query.where.status = params.status;
    }

    // 정렬
    if (params.orderby) {
      const order = params.order === 'asc' ? 'ASC' : 'DESC';
      switch (params.orderby) {
        case 'date':
          query.order.createdAt = order;
          break;
        case 'title':
          query.order.title = order;
          break;
        case 'modified':
          query.order.updatedAt = order;
          break;
        default:
          query.order[params.orderby] = order;
      }
    }

    return query;
  }
}