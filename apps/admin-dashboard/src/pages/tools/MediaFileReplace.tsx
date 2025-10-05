import React, { useState } from 'react';
import { RefreshCw, Search, Upload, AlertCircle, CheckCircle, FileText, Image, Video, Music, File } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';

interface MediaFile {
  id: string;
  filename: string;
  originalName: string;
  url: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
}

const MediaFileReplace: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<MediaFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [searching, setSearching] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [autocompleteSuggestions, setAutocompleteSuggestions] = useState<MediaFile[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);

  // Auto-complete search as user types
  const handleSearchInputChange = async (value: string) => {
    setSearchQuery(value);

    if (value.trim().length < 2) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
      return;
    }

    try {
      const response = await authClient.api.get('/api/media', {
        params: {
          search: value,
          limit: 10
        }
      });

      const files = response.data?.data || [];
      setAutocompleteSuggestions(files);
      setShowAutocomplete(files.length > 0);
    } catch (error) {
      setAutocompleteSuggestions([]);
      setShowAutocomplete(false);
    }
  };

  // Select from autocomplete
  const handleAutocompleteSelect = (file: MediaFile) => {
    setSearchQuery(file.originalName);
    setAutocompleteSuggestions([]);
    setShowAutocomplete(false);
    handleSearch(file.originalName);
  };

  // Search for media files by filename
  const handleSearch = async (queryOverride?: string) => {
    const query = queryOverride || searchQuery;

    if (!query.trim()) {
      toast.error('파일명을 입력하세요');
      return;
    }

    setSearching(true);
    setSearchResults([]);
    setSelectedFile(null);
    setSuccessMessage('');
    setShowAutocomplete(false);

    try {
      const response = await authClient.api.get('/api/media', {
        params: {
          search: query,
          limit: 50
        }
      });

      const files = response.data?.data || [];
      setSearchResults(files);

      if (files.length === 0) {
        toast.error('검색 결과가 없습니다');
      }
    } catch (error) {
      toast.error('검색 중 오류가 발생했습니다');
    } finally {
      setSearching(false);
    }
  };

  // Handle file selection from results
  const handleSelectFile = (file: MediaFile) => {
    setSelectedFile(file);
    setNewFile(null);
    setSuccessMessage('');
  };

  // Handle new file upload
  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewFile(file);
      setSuccessMessage('');
    }
  };

  // Replace the media file
  const handleReplace = async () => {
    if (!selectedFile || !newFile) {
      toast.error('기존 파일과 새 파일을 모두 선택하세요');
      return;
    }

    setReplacing(true);

    try {
      const formData = new FormData();
      formData.append('file', newFile);

      await authClient.api.put(`/api/media/${selectedFile.id}/replace`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setSuccessMessage(`파일이 성공적으로 교체되었습니다: ${selectedFile.filename}`);
      toast.success('파일 교체 완료!');

      // Reset states
      setNewFile(null);
      setSelectedFile(null);
      setSearchResults([]);
      setSearchQuery('');
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '파일 교체 중 오류가 발생했습니다';
      toast.error(errorMsg);
    } finally {
      setReplacing(false);
    }
  };

  // Get file icon based on mime type
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return <Image className="w-5 h-5 text-blue-500" />;
    if (mimeType.startsWith('video/')) return <Video className="w-5 h-5 text-purple-500" />;
    if (mimeType.startsWith('audio/')) return <Music className="w-5 h-5 text-green-500" />;
    if (mimeType.startsWith('text/') || mimeType.includes('markdown')) return <FileText className="w-5 h-5 text-gray-500" />;
    return <File className="w-5 h-5 text-gray-400" />;
  };

  // Format file size
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-8 py-3">
        <AdminBreadcrumb
          items={[
            { label: 'Dashboard', path: '/' },
            { label: '도구', path: '/tools' },
            { label: '미디어 파일 교체' }
          ]}
        />
      </div>

      <div className="px-8 py-6 max-w-6xl">
        <div className="mb-6">
          <h1 className="text-2xl font-normal mb-2 flex items-center gap-2">
            <RefreshCw className="w-7 h-7 text-blue-600" />
            미디어 파일 교체
          </h1>
          <p className="text-gray-600">
            미디어 라이브러리의 기존 파일을 새 파일로 교체합니다. URL과 ID는 유지되므로 모든 페이지에 자동 반영됩니다.
          </p>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-3">
            <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-green-900">교체 완료</h3>
              <p className="text-sm text-green-700 mt-1">{successMessage}</p>
              <p className="text-xs text-green-600 mt-2">
                마크다운 블록 등 참조하는 모든 곳에서 60초 이내 자동 업데이트됩니다.
              </p>
            </div>
          </div>
        )}

        {/* Step 1: Search */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            1단계: 교체할 파일 검색
          </h2>
          <div className="flex gap-3 relative">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="파일명을 입력하세요 (예: document.md, video.mp4)"
                value={searchQuery}
                onChange={(e) => handleSearchInputChange(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                onFocus={() => autocompleteSuggestions.length > 0 && setShowAutocomplete(true)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />

              {/* Autocomplete Dropdown */}
              {showAutocomplete && autocompleteSuggestions.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-96 overflow-y-auto z-50">
                  {autocompleteSuggestions.map((file) => (
                    <button
                      key={file.id}
                      onClick={() => handleAutocompleteSelect(file)}
                      className="w-full p-3 text-left hover:bg-gray-50 border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {getFileIcon(file.mimeType)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{file.originalName}</p>
                          <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                            <span className="font-mono">{file.filename}</span>
                            <span>•</span>
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{file.mimeType.split('/')[1]}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={() => handleSearch()}
              disabled={searching}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {searching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  검색 중...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  검색
                </>
              )}
            </button>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="mt-4 border-t pt-4">
              <p className="text-sm text-gray-600 mb-3">
                검색 결과: {searchResults.length}개 파일
              </p>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {searchResults.map((file) => (
                  <button
                    key={file.id}
                    onClick={() => handleSelectFile(file)}
                    className={`w-full p-3 border rounded-lg text-left hover:bg-gray-50 transition-colors ${
                      selectedFile?.id === file.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getFileIcon(file.mimeType)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">{file.originalName}</p>
                          <p className="text-sm text-gray-500 font-mono truncate">{file.filename}</p>
                          <div className="flex items-center gap-3 mt-1 text-xs text-gray-400">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{file.mimeType}</span>
                            <span>•</span>
                            <span>{new Date(file.uploadedAt).toLocaleDateString('ko-KR')}</span>
                          </div>
                        </div>
                      </div>
                      {selectedFile?.id === file.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Step 2: Upload New File */}
        {selectedFile && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5" />
              2단계: 새 파일 선택
            </h2>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium">선택된 파일</p>
                <p className="mt-1">
                  <span className="font-mono">{selectedFile.filename}</span>
                  <span className="text-blue-600 mx-2">→</span>
                  이 파일을 새 파일로 교체합니다
                </p>
              </div>
            </div>

            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <input
                type="file"
                id="new-file-input"
                onChange={handleNewFileChange}
                className="hidden"
                accept="image/*,video/*,audio/*,application/pdf,.txt,.md,.json,.doc,.docx,.csv"
              />
              <label
                htmlFor="new-file-input"
                className="cursor-pointer flex flex-col items-center"
              >
                <Upload className="w-12 h-12 text-gray-400 mb-3" />
                <p className="text-lg font-medium text-gray-700 mb-1">
                  새 파일을 선택하세요
                </p>
                <p className="text-sm text-gray-500">
                  클릭하여 파일 선택 또는 드래그 앤 드롭
                </p>
              </label>

              {newFile && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-center gap-2 text-green-700">
                    <CheckCircle className="w-5 h-5" />
                    <span className="font-medium">{newFile.name}</span>
                    <span className="text-sm text-green-600">({formatFileSize(newFile.size)})</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Replace */}
        {selectedFile && newFile && (
          <div className="bg-white rounded-lg shadow-sm border p-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <RefreshCw className="w-5 h-5" />
              3단계: 교체 실행
            </h2>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium mb-1">교체 전 확인</p>
                <ul className="space-y-1">
                  <li>• 기존 파일: <span className="font-mono">{selectedFile.filename}</span></li>
                  <li>• 새 파일: <span className="font-mono">{newFile.name}</span></li>
                  <li>• URL과 ID는 변경되지 않으며, 파일 내용만 교체됩니다</li>
                  <li>• 교체 후 복구할 수 없습니다</li>
                </ul>
              </div>
            </div>

            <button
              onClick={handleReplace}
              disabled={replacing}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg font-medium"
            >
              {replacing ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin" />
                  교체 중...
                </>
              ) : (
                <>
                  <RefreshCw className="w-5 h-5" />
                  파일 교체 실행
                </>
              )}
            </button>
          </div>
        )}

        {/* Info Box */}
        <div className="mt-8 bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h3 className="font-semibold text-gray-900 mb-3">사용 안내</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>지원 파일: 이미지, 동영상, 오디오, PDF, 마크다운(.md), 문서 파일</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>교체 후 URL이 동일하므로 모든 페이지에서 자동으로 새 파일이 표시됩니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>마크다운 블록은 60초 이내 자동 갱신됩니다</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-blue-600">•</span>
              <span>파일 크기 제한: 50MB</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default MediaFileReplace;
