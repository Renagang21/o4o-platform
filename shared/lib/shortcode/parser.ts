/**
 * 숏코드 파싱 엔진
 * WordPress 수준의 [shortcode attr="value"] 형태 파싱 지원
 */

export interface ShortcodeAttributes {
  [key: string]: string | number | boolean;
}

export interface ParsedShortcode {
  name: string;
  attributes: ShortcodeAttributes;
  content?: string;
  selfClosing: boolean;
  originalMatch: string;
  position: {
    start: number;
    end: number;
  };
}

export class ShortcodeParser {
  private static readonly SHORTCODE_REGEX = /\[([a-zA-Z0-9_-]+)(\s+[^\]]*)?(?:\](.*?)\[\/\1\]|\s*\/?\])/gs;
  private static readonly ATTRIBUTE_REGEX = /(\w+)(?:=["']([^"']*?)["']|=([^\s\]]+)|(?=\s|$))/g;

  /**
   * 텍스트에서 모든 숏코드를 파싱합니다
   */
  static parseShortcodes(content: string): ParsedShortcode[] {
    const shortcodes: ParsedShortcode[] = [];
    let match;

    // Reset regex lastIndex for global search
    this.SHORTCODE_REGEX.lastIndex = 0;

    while ((match = this.SHORTCODE_REGEX.exec(content)) !== null) {
      const [fullMatch, name, attributeString = '', innerContent] = match;
      const attributes = this.parseAttributes(attributeString.trim());
      
      shortcodes.push({
        name: name.toLowerCase(),
        attributes,
        content: innerContent || undefined,
        selfClosing: !innerContent,
        originalMatch: fullMatch,
        position: {
          start: match.index,
          end: match.index + fullMatch.length
        }
      });
    }

    return shortcodes;
  }

  /**
   * 단일 숏코드 문자열을 파싱합니다
   */
  static parseSingleShortcode(shortcodeString: string): ParsedShortcode | null {
    const shortcodes = this.parseShortcodes(shortcodeString);
    return shortcodes.length > 0 ? shortcodes[0] : null;
  }

  /**
   * 속성 문자열을 파싱하여 객체로 변환합니다
   */
  private static parseAttributes(attributeString: string): ShortcodeAttributes {
    const attributes: ShortcodeAttributes = {};
    
    if (!attributeString) return attributes;

    // Reset regex lastIndex
    this.ATTRIBUTE_REGEX.lastIndex = 0;
    
    let match;
    while ((match = this.ATTRIBUTE_REGEX.exec(attributeString)) !== null) {
      const [, key, quotedValue, unquotedValue] = match;
      let value: string | number | boolean = quotedValue || unquotedValue || true;

      // Type conversion
      if (typeof value === 'string') {
        // Boolean conversion
        if (value.toLowerCase() === 'true') value = true;
        else if (value.toLowerCase() === 'false') value = false;
        // Number conversion
        else if (!isNaN(Number(value)) && value !== '') value = Number(value);
      }

      attributes[key.toLowerCase()] = value;
    }

    return attributes;
  }

  /**
   * 숏코드를 HTML 문자열로 렌더링합니다
   */
  static renderShortcode(shortcode: ParsedShortcode): string {
    const { name, attributes, content, selfClosing } = shortcode;
    
    let attributeString = '';
    if (Object.keys(attributes).length > 0) {
      attributeString = ' ' + Object.entries(attributes)
        .map(([key, value]) => {
          if (typeof value === 'boolean') {
            return value ? key : '';
          }
          return `${key}="${value}"`;
        })
        .filter(Boolean)
        .join(' ');
    }

    if (selfClosing) {
      return `[${name}${attributeString}]`;
    } else {
      return `[${name}${attributeString}]${content || ''}[/${name}]`;
    }
  }

  /**
   * 콘텐츠에서 숏코드를 치환합니다
   */
  static replaceShortcodes(
    content: string,
    replacer: (shortcode: ParsedShortcode) => string
  ): string {
    const shortcodes = this.parseShortcodes(content);
    
    // 역순으로 처리하여 position 정보가 유효하도록 함
    let result = content;
    for (let i = shortcodes.length - 1; i >= 0; i--) {
      const shortcode = shortcodes[i];
      const replacement = replacer(shortcode);
      result = result.substring(0, shortcode.position.start) + 
               replacement + 
               result.substring(shortcode.position.end);
    }
    
    return result;
  }

  /**
   * 숏코드 유효성 검사
   */
  static validateShortcode(name: string, attributes: ShortcodeAttributes, schema?: ShortcodeSchema): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: []
    };

    // 기본 이름 검사
    if (!name || !/^[a-zA-Z0-9_-]+$/.test(name)) {
      result.valid = false;
      result.errors.push('Invalid shortcode name');
    }

    // 스키마 검사
    if (schema) {
      // 필수 속성 검사
      for (const requiredAttr of schema.required || []) {
        if (!(requiredAttr in attributes)) {
          result.valid = false;
          result.errors.push(`Missing required attribute: ${requiredAttr}`);
        }
      }

      // 속성 타입 검사
      for (const [attrName, attrValue] of Object.entries(attributes)) {
        const attrSchema = schema.attributes?.[attrName];
        if (attrSchema) {
          if (attrSchema.type && typeof attrValue !== attrSchema.type) {
            result.valid = false;
            result.errors.push(`Invalid type for attribute ${attrName}: expected ${attrSchema.type}`);
          }

          if (attrSchema.enum && !attrSchema.enum.includes(attrValue as string)) {
            result.valid = false;
            result.errors.push(`Invalid value for attribute ${attrName}: must be one of ${attrSchema.enum.join(', ')}`);
          }
        }
      }
    }

    return result;
  }

  /**
   * 숏코드를 텍스트로 이스케이프
   */
  static escapeShortcode(content: string): string {
    return content.replace(/\[([a-zA-Z0-9_-]+)/g, '&#91;$1');
  }

  /**
   * 이스케이프된 숏코드를 언이스케이프
   */
  static unescapeShortcode(content: string): string {
    return content.replace(/&#91;([a-zA-Z0-9_-]+)/g, '[$1');
  }
}

export interface ShortcodeSchema {
  required?: string[];
  attributes?: {
    [key: string]: {
      type?: 'string' | 'number' | 'boolean';
      enum?: string[];
      default?: any;
      description?: string;
    };
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 편의 함수들
export const parseShortcodes = ShortcodeParser.parseShortcodes;
export const parseSingleShortcode = ShortcodeParser.parseSingleShortcode;
export const replaceShortcodes = ShortcodeParser.replaceShortcodes;
export const validateShortcode = ShortcodeParser.validateShortcode;