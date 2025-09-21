/**
 * SyntaxHighlighter Component
 * RegExp-based syntax highlighting for various programming languages
 * No external dependencies - pure JavaScript/TypeScript implementation
 */

import React from 'react';
import { cn } from '@/lib/utils';

export interface SyntaxToken {
  type: 'keyword' | 'string' | 'comment' | 'number' | 'operator' | 'function' | 'variable' | 'tag' | 'attribute' | 'value' | 'text';
  content: string;
  className: string;
}

export interface SyntaxHighlighterProps {
  code: string;
  language: string;
  theme?: string;
  showLineNumbers?: boolean;
  className?: string;
}

/**
 * Language-specific regex patterns for syntax highlighting
 */
const LANGUAGE_PATTERNS = {
  javascript: [
    // Comments
    { regex: /\/\*[\s\S]*?\*\//g, type: 'comment', className: 'syntax-comment' },
    { regex: /\/\/.*$/gm, type: 'comment', className: 'syntax-comment' },

    // Strings
    { regex: /"(?:[^"\\]|\\.)*"/g, type: 'string', className: 'syntax-string' },
    { regex: /'(?:[^'\\]|\\.)*'/g, type: 'string', className: 'syntax-string' },
    { regex: /`(?:[^`\\]|\\.)*`/g, type: 'string', className: 'syntax-string' },

    // Keywords
    { regex: /\b(async|await|break|case|catch|class|const|continue|debugger|default|delete|do|else|enum|export|extends|false|finally|for|function|if|import|in|instanceof|let|new|null|return|super|switch|this|throw|true|try|typeof|undefined|var|void|while|with|yield)\b/g, type: 'keyword', className: 'syntax-keyword' },

    // Functions
    { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, type: 'function', className: 'syntax-function' },

    // Numbers
    { regex: /\b\d+\.?\d*\b/g, type: 'number', className: 'syntax-number' },

    // Operators
    { regex: /[+\-*/%=<>!&|^~?:]/g, type: 'operator', className: 'syntax-operator' }
  ],

  typescript: [
    // Comments
    { regex: /\/\*[\s\S]*?\*\//g, type: 'comment', className: 'syntax-comment' },
    { regex: /\/\/.*$/gm, type: 'comment', className: 'syntax-comment' },

    // Strings
    { regex: /"(?:[^"\\]|\\.)*"/g, type: 'string', className: 'syntax-string' },
    { regex: /'(?:[^'\\]|\\.)*'/g, type: 'string', className: 'syntax-string' },
    { regex: /`(?:[^`\\]|\\.)*`/g, type: 'string', className: 'syntax-string' },

    // TypeScript Keywords
    { regex: /\b(abstract|any|as|asserts|bigint|boolean|break|case|catch|class|const|continue|debugger|declare|default|delete|do|else|enum|export|extends|false|finally|for|from|function|get|if|implements|import|in|infer|instanceof|interface|is|keyof|let|module|namespace|never|new|null|number|object|package|private|protected|public|readonly|require|global|return|set|static|string|super|switch|symbol|this|throw|true|try|type|typeof|undefined|unique|unknown|var|void|while|with|yield)\b/g, type: 'keyword', className: 'syntax-keyword' },

    // Type annotations
    { regex: /:\s*([a-zA-Z_$][a-zA-Z0-9_$]*(?:\[\])?)/g, type: 'variable', className: 'syntax-type' },

    // Functions
    { regex: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(/g, type: 'function', className: 'syntax-function' },

    // Numbers
    { regex: /\b\d+\.?\d*\b/g, type: 'number', className: 'syntax-number' },

    // Operators
    { regex: /[+\-*/%=<>!&|^~?:]/g, type: 'operator', className: 'syntax-operator' }
  ],

  html: [
    // Comments
    { regex: /<!--[\s\S]*?-->/g, type: 'comment', className: 'syntax-comment' },

    // Tags
    { regex: /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g, type: 'tag', className: 'syntax-tag' },

    // Attributes
    { regex: /\b([a-zA-Z-]+)=/g, type: 'attribute', className: 'syntax-attribute' },

    // Attribute values
    { regex: /="([^"]*)"/g, type: 'value', className: 'syntax-value' },
    { regex: /='([^']*)'/g, type: 'value', className: 'syntax-value' },

    // Strings
    { regex: /"[^"]*"/g, type: 'string', className: 'syntax-string' },
    { regex: /'[^']*'/g, type: 'string', className: 'syntax-string' }
  ],

  css: [
    // Comments
    { regex: /\/\*[\s\S]*?\*\//g, type: 'comment', className: 'syntax-comment' },

    // Selectors
    { regex: /([.#]?[a-zA-Z][a-zA-Z0-9-_]*)\s*{/g, type: 'tag', className: 'syntax-selector' },

    // Properties
    { regex: /([a-zA-Z-]+)\s*:/g, type: 'attribute', className: 'syntax-property' },

    // Values
    { regex: /:\s*([^;}\n]+)/g, type: 'value', className: 'syntax-value' },

    // Strings
    { regex: /"[^"]*"/g, type: 'string', className: 'syntax-string' },
    { regex: /'[^']*'/g, type: 'string', className: 'syntax-string' },

    // Colors
    { regex: /#[0-9a-fA-F]{3,6}\b/g, type: 'number', className: 'syntax-color' },

    // Numbers with units
    { regex: /\b\d+(?:\.\d+)?(?:px|em|rem|%|vh|vw|pt|pc|in|cm|mm|ex|ch|fr)\b/g, type: 'number', className: 'syntax-number' }
  ],

  python: [
    // Comments
    { regex: /#.*$/gm, type: 'comment', className: 'syntax-comment' },

    // Strings
    { regex: /"""[\s\S]*?"""/g, type: 'string', className: 'syntax-string' },
    { regex: /'''[\s\S]*?'''/g, type: 'string', className: 'syntax-string' },
    { regex: /"(?:[^"\\]|\\.)*"/g, type: 'string', className: 'syntax-string' },
    { regex: /'(?:[^'\\]|\\.)*'/g, type: 'string', className: 'syntax-string' },

    // Keywords
    { regex: /\b(and|as|assert|break|class|continue|def|del|elif|else|except|exec|finally|for|from|global|if|import|in|is|lambda|not|or|pass|print|raise|return|try|while|with|yield|True|False|None)\b/g, type: 'keyword', className: 'syntax-keyword' },

    // Functions
    { regex: /\bdef\s+([a-zA-Z_][a-zA-Z0-9_]*)/g, type: 'function', className: 'syntax-function' },
    { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g, type: 'function', className: 'syntax-function' },

    // Numbers
    { regex: /\b\d+\.?\d*\b/g, type: 'number', className: 'syntax-number' },

    // Operators
    { regex: /[+\-*/%=<>!&|^~]/g, type: 'operator', className: 'syntax-operator' }
  ],

  json: [
    // Strings (keys and values)
    { regex: /"(?:[^"\\]|\\.)*"/g, type: 'string', className: 'syntax-string' },

    // Numbers
    { regex: /\b-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?\b/g, type: 'number', className: 'syntax-number' },

    // Keywords (boolean and null)
    { regex: /\b(true|false|null)\b/g, type: 'keyword', className: 'syntax-keyword' },

    // Operators
    { regex: /[{}[\]:,]/g, type: 'operator', className: 'syntax-operator' }
  ],

  xml: [
    // Comments
    { regex: /<!--[\s\S]*?-->/g, type: 'comment', className: 'syntax-comment' },

    // CDATA
    { regex: /<!\[CDATA\[[\s\S]*?\]\]>/g, type: 'string', className: 'syntax-cdata' },

    // Tags
    { regex: /<\/?([a-zA-Z][a-zA-Z0-9-:]*)\b[^>]*>/g, type: 'tag', className: 'syntax-tag' },

    // Attributes
    { regex: /\b([a-zA-Z-:]+)=/g, type: 'attribute', className: 'syntax-attribute' },

    // Attribute values
    { regex: /="([^"]*)"/g, type: 'value', className: 'syntax-value' },
    { regex: /='([^']*)'/g, type: 'value', className: 'syntax-value' }
  ]
};

/**
 * Tokenizes code based on language patterns
 */
export function tokenizeCode(code: string, language: string): SyntaxToken[] {
  const patterns = LANGUAGE_PATTERNS[language as keyof typeof LANGUAGE_PATTERNS] || [];

  if (patterns.length === 0) {
    return [{ type: 'text', content: code, className: 'syntax-text' }];
  }

  const tokens: SyntaxToken[] = [];
  let remainingCode = code;
  let offset = 0;

  // Process each pattern
  patterns.forEach(pattern => {
    remainingCode = remainingCode.replace(pattern.regex, (match, ...groups) => {
      const index = arguments[arguments.length - 2]; // Second to last argument is the index

      // Extract content for function names and other special cases
      let content = match;
      if (pattern.type === 'function' && groups.length > 0) {
        content = groups[0]; // Use captured group for function names
      }

      tokens.push({
        type: pattern.type as SyntaxToken['type'],
        content: content,
        className: pattern.className
      });

      return `__TOKEN_${tokens.length - 1}__`;
    });
  });

  // Split by tokens and rebuild with proper text nodes
  const finalTokens: SyntaxToken[] = [];
  const parts = remainingCode.split(/(__TOKEN_\d+__)/);

  parts.forEach(part => {
    const tokenMatch = part.match(/^__TOKEN_(\d+)__$/);
    if (tokenMatch) {
      const tokenIndex = parseInt(tokenMatch[1]);
      finalTokens.push(tokens[tokenIndex]);
    } else if (part.length > 0) {
      finalTokens.push({
        type: 'text',
        content: part,
        className: 'syntax-text'
      });
    }
  });

  return finalTokens;
}

/**
 * Renders syntax-highlighted code
 */
export const SyntaxHighlighter: React.FC<SyntaxHighlighterProps> = ({
  code,
  language,
  theme = 'default',
  showLineNumbers = false,
  className
}) => {
  const tokens = tokenizeCode(code, language);
  const lines = code.split('\n');

  if (showLineNumbers) {
    return (
      <div className={cn('syntax-highlighter', `syntax-theme-${theme}`, className)}>
        <div className="syntax-line-numbers">
          {lines.map((_, index) => (
            <div key={index} className="syntax-line-number">
              {index + 1}
            </div>
          ))}
        </div>
        <div className="syntax-content">
          <pre className="syntax-pre">
            <code className="syntax-code">
              {tokens.map((token, index) => (
                <span key={index} className={token.className}>
                  {token.content}
                </span>
              ))}
            </code>
          </pre>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('syntax-highlighter', `syntax-theme-${theme}`, className)}>
      <pre className="syntax-pre">
        <code className="syntax-code">
          {tokens.map((token, index) => (
            <span key={index} className={token.className}>
              {token.content}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
};

/**
 * Simple line-by-line renderer for basic highlighting
 */
export const SimpleSyntaxHighlighter: React.FC<{
  code: string;
  language: string;
  theme?: string;
  className?: string;
}> = ({ code, language, theme = 'default', className }) => {
  const lines = code.split('\n');

  return (
    <div className={cn('syntax-highlighter', `syntax-theme-${theme}`, className)}>
      {lines.map((line, lineIndex) => {
        const tokens = tokenizeCode(line, language);

        return (
          <div key={lineIndex} className="syntax-line">
            <span className="syntax-line-number">{lineIndex + 1}</span>
            <span className="syntax-line-content">
              {tokens.map((token, tokenIndex) => (
                <span key={tokenIndex} className={token.className}>
                  {token.content}
                </span>
              ))}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default SyntaxHighlighter;