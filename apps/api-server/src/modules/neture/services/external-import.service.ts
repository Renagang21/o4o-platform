/**
 * ExternalImportService — WO-NETURE-EXTERNAL-PRODUCT-IMPORT-ASSISTANT-V1
 *
 * 외부 쇼핑몰 상품 페이지에서 상품명/간략설명/상세설명을 추출하고,
 * 이미지를 O4O GCS에 업로드한 후 URL을 교체하여 반환한다.
 */

import { JSDOM } from 'jsdom';
import sharp from 'sharp';
import logger from '../../../utils/logger.js';
import { ImageStorageService } from './image-storage.service.js';
import type { DataSource } from 'typeorm';

// ── 사이트 파싱 규칙 (확장 가능) ──

interface SiteParserConfig {
  domain: string;
  name: string;
  selectors: {
    productName: string;
    shortDescription: string;
    detailDescription: string;
  };
}

const SITE_PARSERS: SiteParserConfig[] = [
  {
    domain: '3lifezone.co.kr',
    name: '쓰리라이프존',
    selectors: {
      productName: '#frmView .item_detail_tit h3, .goods_name h3, input[name="goods_name"]',
      shortDescription: '#frmView .item_detail_list .txt, .item_info_cont .txt, .simple_desc',
      detailDescription: '#detail .detail_cont, #prdDetail, .goods_description',
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

// ── 텍스트 장식 제거 ──

const DECORATION_PROPERTIES = [
  'font-size', 'font-family', 'color', 'background-color', 'background',
  'line-height', 'letter-spacing', 'font-weight', 'font-style',
  'text-decoration', 'text-shadow', 'word-spacing',
];

function stripDecoration(html: string): string {
  const dom = new JSDOM(`<div id="__root">${html}</div>`);
  const doc = dom.window.document;
  const root = doc.getElementById('__root')!;

  // Remove <font> tags — unwrap to children
  root.querySelectorAll('font').forEach((font) => {
    const parent = font.parentNode;
    if (parent) {
      while (font.firstChild) {
        parent.insertBefore(font.firstChild, font);
      }
      parent.removeChild(font);
    }
  });

  // Strip decoration styles from all elements
  root.querySelectorAll('[style]').forEach((el) => {
    const htmlEl = el as HTMLElement;
    for (const prop of DECORATION_PROPERTIES) {
      htmlEl.style.removeProperty(prop);
    }
    // Remove style attribute entirely if empty
    if (!htmlEl.getAttribute('style')?.trim()) {
      htmlEl.removeAttribute('style');
    }
  });

  // Remove class attributes (site-specific classes)
  root.querySelectorAll('[class]').forEach((el) => {
    el.removeAttribute('class');
  });

  return root.innerHTML;
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

    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Extract fields using selectors
    let productName: string | null = null;
    let shortDescription: string | null = null;
    let detailHtml: string | null = null;

    if (parser) {
      // Product name
      const nameEl = doc.querySelector(parser.selectors.productName);
      if (nameEl) {
        productName = (nameEl as HTMLInputElement).value?.trim()
          || nameEl.textContent?.trim()
          || null;
      }

      // Short description
      const shortEl = doc.querySelector(parser.selectors.shortDescription);
      if (shortEl) {
        shortDescription = shortEl.textContent?.trim() || null;
      }

      // Detail description
      const detailEl = doc.querySelector(parser.selectors.detailDescription);
      if (detailEl) {
        detailHtml = detailEl.innerHTML;
      }
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

    // 2. Extract and replace images
    const dom = new JSDOM(`<div id="__root">${cleaned}</div>`);
    const doc = dom.window.document;
    const root = doc.getElementById('__root')!;
    const imgElements = root.querySelectorAll('img');

    let imageCount = 0;

    for (const img of Array.from(imgElements)) {
      const src = img.getAttribute('src');
      if (!src) continue;

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
        img.setAttribute('src', newUrl);
        imageCount++;
      } catch (err) {
        logger.warn(`[ExternalImport] Image download failed: ${absoluteUrl}`, err);
        // Keep original URL on failure
      }
    }

    return { html: root.innerHTML, imageCount };
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
