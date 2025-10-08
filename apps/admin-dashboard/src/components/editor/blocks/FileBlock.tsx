/**
 * File Block Component
 * Display a downloadable file with optional description
 */

import { useCallback, useState } from 'react';
import { File, Download, Upload, ExternalLink } from 'lucide-react';
import FileSelector, { FileItem } from './shared/FileSelector';

interface FileBlockProps {
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
}

const FileBlock: React.FC<FileBlockProps> = ({ attributes = {}, onChange }) => {
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

  if (!url) {
    return (
      <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <File className="w-16 h-16 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">파일 추가</h3>
        <p className="text-sm text-gray-500 mb-4 text-center">
          미디어 라이브러리에서 파일을 선택하세요
        </p>
        <button
          onClick={() => setShowFileSelector(true)}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 flex items-center gap-2"
        >
          <Upload className="w-4 h-4" />
          파일 선택
        </button>

        <FileSelector
          isOpen={showFileSelector}
          onClose={() => setShowFileSelector(false)}
          onSelect={handleFileSelect}
          multiple={false}
          acceptedTypes={['document']}
          title="파일 선택"
        />
      </div>
    );
  }

  return (
    <div className="p-6 bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <File className="w-6 h-6 text-blue-600" />
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-medium text-gray-900 mb-1 truncate">
            {fileName || 'File'}
          </h3>
          {showFileSize && fileSize > 0 && (
            <p className="text-sm text-gray-500 mb-3">{formatFileSize(fileSize)}</p>
          )}
          {showDownloadButton && (
            <a
              href={url}
              target={openInNewTab ? '_blank' : '_self'}
              rel={openInNewTab ? 'noopener noreferrer' : undefined}
              download
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download className="w-4 h-4" />
              {buttonText}
              {openInNewTab && <ExternalLink className="w-3 h-3" />}
            </a>
          )}
        </div>
        <button
          onClick={() => setShowFileSelector(true)}
          className="flex-shrink-0 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors"
        >
          변경
        </button>
      </div>

      <FileSelector
        isOpen={showFileSelector}
        onClose={() => setShowFileSelector(false)}
        onSelect={handleFileSelect}
        multiple={false}
        acceptedTypes={['document']}
        title="파일 선택"
      />
    </div>
  );
};

export default FileBlock;
