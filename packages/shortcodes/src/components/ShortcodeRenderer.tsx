/**
 * Universal Shortcode Renderer Component
 * Provides consistent shortcode rendering across Main Site and Admin Dashboard
 */

import { FC, useState, useEffect, ReactNode } from 'react';
import { globalRegistry, defaultParser, ParsedShortcode } from '../index.js';

export interface ShortcodeRendererProps {
  content: string;
  context?: any;
  onError?: (error: Error) => void;
  LoadingComponent?: FC;
  ErrorComponent?: FC<{ error: Error }>;
  UnknownShortcodeComponent?: FC<{ shortcode: ParsedShortcode }>;
}

/**
 * ShortcodeRenderer Component
 *
 * Renders all shortcodes in the given content string.
 * Supports custom loading, error, and unknown shortcode components.
 */
export const ShortcodeRenderer: FC<ShortcodeRendererProps> = ({
  content,
  context,
  onError,
  LoadingComponent,
  ErrorComponent,
  UnknownShortcodeComponent,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    try {
      // Simulate async initialization if needed
      setLoading(false);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      onError?.(error);
    }
  }, [content]);

  if (loading && LoadingComponent) {
    return <LoadingComponent />;
  }

  if (error && ErrorComponent) {
    return <ErrorComponent error={error} />;
  }

  // Parse all shortcodes in content
  const shortcodes = defaultParser.parse(content);

  if (shortcodes.length === 0) {
    // No shortcodes found, return plain content
    return <>{content}</>;
  }

  // Build elements array with text and shortcode components
  const elements: ReactNode[] = [];
  let lastIndex = 0;
  let keyIndex = 0;

  shortcodes.forEach((shortcode) => {
    const matchIndex = content.indexOf(shortcode.fullMatch, lastIndex);

    // Add text before shortcode
    if (matchIndex > lastIndex) {
      const textContent = content.slice(lastIndex, matchIndex);
      if (textContent) {
        elements.push(
          <span key={`text-${keyIndex++}`}>
            {textContent}
          </span>
        );
      }
    }

    // Render shortcode
    const definition = globalRegistry.get(shortcode.name);
    if (definition) {
      try {
        const Component = definition.component;
        elements.push(
          <Component
            key={`shortcode-${keyIndex++}`}
            attributes={shortcode.attributes}
            content={shortcode.content}
            context={context}
          />
        );
      } catch (err) {
        // Shortcode render error
        const error = err instanceof Error ? err : new Error('Shortcode render error');
        console.error(`Error rendering shortcode [${shortcode.name}]:`, error);

        if (ErrorComponent) {
          elements.push(<ErrorComponent key={`error-${keyIndex++}`} error={error} />);
        } else {
          elements.push(
            <span key={`error-${keyIndex++}`} style={{ color: 'red' }}>
              [Error: {shortcode.name}]
            </span>
          );
        }
      }
    } else {
      // Unknown shortcode
      if (UnknownShortcodeComponent) {
        elements.push(
          <UnknownShortcodeComponent key={`unknown-${keyIndex++}`} shortcode={shortcode} />
        );
      } else {
        elements.push(
          <span key={`unknown-${keyIndex++}`} style={{ color: '#999' }}>
            {shortcode.fullMatch}
          </span>
        );
      }
    }

    lastIndex = matchIndex + shortcode.fullMatch.length;
  });

  // Add remaining text
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent) {
      elements.push(
        <span key={`text-${keyIndex++}`}>
          {textContent}
        </span>
      );
    }
  }

  return <>{elements}</>;
};

/**
 * Default Loading Component
 */
export const DefaultLoadingComponent: FC = () => (
  <div style={{ padding: '1rem', textAlign: 'center' }}>
    <span>Loading...</span>
  </div>
);

/**
 * Default Error Component
 */
export const DefaultErrorComponent: FC<{ error: Error }> = ({ error }) => (
  <div style={{
    padding: '1rem',
    backgroundColor: '#fee',
    border: '1px solid #fcc',
    borderRadius: '4px',
    color: '#c33',
  }}>
    <strong>Error:</strong> {error.message}
  </div>
);

/**
 * Default Unknown Shortcode Component
 */
export const DefaultUnknownShortcodeComponent: FC<{ shortcode: ParsedShortcode }> = ({ shortcode }) => (
  <span style={{ color: '#999', fontStyle: 'italic' }}>
    [Unknown shortcode: {shortcode.name}]
  </span>
);
