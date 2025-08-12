import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext } from 'react';
import { defaultParser } from './parser';
import { globalRegistry } from './registry';
import { useShortcodes } from './renderer';
const ShortcodeContext = createContext(null);
/**
 * Shortcode Provider Component
 */
export const ShortcodeProvider = ({ children, parser = defaultParser, registry = globalRegistry }) => {
    const { render } = useShortcodes(parser, registry);
    const value = {
        parser,
        registry,
        render
    };
    return (_jsx(ShortcodeContext.Provider, { value: value, children: children }));
};
/**
 * useShortcodeContext Hook
 */
export const useShortcodeContext = () => {
    const context = useContext(ShortcodeContext);
    if (!context) {
        throw new Error('useShortcodeContext must be used within a ShortcodeProvider');
    }
    return context;
};
export const ShortcodeContent = ({ content, context, className }) => {
    const { render } = useShortcodeContext();
    return (_jsx("div", { className: className, children: render(content, context) }));
};
