/**
 * Standard Code Block
 * 표준 템플릿 기반의 코드 블록
 */

import { useState, useCallback, useRef } from 'react';
import { 
  Code2,
  Copy,
  Check,
  Download,
  Eye,
  EyeOff
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { StandardBlockTemplate, StandardBlockProps, StandardBlockConfig } from '../StandardBlockTemplate';
import { cn } from '@/lib/utils';

interface CodeBlockProps extends StandardBlockProps {
  content: string;
  attributes?: {
    language?: string;
    fileName?: string;
    showLineNumbers?: boolean;
    startLineNumber?: number;
    highlightLines?: string;
    theme?: 'light' | 'dark' | 'github' | 'monokai' | 'dracula';
    fontSize?: number;
    fontFamily?: string;
    tabSize?: number;
    wordWrap?: boolean;
    showCopyButton?: boolean;
    showDownloadButton?: boolean;
    maxHeight?: number;
    borderRadius?: number;
    backgroundColor?: string;
    textColor?: string;
  };
}

const codeConfig: StandardBlockConfig = {
  type: 'code',
  icon: Code2,
  category: 'text',
  title: 'Code',
  description: 'Display code with syntax highlighting.',
  keywords: ['code', 'syntax', 'programming', 'highlight'],
  supports: {
    align: false,
    color: true,
    spacing: true,
    border: true,
    customClassName: true
  }
};

const PROGRAMMING_LANGUAGES = [
  { value: 'plaintext', label: 'Plain Text' },
  { value: 'javascript', label: 'JavaScript' },
  { value: 'typescript', label: 'TypeScript' },
  { value: 'jsx', label: 'JSX' },
  { value: 'tsx', label: 'TSX' },
  { value: 'html', label: 'HTML' },
  { value: 'css', label: 'CSS' },
  { value: 'scss', label: 'SCSS' },
  { value: 'json', label: 'JSON' },
  { value: 'python', label: 'Python' },
  { value: 'java', label: 'Java' },
  { value: 'csharp', label: 'C#' },
  { value: 'cpp', label: 'C++' },
  { value: 'php', label: 'PHP' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'go', label: 'Go' },
  { value: 'rust', label: 'Rust' },
  { value: 'sql', label: 'SQL' },
  { value: 'bash', label: 'Bash' },
  { value: 'yaml', label: 'YAML' },
  { value: 'xml', label: 'XML' },
  { value: 'markdown', label: 'Markdown' }
];

const CODE_THEMES = [
  { value: 'light', label: 'Light', bg: '#ffffff', text: '#24292e' },
  { value: 'dark', label: 'Dark', bg: '#0d1117', text: '#c9d1d9' },
  { value: 'github', label: 'GitHub', bg: '#f6f8fa', text: '#24292e' },
  { value: 'monokai', label: 'Monokai', bg: '#272822', text: '#f8f8f2' },
  { value: 'dracula', label: 'Dracula', bg: '#282a36', text: '#f8f8f2' }
];

const FONT_FAMILIES = [
  { value: 'Monaco, Consolas, "Lucida Console", monospace', label: 'Monaco' },
  { value: '"Fira Code", monospace', label: 'Fira Code' },
  { value: '"Source Code Pro", monospace', label: 'Source Code Pro' },
  { value: '"JetBrains Mono", monospace', label: 'JetBrains Mono' },
  { value: 'Consolas, monospace', label: 'Consolas' },
  { value: '"Courier New", monospace', label: 'Courier New' }
];

const StandardCodeBlock: React.FC<CodeBlockProps> = (props) => {
  const { content, onChange, attributes = {}, isSelected } = props;
  const {
    language = 'javascript',
    fileName = '',
    showLineNumbers = true,
    startLineNumber = 1,
    highlightLines = '',
    theme = 'github',
    fontSize = 14,
    fontFamily = 'Monaco, Consolas, "Lucida Console", monospace',
    tabSize = 2,
    wordWrap = false,
    showCopyButton = true,
    showDownloadButton = false,
    maxHeight = 400,
    borderRadius = 6,
    backgroundColor,
    textColor
  } = attributes;

  const [copied, setCopied] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef<HTMLPreElement>(null);

  // Update attribute helper
  const updateAttribute = useCallback((key: string, value: any) => {
    onChange(content, { ...attributes, [key]: value });
  }, [onChange, content, attributes]);

  // Copy code to clipboard
  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      // Error log removed
    }
  };

  // Download code as file
  const downloadCode = () => {
    const extension = getFileExtension(language);
    const filename = fileName || `code.${extension}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Get file extension based on language
  const getFileExtension = (lang: string): string => {
    const extensions: Record<string, string> = {
      javascript: 'js',
      typescript: 'ts',
      jsx: 'jsx',
      tsx: 'tsx',
      html: 'html',
      css: 'css',
      scss: 'scss',
      json: 'json',
      python: 'py',
      java: 'java',
      csharp: 'cs',
      cpp: 'cpp',
      php: 'php',
      ruby: 'rb',
      go: 'go',
      rust: 'rs',
      sql: 'sql',
      bash: 'sh',
      yaml: 'yml',
      xml: 'xml',
      markdown: 'md'
    };
    return extensions[lang] || 'txt';
  };

  // Get theme colors
  const getThemeColors = () => {
    const themeData = CODE_THEMES.find(t => t.value === theme);
    return {
      backgroundColor: backgroundColor || themeData?.bg || '#f6f8fa',
      color: textColor || themeData?.text || '#24292e'
    };
  };

  // Parse highlighted lines
  const getHighlightedLines = (): Set<number> => {
    if (!highlightLines) return new Set();
    
    const lines = new Set<number>();
    const parts = highlightLines.split(',');
    
    parts.forEach(part => {
      const trimmed = part.trim();
      if (trimmed.includes('-')) {
        const [start, end] = trimmed.split('-').map(n => parseInt(n.trim()));
        for (let i = start; i <= end; i++) {
          lines.add(i);
        }
      } else {
        const num = parseInt(trimmed);
        if (!isNaN(num)) {
          lines.add(num);
        }
      }
    });
    
    return lines;
  };

  // Handle tab key in textarea
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const spaces = ' '.repeat(tabSize);
      
      const newContent = content.substring(0, start) + spaces + content.substring(end);
      onChange(newContent, attributes);
      
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + tabSize;
      }, 0);
    }
  };

  // Custom toolbar content
  const customToolbar = (
    <div className="flex items-center gap-1">
      <Select value={language} onValueChange={(value) => updateAttribute('language', value)}>
        <SelectTrigger className="h-9 w-32">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PROGRAMMING_LANGUAGES.map((lang) => (
            <SelectItem key={lang.value} value={lang.value}>
              {lang.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => updateAttribute('showLineNumbers', !showLineNumbers)}
        className={cn("h-9 px-2", showLineNumbers && "bg-blue-100")}
        title="Toggle line numbers"
      >
        <span className="text-xs">#</span>
      </Button>

      <Button
        variant="ghost"
        size="sm"
        onClick={copyCode}
        className="h-9 px-2"
        title="Copy code"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>

      {showDownloadButton && (
        <Button
          variant="ghost"
          size="sm"
          onClick={downloadCode}
          className="h-9 px-2"
          title="Download code"
        >
          <Download className="h-4 w-4" />
        </Button>
      )}
    </div>
  );

  // Custom sidebar content
  const customSidebar = (
    <div className="space-y-4">
      <div>
        <Label className="text-sm font-medium">Code Settings</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="language" className="text-xs text-gray-600">Language</Label>
            <Select value={language} onValueChange={(value) => updateAttribute('language', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROGRAMMING_LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="fileName" className="text-xs text-gray-600">File Name (optional)</Label>
            <Input
              id="fileName"
              placeholder="example.js"
              value={fileName}
              onChange={(e) => updateAttribute('fileName', e.target.value)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="theme" className="text-xs text-gray-600">Theme</Label>
            <Select value={theme} onValueChange={(value) => updateAttribute('theme', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CODE_THEMES.map((themeOption) => (
                  <SelectItem key={themeOption.value} value={themeOption.value}>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded border"
                        style={{ backgroundColor: themeOption.bg }}
                      />
                      {themeOption.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Display Options</Label>
        <div className="mt-2 space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="lineNumbers" className="text-xs text-gray-600">Show Line Numbers</Label>
            <Switch
              id="lineNumbers"
              checked={showLineNumbers}
              onCheckedChange={(checked) => updateAttribute('showLineNumbers', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="wordWrap" className="text-xs text-gray-600">Word Wrap</Label>
            <Switch
              id="wordWrap"
              checked={wordWrap}
              onCheckedChange={(checked) => updateAttribute('wordWrap', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="copyButton" className="text-xs text-gray-600">Show Copy Button</Label>
            <Switch
              id="copyButton"
              checked={showCopyButton}
              onCheckedChange={(checked) => updateAttribute('showCopyButton', checked)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="downloadButton" className="text-xs text-gray-600">Show Download Button</Label>
            <Switch
              id="downloadButton"
              checked={showDownloadButton}
              onCheckedChange={(checked) => updateAttribute('showDownloadButton', checked)}
            />
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Typography</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="fontSize" className="text-xs text-gray-600">Font Size (px)</Label>
            <Input
              id="fontSize"
              type="number"
              min="8"
              max="24"
              value={fontSize}
              onChange={(e) => updateAttribute('fontSize', parseInt(e.target.value) || 14)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="fontFamily" className="text-xs text-gray-600">Font Family</Label>
            <Select value={fontFamily} onValueChange={(value) => updateAttribute('fontFamily', value)}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONT_FAMILIES.map((font) => (
                  <SelectItem key={font.value} value={font.value}>
                    {font.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="tabSize" className="text-xs text-gray-600">Tab Size</Label>
            <Select 
              value={tabSize.toString()} 
              onValueChange={(value) => updateAttribute('tabSize', parseInt(value))}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2">2 spaces</SelectItem>
                <SelectItem value="4">4 spaces</SelectItem>
                <SelectItem value="8">8 spaces</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div>
        <Label className="text-sm font-medium">Advanced</Label>
        <div className="mt-2 space-y-3">
          <div>
            <Label htmlFor="startLineNumber" className="text-xs text-gray-600">Start Line Number</Label>
            <Input
              id="startLineNumber"
              type="number"
              min="1"
              value={startLineNumber}
              onChange={(e) => updateAttribute('startLineNumber', parseInt(e.target.value) || 1)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="highlightLines" className="text-xs text-gray-600">Highlight Lines</Label>
            <Input
              id="highlightLines"
              placeholder="1,3,5-8"
              value={highlightLines}
              onChange={(e) => updateAttribute('highlightLines', e.target.value)}
              className="mt-1"
            />
            <p className="text-xs text-gray-500 mt-1">
              e.g., "1,3,5-8" to highlight lines 1, 3, and 5 through 8
            </p>
          </div>

          <div>
            <Label htmlFor="maxHeight" className="text-xs text-gray-600">Max Height (px)</Label>
            <Input
              id="maxHeight"
              type="number"
              min="100"
              max="1000"
              value={maxHeight}
              onChange={(e) => updateAttribute('maxHeight', parseInt(e.target.value) || 400)}
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="borderRadius" className="text-xs text-gray-600">Border Radius (px)</Label>
            <Input
              id="borderRadius"
              type="number"
              min="0"
              max="20"
              value={borderRadius}
              onChange={(e) => updateAttribute('borderRadius', parseInt(e.target.value) || 6)}
              className="mt-1"
            />
          </div>
        </div>
      </div>
    </div>
  );

  // Code content
  const CodeContent = () => {
    const themeColors = getThemeColors();
    const highlightedLines = getHighlightedLines();
    const lines = content.split('\n');
    const shouldShowExpanded = maxHeight && codeRef.current && codeRef.current.scrollHeight > maxHeight;

    return (
      <div className="relative w-full">
        {/* Header with filename and controls */}
        {(fileName || showCopyButton || showDownloadButton) && (
          <div 
            className="flex items-center justify-between px-4 py-2 border-b text-sm"
            style={{ 
              backgroundColor: themeColors.backgroundColor,
              color: themeColors.color,
              opacity: 0.8
            }}
          >
            <div className="flex items-center gap-2">
              {fileName && <span className="font-mono">{fileName}</span>}
              <span className="text-xs opacity-60">{language}</span>
            </div>
            <div className="flex items-center gap-1">
              {showCopyButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={copyCode}
                  className="h-6 px-2 text-xs"
                >
                  {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                </Button>
              )}
              {showDownloadButton && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={downloadCode}
                  className="h-6 px-2 text-xs"
                >
                  <Download className="h-3 w-3" />
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Code editor/display */}
        <div className="relative">
          {isSelected ? (
            // Editable textarea when selected
            <div className="relative">
              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => onChange(e.target.value, attributes)}
                onKeyDown={handleKeyDown}
                className="w-full p-4 font-mono resize-none outline-none"
                style={{
                  fontSize: `${fontSize}px`,
                  fontFamily: fontFamily,
                  backgroundColor: themeColors.backgroundColor,
                  color: themeColors.color,
                  borderRadius: fileName || showCopyButton || showDownloadButton ? '0 0 6px 6px' : `${borderRadius}px`,
                  tabSize: tabSize,
                  minHeight: '120px',
                  maxHeight: isExpanded ? 'none' : `${maxHeight}px`,
                  whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                  overflow: 'auto'
                }}
                placeholder="Enter your code here..."
                spellCheck={false}
              />
              {showLineNumbers && (
                <div 
                  className="absolute left-0 top-0 px-2 py-4 text-right pointer-events-none select-none"
                  style={{
                    fontSize: `${fontSize}px`,
                    fontFamily: fontFamily,
                    color: themeColors.color,
                    opacity: 0.4,
                    lineHeight: '1.5'
                  }}
                >
                  {lines.map((_, index) => (
                    <div key={index} className="whitespace-nowrap">
                      {startLineNumber + index}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            // Read-only display when not selected
            <pre
              ref={codeRef}
              className="relative overflow-auto"
              style={{
                fontSize: `${fontSize}px`,
                fontFamily: fontFamily,
                backgroundColor: themeColors.backgroundColor,
                color: themeColors.color,
                borderRadius: fileName || showCopyButton || showDownloadButton ? '0 0 6px 6px' : `${borderRadius}px`,
                maxHeight: isExpanded ? 'none' : `${maxHeight}px`,
                margin: 0,
                padding: showLineNumbers ? `16px 16px 16px ${String(startLineNumber + lines.length).length * 8 + 32}px` : '16px'
              }}
            >
              {showLineNumbers && (
                <div 
                  className="absolute left-0 top-0 px-2 py-4 text-right select-none"
                  style={{
                    color: themeColors.color,
                    opacity: 0.4,
                    lineHeight: '1.5'
                  }}
                >
                  {lines.map((_, index) => {
                    const lineNumber = startLineNumber + index;
                    return (
                      <div 
                        key={index} 
                        className={cn(
                          "whitespace-nowrap",
                          highlightedLines.has(lineNumber) && "bg-yellow-200 bg-opacity-20"
                        )}
                      >
                        {lineNumber}
                      </div>
                    );
                  })}
                </div>
              )}
              <code
                style={{
                  whiteSpace: wordWrap ? 'pre-wrap' : 'pre',
                  lineHeight: '1.5'
                }}
              >
                {lines.map((line, index) => {
                  const lineNumber = startLineNumber + index;
                  return (
                    <div
                      key={index}
                      className={cn(
                        highlightedLines.has(lineNumber) && "bg-yellow-200 bg-opacity-10 -mx-4 px-4"
                      )}
                    >
                      {line}
                    </div>
                  );
                })}
              </code>
            </pre>
          )}

          {/* Expand/Collapse button */}
          {shouldShowExpanded && !isSelected && (
            <div className="absolute bottom-2 right-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setIsExpanded(!isExpanded)}
                className="h-6 px-2 text-xs"
              >
                {isExpanded ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                <span className="ml-1">{isExpanded ? 'Collapse' : 'Expand'}</span>
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <StandardBlockTemplate
      {...props}
      config={codeConfig}
      customToolbar={customToolbar}
      customSidebar={customSidebar}
    >
      <div 
        className="w-full border rounded"
        style={{
          borderRadius: `${borderRadius}px`,
          borderColor: getThemeColors().color,
          borderOpacity: 0.1
        }}
      >
        <CodeContent />
      </div>
    </StandardBlockTemplate>
  );
};

export default StandardCodeBlock;