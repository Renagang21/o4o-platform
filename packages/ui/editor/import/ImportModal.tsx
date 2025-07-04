import React, { useState, useRef } from 'react';
import { X, Globe, Code, FileText, AlertCircle, ExternalLink } from 'lucide-react';

export type ImportType = 'wordpress' | 'html' | 'markdown';

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (type: ImportType, content: string) => void;
  initialType?: ImportType;
}

export function ImportModal({ 
  isOpen, 
  onClose, 
  onImport, 
  initialType = 'wordpress' 
}: ImportModalProps) {
  const [importType, setImportType] = useState<ImportType>(initialType);
  const [url, setUrl] = useState('');
  const [htmlContent, setHtmlContent] = useState('');
  const [markdownContent, setMarkdownContent] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen) return null;

  const validateUrl = (url: string): boolean => {
    try {
      const urlObj = new URL(url);
      return urlObj.protocol === 'http:' || urlObj.protocol === 'https:';
    } catch {
      return false;
    }
  };

  const handleImport = async () => {
    setValidationError(null);
    setIsValidating(true);

    try {
      let content = '';
      
      switch (importType) {
        case 'wordpress':
          if (!url.trim()) {
            throw new Error('URL을 입력해주세요.');
          }
          if (!validateUrl(url)) {
            throw new Error('올바른 URL 형식이 아닙니다.');
          }
          content = url.trim();
          break;
          
        case 'html':
          if (!htmlContent.trim()) {
            throw new Error('HTML 코드를 입력해주세요.');
          }
          content = htmlContent.trim();
          break;
          
        case 'markdown':
          if (!markdownContent.trim()) {
            throw new Error('마크다운 텍스트를 입력해주세요.');
          }
          content = markdownContent.trim();
          break;
      }

      await onImport(importType, content);
      onClose();
      
    } catch (error) {
      setValidationError(error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleReset = () => {
    setUrl('');
    setHtmlContent('');
    setMarkdownContent('');
    setValidationError(null);
  };

  const importTypes = [
    {
      id: 'wordpress' as ImportType,
      name: 'WordPress 페이지',
      icon: Globe,
      description: 'URL에서 WordPress 페이지를 가져오기',
      color: 'blue'
    },
    {
      id: 'html' as ImportType,
      name: 'HTML 소스',
      icon: Code,
      description: 'HTML 코드를 직접 붙여넣기',
      color: 'green'
    },
    {
      id: 'markdown' as ImportType,
      name: '마크다운',
      icon: FileText,
      description: '마크다운 텍스트를 변환',
      color: 'purple'
    }
  ];

  const getColorClasses = (color: string, active: boolean = false) => {
    const baseClasses = active ? 'ring-2' : '';
    switch (color) {
      case 'blue':
        return `${baseClasses} ${active ? 'ring-blue-500 bg-blue-50 border-blue-200' : 'border-gray-200 hover:border-blue-300'}`;
      case 'green':
        return `${baseClasses} ${active ? 'ring-green-500 bg-green-50 border-green-200' : 'border-gray-200 hover:border-green-300'}`;
      case 'purple':
        return `${baseClasses} ${active ? 'ring-purple-500 bg-purple-50 border-purple-200' : 'border-gray-200 hover:border-purple-300'}`;
      default:
        return `${baseClasses} border-gray-200`;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">콘텐츠 가져오기</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[70vh]">
          {/* 가져오기 타입 선택 */}
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-3">가져오기 유형</h3>
            <div className="grid grid-cols-1 gap-3">
              {importTypes.map((type) => (
                <button
                  key={type.id}
                  onClick={() => setImportType(type.id)}
                  className={`p-4 border rounded-lg text-left transition-colors ${getColorClasses(
                    type.color,
                    importType === type.id
                  )}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={`flex-shrink-0 w-8 h-8 rounded flex items-center justify-center ${
                      type.color === 'blue' ? 'bg-blue-100' :
                      type.color === 'green' ? 'bg-green-100' : 'bg-purple-100'
                    }`}>
                      <type.icon className={`h-4 w-4 ${
                        type.color === 'blue' ? 'text-blue-600' :
                        type.color === 'green' ? 'text-green-600' : 'text-purple-600'
                      }`} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900 text-sm">{type.name}</div>
                      <div className="text-xs text-gray-500 mt-0.5">{type.description}</div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* WordPress URL 입력 */}
          {importType === 'wordpress' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="wordpress-url" className="block text-sm font-medium text-gray-700 mb-2">
                  WordPress 페이지 URL
                </label>
                <div className="relative">
                  <input
                    id="wordpress-url"
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://example.com/your-page"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {url && validateUrl(url) && (
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-500"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  공개적으로 접근 가능한 WordPress 페이지 URL을 입력하세요.
                </p>
              </div>
            </div>
          )}

          {/* HTML 소스 입력 */}
          {importType === 'html' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="html-content" className="block text-sm font-medium text-gray-700 mb-2">
                  HTML 소스 코드
                </label>
                <textarea
                  id="html-content"
                  ref={textareaRef}
                  value={htmlContent}
                  onChange={(e) => setHtmlContent(e.target.value)}
                  placeholder="<h1>제목</h1>&#10;<p>내용을 여기에 붙여넣으세요...</p>"
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  표준 HTML 태그가 Tiptap 블록으로 자동 변환됩니다.
                </p>
              </div>
            </div>
          )}

          {/* 마크다운 입력 */}
          {importType === 'markdown' && (
            <div className="space-y-4">
              <div>
                <label htmlFor="markdown-content" className="block text-sm font-medium text-gray-700 mb-2">
                  마크다운 텍스트
                </label>
                <textarea
                  id="markdown-content"
                  value={markdownContent}
                  onChange={(e) => setMarkdownContent(e.target.value)}
                  placeholder="# 제목&#10;&#10;**굵은 글씨**와 *기울임*을 사용할 수 있습니다.&#10;&#10;- 목록 항목 1&#10;- 목록 항목 2"
                  rows={8}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  GitHub 스타일 마크다운을 지원합니다.
                </p>
              </div>
            </div>
          )}

          {/* 오류 메시지 */}
          {validationError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-md">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-red-700">{validationError}</div>
              </div>
            </div>
          )}
        </div>

        {/* 하단 버튼 */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleReset}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            초기화
          </button>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              취소
            </button>
            <button
              onClick={handleImport}
              disabled={isValidating || (
                importType === 'wordpress' ? !url.trim() :
                importType === 'html' ? !htmlContent.trim() :
                !markdownContent.trim()
              )}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isValidating ? '검증 중...' : '가져오기'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}