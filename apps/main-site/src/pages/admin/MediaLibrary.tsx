import { useState, useEffect, useRef, FC, ChangeEvent } from 'react';
import { motion } from 'motion/react';
import {
  Upload,
  Image as ImageIcon,
  Video,
  FileText,
  Music,
  File,
  Search,
  Filter,
  Grid,
  List,
  FolderPlus,
  Folder,
  Trash2,
  Edit,
  Download,
  Eye,
  Copy,
  Check,
  X,
  MoreVertical
} from 'lucide-react';

interface MediaFile {
  id: string;
  name: string;
  originalName: string;
  type: 'image' | 'video' | 'audio' | 'document' | 'other';
  mimeType: string;
  size: number;
  url: string;
  thumbnailUrl?: string;
  folder: string;
  tags: string[];
  altText?: string;
  description?: string;
  uploadedAt: string;
  uploadedBy: string;
  dimensions?: {
    width: number;
    height: number;
  };
}

interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;
  createdAt: string;
  fileCount: number;
}

// 목업 데이터
const mockFolders: MediaFolder[] = [
  { id: '1', name: '이미지', createdAt: '2025-01-01', fileCount: 15 },
  { id: '2', name: '동영상', createdAt: '2025-01-01', fileCount: 8 },
  { id: '3', name: '문서', createdAt: '2025-01-01', fileCount: 12 },
  { id: '4', name: '제품 이미지', parentId: '1', createdAt: '2025-01-05', fileCount: 23 },
  { id: '5', name: '블로그 이미지', parentId: '1', createdAt: '2025-01-05', fileCount: 34 }
];

const mockFiles: MediaFile[] = [
  {
    id: '1',
    name: 'hero-banner.jpg',
    originalName: '메인 배너 이미지.jpg',
    type: 'image',
    mimeType: 'image/jpeg',
    size: 2048000,
    url: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1560472355-536de3962603?w=200',
    folder: '1',
    tags: ['메인', '배너', '히어로'],
    altText: '메인 페이지 히어로 배너',
    description: '웹사이트 메인 페이지에 사용되는 히어로 배너 이미지',
    uploadedAt: '2025-01-15',
    uploadedBy: '관리자',
    dimensions: { width: 1920, height: 1080 }
  },
  {
    id: '2',
    name: 'product-showcase.mp4',
    originalName: '제품 소개 영상.mp4',
    type: 'video',
    mimeType: 'video/mp4',
    size: 15728640,
    url: 'https://example.com/video.mp4',
    thumbnailUrl: 'https://images.unsplash.com/photo-1551721434-8b94ddff0e6d?w=200',
    folder: '2',
    tags: ['제품', '소개', '마케팅'],
    description: '주력 제품 소개 영상',
    uploadedAt: '2025-01-14',
    uploadedBy: '마케팅팀'
  },
  {
    id: '3',
    name: 'user-manual.pdf',
    originalName: '사용자 매뉴얼.pdf',
    type: 'document',
    mimeType: 'application/pdf',
    size: 1048576,
    url: 'https://example.com/manual.pdf',
    folder: '3',
    tags: ['매뉴얼', '문서', '가이드'],
    description: '제품 사용자 매뉴얼 문서',
    uploadedAt: '2025-01-13',
    uploadedBy: '기술팀'
  },
  {
    id: '4',
    name: 'product-01.jpg',
    originalName: '제품1 상세 이미지.jpg',
    type: 'image',
    mimeType: 'image/jpeg',
    size: 1536000,
    url: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800',
    thumbnailUrl: 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200',
    folder: '4',
    tags: ['제품', '상세', '쇼핑'],
    altText: '제품 1 상세 이미지',
    uploadedAt: '2025-01-12',
    uploadedBy: '상품팀',
    dimensions: { width: 800, height: 600 }
  }
];

const MediaLibrary: FC = () => {
  const [files, setFiles] = useState(mockFiles);
  const [folders, setFolders] = useState(mockFolders);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [selectedFile, setSelectedFile] = useState<MediaFile | null>(null);
  const [showFileDetails, setShowFileDetails] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 필터링된 파일 목록
  const filteredFiles = files.filter(file => {
    const matchesFolder = selectedFolder === 'all' || file.folder === selectedFolder;
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.originalName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesFolder && matchesSearch;
  });

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    if (bytes < 1073741824) return (bytes / 1048576).toFixed(1) + ' MB';
    return (bytes / 1073741824).toFixed(1) + ' GB';
  };

  // 파일 타입 아이콘
  const getFileIcon = (type: string, mimeType: string) => {
    switch (type) {
      case 'image':
        return <ImageIcon className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'audio':
        return <Music className="w-5 h-5" />;
      case 'document':
        return <FileText className="w-5 h-5" />;
      default:
        return <File className="w-5 h-5" />;
    }
  };

  // 폴더 생성
  const handleCreateFolder = () => {
    if (newFolderName.trim()) {
      const newFolder: MediaFolder = {
        id: Date.now().toString(),
        name: newFolderName.trim(),
        parentId: selectedFolder !== 'all' ? selectedFolder : undefined,
        createdAt: new Date().toISOString().split('T')[0],
        fileCount: 0
      };
      setFolders(prev => [...prev, newFolder]);
      setNewFolderName('');
      setShowNewFolderModal(false);
    }
  };

  // 파일 업로드
  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    setIsUploading(true);

    // 파일 처리 시뮬레이션
    Array.from(uploadedFiles).forEach((file, index) => {
      setTimeout(() => {
        const newFile: MediaFile = {
          id: (Date.now() + index).toString(),
          name: file.name.replace(/\s+/g, '-').toLowerCase(),
          originalName: file.name,
          type: file.type.startsWith('image/') ? 'image' :
                file.type.startsWith('video/') ? 'video' :
                file.type.startsWith('audio/') ? 'audio' :
                file.type.includes('pdf') || file.type.includes('document') ? 'document' : 'other',
          mimeType: file.type,
          size: file.size,
          url: URL.createObjectURL(file),
          thumbnailUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
          folder: selectedFolder !== 'all' ? selectedFolder : '1',
          tags: [],
          uploadedAt: new Date().toISOString().split('T')[0],
          uploadedBy: '현재 사용자'
        };

        setFiles(prev => [...prev, newFile]);

        if (index === uploadedFiles.length - 1) {
          setIsUploading(false);
        }
      }, index * 500);
    });
  };

  // URL 복사
  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    setTimeout(() => setCopiedUrl(''), 2000);
  };

  // 파일 선택
  const handleFileSelect = (fileId: string) => {
    setSelectedFiles(prev => 
      prev.includes(fileId) 
        ? prev.filter(id => id !== fileId)
        : [...prev, fileId]
    );
  };

  // 선택된 파일 삭제
  const handleDeleteSelected = () => {
    if (confirm(`선택된 ${selectedFiles.length}개 파일을 삭제하시겠습니까?`)) {
      setFiles(prev => prev.filter(file => !selectedFiles.includes(file.id)));
      setSelectedFiles([]);
    }
  };

  // 파일 상세 정보 보기
  const handleShowFileDetails = (file: MediaFile) => {
    setSelectedFile(file);
    setShowFileDetails(true);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 헤더 */}
        <motion.div 
          className="mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">미디어 라이브러리</h1>
              <p className="text-gray-600">이미지, 동영상, 문서 등 모든 미디어 파일을 관리하세요.</p>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={() => setShowNewFolderModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
              >
                <FolderPlus className="w-4 h-4" />
                새 폴더
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {isUploading ? '업로드 중...' : '파일 업로드'}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileUpload}
                className="hidden"
                accept="image/*,video/*,audio/*,.pdf,.doc,.docx,.txt"
              />
            </div>
          </div>

          {/* 검색 및 필터 */}
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="파일명, 태그로 검색..."
                value={searchTerm}
                onChange={(e: any) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="flex gap-2">
              <select
                value={selectedFolder}
                onChange={(e: any) => setSelectedFolder(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">모든 폴더</option>
                {folders.map(folder => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name} ({folder.fileCount})
                  </option>
                ))}
              </select>
              
              <div className="flex border border-gray-300 rounded-lg overflow-hidden">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-2 ${viewMode === 'grid' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <Grid className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 ${viewMode === 'list' ? 'bg-blue-500 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          {/* 선택된 파일 액션 */}
          {selectedFiles.length > 0 && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-blue-800">
                  {selectedFiles.length}개 파일이 선택되었습니다
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={handleDeleteSelected}
                    className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700"
                  >
                    <Trash2 className="w-3 h-3" />
                    삭제
                  </button>
                  <button
                    onClick={() => setSelectedFiles([])}
                    className="flex items-center gap-1 px-3 py-1 bg-gray-500 text-white rounded hover:bg-gray-600"
                  >
                    <X className="w-3 h-3" />
                    선택 해제
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>

        {/* 파일 목록 */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          {viewMode === 'grid' ? (
            // 그리드 뷰
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
              {filteredFiles.map((file: any) => (
                <div
                  key={file.id}
                  className={`relative bg-white rounded-lg border-2 overflow-hidden transition-all hover:shadow-lg cursor-pointer group ${
                    selectedFiles.includes(file.id) ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
                  }`}
                  onClick={() => handleFileSelect(file.id)}
                >
                  {/* 파일 미리보기 */}
                  <div className="aspect-square flex items-center justify-center bg-gray-50">
                    {file.type === 'image' && file.thumbnailUrl ? (
                      <img
                        src={file.thumbnailUrl}
                        alt={file.altText || file.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex flex-col items-center gap-2 text-gray-400">
                        {getFileIcon(file.type, file.mimeType)}
                        <span className="text-xs font-medium">{file.mimeType.split('/')[1]?.toUpperCase()}</span>
                      </div>
                    )}
                  </div>

                  {/* 파일 정보 */}
                  <div className="p-3">
                    <h3 className="text-sm font-medium text-gray-900 truncate" title={file.originalName}>
                      {file.originalName}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {formatFileSize(file.size)}
                      {file.dimensions && ` • ${file.dimensions.width}×${file.dimensions.height}`}
                    </p>
                  </div>

                  {/* 액션 버튼 */}
                  <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={(e: any) => {
                        e.stopPropagation();
                        handleShowFileDetails(file);
                      }}
                      className="p-1 bg-white rounded shadow hover:bg-gray-50"
                    >
                      <MoreVertical className="w-3 h-3" />
                    </button>
                  </div>

                  {/* 선택 체크박스 */}
                  {selectedFiles.includes(file.id) && (
                    <div className="absolute top-2 left-2">
                      <div className="w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <Check className="w-3 h-3 text-white" />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            // 리스트 뷰
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="w-12 px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedFiles.length === filteredFiles.length && filteredFiles.length > 0}
                        onChange={(e: any) => {
                          if (e.target.checked) {
                            setSelectedFiles(filteredFiles.map(f => f.id));
                          } else {
                            setSelectedFiles([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      파일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      크기
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      업로드일
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      액션
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredFiles.map((file: any) => (
                    <tr key={file.id} className="hover:bg-gray-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedFiles.includes(file.id)}
                          onChange={() => handleFileSelect(file.id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 flex items-center justify-center bg-gray-100 rounded">
                            {file.type === 'image' && file.thumbnailUrl ? (
                              <img
                                src={file.thumbnailUrl}
                                alt={file.altText || file.name}
                                className="w-full h-full object-cover rounded"
                              />
                            ) : (
                              getFileIcon(file.type, file.mimeType)
                            )}
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {file.originalName}
                            </div>
                            <div className="text-sm text-gray-500">
                              {file.mimeType}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatFileSize(file.size)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {file.uploadedAt}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleCopyUrl(file.url)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title="URL 복사"
                          >
                            {copiedUrl === file.url ? (
                              <Check className="w-4 h-4 text-green-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleShowFileDetails(file)}
                            className="p-1 text-gray-600 hover:bg-gray-50 rounded"
                            title="상세 정보"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => window.open(file.url, '_blank')}
                            className="p-1 text-green-600 hover:bg-green-50 rounded"
                            title="다운로드"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {filteredFiles.length === 0 && (
            <div className="text-center py-12 bg-white rounded-lg border-2 border-dashed border-gray-300">
              <Upload className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">파일이 없습니다</h3>
              <p className="text-gray-500 mb-4">
                {searchTerm || selectedFolder !== 'all' 
                  ? '검색 조건에 맞는 파일이 없습니다.' 
                  : '첫 번째 파일을 업로드해보세요.'
                }
              </p>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                파일 업로드
              </button>
            </div>
          )}
        </motion.div>

        {/* 새 폴더 모달 */}
        {showNewFolderModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">새 폴더 만들기</h3>
              <input
                type="text"
                value={newFolderName}
                onChange={(e: any) => setNewFolderName(e.target.value)}
                placeholder="폴더명을 입력하세요"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleCreateFolder()}
              />
              <div className="flex gap-2 mt-4">
                <button
                  onClick={handleCreateFolder}
                  disabled={!newFolderName.trim()}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  만들기
                </button>
                <button
                  onClick={() => {
                    setShowNewFolderModal(false);
                    setNewFolderName('');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 파일 상세 정보 모달 */}
        {showFileDetails && selectedFile && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-96 max-h-90vh overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">파일 상세 정보</h3>
                <button
                  onClick={() => setShowFileDetails(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* 파일 미리보기 */}
              <div className="mb-4">
                {selectedFile.type === 'image' && selectedFile.url ? (
                  <img
                    src={selectedFile.url}
                    alt={selectedFile.altText || selectedFile.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                ) : (
                  <div className="w-full h-48 bg-gray-100 rounded-lg flex items-center justify-center">
                    {getFileIcon(selectedFile.type, selectedFile.mimeType)}
                  </div>
                )}
              </div>

              {/* 파일 정보 */}
              <div className="space-y-3 text-sm">
                <div>
                  <label className="font-medium text-gray-700">파일명</label>
                  <p className="text-gray-900">{selectedFile.originalName}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">파일 타입</label>
                  <p className="text-gray-900">{selectedFile.mimeType}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">파일 크기</label>
                  <p className="text-gray-900">{formatFileSize(selectedFile.size)}</p>
                </div>
                {selectedFile.dimensions && (
                  <div>
                    <label className="font-medium text-gray-700">해상도</label>
                    <p className="text-gray-900">{selectedFile.dimensions.width} × {selectedFile.dimensions.height}</p>
                  </div>
                )}
                <div>
                  <label className="font-medium text-gray-700">업로드일</label>
                  <p className="text-gray-900">{selectedFile.uploadedAt}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">업로드한 사용자</label>
                  <p className="text-gray-900">{selectedFile.uploadedBy}</p>
                </div>
                <div>
                  <label className="font-medium text-gray-700">URL</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={selectedFile.url}
                      readOnly
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs"
                    />
                    <button
                      onClick={() => handleCopyUrl(selectedFile.url)}
                      className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                    >
                      {copiedUrl === selectedFile.url ? '복사됨' : '복사'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => window.open(selectedFile.url, '_blank')}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  다운로드
                </button>
                <button
                  onClick={() => setShowFileDetails(false)}
                  className="flex-1 px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                >
                  닫기
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MediaLibrary;