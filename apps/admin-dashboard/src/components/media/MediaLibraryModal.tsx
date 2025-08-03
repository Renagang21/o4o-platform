import { FC, useState, useCallback } from 'react';
import { X, Upload, Grid, List, Search, Check, Image as ImageIcon } from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authClient } from '@o4o/auth-client';
import { useDropzone } from 'react-dropzone';
import { format } from 'date-fns';
import { clsx } from 'clsx';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import toast from 'react-hot-toast';

interface MediaItem {
  id: string;
  url: string;
  thumbnailUrl?: string;
  filename: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  alt?: string;
  title?: string;
  caption?: string;
  uploadedAt: Date;
  uploadedBy: {
    id: string;
    name: string;
  };
}

interface MediaLibraryModalProps {
  _isOpen: boolean;
  onClose: () => void;
  onSelect: (media: MediaItem) => void;
  allowMultiple?: boolean;
  acceptedTypes?: string[];
}

const MediaLibraryModal: FC<MediaLibraryModalProps> = ({
  _isOpen,
  onClose,
  onSelect,
  allowMultiple = false,
  acceptedTypes = ['image/*']
}) => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedItems, setSelectedItems] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'library' | 'upload'>('library');
  const queryClient = useQueryClient();

  // 미디어 목록 조회
  const { data: mediaItems = [], isLoading } = useQuery({
    queryKey: ['media', searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await authClient.api.get(`/media?${params}`);
      return response.data;
    },
    enabled: _isOpen
  });

  // 파일 업로드 mutation
  const uploadMutation = useMutation({
    mutationFn: async (files: File[]) => {
      const formData = new FormData();
      files.forEach((file: any) => {
        formData.append('files', file);
      });

      const response = await authClient.api.post('/media/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('파일이 업로드되었습니다');
      queryClient.invalidateQueries({ queryKey: ['media'] });
      setActiveTab('library');
    },
    onError: () => {
      toast.error('파일 업로드에 실패했습니다');
    }
  });

  // Dropzone 설정
  const onDrop = useCallback((acceptedFiles: File[]) => {
    uploadMutation.mutate(acceptedFiles);
  }, [uploadMutation]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: acceptedTypes.reduce((acc: any, type: any) => ({ ...acc, [type]: [] }), {}),
    multiple: true
  });

  // 아이템 선택 처리
  const handleItemClick = (item: MediaItem) => {
    if (allowMultiple) {
      setSelectedItems((prev: any) => 
        prev.includes(item.id) 
          ? prev.filter((id: any) => id !== item.id)
          : [...prev, item.id]
      );
    } else {
      onSelect(item);
      onClose();
    }
  };

  // 선택 완료 처리
  const handleSelectComplete = () => {
    const selected = mediaItems.filter((item: any) => selectedItems.includes(item.id));
    if (selected.length > 0) {
      selected.forEach((item: any) => onSelect(item));
      onClose();
    }
  };

  if (!_isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[80vh] flex flex-col">
        {/* 헤더 */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-semibold">미디어 라이브러리</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 탭 */}
        <div className="flex border-b">
          <button
            onClick={() => setActiveTab('library')}
            className={clsx(
              'px-6 py-3 font-medium transition-colors',
              activeTab === 'library' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            미디어 라이브러리
          </button>
          <button
            onClick={() => setActiveTab('upload')}
            className={clsx(
              'px-6 py-3 font-medium transition-colors',
              activeTab === 'upload' 
                ? 'border-b-2 border-blue-600 text-blue-600' 
                : 'text-gray-600 hover:text-gray-900'
            )}
          >
            파일 업로드
          </button>
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-hidden">
          {activeTab === 'library' ? (
            <>
              {/* 툴바 */}
              <div className="flex items-center justify-between p-4 border-b">
                <div className="flex items-center gap-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="search"
                      placeholder="미디어 검색..."
                      value={searchQuery}
                      onChange={(e: any) => setSearchQuery(e.target.value)}
                      className="pl-10 w-64"
                    />
                  </div>
                  <div className="flex items-center gap-1 border rounded-lg">
                    <button
                      onClick={() => setViewMode('grid')}
                      className={clsx(
                        'p-2 transition-colors',
                        viewMode === 'grid' ? 'bg-gray-100' : 'hover:bg-gray-50'
                      )}
                    >
                      <Grid className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setViewMode('list')}
                      className={clsx(
                        'p-2 transition-colors',
                        viewMode === 'list' ? 'bg-gray-100' : 'hover:bg-gray-50'
                      )}
                    >
                      <List className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                {allowMultiple && selectedItems.length > 0 && (
                  <Button onClick={handleSelectComplete}>
                    {selectedItems.length}개 선택 완료
                  </Button>
                )}
              </div>

              {/* 미디어 목록 */}
              <div className="p-4 overflow-y-auto h-full">
                {isLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                  </div>
                ) : mediaItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-64 text-gray-500">
                    <ImageIcon className="w-16 h-16 mb-4" />
                    <p>미디어가 없습니다</p>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-6 gap-4">
                    {mediaItems.map((item: MediaItem) => (
                      <div
                        key={item.id}
                        onClick={() => handleItemClick(item)}
                        className={clsx(
                          'relative aspect-square rounded-lg overflow-hidden cursor-pointer group',
                          'border-2 transition-all hover:shadow-lg',
                          selectedItems.includes(item.id) 
                            ? 'border-blue-600' 
                            : 'border-gray-200 hover:border-gray-300'
                        )}
                      >
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.alt || item.filename}
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-opacity">
                          {selectedItems.includes(item.id) && (
                            <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                              <Check className="w-4 h-4 text-white" />
                            </div>
                          )}
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                          <p className="text-xs text-white truncate">{item.filename}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">파일</th>
                        <th className="text-left py-2">파일명</th>
                        <th className="text-left py-2">업로드 일시</th>
                        <th className="text-left py-2">크기</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mediaItems.map((item: MediaItem) => (
                        <tr
                          key={item.id}
                          onClick={() => handleItemClick(item)}
                          className={clsx(
                            'border-b cursor-pointer hover:bg-gray-50',
                            selectedItems.includes(item.id) && 'bg-blue-50'
                          )}
                        >
                          <td className="py-2">
                            <img
                              src={item.thumbnailUrl || item.url}
                              alt={item.alt || item.filename}
                              className="w-10 h-10 object-cover rounded"
                            />
                          </td>
                          <td className="py-2">{item.filename}</td>
                          <td className="py-2 text-sm text-gray-600">
                            {format(new Date(item.uploadedAt), 'yyyy-MM-dd HH:mm')}
                          </td>
                          <td className="py-2 text-sm text-gray-600">
                            {(item.size / 1024 / 1024).toFixed(2)} MB
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </>
          ) : (
            /* 업로드 탭 */
            <div className="p-8 h-full flex items-center justify-center">
              <div
                {...getRootProps()}
                className={clsx(
                  'w-full max-w-2xl h-64 border-2 border-dashed rounded-lg',
                  'flex flex-col items-center justify-center cursor-pointer',
                  'transition-colors',
                  isDragActive 
                    ? 'border-blue-600 bg-blue-50' 
                    : 'border-gray-300 hover:border-gray-400'
                )}
              >
                <input {...getInputProps()} />
                <Upload className="w-12 h-12 text-gray-400 mb-4" />
                {isDragActive ? (
                  <p className="text-lg text-blue-600">파일을 여기에 놓으세요</p>
                ) : (
                  <>
                    <p className="text-lg text-gray-600 mb-2">
                      파일을 드래그하거나 클릭하여 업로드
                    </p>
                    <p className="text-sm text-gray-500">
                      지원 형식: {acceptedTypes.join(', ')}
                    </p>
                  </>
                )}
              </div>
              {uploadMutation.isPending && (
                <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MediaLibraryModal;