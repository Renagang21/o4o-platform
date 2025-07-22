import { ShortcodeParser, ParsedShortcode, ShortcodeAttributes } from './types';

/**
 * 숏코드 파서 구현
 * WordPress 스타일의 숏코드를 파싱합니다.
 * 
 * 지원 형식:
 * - [shortcode]
 * - [shortcode attr="value"]
 * - [shortcode attr="value" attr2=123]
 * - [shortcode]content[/shortcode]
 */
export class DefaultShortcodeParser implements ShortcodeParser {
  private shortcodeRegex: RegExp;

  constructor() {
    // 숏코드 매칭 정규식
    // 1. Self-closing: [shortcode attrs]
    // 2. With content: [shortcode attrs]content[/shortcode]
    this.shortcodeRegex = /\[(\w+)([^\]]*?)\](?:([\s\S]*?)\[\/\1\])?/g;
  }

  parse(content: string): ParsedShortcode[] {
    const matches: ParsedShortcode[] = [];
    let match;

    // 모든 매칭 찾기
    while ((match = this.shortcodeRegex.exec(content)) !== null) {
      const [fullMatch, name, attributesString, innerContent] = match;
      
      matches.push({
        fullMatch,
        name,
        attributes: this.parseAttributes(attributesString),
        content: innerContent,
        isSelfClosing: !innerContent
      });
    }

    // 정규식 상태 리셋
    this.shortcodeRegex.lastIndex = 0;

    return matches;
  }

  parseOne(content: string): ParsedShortcode | null {
    const matches = this.parse(content);
    return matches.length > 0 ? matches[0] : null;
  }

  /**
   * 속성 문자열을 파싱하여 객체로 변환
   * 예: 'id="123" title="Hello World" enabled' => { id: "123", title: "Hello World", enabled: true }
   */
  private parseAttributes(attributesString: string): ShortcodeAttributes {
    const attributes: ShortcodeAttributes = {};
    
    if (!attributesString || !attributesString.trim()) {
      return attributes;
    }

    // 속성 파싱 정규식
    // 1. name="value" (따옴표 있는 값)
    // 2. name='value' (작은 따옴표)
    // 3. name=value (따옴표 없는 값)
    // 4. name (값 없는 속성, boolean true로 처리)
    const attrRegex = /(\w+)(?:=(?:"([^"]*)"|'([^']*)'|([^\s]+)))?/g;
    let attrMatch;

    while ((attrMatch = attrRegex.exec(attributesString)) !== null) {
      const [, key, doubleQuoted, singleQuoted, unquoted] = attrMatch;
      const value = doubleQuoted || singleQuoted || unquoted;

      if (value === undefined) {
        // 값이 없는 속성은 true로 처리
        attributes[key] = true;
      } else if (!isNaN(Number(value))) {
        // 숫자로 변환 가능한 경우 숫자로 저장
        attributes[key] = Number(value);
      } else if (value === 'true' || value === 'false') {
        // boolean 값 처리
        attributes[key] = value === 'true';
      } else {
        // 나머지는 문자열로 저장
        attributes[key] = value;
      }
    }

    return attributes;
  }
}

// 기본 파서 인스턴스 export
export const defaultParser = new DefaultShortcodeParser();