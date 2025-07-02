import React, { useState } from 'react';
import { Copy, FileText, Image as ImageIcon, Package, Globe, AlertCircle, X } from 'lucide-react';

interface Content {
  id: string;
  title: string;
  type: 'page' | 'post' | 'product' | 'notice';
  status: 'draft' | 'published' | 'archived';
  content: any;
  slug: string;
  excerpt?: string;
  featuredImage?: string;
  author: string;
  category?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  views: number;
  seo?: any;
}

interface ContentCloneManagerProps {
  contents: Content[];
  onClone: (originalId: string, newContent: Partial<Content>) => void;
  currentContent?: Content;
  isOpen: boolean;
  onClose: () => void;
}

export const ContentCloneManager: React.FC<ContentCloneManagerProps> = ({
  contents,
  onClone,
  currentContent,
  isOpen,
  onClose
}) => {
  const [selectedContentId, setSelectedContentId] = useState<string>('');
  const [cloneOptions, setCloneOptions] = useState({
    includeContent: true,
    includeSEO: true,
    includeImages: true,
    includeTags: true,
    newStatus: 'draft' as 'draft' | 'published' | 'archived'
  });
  const [newTitle, setNewTitle] = useState('');
  const [newSlug, setNewSlug] = useState('');

  // 타입별 아이콘
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'page':
        return <FileText className="w-4 h-4" />;
      case 'post':
        return <FileText className="w-4 h-4" />;
      case 'product':
        return <Package className="w-4 h-4" />;
      case 'notice':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Globe className="w-4 h-4" />;
    }
  };

  // 타입별 라벨
  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'page':
        return '페이지';
      case 'post':
        return '포스트';
      case 'product':
        return '제품';
      case 'notice':
        return '공지사항';
      default:
        return '컨텐츠';
    }
  };

  // 선택된 컨텐츠
  const selectedContent = contents.find(c => c.id === selectedContentId);

  // 제목 변경 시 슬러그 자동 생성
  const handleTitleChange = (title: string) => {
    setNewTitle(title);
    if (!newSlug || newSlug === generateSlug(newTitle)) {
      setNewSlug(generateSlug(title));
    }
  };

  // 슬러그 생성 함수
  const generateSlug = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9가-힣\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  };

  // 복제 실행
  const handleClone = () => {
    if (!selectedContent || !newTitle.trim()) return;

    const clonedContent: Partial<Content> = {
      title: newTitle.trim(),
      slug: newSlug.trim() || generateSlug(newTitle),
      type: selectedContent.type,
      status: cloneOptions.newStatus,
      author: selectedContent.author,
      content: cloneOptions.includeContent ? selectedContent.content : { type: 'doc', content: [] },
      excerpt: cloneOptions.includeContent ? selectedContent.excerpt : '',
      featuredImage: cloneOptions.includeImages ? selectedContent.featuredImage : undefined,
      category: selectedContent.category,
      tags: cloneOptions.includeTags ? [...selectedContent.tags] : [],
      seo: cloneOptions.includeSEO ? { ...selectedContent.seo } : undefined,
      views: 0
    };

    onClone(selectedContent.id, clonedContent);
    handleClose();
  };

  // 모달 닫기
  const handleClose = () => {
    setSelectedContentId('');
    setNewTitle('');
    setNewSlug('');
    setCloneOptions({
      includeContent: true,
      includeSEO: true,
      includeImages: true,
      includeTags: true,
      newStatus: 'draft'
    });
    onClose();
  };

  // 현재 컨텐츠를 기본 선택으로 설정
  React.useEffect(() => {
    if (isOpen && currentContent && !selectedContentId) {
      setSelectedContentId(currentContent.id);
      setNewTitle(`${currentContent.title} (복사본)`);
      setNewSlug(`${currentContent.slug}-copy`);
    }
  }, [isOpen, currentContent, selectedContentId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl max-h-[90vh] overflow-hidden">
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <Copy className="w-5 h-5" />
              컨텐츠 복제
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="space-y-6">
            {/* 복제할 컨텐츠 선택 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                복제할 컨텐츠 선택
              </label>
              <select
                value={selectedContentId}
                onChange={(e) => setSelectedContentId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">컨텐츠를 선택하세요</option>
                {contents.map(content => (
                  <option key={content.id} value={content.id}>
                    [{getTypeLabel(content.type)}] {content.title}
                  </option>
                ))}
              </select>
            </div>

            {/* 선택된 컨텐츠 정보 */}
            {selectedContent && (
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  {getTypeIcon(selectedContent.type)}
                  <span className="font-medium">{selectedContent.title}</span>
                  <span className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded">
                    {getTypeLabel(selectedContent.type)}
                  </span>
                </div>
                <div className="text-sm text-gray-600 space-y-1">
                  <p>슬러그: {selectedContent.slug}</p>
                  <p>작성자: {selectedContent.author}</p>
                  <p>카테고리: {selectedContent.category || '없음'}</p>
                  <p>태그: {selectedContent.tags.length > 0 ? selectedContent.tags.join(', ') : '없음'}</p>
                  <p>생성일: {new Date(selectedContent.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            )}

            {/* 새 컨텐츠 정보 */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 제목 *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => handleTitleChange(e.target.value)}
                  placeholder="새 컨텐츠의 제목을 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  새 슬러그 *
                </label>
                <input
                  type="text"
                  value={newSlug}
                  onChange={(e) => setNewSlug(e.target.value)}
                  placeholder="새 컨텐츠의 슬러그를 입력하세요"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                <p className="mt-1 text-xs text-gray-500">
                  제목을 기반으로 자동 생성됩니다. 직접 수정할 수 있습니다.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  초기 상태
                </label>
                <select
                  value={cloneOptions.newStatus}
                  onChange={(e) => setCloneOptions(prev => ({ 
                    ...prev, 
                    newStatus: e.target.value as 'draft' | 'published' | 'archived' 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="draft">초안</option>
                  <option value="published">공개</option>
                  <option value="archived">보관</option>
                </select>
              </div>
            </div>

            {/* 복제 옵션 */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                복제 옵션
              </label>
              <div className="space-y-3">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cloneOptions.includeContent}
                    onChange={(e) => setCloneOptions(prev => ({ 
                      ...prev, 
                      includeContent: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">컨텐츠 내용 포함</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cloneOptions.includeSEO}
                    onChange={(e) => setCloneOptions(prev => ({ 
                      ...prev, 
                      includeSEO: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">SEO 메타데이터 포함</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cloneOptions.includeImages}
                    onChange={(e) => setCloneOptions(prev => ({ 
                      ...prev, 
                      includeImages: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">대표 이미지 포함</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={cloneOptions.includeTags}
                    onChange={(e) => setCloneOptions(prev => ({ 
                      ...prev, 
                      includeTags: e.target.checked 
                    }))}
                    className="rounded"
                  />
                  <span className="text-sm">태그 포함</span>
                </label>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 border-t bg-gray-50">
          <div className="flex gap-2 justify-end">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
            <button
              onClick={handleClone}
              disabled={!selectedContentId || !newTitle.trim() || !newSlug.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              복제하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
