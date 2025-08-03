import { FC } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Trash2, Calendar, Clock } from 'lucide-react';

interface SignageContent {
  id: string;
  title: string;
  type: 'image' | 'text' | 'video' | 'notice';
  content: string;
  thumbnail: string;
  isActive: boolean;
  createdAt: string;
  schedule: {
    days: string[];
    timeRanges: { start: string; end: string }[];
  };
}

const SignageDetail: FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Mock 데이터
  const content: SignageContent = {
    id: '1',
    title: '신규 입고 안내',
    type: 'image',
    content: 'https://via.placeholder.com/1920x1080',
    thumbnail: 'https://via.placeholder.com/300x200',
    isActive: true,
    createdAt: '2024-03-15',
    schedule: {
      days: ['월', '화', '수', '목', '금'],
      timeRanges: [
        { start: '09:00', end: '12:00' },
        { start: '14:00', end: '18:00' }
      ]
    }
  };

  const handleDelete = () => {
    if (window.confirm('정말로 이 콘텐츠를 삭제하시겠습니까?')) {
      // 삭제 로직 구현
      navigate('/signage');
    }
  };

  const renderContent = () => {
    switch (content.type) {
      case 'image':
        return (
          <img
            src={content.content}
            alt={content.title}
            className="w-full h-auto rounded-lg"
          />
        );
      case 'text':
        return (
          <div className="p-8 bg-white rounded-lg">
            <p className="text-lg text-text-main whitespace-pre-wrap">
              {content.content}
            </p>
          </div>
        );
      case 'video':
        return (
          <video
            src={content.content}
            controls
            className="w-full rounded-lg"
          />
        );
      case 'notice':
        return (
          <div className="p-8 bg-white rounded-lg">
            <div className="flex items-center mb-4">
              <div className="w-2 h-2 bg-danger rounded-full mr-2" />
              <h3 className="text-lg font-medium text-text-main">긴급 공지</h3>
            </div>
            <p className="text-lg text-text-main whitespace-pre-wrap">
              {content.content}
            </p>
          </div>
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
          {content.title}
        </h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
            <h2 className="text-lg font-medium text-text-main mb-4">미리보기</h2>
            {renderContent()}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-lg font-medium text-text-main mb-4">송출 정보</h2>
            <div className="space-y-4">
              <div>
                <div className="flex items-center mb-2">
                  <Calendar className="w-5 h-5 text-text-secondary mr-2" />
                  <span className="text-text-secondary">송출 요일</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {content.schedule.days.map((day: any) => (
                    <span
                      key={day}
                      className="px-3 py-1 bg-secondary text-text-secondary rounded-full text-sm"
                    >
                      {day}
                    </span>
                  ))}
                </div>
              </div>
              <div>
                <div className="flex items-center mb-2">
                  <Clock className="w-5 h-5 text-text-secondary mr-2" />
                  <span className="text-text-secondary">송출 시간</span>
                </div>
                <div className="space-y-2">
                  {content.schedule.timeRanges.map((range, index) => (
                    <div
                      key={index}
                      className="px-3 py-2 bg-secondary text-text-secondary rounded-lg text-sm"
                    >
                      {range.start} - {range.end}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="flex space-x-4">
            <button
              onClick={() => navigate(`/signage/edit/${content.id}`)}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors duration-200"
            >
              <Edit className="w-5 h-5 mr-2" />
              수정
            </button>
            <button
              onClick={handleDelete}
              className="flex-1 inline-flex items-center justify-center px-4 py-2 bg-danger text-white rounded-lg hover:bg-danger-dark transition-colors duration-200"
            >
              <Trash2 className="w-5 h-5 mr-2" />
              삭제
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignageDetail; 