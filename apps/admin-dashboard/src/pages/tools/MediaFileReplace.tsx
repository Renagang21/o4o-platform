import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Upload, AlertCircle, CheckCircle, X, Filter } from 'lucide-react';
import { authClient } from '@o4o/auth-client';
import toast from 'react-hot-toast';
import AdminBreadcrumb from '@/components/common/AdminBreadcrumb';
import MediaGrid from '@/components/media/MediaGrid';

interface MediaFile {
  id: string;
  filename: string;
  title: string;
  url: string;
  mimeType: string;
  mediaType: string;
  size: number;
  uploadedAt: string;
  thumbnailUrl?: string;
  type: 'image' | 'video';
}

const MediaFileReplace: React.FC = () => {
  const [allMedia, setAllMedia] = useState<MediaFile[]>([]);
  const [filteredMedia, setFilteredMedia] = useState<MediaFile[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [newFile, setNewFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(true);
  const [replacing, setReplacing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');

  // Load all media files on mount
  useEffect(() => {
    loadMediaFiles();
  }, []);

  // Filter media when search query or filter type changes
  useEffect(() => {
    let filtered = allMedia;

    // Apply type filter
    if (filterType !== 'all') {
      filtered = filtered.filter(file => file.mediaType === filterType);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(file =>
        file.title.toLowerCase().includes(query) ||
        file.filename.toLowerCase().includes(query)
      );
    }

    setFilteredMedia(filtered);
  }, [allMedia, searchQuery, filterType]);

  const loadMediaFiles = async () => {
    setLoading(true);
    try {
      const response = await authClient.api.get('/api/media', {
        params: { limit: 1000 }
      });

      const files = (response.data?.data || []).map((file: any) => ({
        id: file.id,
        filename: file.filename,
        title: file.originalName || file.filename,
        url: file.url,
        mimeType: file.mimeType,
        mediaType: file.mediaType || 'file',
        size: file.size,
        uploadedAt: file.createdAt || file.uploadedAt,
        thumbnailUrl: file.thumbnailUrl,
        type: file.mediaType === 'image' ? 'image' : 'video'
      }));

      setAllMedia(files);
      setFilteredMedia(files);
    } catch (error) {
      toast.error('미디어 파일 로드 실패');
    } finally {
      setLoading(false);
    }
  };

  const handleItemSelect = (id: string, selected: boolean) => {
    if (selected) {
      setSelectedIds([id]);
      const file = filteredMedia.find(f => f.id === id);
      setSelectedFile(file || null);
      setNewFile(null);
      setSuccessMessage('');
    } else {
      setSelectedIds([]);
      setSelectedFile(null);
    }
  };

  const handleNewFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setNewFile(file);
      setSuccessMessage('');
    }
  };

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

      // Reload media files
      await loadMediaFiles();

      // Reset states
      setNewFile(null);
      setSelectedFile(null);
      setSelectedIds([]);
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || '파일 교체 중 오류가 발생했습니다';
      toast.error(errorMsg);
    } finally {
      setReplacing(false);
    }
  };

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

      <div className="px-8 py-6 max-w-7xl mx-auto">
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
            <div className="flex-1">
              <h3 className="font-medium text-green-900">교체 완료</h3>
              <p className="text-sm text-green-700 mt-1">{successMessage}</p>
              <p className="text-xs text-green-600 mt-2">
                마크다운 블록 등 참조하는 모든 곳에서 60초 이내 자동 업데이트됩니다.
              </p>
            </div>
            <button onClick={() => setSuccessMessage('')} className="text-green-600 hover:text-green-700">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 1: Select File to Replace */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" />
            1단계: 교체할 파일 선택
          </h2>

          {/* Search and Filter */}
          <div className="flex gap-3 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="파일명으로 검색..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">모든 파일</option>
              <option value="image">이미지</option>
              <option value="video">비디오</option>
              <option value="audio">오디오</option>
              <option value="document">문서</option>
            </select>
          </div>

          {/* Media Grid */}
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto mb-2" />
              <p className="text-gray-500">파일 로딩 중...</p>
            </div>
          ) : filteredMedia.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Filter className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>검색 결과가 없습니다</p>
            </div>
          ) : (
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm text-gray-600 mb-3">
                총 {filteredMedia.length}개 파일 (교체할 파일을 클릭하세요)
              </p>
              <MediaGrid
                items={filteredMedia}
                selectedIds={selectedIds}
                onItemSelect={handleItemSelect}
              />
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
                  클릭하여 파일 선택
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
