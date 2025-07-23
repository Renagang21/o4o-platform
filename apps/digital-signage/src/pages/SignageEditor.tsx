import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Image, FileText, Video, Bell } from 'lucide-react';
import SignageScheduler from '../components/signage/SignageScheduler';

interface SignageContent {
  id?: string;
  title: string;
  type: 'image' | 'text' | 'video' | 'notice';
  content: string;
  schedule: {
    days: string[];
    timeRanges: { start: string; end: string }[];
  };
}

const SignageEditor: React.FC = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState<SignageContent>({
    title: '',
    type: 'image',
    content: '',
    schedule: {
      days: [],
      timeRanges: [{ start: '09:00', end: '18:00' }]
    }
  });

  const handleTypeChange = (type: SignageContent['type']) => {
    setContent({ ...content, type, content: '' });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setContent({ ...content, content: e.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent({ ...content, content: e.target.value });
  };

  const handleScheduleChange = (schedule: SignageContent['schedule']) => {
    setContent({ ...content, schedule });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // 저장 로직 구현
    navigate('/signage');
  };

  const renderContentEditor = () => {
    switch (content.type) {
      case 'image':
      case 'video':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer bg-secondary hover:bg-secondary-dark">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  {content.type === 'image' ? (
                    <Image className="w-12 h-12 text-text-secondary mb-3" />
                  ) : (
                    <Video className="w-12 h-12 text-text-secondary mb-3" />
                  )}
                  <p className="mb-2 text-sm text-text-secondary">
                    <span className="font-semibold">클릭</span>하여 파일 업로드
                  </p>
                  <p className="text-xs text-text-secondary">
                    {content.type === 'image'
                      ? 'PNG, JPG, GIF (최대 10MB)'
                      : 'MP4, WebM (최대 100MB)'}
                  </p>
                </div>
                <input
                  type="file"
                  className="hidden"
                  accept={content.type === 'image' ? 'image/*' : 'video/*'}
                  onChange={handleFileChange}
                />
              </label>
            </div>
            {content.content && (
              <div className="mt-4">
                {content.type === 'image' ? (
                  <img
                    src={content.content}
                    alt="미리보기"
                    className="w-full h-auto rounded-lg"
                  />
                ) : (
                  <video
                    src={content.content}
                    controls
                    className="w-full rounded-lg"
                  />
                )}
              </div>
            )}
          </div>
        );
      case 'text':
      case 'notice':
        return (
          <textarea
            value={content.content}
            onChange={handleTextChange}
            placeholder={
              content.type === 'text'
                ? '텍스트 내용을 입력하세요'
                : '공지사항 내용을 입력하세요'
            }
            className="w-full h-64 p-4 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary resize-none"
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center mb-8">
        <button
          onClick={() => navigate('/signage')}
          className="mr-4 p-2 text-text-secondary hover:text-text-main transition-colors duration-200"
        >
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-2xl font-semibold text-text-main">
          {content.id ? '콘텐츠 수정' : '새 콘텐츠 등록'}
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-text-main mb-4">기본 정보</h2>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-text-secondary mb-1"
              >
                제목
              </label>
              <input
                type="text"
                id="title"
                value={content.title}
                onChange={(e) =>
                  setContent({ ...content, title: e.target.value })
                }
                className="w-full px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
                placeholder="콘텐츠 제목을 입력하세요"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                콘텐츠 타입
              </label>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => handleTypeChange('image')}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    content.type === 'image'
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
                  }`}
                >
                  <Image className="w-5 h-5 mr-2" />
                  이미지
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('text')}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    content.type === 'text'
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
                  }`}
                >
                  <FileText className="w-5 h-5 mr-2" />
                  텍스트
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('video')}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    content.type === 'video'
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
                  }`}
                >
                  <Video className="w-5 h-5 mr-2" />
                  동영상
                </button>
                <button
                  type="button"
                  onClick={() => handleTypeChange('notice')}
                  className={`flex items-center px-4 py-2 rounded-lg ${
                    content.type === 'notice'
                      ? 'bg-primary text-white'
                      : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
                  }`}
                >
                  <Bell className="w-5 h-5 mr-2" />
                  공지
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-text-secondary mb-2">
                콘텐츠
              </label>
              {renderContentEditor()}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium text-text-main mb-4">송출 설정</h2>
          <SignageScheduler
            schedule={content.schedule}
            onChange={handleScheduleChange}
          />
        </div>

        <div className="flex justify-end space-x-4">
          <button
            type="button"
            onClick={() => navigate('/signage')}
            className="px-6 py-2 bg-secondary text-text-secondary rounded-lg hover:bg-secondary-dark transition-colors duration-200"
          >
            취소
          </button>
          <button
            type="submit"
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors duration-200"
          >
            저장
          </button>
        </div>
      </form>
    </div>
  );
};

export default SignageEditor; 