import React, { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, File, Image, Video, Trash2, Edit3, Save } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { BetaFeedbackWidget } from '../../components/beta/BetaFeedbackWidget';

interface SignageContent {
  id: string;
  title: string;
  type: 'video' | 'image' | 'slideshow';
  url: string;
  thumbnail: string;
  duration?: number;
  createdAt: string;
  isActive: boolean;
}

const ContentManager: React.FC = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [newContent, setNewContent] = useState({
    title: '',
    type: 'image' as 'video' | 'image' | 'slideshow',
    file: null as File | null
  });

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const file = files[0];
    const fileType = file.type.startsWith('video/') ? 'video' : 
                    file.type.startsWith('image/') ? 'image' : null;

    if (!fileType) {
      alert('지원하지 않는 파일 형식입니다. 이미지 또는 동영상 파일을 선택해주세요.');
      return;
    }

    setNewContent({
      title: file.name.replace(/\.[^/.]+$/, ''), // 확장자 제거
      type: fileType,
      file: file
    });
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleUpload = async () => {
    if (!newContent.file || !newContent.title) {
      alert('파일과 제목을 입력해주세요.');
      return;
    }

    setUploading(true);
    
    try {
      // 실제로는 파일 업로드 API 호출
      await new Promise(resolve => setTimeout(resolve, 2000)); // 모의 업로드 지연
      
      console.log('업로드 완료:', {
        title: newContent.title,
        type: newContent.type,
        file: newContent.file.name
      });

      alert('콘텐츠가 성공적으로 업로드되었습니다!');
      
      // 초기화
      setNewContent({
        title: '',
        type: 'image',
        file: null
      });
      
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      
    } catch (error) {
      console.error('업로드 실패:', error);
      alert('업로드에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      {/* 헤더 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-4">
            <Link
              to="/signage"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              대시보드로
            </Link>
            <div className="h-6 w-px bg-gray-300" />
            <h1 className="text-xl font-bold text-gray-900">콘텐츠 관리</h1>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 콘텐츠 업로드 */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-6">새 콘텐츠 업로드</h2>
          
          {/* 파일 드롭 영역 */}
          <div
            className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive 
                ? 'border-blue-500 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={(e) => handleFileSelect(e.target.files)}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            
            <div className="space-y-4">
              <div className="flex justify-center">
                <Upload className="w-16 h-16 text-gray-400" />
              </div>
              
              {newContent.file ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2">
                    {newContent.type === 'video' && <Video className="w-5 h-5 text-blue-600" />}
                    {newContent.type === 'image' && <Image className="w-5 h-5 text-green-600" />}
                    <span className="font-medium text-gray-900">{newContent.file.name}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    크기: {(newContent.file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-700">
                    파일을 드래그하거나 클릭하여 업로드
                  </p>
                  <p className="text-sm text-gray-500">
                    지원 형식: JPG, PNG, GIF, MP4, MOV, AVI (최대 100MB)
                  </p>
                </div>
              )}
            </div>
          </div>
          
          {/* 콘텐츠 정보 입력 */}
          {newContent.file && (
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  콘텐츠 제목
                </label>
                <input
                  type="text"
                  value={newContent.title}
                  onChange={(e) => setNewContent(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="TV에 표시될 콘텐츠 제목을 입력하세요"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  콘텐츠 타입
                </label>
                <select
                  value={newContent.type}
                  onChange={(e) => setNewContent(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'video' | 'image' | 'slideshow' 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="image">이미지</option>
                  <option value="video">동영상</option>
                  <option value="slideshow">슬라이드쇼</option>
                </select>
              </div>
              
              <div className="flex gap-4">
                <button
                  onClick={handleUpload}
                  disabled={uploading || !newContent.title}
                  className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
                >
                  {uploading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      업로드 중...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      업로드
                    </>
                  )}
                </button>
                
                <button
                  onClick={() => {
                    setNewContent({ title: '', type: 'image', file: null });
                    if (fileInputRef.current) fileInputRef.current.value = '';
                  }}
                  className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  취소
                </button>
              </div>
            </div>
          )}
        </div>

        {/* 기존 콘텐츠 목록 */}
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-gray-900">콘텐츠 목록</h2>
            <Link
              to="/signage"
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              대시보드에서 관리
            </Link>
          </div>
          
          <div className="space-y-4">
            {/* 모의 콘텐츠 목록 */}
            {[
              {
                id: '1',
                title: '매장 환영 동영상',
                type: 'video',
                createdAt: '2025-01-20',
                isActive: true,
                size: '15.2 MB'
              },
              {
                id: '2',
                title: '신제품 프로모션',
                type: 'slideshow', 
                createdAt: '2025-01-19',
                isActive: false,
                size: '3.1 MB'
              },
              {
                id: '3',
                title: '매장 안내사항',
                type: 'image',
                createdAt: '2025-01-18',
                isActive: false,
                size: '1.8 MB'
              }
            ].map((content) => (
              <div key={content.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-gray-100 rounded">
                    {content.type === 'video' && <Video className="w-5 h-5 text-blue-600" />}
                    {content.type === 'image' && <Image className="w-5 h-5 text-green-600" />}
                    {content.type === 'slideshow' && <File className="w-5 h-5 text-purple-600" />}
                  </div>
                  
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{content.title}</h3>
                      {content.isActive && (
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                          재생 중
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-500 mt-1">
                      <span className="capitalize">{content.type}</span>
                      <span>{content.createdAt}</span>
                      <span>{content.size}</span>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button className="p-2 text-blue-600 hover:bg-blue-50 rounded">
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-red-600 hover:bg-red-50 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
          
          {/* 빈 상태 */}
          {false && (
            <div className="text-center py-8">
              <File className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">아직 업로드된 콘텐츠가 없습니다.</p>
              <p className="text-sm text-gray-400">위에서 새 콘텐츠를 업로드해보세요.</p>
            </div>
          )}
        </div>
      </div>
      
      {/* Beta Feedback Widget */}
      <BetaFeedbackWidget 
        page="content-manager" 
        feature="content_management"
      />
    </div>
  );
};

export default ContentManager;
