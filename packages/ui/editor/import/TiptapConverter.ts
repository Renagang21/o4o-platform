import { HtmlAnalyzer, AnalyzedContent, ParsedBlock } from './HtmlAnalyzer';

export interface TiptapDocument {
  type: 'doc';
  content: TiptapNode[];
}

export interface TiptapNode {
  type: string;
  attrs?: Record<string, any>;
  content?: TiptapNode[];
  marks?: TiptapMark[];
  text?: string;
}

export interface TiptapMark {
  type: string;
  attrs?: Record<string, any>;
}

export interface ConversionResult {
  document: TiptapDocument;
  requiredExtensions: string[];
  meta: {
    blockCount: number;
    wordCount: number;
    hasImages: boolean;
    hasTables: boolean;
    hasLists: boolean;
  };
}

export class TiptapConverter {
  private htmlAnalyzer: HtmlAnalyzer;

  constructor() {
    this.htmlAnalyzer = new HtmlAnalyzer();
  }

  /**
   * WordPress 페이지를 Tiptap 문서로 변환
   */
  async convertWordPressPage(url: string): Promise<ConversionResult> {
    const analyzed = await this.htmlAnalyzer.analyzeWordPressPage(url);
    return this.convertAnalyzedContent(analyzed);
  }

  /**
   * HTML 문자열을 Tiptap 문서로 변환
   */
  convertHtmlString(html: string): ConversionResult {
    const analyzed = this.htmlAnalyzer.analyzeHtmlString(html);
    return this.convertAnalyzedContent(analyzed);
  }

  /**
   * 마크다운을 Tiptap 문서로 변환
   */
  convertMarkdown(markdown: string): ConversionResult {
    const analyzed = this.htmlAnalyzer.analyzeMarkdown(markdown);
    return this.convertAnalyzedContent(analyzed);
  }

  /**
   * 분석된 콘텐츠를 Tiptap 문서로 변환
   */
  convertAnalyzedContent(analyzed: AnalyzedContent): ConversionResult {
    const tiptapNodes = analyzed.blocks.map(block => this.convertBlock(block)).filter(Boolean) as TiptapNode[];
    
    const document: TiptapDocument = {
      type: 'doc',
      content: tiptapNodes.length > 0 ? tiptapNodes : [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: '' }]
        }
      ]
    };

    const meta = {
      blockCount: tiptapNodes.length,
      wordCount: analyzed.meta.wordCount,
      hasImages: analyzed.meta.imageCount > 0,
      hasTables: analyzed.meta.tableCount > 0,
      hasLists: analyzed.meta.listCount > 0
    };

    return {
      document,
      requiredExtensions: analyzed.requiredExtensions,
      meta
    };
  }

  /**
   * 개별 블록을 Tiptap 노드로 변환
   */
  private convertBlock(block: ParsedBlock): TiptapNode | null {
    switch (block.type) {
      case 'heading':
        return {
          type: 'heading',
          attrs: block.attrs,
          content: this.convertInlineContent(block.content)
        };

      case 'paragraph':
        const paragraphContent = this.convertInlineContent(block.content);
        // 빈 문단은 빈 텍스트 노드로
        return {
          type: 'paragraph',
          content: paragraphContent.length > 0 ? paragraphContent : [{ type: 'text', text: '' }]
        };

      case 'blockquote':
        return {
          type: 'blockquote',
          content: [{
            type: 'paragraph',
            content: this.convertInlineContent(block.content)
          }]
        };

      case 'bulletList':
        return {
          type: 'bulletList',
          content: this.convertListItems(block.content)
        };

      case 'orderedList':
        return {
          type: 'orderedList',
          content: this.convertListItems(block.content)
        };

      case 'listItem':
        return {
          type: 'listItem',
          content: this.convertBlockContent(block.content)
        };

      case 'codeBlock':
        return {
          type: 'codeBlock',
          attrs: block.attrs,
          content: block.content
        };

      case 'image':
        return {
          type: 'image',
          attrs: {
            src: block.attrs?.src,
            alt: block.attrs?.alt || '',
            title: block.attrs?.title || null
          }
        };

      case 'table':
        return {
          type: 'table',
          content: this.convertTableContent(block.content)
        };

      case 'tableRow':
        return {
          type: 'tableRow',
          content: this.convertTableCells(block.content)
        };

      case 'tableCell':
        return {
          type: 'tableCell',
          content: this.convertBlockContent(block.content)
        };

      case 'horizontalRule':
        return {
          type: 'horizontalRule'
        };

      case 'youtube':
        return {
          type: 'youtube',
          attrs: {
            src: block.attrs?.src
          }
        };

      default:
        // 알 수 없는 블록 타입은 문단으로 변환
        if (block.content && Array.isArray(block.content)) {
          return {
            type: 'paragraph',
            content: this.convertInlineContent(block.content)
          };
        }
        return null;
    }
  }

  /**
   * 인라인 콘텐츠 변환 (텍스트, 마크 등)
   */
  private convertInlineContent(content: any[]): TiptapNode[] {
    if (!Array.isArray(content)) return [];

    return content.map(item => {
      if (item.type === 'text') {
        const node: TiptapNode = {
          type: 'text',
          text: item.text || ''
        };

        if (item.marks && Array.isArray(item.marks)) {
          node.marks = item.marks.map((mark: any) => ({
            type: mark.type,
            attrs: mark.attrs || {}
          }));
        }

        return node;
      }
      
      // 다른 인라인 요소들 (hard break 등)
      return item;
    }).filter(item => item.text !== undefined || item.type !== 'text');
  }

  /**
   * 블록 콘텐츠 변환 (문단, 리스트 아이템 등의 자식 요소)
   */
  private convertBlockContent(content: any[]): TiptapNode[] {
    if (!Array.isArray(content)) return [];

    return content.map(item => this.convertBlock(item)).filter(Boolean) as TiptapNode[];
  }

  /**
   * 리스트 아이템 변환
   */
  private convertListItems(content: any[]): TiptapNode[] {
    if (!Array.isArray(content)) return [];

    return content.map(item => {
      if (item.type === 'listItem') {
        return {
          type: 'listItem',
          content: this.convertBlockContent(item.content)
        };
      }
      return null;
    }).filter(Boolean) as TiptapNode[];
  }

  /**
   * 테이블 콘텐츠 변환
   */
  private convertTableContent(content: any[]): TiptapNode[] {
    if (!Array.isArray(content)) return [];

    return content.map(row => {
      if (row.type === 'tableRow') {
        return {
          type: 'tableRow',
          content: this.convertTableCells(row.content)
        };
      }
      return null;
    }).filter(Boolean) as TiptapNode[];
  }

  /**
   * 테이블 셀 변환
   */
  private convertTableCells(content: any[]): TiptapNode[] {
    if (!Array.isArray(content)) return [];

    return content.map(cell => {
      if (cell.type === 'tableCell') {
        return {
          type: 'tableCell',
          content: this.convertBlockContent(cell.content)
        };
      }
      return null;
    }).filter(Boolean) as TiptapNode[];
  }

  /**
   * Tiptap 문서를 HTML로 변환 (미리보기용)
   */
  convertTiptapToHtml(document: TiptapDocument): string {
    const htmlParts = document.content.map(node => this.nodeToHtml(node));
    return htmlParts.join('');
  }

  /**
   * 개별 노드를 HTML로 변환
   */
  private nodeToHtml(node: TiptapNode): string {
    switch (node.type) {
      case 'paragraph':
        const content = node.content?.map(child => this.nodeToHtml(child)).join('') || '';
        return `<p>${content}</p>`;

      case 'heading':
        const level = node.attrs?.level || 1;
        const headingContent = node.content?.map(child => this.nodeToHtml(child)).join('') || '';
        return `<h${level}>${headingContent}</h${level}>`;

      case 'blockquote':
        const quoteContent = node.content?.map(child => this.nodeToHtml(child)).join('') || '';
        return `<blockquote>${quoteContent}</blockquote>`;

      case 'bulletList':
        const bulletItems = node.content?.map(child => this.nodeToHtml(child)).join('') || '';
        return `<ul>${bulletItems}</ul>`;

      case 'orderedList':
        const orderedItems = node.content?.map(child => this.nodeToHtml(child)).join('') || '';
        return `<ol>${orderedItems}</ol>`;

      case 'listItem':
        const itemContent = node.content?.map(child => this.nodeToHtml(child)).join('') || '';
        return `<li>${itemContent}</li>`;

      case 'codeBlock':
        const codeContent = node.content?.map(child => this.nodeToHtml(child)).join('') || '';
        const language = node.attrs?.language;
        return `<pre><code${language ? ` class="language-${language}"` : ''}>${codeContent}</code></pre>`;

      case 'image':
        const src = node.attrs?.src || '';
        const alt = node.attrs?.alt || '';
        const title = node.attrs?.title;
        return `<img src="${src}" alt="${alt}"${title ? ` title="${title}"` : ''}>`;

      case 'horizontalRule':
        return '<hr>';

      case 'text':
        let text = node.text || '';
        
        if (node.marks) {
          for (const mark of node.marks) {
            switch (mark.type) {
              case 'bold':
                text = `<strong>${text}</strong>`;
                break;
              case 'italic':
                text = `<em>${text}</em>`;
                break;
              case 'underline':
                text = `<u>${text}</u>`;
                break;
              case 'code':
                text = `<code>${text}</code>`;
                break;
              case 'link':
                const href = mark.attrs?.href || '#';
                const target = mark.attrs?.target;
                text = `<a href="${href}"${target ? ` target="${target}"` : ''}>${text}</a>`;
                break;
            }
          }
        }
        
        return text;

      default:
        return node.content?.map(child => this.nodeToHtml(child)).join('') || '';
    }
  }

  /**
   * 변환 결과를 검증합니다.
   */
  validateConversion(result: ConversionResult): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // 기본 문서 구조 검증
    if (!result.document || result.document.type !== 'doc') {
      errors.push('유효하지 않은 문서 구조입니다.');
    }

    if (!result.document.content || !Array.isArray(result.document.content)) {
      errors.push('문서 콘텐츠가 올바르지 않습니다.');
    }

    // 빈 문서 검증
    if (result.document.content.length === 0) {
      errors.push('변환된 콘텐츠가 비어있습니다.');
    }

    // 필수 확장 검증
    if (!result.requiredExtensions || !Array.isArray(result.requiredExtensions)) {
      errors.push('필수 확장 목록이 올바르지 않습니다.');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}