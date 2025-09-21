/**
 * CodeToolbar Component
 * Advanced toolbar for Code Block with theme selection, font controls, and file operations
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  Check,
  Download,
  Upload,
  Palette,
  Type,
  LineChart,
  Code2,
  FileText,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CodeToolbarProps {
  language: string;
  theme: string;
  showLineNumbers: boolean;
  fontSize: number;
  filename?: string;
  code: string;
  onLanguageChange: (language: string) => void;
  onThemeChange: (theme: string) => void;
  onToggleLineNumbers: () => void;
  onFontSizeChange: (size: number) => void;
  onFilenameChange: (filename: string) => void;
  onCopy: () => void;
  onDownload: () => void;
  onUpload: (file: File) => void;
  className?: string;
}

const LANGUAGES = [
  { value: 'text', label: 'Plain Text', ext: 'txt' },
  { value: 'javascript', label: 'JavaScript', ext: 'js' },
  { value: 'typescript', label: 'TypeScript', ext: 'ts' },
  { value: 'html', label: 'HTML', ext: 'html' },
  { value: 'css', label: 'CSS', ext: 'css' },
  { value: 'python', label: 'Python', ext: 'py' },
  { value: 'java', label: 'Java', ext: 'java' },
  { value: 'json', label: 'JSON', ext: 'json' },
  { value: 'xml', label: 'XML', ext: 'xml' },
  { value: 'sql', label: 'SQL', ext: 'sql' },
  { value: 'bash', label: 'Bash', ext: 'sh' },
  { value: 'php', label: 'PHP', ext: 'php' },
  { value: 'go', label: 'Go', ext: 'go' },
  { value: 'rust', label: 'Rust', ext: 'rs' },
  { value: 'cpp', label: 'C++', ext: 'cpp' },
];

const THEMES = [
  { value: 'default', label: 'VS Code Dark', description: 'Dark theme inspired by VS Code' },
  { value: 'github', label: 'GitHub Light', description: 'Clean light theme' },
  { value: 'monokai', label: 'Monokai', description: 'Classic dark theme' },
  { value: 'dracula', label: 'Dracula', description: 'Purple-tinted dark theme' },
  { value: 'solarized', label: 'Solarized Light', description: 'Easy on the eyes' },
];

const FONT_SIZES = [10, 11, 12, 13, 14, 15, 16, 18, 20, 22, 24];

export const CodeToolbar: React.FC<CodeToolbarProps> = ({
  language,
  theme,
  showLineNumbers,
  fontSize,
  filename,
  code,
  onLanguageChange,
  onThemeChange,
  onToggleLineNumbers,
  onFontSizeChange,
  onFilenameChange,
  onCopy,
  onDownload,
  onUpload,
  className
}) => {
  const [copied, setCopied] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const handleCopy = async () => {
    try {
      await onCopy();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy code:', error);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      onUpload(file);
      // Reset input
      event.target.value = '';
    }
  };

  const generateFilename = () => {
    if (filename) return filename;

    const langConfig = LANGUAGES.find(l => l.value === language);
    const ext = langConfig?.ext || 'txt';
    return `code.${ext}`;
  };

  return (
    <div className={cn('flex items-center gap-2 flex-wrap', className)}>
      {/* Language Selector */}
      <Select value={language} onValueChange={onLanguageChange}>
        <SelectTrigger className="w-32 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {LANGUAGES.map((lang) => (
            <SelectItem key={lang.value} value={lang.value} className="text-xs">
              <div className="flex items-center gap-2">
                <Code2 className="h-3 w-3" />
                {lang.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-4 bg-gray-300" />

      {/* Theme Selector */}
      <Select value={theme} onValueChange={onThemeChange}>
        <SelectTrigger className="w-32 h-7 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {THEMES.map((themeOption) => (
            <SelectItem key={themeOption.value} value={themeOption.value} className="text-xs">
              <div className="flex items-center gap-2">
                <Palette className="h-3 w-3" />
                {themeOption.label}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="w-px h-4 bg-gray-300" />

      {/* Copy Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={handleCopy}
      >
        {copied ? (
          <>
            <Check className="h-3 w-3 mr-1" />
            Copied!
          </>
        ) : (
          <>
            <Copy className="h-3 w-3 mr-1" />
            Copy
          </>
        )}
      </Button>

      {/* Download Button */}
      <Button
        variant="ghost"
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={onDownload}
        title={`Download as ${generateFilename()}`}
      >
        <Download className="h-3 w-3 mr-1" />
        Download
      </Button>

      {/* Upload Button */}
      <div className="relative">
        <input
          type="file"
          accept=".txt,.js,.ts,.html,.css,.py,.java,.json,.xml,.sql,.sh,.php,.go,.rs,.cpp,.c,.h,.jsx,.tsx,.vue,.scss,.less,.yaml,.yml,.md,.rb,.swift,.kt,.scala,.clj,.elm,.dart,.lua,.pl,.r,.m,.mat,.jl,.nim,.hs,.fs,.ml,.pas,.asm,.s,.vb,.cs,.f,.f90,.f95,.f03,.f08,.cobol,.cob,.cbl,.ada,.adb,.ads,.tcl,.ps1,.psm1,.psd1,.vbs,.bat,.cmd,.awk,.sed,.ini,.cfg,.conf,.toml,.lock,.log"
          onChange={handleFileUpload}
          className="absolute inset-0 opacity-0 cursor-pointer"
          id="code-file-upload"
        />
        <Button
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs"
          title="Upload code file"
        >
          <Upload className="h-3 w-3 mr-1" />
          Upload
        </Button>
      </div>

      <div className="w-px h-4 bg-gray-300" />

      {/* Advanced Settings Toggle */}
      <Button
        variant={showAdvanced ? "default" : "ghost"}
        size="sm"
        className="h-7 px-2 text-xs"
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        <Settings className="h-3 w-3 mr-1" />
        Settings
      </Button>

      {/* Advanced Settings */}
      {showAdvanced && (
        <>
          <div className="w-px h-4 bg-gray-300" />

          {/* Line Numbers Toggle */}
          <Button
            variant={showLineNumbers ? "default" : "ghost"}
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={onToggleLineNumbers}
          >
            <LineChart className="h-3 w-3 mr-1" />
            Lines
          </Button>

          {/* Font Size Selector */}
          <Select value={fontSize.toString()} onValueChange={(value) => onFontSizeChange(parseInt(value))}>
            <SelectTrigger className="w-16 h-7 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={size.toString()} className="text-xs">
                  <div className="flex items-center gap-2">
                    <Type className="h-3 w-3" />
                    {size}px
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Filename Input */}
          <div className="flex items-center gap-1">
            <FileText className="h-3 w-3 text-gray-500" />
            <input
              type="text"
              value={filename || ''}
              onChange={(e) => onFilenameChange(e.target.value)}
              placeholder={generateFilename()}
              className="w-24 h-7 px-2 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Helper function to generate download file
 */
export const downloadCode = (code: string, filename: string) => {
  try {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Failed to download file:', error);
  }
};

/**
 * Helper function to read uploaded file
 */
export const readUploadedFile = (file: File): Promise<{ content: string; language: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      const content = event.target?.result as string;

      // Detect language from file extension
      const extension = file.name.split('.').pop()?.toLowerCase() || '';
      const language = detectLanguageFromExtension(extension);

      resolve({ content, language });
    };

    reader.onerror = () => {
      reject(new Error('Failed to read file'));
    };

    reader.readAsText(file, 'UTF-8');
  });
};

/**
 * Helper function to detect language from file extension
 */
export const detectLanguageFromExtension = (extension: string): string => {
  const extensionMap: Record<string, string> = {
    'js': 'javascript',
    'jsx': 'javascript',
    'mjs': 'javascript',
    'ts': 'typescript',
    'tsx': 'typescript',
    'html': 'html',
    'htm': 'html',
    'css': 'css',
    'scss': 'css',
    'less': 'css',
    'py': 'python',
    'pyw': 'python',
    'java': 'java',
    'json': 'json',
    'xml': 'xml',
    'sql': 'sql',
    'sh': 'bash',
    'bash': 'bash',
    'zsh': 'bash',
    'fish': 'bash',
    'php': 'php',
    'go': 'go',
    'rs': 'rust',
    'cpp': 'cpp',
    'cxx': 'cpp',
    'cc': 'cpp',
    'c': 'cpp',
    'h': 'cpp',
    'hpp': 'cpp',
    'txt': 'text',
    'md': 'text',
    'yml': 'text',
    'yaml': 'text',
    'toml': 'text',
    'ini': 'text',
    'cfg': 'text',
    'conf': 'text'
  };

  return extensionMap[extension] || 'text';
};

export default CodeToolbar;