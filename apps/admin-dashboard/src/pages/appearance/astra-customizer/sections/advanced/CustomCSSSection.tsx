/**
 * Custom CSS Section Component
 * 사용자 정의 CSS 섹션 - 간단한 CSS 편집기
 */

import React, { useCallback, useRef, useEffect, useState } from 'react';
import { useCustomizer } from '../../context/CustomizerContext';
import { AlertCircle, History, Minimize2 } from 'lucide-react';
import Editor, { loader, OnMount } from '@monaco-editor/react';
import type * as Monaco from 'monaco-editor/esm/vs/editor/editor.api';

// Configure Monaco to load from CDN
loader.config({ paths: { vs: 'https://cdn.jsdelivr.net/npm/monaco-editor@0.54.0/min/vs' } });

// Security patterns to block
const DANGEROUS_PATTERNS = [
  /expression\s*\(/gi,  // IE CSS expressions
  /url\s*\(\s*["']?javascript:/gi,  // JavaScript URLs
  /@import\s+url\s*\(\s*["']?https?:\/\//gi,  // External @imports
  /<script/gi,  // Script tags
  /behavior\s*:/gi,  // IE behaviors
];

// CSS variable suggestions
const CSS_VARIABLES = [
  // WP variables
  '--wp-color-primary-500', '--wp-color-secondary-500', '--wp-text-primary',
  '--wp-link-color', '--wp-link-color-hover', '--wp-border-primary',
  '--wp-bg-body', '--wp-bg-content', '--wp-font-body',
  '--wp-font-size-body-desktop', '--wp-font-size-body-tablet', '--wp-font-size-body-mobile',
  '--wp-line-height-body-desktop', '--wp-line-height-body-tablet', '--wp-line-height-body-mobile',
  '--wp-container-width-desktop', '--wp-container-width-tablet', '--wp-container-width-mobile',

  // Astra legacy variables
  '--ast-primary-color', '--ast-secondary-color', '--ast-text-color',
  '--ast-link-color', '--ast-link-hover-color', '--ast-border-color',
  '--ast-body-bg', '--ast-content-bg', '--ast-body-font-family',
  '--ast-body-font-weight', '--ast-body-text-transform',
  '--ast-button-font-family', '--ast-button-font-weight', '--ast-button-text-transform',
  '--ast-container-width-desktop', '--ast-container-width-tablet', '--ast-container-width-mobile',
  '--ast-sidebar-width-desktop', '--ast-sidebar-width-tablet', '--ast-sidebar-width-mobile',
  '--ast-sidebar-gap',
  '--ast-palette-color1', '--ast-palette-color2', '--ast-palette-color3',
  '--ast-palette-color4', '--ast-palette-color5', '--ast-palette-color6',
  '--ast-palette-color7', '--ast-palette-color8', '--ast-palette-color9',

  // Button variables (Phase 4: --o4o-* standard)
  '--o4o-button-bg', '--o4o-button-text', '--o4o-button-border', '--o4o-button-radius',
  '--o4o-button-padding-y', '--o4o-button-padding-x', '--o4o-button-bg-hover', '--o4o-button-bg-active',
  '--o4o-button-secondary-bg', '--o4o-button-secondary-text', '--o4o-button-secondary-border',
  '--o4o-button-success-bg', '--o4o-button-danger-bg', '--o4o-button-ghost-text',
  '--o4o-button-outline-text', '--o4o-button-outline-border', '--o4o-button-outline-border-width',
  // Legacy button variables (deprecated, for backward compatibility)
  '--button-primary-bg', '--button-primary-text', '--button-primary-border-radius',
  '--button-primary-padding-v', '--button-primary-padding-h', '--button-primary-bg-hover',
  '--button-secondary-bg', '--button-secondary-text',
  '--button-outline-border', '--button-outline-text', '--button-outline-border-width',

  // Breadcrumb variables (Phase 4: --o4o-* standard)
  '--o4o-breadcrumb-link', '--o4o-breadcrumb-link-hover', '--o4o-breadcrumb-text',
  '--o4o-breadcrumb-separator', '--o4o-breadcrumb-font-size',
  // Legacy breadcrumb variables (deprecated, for backward compatibility)
  '--breadcrumb-text-color', '--breadcrumb-link-color', '--breadcrumb-separator-color',
  '--breadcrumb-font-size',

  // Scroll to top variables (Phase 4: --o4o-* standard)
  '--o4o-scroll-top-bg', '--o4o-scroll-top-icon', '--o4o-scroll-top-text',
  '--o4o-scroll-top-size', '--o4o-scroll-top-border-radius',
  '--o4o-scroll-top-position-bottom', '--o4o-scroll-top-position-right', '--o4o-scroll-top-bg-hover',
  // Legacy scroll-to-top variables (deprecated, for backward compatibility)
  '--scroll-top-bg', '--scroll-top-icon-color', '--scroll-top-size',
  '--scroll-top-border-radius', '--scroll-top-position-bottom', '--scroll-top-position-right',

  // Blog variables
  '--blog-card-spacing', '--blog-card-bg', '--blog-card-border',
  '--blog-card-border-radius', '--blog-card-padding',
  '--blog-title-color', '--blog-title-hover-color', '--blog-excerpt-color',
  '--blog-meta-text-color', '--blog-meta-link-color', '--blog-meta-icon-color',
  '--blog-title-size-desktop', '--blog-title-size-tablet', '--blog-title-size-mobile',
  '--blog-title-weight', '--blog-excerpt-size-desktop', '--blog-excerpt-size-tablet',
  '--blog-excerpt-size-mobile', '--blog-meta-size-desktop', '--blog-meta-size-tablet',
  '--blog-meta-size-mobile',
];

// Max size limit (64KB)
const MAX_CSS_SIZE = 64 * 1024;

export const CustomCSSSection: React.FC = () => {
  const { state, updateSetting } = useCustomizer();
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof Monaco | null>(null);

  const [history, setHistory] = useState<string[]>([state.settings.customCSS || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [minify, setMinify] = useState(false);

  /**
   * Validate CSS for security issues
   */
  const validateCSS = (css: string): { valid: boolean; error?: string } => {
    for (const pattern of DANGEROUS_PATTERNS) {
      if (pattern.test(css)) {
        return {
          valid: false,
          error: `Security: Blocked pattern "${pattern.source}" detected`,
        };
      }
    }

    if (css.length > MAX_CSS_SIZE) {
      return {
        valid: false,
        error: `CSS exceeds maximum size of ${MAX_CSS_SIZE / 1024}KB`,
      };
    }

    return { valid: true };
  };

  /**
   * Minify CSS (simple minification)
   */
  const minifyCSS = (css: string): string => {
    return css
      .replace(/\/\*[\s\S]*?\*\//g, '') // Remove comments
      .replace(/\s+/g, ' ') // Collapse whitespace
      .replace(/\s*([{}:;,])\s*/g, '$1') // Remove whitespace around delimiters
      .trim();
  };

  /**
   * Add to history
   */
  const addToHistory = useCallback((css: string) => {
    setHistory((prev) => {
      const newHistory = prev.slice(0, historyIndex + 1);
      newHistory.push(css);
      // Keep last 50 states
      if (newHistory.length > 50) {
        newHistory.shift();
        return newHistory;
      }
      return newHistory;
    });
    setHistoryIndex((prev) => Math.min(prev + 1, 49));
  }, [historyIndex]);

  /**
   * Undo
   */
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      const css = history[newIndex];
      editorRef.current?.setValue(css);
      updateSetting('customCSS' as any, css);
    }
  }, [historyIndex, history, updateSetting]);

  /**
   * Redo
   */
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      const css = history[newIndex];
      editorRef.current?.setValue(css);
      updateSetting('customCSS' as any, css);
    }
  }, [historyIndex, history, updateSetting]);

  /**
   * Handle editor mount
   */
  const handleEditorMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Register CSS variable completions
    monaco.languages.registerCompletionItemProvider('css', {
      provideCompletionItems: (model, position) => {
        const word = model.getWordUntilPosition(position);
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        };

        const suggestions: Monaco.languages.CompletionItem[] = CSS_VARIABLES.map((variable) => ({
          label: variable,
          kind: monaco.languages.CompletionItemKind.Variable,
          insertText: variable,
          range,
          documentation: `CSS Custom Property: ${variable}`,
        }));

        return { suggestions };
      },
    });

    // Add keyboard shortcuts
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyZ, () => {
      undo();
    });
    editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyZ, () => {
      redo();
    });
  };

  /**
   * Handle CSS change
   */
  const handleCSSChange = useCallback(
    (value: string | undefined) => {
      const newCSS = value || '';

      // Validate security
      const validation = validateCSS(newCSS);
      if (!validation.valid) {
        console.warn('[CustomCSS] Validation failed:', validation.error);
        return;
      }

      // Update state immediately (for editor value)
      updateSetting('customCSS' as any, newCSS);

      // Debounced preview update (300ms)
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }

      debounceTimeoutRef.current = setTimeout(() => {
        // Apply minification if enabled
        const processedCSS = minify ? minifyCSS(newCSS) : newCSS;

        // Update setting (will be applied after save)
        updateSetting('customCSS', processedCSS);

        // Add to history (debounced)
        addToHistory(newCSS);
      }, 300);
    },
    [updateSetting, minify, addToHistory]
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
    };
  }, []);

  // Initialize history
  useEffect(() => {
    if (state.settings.customCSS && history[0] !== state.settings.customCSS) {
      setHistory([state.settings.customCSS]);
      setHistoryIndex(0);
    }
  }, [state.settings.customCSS]);

  const cssSize = new Blob([state.settings.customCSS || '']).size;
  const sizeWarning = cssSize > MAX_CSS_SIZE * 0.8;

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-2">
          <AlertCircle size={20} className="text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-900">
            <p className="font-medium mb-1">사용자 정의 CSS</p>
            <p className="text-blue-700">
              여기에 입력한 CSS는 사이트 전체에 적용됩니다. 실시간 미리보기로 즉시 확인할 수 있습니다.
            </p>
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={undo}
            disabled={historyIndex === 0}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="Undo (Ctrl+Z)"
          >
            Undo
          </button>
          <button
            onClick={redo}
            disabled={historyIndex >= history.length - 1}
            className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
            title="Redo (Ctrl+Shift+Z)"
          >
            Redo
          </button>
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="px-3 py-1 text-sm border rounded hover:bg-gray-50 flex items-center gap-1"
            title="History"
          >
            <History size={14} />
            History ({history.length})
          </button>
        </div>

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={minify}
              onChange={(e) => setMinify(e.target.checked)}
              className="rounded"
            />
            Minify on save
          </label>
          <div className={`text-xs ${sizeWarning ? 'text-orange-600 font-medium' : 'text-gray-500'}`}>
            {(cssSize / 1024).toFixed(2)} KB / {MAX_CSS_SIZE / 1024} KB
          </div>
        </div>
      </div>

      {/* History Panel */}
      {showHistory && (
        <div className="bg-white border rounded-lg p-4 max-h-40 overflow-y-auto">
          <p className="text-sm font-medium mb-2">History</p>
          <div className="space-y-1">
            {history.map((css, index) => (
              <button
                key={index}
                onClick={() => {
                  setHistoryIndex(index);
                  editorRef.current?.setValue(css);
                  updateSetting('customCSS' as any, css);
                }}
                className={`w-full text-left px-2 py-1 text-xs rounded hover:bg-gray-50 ${
                  index === historyIndex ? 'bg-blue-50 text-blue-700' : 'text-gray-600'
                }`}
              >
                State {index + 1} - {new Date().toLocaleTimeString()} ({css.length} chars)
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Monaco Editor */}
      <div className="border border-gray-300 rounded-md overflow-hidden">
        <Editor
          height="400px"
          defaultLanguage="css"
          value={state.settings.customCSS || ''}
          onChange={handleCSSChange}
          onMount={handleEditorMount}
          theme="vs-light"
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            lineNumbers: 'on',
            scrollBeyondLastLine: false,
            wordWrap: 'on',
            automaticLayout: true,
            tabSize: 2,
            insertSpaces: true,
            formatOnPaste: true,
            formatOnType: true,
            suggest: {
              showVariables: true,
              showKeywords: true,
              showProperties: true,
            },
          }}
        />
      </div>

      <p className="text-xs text-gray-500">
        💡 팁: CSS Custom Properties (--variables)는 자동완성을 지원합니다. Ctrl+Space로 확인하세요.
      </p>

      {/* CSS 예제 힌트 */}
      <details className="bg-gray-50 rounded-lg p-4">
        <summary className="cursor-pointer text-sm font-medium text-gray-700 select-none">
          CSS 예제 보기
        </summary>
        <div className="mt-3 space-y-2 text-xs text-gray-600 font-mono">
          <div className="bg-white p-2 rounded border">
            <div className="text-gray-500 mb-1">/* CSS Variables 사용 */</div>
            <div>.my-button {'{ background: var(--wp-color-primary-500); }'}</div>
          </div>
          <div className="bg-white p-2 rounded border">
            <div className="text-gray-500 mb-1">/* 헤더 배경색 변경 */</div>
            <div>header {'{ background: #1a1a1a; }'}</div>
          </div>
          <div className="bg-white p-2 rounded border">
            <div className="text-gray-500 mb-1">/* 본문 글꼴 크기 */</div>
            <div>body {'{ font-size: 18px; }'}</div>
          </div>
        </div>
      </details>
    </div>
  );
};
