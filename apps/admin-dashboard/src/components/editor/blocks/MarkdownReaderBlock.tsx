/**
 * Markdown Reader Block
 * Displays markdown content from media library files
 */

import React, { useState, useCallback, useEffect } from 'react';
import { FileCode, FolderOpen, FileText, X, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import FileSelector, { FileItem } from './shared/FileSelector';
import { marked } from 'marked';

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
  isSelected?: boolean;
  onSelect?: () => void;
}

const MarkdownReaderBlock: React.FC<MarkdownReaderBlockProps> = ({
  id,
  attributes = {},
  setAttributes,
  onChange,
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

  // Handle file selection from library
  const handleMediaSelect = useCallback((file: FileItem | FileItem[]) => {
    const selectedFile = Array.isArray(file) ? file[0] : file;
    if (selectedFile) {
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
    }
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

  return (
    <div
      className={`markdown-reader-block p-6 border-2 rounded-lg transition-all ${
        isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
      }`}
      onClick={onSelect}
    >
      <div className="flex items-center gap-2 mb-4">
        <FileCode className="w-5 h-5 text-gray-600" />
        <h3 className="font-semibold text-gray-700">Markdown Reader</h3>
      </div>

      {!url ? (
        <div className="text-center py-8 bg-gray-50 rounded border-2 border-dashed border-gray-300">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-500 mb-4">Select a Markdown file from Media Library</p>
          <Button
            variant="outline"
            onClick={(e) => {
              e.stopPropagation();
              setShowMediaSelector(true);
            }}
            className="gap-2"
          >
            <FolderOpen className="w-4 h-4" />
            Select from Media Library
          </Button>
          <p className="text-xs text-gray-400 mt-2">Supported: .md files</p>
        </div>
      ) : (
        <div>
          {/* Selected File Info */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <FileText className="w-8 h-8 text-blue-500" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm text-gray-900 truncate">
                    {fileName || 'Markdown File'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {fileSize ? formatFileSize(fileSize) : 'Unknown size'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMediaSelector(true);
                  }}
                  className="gap-2"
                >
                  <FolderOpen className="w-4 h-4" />
                  Change File
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveFile();
                  }}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Markdown Content Preview */}
          <div
            className={`markdown-content p-4 bg-white rounded border theme-${theme}`}
            style={{ fontSize: `${fontSize}px` }}
          >
            {loadError ? (
              <div className="flex items-start gap-2 text-red-600 bg-red-50 p-4 rounded">
                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Failed to load markdown file</p>
                  <p className="text-sm mt-1">{loadError}</p>
                </div>
              </div>
            ) : isLoading ? (
              <div className="flex items-center justify-center gap-2 text-gray-500 py-8">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                <p>Loading markdown content...</p>
              </div>
            ) : markdownContent ? (
              <div
                className="prose prose-sm max-w-none"
                dangerouslySetInnerHTML={{ __html: markdownContent }}
              />
            ) : (
              <p className="text-gray-400 italic">Waiting to load content from {url}...</p>
            )}
          </div>
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
    </div>
  );
};

export default MarkdownReaderBlock;
