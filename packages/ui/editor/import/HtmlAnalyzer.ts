import DOMPurify from 'dompurify';

export interface AnalyzedContent {
  title?: string;
  content: string;
  meta: {
    wordCount: number;
    imageCount: number;
    linkCount: number;
    headingCount: number;
    listCount: number;
    tableCount: number;
  };
  blocks: ParsedBlock[];
  requiredExtensions: string[];
}

export interface ParsedBlock {
  type: string;
  content: any;
  attrs?: Record<string, any>;
  marks?: Array<{ type: string; attrs?: Record<string, any> }>;
}

export class HtmlAnalyzer {
  private parser: DOMParser;
  private requiredExtensions: Set<string>;

  constructor() {
    this.parser = new DOMParser();
    this.requiredExtensions = new Set();
  }

  /**
   * WordPress 페이지에서 HTML을 가져오고 분석합니다.
   */
  async analyzeWordPressPage(url: string): Promise<AnalyzedContent> {
    try {
      // CORS 문제 해결을 위한 프록시 사용 또는 서버 사이드 요청
      const response = await this.fetchWithCorsProxy(url);
      const html = await response.text();
      
      return this.analyzeHtmlString(html, { isWordPress: true, sourceUrl: url });
    } catch (error) {
      throw new Error(`WordPress 페이지를 가져올 수 없습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * HTML 문자열을 분석합니다.
   */
  analyzeHtmlString(html: string, options: { isWordPress?: boolean; sourceUrl?: string } = {}): AnalyzedContent {
    try {
      // DOMPurify로 안전한 HTML 생성
      const cleanHtml = DOMPurify.sanitize(html, {
        ADD_TAGS: ['iframe'], // iframe 허용 (YouTube 등)
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling'],
        FORBID_TAGS: ['script', 'style', 'link', 'meta', 'noscript'],
        FORBID_ATTR: ['onclick', 'onload', 'onerror', 'onmouseover']
      });

      const doc = this.parser.parseFromString(cleanHtml, 'text/html');
      
      // WordPress 특정 콘텐츠 영역 추출
      const contentElement = options.isWordPress 
        ? this.extractWordPressContent(doc)
        : doc.body || doc.documentElement;

      const title = this.extractTitle(doc, options.isWordPress);
      const content = contentElement.innerHTML;
      
      // 메타데이터 추출
      const meta = this.extractMetadata(contentElement);
      
      // 블록 파싱
      const blocks = this.parseContentToBlocks(contentElement);
      
      return {
        title,
        content,
        meta,
        blocks,
        requiredExtensions: Array.from(this.requiredExtensions)
      };
    } catch (error) {
      throw new Error(`HTML 분석 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}`);
    }
  }

  /**
   * 마크다운을 HTML로 변환 후 분석합니다.
   */
  analyzeMarkdown(markdown: string): AnalyzedContent {
    // 간단한 마크다운 to HTML 변환
    const html = this.markdownToHtml(markdown);
    return this.analyzeHtmlString(html);
  }

  /**
   * CORS 문제 해결을 위한 프록시 요청
   */
  private async fetchWithCorsProxy(url: string): Promise<Response> {
    // 개발 환경에서는 CORS 프록시 사용
    if (process.env.NODE_ENV === 'development') {
      const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
      const response = await fetch(proxyUrl);
      const data = await response.json();
      return new Response(data.contents, { status: 200 });
    }
    
    // 프로덕션에서는 서버 사이드 엔드포인트 사용
    const response = await fetch('/api/proxy-fetch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    });
    
    if (!response.ok) {
      throw new Error(`서버 오류: ${response.status}`);
    }
    
    return response;
  }

  /**
   * WordPress 콘텐츠 영역 추출
   */
  private extractWordPressContent(doc: Document): Element {
    // WordPress 일반적인 콘텐츠 셀렉터들
    const selectors = [
      '.entry-content',
      '.post-content', 
      '.content',
      'article .content',
      '.wp-block-group',
      'main article',
      '#content',
      '#main'
    ];

    for (const selector of selectors) {
      const element = doc.querySelector(selector);
      if (element && element.textContent && element.textContent.trim().length > 100) {
        return element;
      }
    }

    // fallback: body에서 불필요한 요소 제거
    const body = doc.body.cloneNode(true) as Element;
    const removeSelectors = [
      'header', 'nav', 'footer', 'aside', '.sidebar', 
      '.navigation', '.menu', '.widget', '.comments',
      'script', 'style', 'noscript'
    ];
    
    removeSelectors.forEach(selector => {
      body.querySelectorAll(selector).forEach(el => el.remove());
    });

    return body;
  }

  /**
   * 제목 추출
   */
  private extractTitle(doc: Document, isWordPress: boolean = false): string | undefined {
    if (isWordPress) {
      const selectors = ['.entry-title', '.post-title', 'h1.title', 'article h1'];
      for (const selector of selectors) {
        const element = doc.querySelector(selector);
        if (element && element.textContent) {
          return element.textContent.trim();
        }
      }
    }
    
    const titleElement = doc.querySelector('title');
    return titleElement?.textContent?.trim();
  }

  /**
   * 메타데이터 추출
   */
  private extractMetadata(element: Element) {
    const text = element.textContent || '';
    return {
      wordCount: text.trim().split(/\s+/).length,
      imageCount: element.querySelectorAll('img').length,
      linkCount: element.querySelectorAll('a').length,
      headingCount: element.querySelectorAll('h1, h2, h3, h4, h5, h6').length,
      listCount: element.querySelectorAll('ul, ol').length,
      tableCount: element.querySelectorAll('table').length
    };
  }

  /**
   * HTML 요소를 Tiptap 블록으로 변환
   */
  private parseContentToBlocks(element: Element): ParsedBlock[] {
    const blocks: ParsedBlock[] = [];
    
    for (const child of Array.from(element.children)) {
      const block = this.elementToBlock(child);
      if (block) {
        blocks.push(block);
      }
    }
    
    return blocks;
  }

  /**
   * 개별 HTML 요소를 Tiptap 블록으로 변환
   */
  private elementToBlock(element: Element): ParsedBlock | null {
    const tagName = element.tagName.toLowerCase();
    
    switch (tagName) {
      case 'h1':
      case 'h2':
      case 'h3':
      case 'h4':
      case 'h5':
      case 'h6':
        this.requiredExtensions.add('heading');
        return {
          type: 'heading',
          attrs: { level: parseInt(tagName.charAt(1)) },
          content: this.parseInlineContent(element)
        };
        
      case 'p':
        return {
          type: 'paragraph',
          content: this.parseInlineContent(element)
        };
        
      case 'blockquote':
        this.requiredExtensions.add('blockquote');
        return {
          type: 'blockquote',
          content: this.parseInlineContent(element)
        };
        
      case 'ul':
        this.requiredExtensions.add('bulletList');
        return {
          type: 'bulletList',
          content: this.parseListItems(element)
        };
        
      case 'ol':
        this.requiredExtensions.add('orderedList');
        return {
          type: 'orderedList',
          content: this.parseListItems(element)
        };
        
      case 'pre':
        this.requiredExtensions.add('codeBlock');
        const codeElement = element.querySelector('code');
        return {
          type: 'codeBlock',
          attrs: {
            language: this.extractCodeLanguage(codeElement)
          },
          content: [{
            type: 'text',
            text: element.textContent || ''
          }]
        };
        
      case 'img':
        this.requiredExtensions.add('image');
        return {
          type: 'image',
          attrs: {
            src: element.getAttribute('src'),
            alt: element.getAttribute('alt'),
            title: element.getAttribute('title')
          }
        };
        
      case 'table':
        this.requiredExtensions.add('table');
        return this.parseTable(element);
        
      case 'hr':
        this.requiredExtensions.add('horizontalRule');
        return {
          type: 'horizontalRule'
        };
        
      case 'iframe':
        // YouTube, Vimeo 등 임베드 처리
        const src = element.getAttribute('src');
        if (src && (src.includes('youtube.com') || src.includes('vimeo.com'))) {
          this.requiredExtensions.add('youtube');
          return {
            type: 'youtube',
            attrs: { src }
          };
        }
        break;
        
      case 'div':
        // WordPress 블록 또는 특수 div 처리
        const className = element.className;
        if (className.includes('wp-block-')) {
          return this.parseWordPressBlock(element);
        }
        // div의 자식 요소들을 재귀적으로 처리
        break;
    }
    
    return null;
  }

  /**
   * 인라인 콘텐츠 파싱 (strong, em, a 등)
   */
  private parseInlineContent(element: Element): any[] {
    const content: any[] = [];
    
    for (const node of Array.from(element.childNodes)) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent;
        if (text) {
          content.push({ type: 'text', text });
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as Element;
        const tagName = el.tagName.toLowerCase();
        const text = el.textContent;
        
        if (!text) continue;
        
        const marks: any[] = [];
        
        switch (tagName) {
          case 'strong':
          case 'b':
            this.requiredExtensions.add('bold');
            marks.push({ type: 'bold' });
            break;
          case 'em':
          case 'i':
            this.requiredExtensions.add('italic');
            marks.push({ type: 'italic' });
            break;
          case 'u':
            this.requiredExtensions.add('underline');
            marks.push({ type: 'underline' });
            break;
          case 'code':
            this.requiredExtensions.add('code');
            marks.push({ type: 'code' });
            break;
          case 'a':
            this.requiredExtensions.add('link');
            marks.push({ 
              type: 'link', 
              attrs: { 
                href: el.getAttribute('href'),
                target: el.getAttribute('target')
              } 
            });
            break;
        }
        
        content.push({
          type: 'text',
          text,
          marks: marks.length > 0 ? marks : undefined
        });
      }
    }
    
    return content;
  }

  /**
   * 리스트 아이템 파싱
   */
  private parseListItems(element: Element): any[] {
    return Array.from(element.querySelectorAll('li')).map(li => ({
      type: 'listItem',
      content: [{
        type: 'paragraph',
        content: this.parseInlineContent(li)
      }]
    }));
  }

  /**
   * 테이블 파싱
   */
  private parseTable(element: Element): ParsedBlock {
    const rows: any[] = [];
    
    element.querySelectorAll('tr').forEach(tr => {
      const cells: any[] = [];
      tr.querySelectorAll('td, th').forEach(cell => {
        cells.push({
          type: 'tableCell',
          content: [{
            type: 'paragraph',
            content: this.parseInlineContent(cell)
          }]
        });
      });
      
      rows.push({
        type: 'tableRow',
        content: cells
      });
    });
    
    return {
      type: 'table',
      content: rows
    };
  }

  /**
   * 코드 언어 추출
   */
  private extractCodeLanguage(codeElement: Element | null): string | null {
    if (!codeElement) return null;
    
    const className = codeElement.className;
    const match = className.match(/language-(\w+)/);
    return match ? match[1] : null;
  }

  /**
   * WordPress 블록 파싱
   */
  private parseWordPressBlock(element: Element): ParsedBlock | null {
    const className = element.className;
    
    if (className.includes('wp-block-quote')) {
      this.requiredExtensions.add('blockquote');
      return {
        type: 'blockquote',
        content: this.parseInlineContent(element)
      };
    }
    
    // 다른 WordPress 블록들...
    return null;
  }

  /**
   * 간단한 마크다운 to HTML 변환
   */
  private markdownToHtml(markdown: string): string {
    return markdown
      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/\`(.*)\`/gim, '<code>$1</code>')
      .replace(/^\* (.*$)/gim, '<li>$1</li>')
      .replace(/(<li>.*<\/li>)/gims, '<ul>$1</ul>')
      .replace(/\n/gim, '<br>');
  }
}