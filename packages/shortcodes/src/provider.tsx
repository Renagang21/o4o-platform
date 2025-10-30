import { createContext, FC, ReactElement, ReactNode, useContext } from 'react';
import { ShortcodeParser, ShortcodeRegistry } from './types.js';
import { defaultParser } from './parser.js';
import { globalRegistry } from './registry.js';
import { useShortcodes } from './renderer.js';

/**
 * Shortcode Context
 */
interface ShortcodeContextValue {
  parser: ShortcodeParser;
  registry: ShortcodeRegistry;
  render: (content: string, context?: any) => ReactElement | null;
}

const ShortcodeContext = createContext<ShortcodeContextValue | null>(null);

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
export const ShortcodeProvider: FC<ShortcodeProviderProps> = ({
  children,
  parser = defaultParser,
  registry = globalRegistry
}) => {
  const { render } = useShortcodes(parser, registry);

  const value: ShortcodeContextValue = {
    parser,
    registry,
    render
  };

  return (
    <ShortcodeContext.Provider value={value}>
      {children}
    </ShortcodeContext.Provider>
  );
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

/**
 * ShortcodeContent Component
 * 숏코드가 포함된 콘텐츠를 렌더링하는 컴포넌트
 */
interface ShortcodeContentProps {
  content: string;
  context?: any;
  className?: string;
}

export const ShortcodeContent: FC<ShortcodeContentProps> = ({
  content,
  context,
  className
}) => {
  const { render } = useShortcodeContext();
  
  return (
    <div className={className}>
      {render(content, context)}
    </div>
  );
};