/**
 * ExternalImportService — WO-NETURE-EXTERNAL-PRODUCT-IMPORT-ASSISTANT-V1
 *
 * 외부 쇼핑몰 상품 페이지에서 상품명/간략설명/상세설명을 추출하고,
 * 이미지를 O4O GCS에 업로드한 후 URL을 교체하여 반환한다.
 *
 * jsdom 대신 regex 기반 파싱 사용 (Cloud Run punycode 호환성 문제 회피)
 */

import sharp from 'sharp';
import logger from '../../../utils/logger.js';
import { ImageStorageService } from './image-storage.service.js';
import type { DataSource } from 'typeorm';

// ── 사이트 파싱 규칙 (확장 가능) ──

interface SiteParserConfig {
  domain: string;
  name: string;
  // regex 기반 추출 패턴
  patterns: {
    productName: RegExp;
    shortDescription: RegExp;
    detailDescription: RegExp;
  };
}

const SITE_PARSERS: SiteParserConfig[] = [
  {
    domain: '3lifezone.co.kr',
    name: '쓰리라이프존',
    patterns: {
      // 퍼스트몰 관리자 페이지: input[name="goods_name"] value
      productName: /name=["']goods_name["'][^>]*value=["']([^"']+)["']/i,
      // 간략설명 textarea
      shortDescription: /name=["']short_description["'][^>]*>([^<]*)</i,
      // 상세설명: 에디터 영역 (tx_canvas_wysiwyg 이후 콘텐츠 또는 goods_description)
      detailDescription: /class=["'][^"']*detail_cont[^"']*["'][^>]*>([\s\S]*?)<\/div>/i,
    },
  },
];

function findParser(url: string): SiteParserConfig | null {
  try {
    const hostname = new URL(url).hostname;
    return SITE_PARSERS.find((p) => hostname.includes(p.domain)) || null;
  } catch {
    return null;
  }
}

// ── 텍스트 장식 제거 (regex 기반) ──

const DECORATION_PROPS_RE = /\b(?:font-size|font-family|color|background-color|background|line-height|letter-spacing|font-weight|font-style|text-decoration|text-shadow|word-spacing)\s*:[^;]+;?/gi;

function stripDecoration(html: string): string {
  let result = html;

  // 1. <font ...> 태그 → 내용만 유지
  result = result.replace(/<font[^>]*>([\s\S]*?)<\/font>/gi, '$1');

  // 2. style 속성에서 장식 속성 제거
  result = result.replace(/style\s*=\s*"([^"]*)"/gi, (match, styleContent: string) => {
    const cleaned = styleContent.replace(DECORATION_PROPS_RE, '').trim();
    return cleaned ? `style="${cleaned}"` : '';
  });
  result = result.replace(/style\s*=\s*'([^']*)'/gi, (match, styleContent: string) => {
    const cleaned = styleContent.replace(DECORATION_PROPS_RE, '').trim();
    return cleaned ? `style='${cleaned}'` : '';
  });

  // 3. class 속성 제거 (외부 사이트 전용 클래스)
  result = result.replace(/\s+class\s*=\s*["'][^"']*["']/gi, '');

  // 4. 빈 style 속성 정리
  result = result.replace(/\s+style\s*=\s*["']\s*["']/gi, '');

  // 5. 빈 span 태그 정리 (<span>내용</span> → 내용)
  result = result.replace(/<span\s*>([\s\S]*?)<\/span>/gi, '$1');

  return result;
}

// ── 이미지 src 추출 및 교체 ──

function extractImageSrcs(html: string): string[] {
  const srcs: string[] = [];
  const imgRegex = /<img[^>]+src\s*=\s*["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = imgRegex.exec(html)) !== null) {
    srcs.push(match[1]);
  }
  return srcs;
}

function replaceImageSrc(html: string, oldSrc: string, newSrc: string): string {
  // Escape special regex chars in the src
  const escaped = oldSrc.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return html.replace(new RegExp(`(src\\s*=\\s*["'])${escaped}(["'])`, 'g'), `$1${newSrc}$2`);
}

// ── 메인 서비스 ──

export interface ExternalImportResult {
  productName: string | null;
  shortDescription: string | null;
  detailDescription: string | null;
  imageCount: number;
  source: string;
}

export class ExternalImportService {
  private imageStorage: ImageStorageService;

  constructor(private dataSource: DataSource) {
    this.imageStorage = new ImageStorageService();
  }

  async parseFromUrl(url: string, masterId: string): Promise<ExternalImportResult> {
    const parser = findParser(url);
    const source = new URL(url).hostname;

    // Fetch page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; O4O-Import/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'ko-KR,ko;q=0.9',
      },
    });

    if (!response.ok) {
      throw new Error(`외부 페이지 접근 실패: HTTP ${response.status}`);
    }

    const html = await response.text();

    // 로그인 리다이렉트 감지 (비회원 차단 사이트)
    if (html.includes('member_only') || html.includes('return_url') || html.includes('login_process')) {
      throw new Error('이 사이트는 로그인이 필요합니다. "HTML 붙여넣기" 탭을 이용하세요.');
    }

    // Extract fields using regex patterns
    let productName: string | null = null;
    let shortDescription: string | null = null;
    let detailHtml: string | null = null;

    if (parser) {
      const nameMatch = html.match(parser.patterns.productName);
      if (nameMatch) productName = nameMatch[1].trim();

      const shortMatch = html.match(parser.patterns.shortDescription);
      if (shortMatch) shortDescription = shortMatch[1].trim();

      const detailMatch = html.match(parser.patterns.detailDescription);
      if (detailMatch) detailHtml = detailMatch[1];
    }

    // Process detail description
    let processedDetail: string | null = null;
    let imageCount = 0;

    if (detailHtml) {
      const result = await this.processHtml(detailHtml, masterId, source);
      processedDetail = result.html;
      imageCount = result.imageCount;
    }

    return {
      productName,
      shortDescription,
      detailDescription: processedDetail,
      imageCount,
      source,
    };
  }

  async parseFromHtml(html: string, masterId: string): Promise<ExternalImportResult> {
    const result = await this.processHtml(html, masterId, 'direct-paste');

    return {
      productName: null,
      shortDescription: null,
      detailDescription: result.html,
      imageCount: result.imageCount,
      source: 'direct-paste',
    };
  }

  private async processHtml(
    html: string,
    masterId: string,
    source: string,
  ): Promise<{ html: string; imageCount: number }> {
    // 1. Strip decoration
    let cleaned = stripDecoration(html);

    // 2. Extract image srcs and process them
    const srcs = extractImageSrcs(cleaned);
    let imageCount = 0;

    for (const src of srcs) {
      // Resolve relative URLs
      let absoluteUrl = src;
      if (src.startsWith('//')) {
        absoluteUrl = `https:${src}`;
      } else if (src.startsWith('/')) {
        // Can't resolve without base URL — skip
        continue;
      }

      if (!absoluteUrl.startsWith('http')) continue;

      try {
        const newUrl = await this.downloadAndUploadImage(absoluteUrl, masterId);
        cleaned = replaceImageSrc(cleaned, src, newUrl);
        imageCount++;
      } catch (err) {
        logger.warn(`[ExternalImport] Image download failed: ${absoluteUrl}`, err);
        // Keep original URL on failure
      }
    }

    return { html: cleaned, imageCount };
  }

  private async downloadAndUploadImage(imageUrl: string, masterId: string): Promise<string> {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; O4O-Import/1.0)',
        'Referer': imageUrl,
      },
    });

    if (!response.ok) {
      throw new Error(`Image download failed: ${response.status}`);
    }

    const buffer = Buffer.from(await response.arrayBuffer());

    // Resize with sharp (same policy as content images)
    const processed = await sharp(buffer)
      .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 85 })
      .toBuffer();

    // Upload to GCS
    const { url } = await this.imageStorage.uploadImage(
      masterId,
      processed,
      'image/webp',
      'external-import.webp',
      'content',
    );

    logger.info(`[ExternalImport] Image uploaded: ${imageUrl.substring(0, 80)}... → ${url}`);

    return url;
  }
}
