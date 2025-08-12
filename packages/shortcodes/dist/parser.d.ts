import { ShortcodeParser, ParsedShortcode } from './types';
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
export declare class DefaultShortcodeParser implements ShortcodeParser {
    private shortcodeRegex;
    constructor();
    parse(content: string): ParsedShortcode[];
    parseOne(content: string): ParsedShortcode | null;
    /**
     * 속성 문자열을 파싱하여 객체로 변환
     * 예: 'id="123" title="Hello World" enabled' => { id: "123", title: "Hello World", enabled: true }
     */
    private parseAttributes;
}
export declare const defaultParser: DefaultShortcodeParser;
//# sourceMappingURL=parser.d.ts.map