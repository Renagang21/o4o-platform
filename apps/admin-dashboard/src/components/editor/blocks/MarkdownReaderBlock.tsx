/**
 * Markdown Reader Block
 * Displays markdown content from media library files
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FileCode, FolderOpen, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileSelector, { FileItem } from './shared/FileSelector';
import { marked } from 'marked';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';

interface MarkdownReaderBlockProps {
  id: string;
  attributes?: {
    url?: string;
    markdownContent?: string;
    fileName?: string;
    fileSize?: number;
    fontSize?: number;
    theme?: string;
  };
  setAttributes?: (attributes: any) => void;
  onChange?: (content: any, attributes?: any) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

const MarkdownReaderBlock: React.FC<MarkdownReaderBlockProps> = ({
  id,
  attributes = {},
  setAttributes,
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected,
  onSelect,
}) => {
  const {
    url = '',
    markdownContent = '',
    fileName = '',
    fileSize = 0,
    fontSize = 16,
    theme = 'github'
  } = attributes;
  const [showMediaSelector, setShowMediaSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Load and parse markdown file when URL changes
  useEffect(() => {
    const loadMarkdownFile = async () => {
      if (!url || markdownContent) {
        return; // Skip if no URL or content already loaded
      }

      setIsLoading(true);
      setLoadError(null);

      try {
        const response = await fetch(url);

        if (!response.ok) {
          throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
        }

        const markdownText = await response.text();

        // Convert markdown to HTML using marked
        const htmlContent = await marked(markdownText);

        // Update attributes with the parsed HTML
        const updatedAttributes = {
          ...attributes,
          markdownContent: htmlContent,
        };

        if (setAttributes) {
          setAttributes(updatedAttributes);
        } else if (onChange) {
          onChange(null, updatedAttributes);
        }
      } catch (error) {
        console.error('Failed to load markdown file:', error);
        setLoadError(error instanceof Error ? error.message : 'Failed to load markdown file');
      } finally {
        setIsLoading(false);
      }
    };

    loadMarkdownFile();
  }, [url]); // Only depend on url, not on markdownContent to avoid loops

  // Validate markdown file
  const isValidMarkdownFile = (file: FileItem): boolean => {
    const fileName = file.title?.toLowerCase() || '';
    const hasValidExtension = fileName.endsWith('.md') || fileName.endsWith('.markdown');

    // Accept file if it has valid extension, regardless of mimeType
    // (mimeType can be 'application/octet-stream' or other values)
    return hasValidExtension;
  };

  // Handle file selection from library
  const handleMediaSelect = useCallback((file: FileItem | FileItem[]) => {
    const selectedFile = Array.isArray(file) ? file[0] : file;
    if (!selectedFile) return;

    // Validate file type
    if (!isValidMarkdownFile(selectedFile)) {
      setLoadError('Please select a valid Markdown file (.md or .markdown)');
      setShowMediaSelector(false);
      return;
    }

    // Clear any previous errors
    setLoadError(null);

    const updatedAttributes = {
      ...attributes,
      url: selectedFile.url,
      markdownContent: '', // Will be loaded from URL
      fileName: selectedFile.title,
      fileSize: selectedFile.fileSize,
    };

    if (setAttributes) {
      setAttributes(updatedAttributes);
    } else if (onChange) {
      onChange(null, updatedAttributes);
    }
    setShowMediaSelector(false);
  }, [attributes, setAttributes, onChange]);

  const handleRemoveFile = () => {
    const updatedAttributes = {
      ...attributes,
      url: '',
      markdownContent: '',
      fileName: '',
      fileSize: 0
    };

    if (setAttributes) {
      setAttributes(updatedAttributes);
    } else if (onChange) {
      onChange(null, updatedAttributes);
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Custom toolbar content
  const customToolbarContent = isSelected && url ? (
    <div className="flex gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowMediaSelector(true);
        }}
        title="Replace markdown file"
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
      >
        <FolderOpen className="w-4 h-4" />
      </button>
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleRemoveFile();
        }}
        title="Remove file"
        className="p-1.5 hover:bg-gray-100 rounded transition-colors text-red-600 hover:bg-red-50"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  ) : null;

  // Custom sidebar content
  const customSidebarContent = isSelected ? (
    <div className="space-y-4">
      {/* File Information */}
      {url && (
        <div className="pb-4 border-b border-gray-200">
          <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">File Information</h4>
          <div className="space-y-2">
            <div className="flex items-start gap-2">
              <FileText className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 truncate" title={fileName}>
                  {fileName || 'Markdown File'}
                </p>
                <p className="text-xs text-gray-500">
                  {fileSize ? formatFileSize(fileSize) : 'Unknown size'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Theme Settings */}
      <div className="pb-4 border-b border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Theme</h4>
        <select
          value={theme}
          onChange={(e) => {
            const updatedAttributes = { ...attributes, theme: e.target.value };
            if (setAttributes) {
              setAttributes(updatedAttributes);
            } else if (onChange) {
              onChange(null, updatedAttributes);
            }
          }}
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        >
          <option value="github">GitHub</option>
          <option value="monokai">Monokai</option>
          <option value="solarized">Solarized</option>
        </select>
      </div>

      {/* Font Size */}
      <div>
        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Font Size</h4>
        <div className="flex items-center gap-2">
          <input
            type="range"
            min="12"
            max="24"
            value={fontSize}
            onChange={(e) => {
              const updatedAttributes = { ...attributes, fontSize: parseInt(e.target.value) };
              if (setAttributes) {
                setAttributes(updatedAttributes);
              } else if (onChange) {
                onChange(null, updatedAttributes);
              }
            }}
            className="flex-1"
          />
          <span className="text-sm text-gray-600 w-12 text-right">{fontSize}px</span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <EnhancedBlockWrapper
      id={id}
      type="markdown"
      isSelected={isSelected || false}
      onSelect={onSelect || (() => {})}
      onDelete={onDelete || (() => {})}
      onDuplicate={onDuplicate || (() => {})}
      onMoveUp={onMoveUp || (() => {})}
      onMoveDown={onMoveDown || (() => {})}
      onAddBlock={onAddBlock}
      className="wp-block-markdown-reader"
      customToolbarContent={customToolbarContent}
      customSidebarContent={customSidebarContent}
    >
      {!url ? (
        <div className="text-center py-12 bg-gray-50 rounded border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Select a Markdown file from Media Library</p>

          {loadError && (
            <div className="mb-4 mx-auto max-w-md">
              <div className="flex items-start gap-2 text-red-600 bg-red-50 p-3 rounded text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <p className="text-left">{loadError}</p>
              </div>
            </div>
          )}

          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setLoadError(null);
              setShowMediaSelector(true);
            }}
            className="gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Select from Media Library
          </Button>
          <p className="text-xs text-gray-400 mt-2">Supported: .md, .markdown files only</p>
        </div>
      ) : loadError ? (
        <div className="flex items-start gap-2 text-red-600 bg-red-50 p-4 rounded">
          <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Failed to load markdown file</p>
            <p className="text-sm mt-1">{loadError}</p>
            <Button
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                setShowMediaSelector(true);
              }}
              className="mt-3"
            >
              Try Different File
            </Button>
          </div>
        </div>
      ) : isLoading ? (
        <div className="flex items-center justify-center gap-2 text-gray-500 py-12">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
          <p>Loading markdown content...</p>
        </div>
      ) : markdownContent ? (
        <div
          className={`prose prose-sm max-w-none markdown-theme-${theme}`}
          style={{ fontSize: `${fontSize}px` }}
          dangerouslySetInnerHTML={{ __html: markdownContent }}
        />
      ) : (
        <div className="text-center py-12 text-gray-400 italic">
          <p>Waiting to load content...</p>
        </div>
      )}

      {/* File Selector Modal */}
      {showMediaSelector && (
        <FileSelector
          isOpen={showMediaSelector}
          onClose={() => setShowMediaSelector(false)}
          onSelect={handleMediaSelect}
          multiple={false}
          acceptedTypes={['document']}
          acceptedMimeTypes={['text/markdown']}
          acceptedExtensions={['.md', '.markdown']}
          title="Select Markdown File"
        />
      )}
    </EnhancedBlockWrapper>
  );
};

export default MarkdownReaderBlock;
