import { FC, ReactElement, ReactNode } from 'react';
import { ShortcodeParser, ShortcodeRegistry } from './types';
/**
 * Shortcode Context
 */
interface ShortcodeContextValue {
    parser: ShortcodeParser;
    registry: ShortcodeRegistry;
    render: (content: string, context?: any) => ReactElement | null;
}
/**
 * Shortcode Provider Props
 */
interface ShortcodeProviderProps {
    children: ReactNode;
    parser?: ShortcodeParser;
    registry?: ShortcodeRegistry;
}
/**
 * Shortcode Provider Component
 */
export declare const ShortcodeProvider: FC<ShortcodeProviderProps>;
/**
 * useShortcodeContext Hook
 */
export declare const useShortcodeContext: () => ShortcodeContextValue;
/**
 * ShortcodeContent Component
 * 숏코드가 포함된 콘텐츠를 렌더링하는 컴포넌트
 */
interface ShortcodeContentProps {
    content: string;
    context?: any;
    className?: string;
}
export declare const ShortcodeContent: FC<ShortcodeContentProps>;
export {};
//# sourceMappingURL=provider.d.ts.map