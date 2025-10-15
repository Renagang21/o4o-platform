/**
 * File Block Component
 * Display a downloadable file with optional description
 * WordPress Gutenberg style with EnhancedBlockWrapper
 */

import { useCallback, useState } from 'react';
import { File, Download, Upload, ExternalLink, X } from 'lucide-react';
import FileSelector, { FileItem } from './shared/FileSelector';
import EnhancedBlockWrapper from './EnhancedBlockWrapper';

interface FileBlockProps {
  id?: string;
  attributes?: {
    url?: string;
    fileName?: string;
    fileSize?: number;
    showDownloadButton?: boolean;
    showFileSize?: boolean;
    buttonText?: string;
    openInNewTab?: boolean;
  };
  onChange?: (event: any, newAttributes: any) => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onAddBlock?: (position: 'before' | 'after') => void;
  isSelected?: boolean;
  onSelect?: () => void;
}

const FileBlock: React.FC<FileBlockProps> = ({
  id = 'file',
  attributes = {},
  onChange,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onAddBlock,
  isSelected = false,
  onSelect,
}) => {
  const {
    url = '',
    fileName = '',
    fileSize = 0,
    showDownloadButton = true,
    showFileSize = true,
    buttonText = '다운로드',
    openInNewTab = false,
  } = attributes;

  const [showFileSelector, setShowFileSelector] = useState(false);

  const updateAttribute = useCallback(
    (key: string, value: any) => {
      if (onChange) {
        onChange(null, { ...attributes, [key]: value });
      }
    },
    [onChange, attributes]
  );

  const handleFileSelect = useCallback(
    (file: FileItem | FileItem[]) => {
      const selectedFile = Array.isArray(file) ? file[0] : file;
      if (selectedFile) {
        updateAttribute('url', selectedFile.url);
        updateAttribute('fileName', selectedFile.title);
        updateAttribute('fileSize', selectedFile.fileSize || 0);
        setShowFileSelector(false);
      }
    },
    [updateAttribute]
  );

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleRemoveFile = () => {
    if (onChange) {
      onChange(null, {
        ...attributes,
        url: '',
        fileName: '',
        fileSize: 0
      });
    }
  };

  // Custom toolbar content
  const customToolbarContent = isSelected && url ? (
    <div className="flex gap-1">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setShowFileSelector(true);
        }}
        title="Replace file"
        className="p-1.5 hover:bg-gray-100 rounded transition-colors"
      >
        <Upload className="w-4 h-4" />
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
  const customSidebarContent = isSelected && url ? (
    <div className="space-y-4">
      {/* File Information */}
      <div className="pb-4 border-b border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">File Information</h4>
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <File className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-gray-900 truncate" title={fileName}>
                {fileName || 'File'}
              </p>
              {fileSize > 0 && (
                <p className="text-xs text-gray-500">
                  {formatFileSize(fileSize)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Download Settings */}
      <div className="pb-4 border-b border-gray-200">
        <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Download Settings</h4>
        <div className="space-y-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showDownloadButton}
              onChange={(e) => updateAttribute('showDownloadButton', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Show download button</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={showFileSize}
              onChange={(e) => updateAttribute('showFileSize', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Show file size</span>
          </label>
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={openInNewTab}
              onChange={(e) => updateAttribute('openInNewTab', e.target.checked)}
              className="rounded border-gray-300"
            />
            <span className="text-sm">Open in new tab</span>
          </label>
        </div>
      </div>

      {/* Button Text */}
      {showDownloadButton && (
        <div>
          <h4 className="text-xs font-semibold text-gray-700 uppercase mb-3">Button Text</h4>
          <input
            type="text"
            value={buttonText}
            onChange={(e) => updateAttribute('buttonText', e.target.value)}
            placeholder="다운로드"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      )}
    </div>
  ) : null;

  return (
    <EnhancedBlockWrapper
      id={id}
      type="file"
      isSelected={isSelected}
      onSelect={onSelect || (() => {})}
      onDelete={onDelete || (() => {})}
      onDuplicate={onDuplicate || (() => {})}
      onMoveUp={onMoveUp || (() => {})}
      onMoveDown={onMoveDown || (() => {})}
      onAddBlock={onAddBlock}
      className="wp-block-file"
      customToolbarContent={customToolbarContent}
      customSidebarContent={customSidebarContent}
    >
      {!url ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <File className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">파일 추가</h3>
          <p className="text-sm text-gray-500 mb-4">
            미디어 라이브러리에서 파일을 선택하세요
          </p>
          <button
            onClick={() => setShowFileSelector(true)}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2 mx-auto"
          >
            <Upload className="w-4 h-4" />
            파일 선택
          </button>
        </div>
      ) : (
        <div className="wp-block-file__content">
          <a
            href={url}
            target={openInNewTab ? '_blank' : '_self'}
            rel={openInNewTab ? 'noopener noreferrer' : undefined}
            download
            className="wp-block-file__button wp-element-button"
          >
            <File className="w-5 h-5" />
            {fileName || 'Download'}
            {showDownloadButton && <Download className="w-4 h-4 ml-2" />}
            {openInNewTab && <ExternalLink className="w-3 h-3 ml-1" />}
          </a>
          {showFileSize && fileSize > 0 && (
            <span className="wp-block-file__filesize">
              {formatFileSize(fileSize)}
            </span>
          )}
        </div>
      )}

      {/* File Selector Modal */}
      {showFileSelector && (
        <FileSelector
          isOpen={showFileSelector}
          onClose={() => setShowFileSelector(false)}
          onSelect={handleFileSelect}
          multiple={false}
          acceptedTypes={['document']}
          title="파일 선택"
        />
      )}
    </EnhancedBlockWrapper>
  );
};

export default FileBlock;
