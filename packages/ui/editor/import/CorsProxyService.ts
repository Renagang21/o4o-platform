import DOMPurify from 'dompurify';

export interface ProxyResponse {
  content: string;
  status: number;
  contentType?: string;
  finalUrl: string;
  error?: string;
}

export interface SecurityCheckResult {
  isSafe: boolean;
  warnings: string[];
  sanitizedContent?: string;
}

export class CorsProxyService {
  private readonly allowedDomains: Set<string>;
  private readonly blockedPatterns: RegExp[];
  private readonly maxContentSize: number = 5 * 1024 * 1024; // 5MB

  constructor() {
    // 허용된 도메인 목록
    this.allowedDomains = new Set([
      'wordpress.com',
      'wordpress.org',
      'medium.com',
      'github.com',
      'dev.to',
      'hashnode.com'
    ]);

    // 차단할 패턴들
    this.blockedPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /file:/i,
      /ftp:/i
    ];
  }

  /**
   * URL 보안 검증
   */
  validateUrl(url: string): { isValid: boolean; reason?: string } {
    try {
      const urlObj = new URL(url);
      
      // 프로토콜 검증
      if (!['http:', 'https:'].includes(urlObj.protocol)) {
        return { isValid: false, reason: 'HTTP 또는 HTTPS 프로토콜만 허용됩니다.' };
      }

      // 차단된 패턴 검증
      for (const pattern of this.blockedPatterns) {
        if (pattern.test(url)) {
          return { isValid: false, reason: '허용되지 않은 URL 형식입니다.' };
        }
      }

      // 로컬 IP 차단
      if (this.isLocalIp(urlObj.hostname)) {
        return { isValid: false, reason: '로컬 IP 주소는 허용되지 않습니다.' };
      }

      // 도메인 화이트리스트 검증 (개발 모드에서는 비활성화)
      if (process.env.NODE_ENV === 'production') {
        const isAllowedDomain = Array.from(this.allowedDomains).some(domain => 
          urlObj.hostname.endsWith(domain)
        );
        
        if (!isAllowedDomain) {
          return { isValid: false, reason: '허용되지 않은 도메인입니다.' };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, reason: '유효하지 않은 URL 형식입니다.' };
    }
  }

  /**
   * CORS 프록시를 통한 콘텐츠 가져오기
   */
  async fetchContent(url: string): Promise<ProxyResponse> {
    // URL 검증
    const validation = this.validateUrl(url);
    if (!validation.isValid) {
      throw new Error(validation.reason);
    }

    try {
      // 개발 환경에서는 공개 CORS 프록시 사용
      if (process.env.NODE_ENV === 'development') {
        return await this.fetchWithPublicProxy(url);
      }
      
      // 프로덕션에서는 자체 서버 사이드 프록시 사용
      return await this.fetchWithServerProxy(url);
      
    } catch (error) {
      throw new Error(`콘텐츠를 가져올 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 공개 CORS 프록시 사용 (개발 환경)
   */
  private async fetchWithPublicProxy(url: string): Promise<ProxyResponse> {
    const proxyServices = [
      `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
      `https://corsproxy.io/?${encodeURIComponent(url)}`,
      `https://cors-anywhere.herokuapp.com/${url}`
    ];

    let lastError: Error | null = null;

    for (const proxyUrl of proxyServices) {
      try {
        const response = await fetch(proxyUrl, {
          method: 'GET',
          headers: {
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'User-Agent': 'Mozilla/5.0 (compatible; ContentImporter/1.0)'
          }
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        let content: string;
        
        // allorigins의 경우 JSON 응답
        if (proxyUrl.includes('allorigins.win')) {
          const data = await response.json();
          content = data.contents;
        } else {
          content = await response.text();
        }

        // 콘텐츠 크기 검증
        if (content.length > this.maxContentSize) {
          throw new Error('콘텐츠 크기가 너무 큽니다.');
        }

        return {
          content,
          status: response.status,
          contentType: response.headers.get('content-type') || undefined,
          finalUrl: url
        };
        
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('알 수 없는 오류');
        continue;
      }
    }

    throw lastError || new Error('모든 프록시 서비스가 실패했습니다.');
  }

  /**
   * 서버 사이드 프록시 사용 (프로덕션 환경)
   */
  private async fetchWithServerProxy(url: string): Promise<ProxyResponse> {
    const response = await fetch('/api/proxy-fetch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `서버 오류: ${response.status}`);
    }

    const data = await response.json();
    return data;
  }

  /**
   * 콘텐츠 보안 검사 및 정리
   */
  performSecurityCheck(html: string): SecurityCheckResult {
    const warnings: string[] = [];
    
    try {
      // DOMPurify 설정
      const config = {
        // 허용할 태그들
        ALLOWED_TAGS: [
          'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
          'p', 'br', 'strong', 'em', 'u', 'b', 'i',
          'a', 'img', 'ul', 'ol', 'li',
          'blockquote', 'pre', 'code',
          'table', 'thead', 'tbody', 'tr', 'td', 'th',
          'div', 'span', 'hr'
        ],
        
        // 허용할 속성들
        ALLOWED_ATTR: [
          'href', 'src', 'alt', 'title', 'class', 'id',
          'target', 'rel', 'width', 'height',
          'colspan', 'rowspan'
        ],
        
        // 허용할 URI 스키마
        ALLOWED_URI_REGEXP: /^(?:(?:(?:f|ht)tps?|mailto|tel|callto|cid|xmpp):|[^a-z]|[a-z+.\-]+(?:[^a-z+.\-:]|$))/i,
        
        // 금지할 태그들
        FORBID_TAGS: ['script', 'style', 'link', 'meta', 'object', 'embed', 'iframe'],
        
        // 금지할 속성들
        FORBID_ATTR: [
          'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
          'onfocus', 'onblur', 'onchange', 'onsubmit'
        ],
        
        // 빈 요소 제거
        REMOVE_EMPTY: true,
        
        // 빈 속성 제거
        REMOVE_EMPTY_ATTRS: true
      };

      // 정리된 HTML 생성
      const sanitizedContent = DOMPurify.sanitize(html, config);
      
      // 제거된 콘텐츠 감지
      if (html.length !== sanitizedContent.length) {
        warnings.push('보안상 위험한 요소가 제거되었습니다.');
      }
      
      // 스크립트 태그 감지
      if (html.toLowerCase().includes('<script')) {
        warnings.push('JavaScript 코드가 제거되었습니다.');
      }
      
      // 스타일 태그 감지
      if (html.toLowerCase().includes('<style')) {
        warnings.push('CSS 스타일이 제거되었습니다.');
      }
      
      // 외부 리소스 감지
      const externalLinks = (html.match(/src="https?:\/\/[^"]+"/g) || []).length;
      if (externalLinks > 0) {
        warnings.push(`${externalLinks}개의 외부 리소스가 감지되었습니다.`);
      }

      return {
        isSafe: true,
        warnings,
        sanitizedContent
      };
      
    } catch (error) {
      return {
        isSafe: false,
        warnings: [`보안 검사 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`]
      };
    }
  }

  /**
   * 로컬 IP 주소 감지
   */
  private isLocalIp(hostname: string): boolean {
    // 로컬 호스트
    if (['localhost', '127.0.0.1', '::1'].includes(hostname)) {
      return true;
    }
    
    // 사설 IP 대역
    const privateRanges = [
      /^10\./,
      /^172\.(1[6-9]|2[0-9]|3[01])\./,
      /^192\.168\./,
      /^169\.254\./, // Link-local
      /^fc00:/, // IPv6 private
      /^fd[0-9a-f]{2}:/ // IPv6 private
    ];
    
    return privateRanges.some(range => range.test(hostname));
  }

  /**
   * 콘텐츠 타입 검증
   */
  validateContentType(contentType?: string): boolean {
    if (!contentType) return true; // 기본적으로 허용
    
    const allowedTypes = [
      'text/html',
      'application/xhtml+xml',
      'text/plain'
    ];
    
    return allowedTypes.some(type => contentType.includes(type));
  }

  /**
   * 응답 크기 제한 확인
   */
  validateContentSize(content: string): { isValid: boolean; reason?: string } {
    if (content.length > this.maxContentSize) {
      return {
        isValid: false,
        reason: `콘텐츠 크기가 제한을 초과했습니다. (최대: ${this.maxContentSize / 1024 / 1024}MB)`
      };
    }
    
    return { isValid: true };
  }

  /**
   * 콘텐츠 품질 검사
   */
  assessContentQuality(html: string): {
    score: number; // 0-100
    issues: string[];
    suggestions: string[];
  } {
    const issues: string[] = [];
    const suggestions: string[] = [];
    let score = 100;

    // HTML 구조 검사
    const hasTitle = /<h[1-6]/i.test(html);
    if (!hasTitle) {
      issues.push('제목이 없습니다.');
      suggestions.push('제목을 추가하세요.');
      score -= 20;
    }

    // 콘텐츠 길이 검사
    const textContent = html.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 100) {
      issues.push('콘텐츠가 너무 짧습니다.');
      suggestions.push('더 많은 내용을 추가하세요.');
      score -= 15;
    }

    // 이미지 alt 텍스트 검사
    const images = html.match(/<img[^>]*>/g) || [];
    const imagesWithoutAlt = images.filter(img => !img.includes('alt='));
    if (imagesWithoutAlt.length > 0) {
      issues.push(`${imagesWithoutAlt.length}개의 이미지에 alt 텍스트가 없습니다.`);
      suggestions.push('이미지에 대체 텍스트를 추가하세요.');
      score -= 10;
    }

    // 링크 검사
    const links = html.match(/<a[^>]*href="[^"]*"[^>]*>/g) || [];
    const externalLinks = links.filter(link => link.includes('http'));
    if (externalLinks.length > 10) {
      issues.push('외부 링크가 너무 많습니다.');
      suggestions.push('관련성 있는 링크만 유지하세요.');
      score -= 5;
    }

    return {
      score: Math.max(0, Math.min(100, score)),
      issues,
      suggestions
    };
  }
}