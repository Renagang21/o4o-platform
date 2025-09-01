import { ReactElement } from 'react';
import { ShortcodeRenderer, ParsedShortcode, ShortcodeParser, ShortcodeRegistry } from './types';
/**
 * 숏코드 렌더러 구현
 * 파싱된 숏코드를 React 컴포넌트로 렌더링합니다.
 */
export declare class DefaultShortcodeRenderer implements ShortcodeRenderer {
    private parser;
    private registry;
    constructor(parser: ShortcodeParser, registry: ShortcodeRegistry);
    /**
     * 콘텐츠 내의 모든 숏코드를 렌더링
     */
    render(content: string, context?: any): ReactElement | null;
    /**
     * 단일 숏코드 렌더링
     */
    renderShortcode(shortcode: ParsedShortcode, context?: any): ReactElement | null;
}
/**
 * React Hook: useShortcodes
 * 컴포넌트에서 숏코드를 쉽게 사용할 수 있도록 하는 Hook
 */
export declare function useShortcodes(parser: ShortcodeParser, registry: ShortcodeRegistry): {
    render: (content: string, context?: any) => ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | null;
    renderShortcode: (shortcode: ParsedShortcode, context?: any) => ReactElement<unknown, string | import("react").JSXElementConstructor<any>> | null;
};
//# sourceMappingURL=renderer.d.ts.map