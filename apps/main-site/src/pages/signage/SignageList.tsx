import { useState, FC } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Image, FileText, Video, Bell } from 'lucide-react';

interface SignageContent {
  id: string;
  title: string;
  type: 'image' | 'text' | 'video' | 'notice';
  thumbnail: string;
  isActive: boolean;
  createdAt: string;
}

const SignageList: FC = () => {
  const [filter, setFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'date' | 'name'>('date');

  // Mock 데이터
  const contents: SignageContent[] = [
    {
      id: '1',
      title: '신규 입고 안내',
      type: 'image',
      thumbnail: 'https://via.placeholder.com/300x200',
      isActive: true,
      createdAt: '2024-03-15'
    },
    {
      id: '2',
      title: '영업시간 안내',
      type: 'text',
      thumbnail: 'https://via.placeholder.com/300x200',
      isActive: false,
      createdAt: '2024-03-14'
    },
    {
      id: '3',
      title: '제품 사용법',
      type: 'video',
      thumbnail: 'https://via.placeholder.com/300x200',
      isActive: true,
      createdAt: '2024-03-13'
    },
    {
      id: '4',
      title: '긴급 공지사항',
      type: 'notice',
      thumbnail: 'https://via.placeholder.com/300x200',
      isActive: true,
      createdAt: '2024-03-12'
    }
  ];

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'image':
        return <Image className="w-5 h-5" />;
      case 'text':
        return <FileText className="w-5 h-5" />;
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'notice':
        return <Bell className="w-5 h-5" />;
      default:
        return null;
    }
  };

  const filteredContents = contents
    .filter(content => filter === 'all' || content.type === filter)
    .sort((a, b) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      return a.title.localeCompare(b.title);
    });

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-semibold text-text-main">디지털 사이니지 콘텐츠</h1>
        <Link
          to="/signage/create"
          className="inline-flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors duration-200"
        >
          <Plus className="w-5 h-5 mr-2" />
          새 콘텐츠 등록
        </Link>
      </div>

      <div className="flex justify-between items-center mb-6">
        <div className="flex space-x-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'all'
                ? 'bg-primary text-white'
                : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
            }`}
          >
            전체
          </button>
          <button
            onClick={() => setFilter('image')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'image'
                ? 'bg-primary text-white'
                : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
            }`}
          >
            이미지
          </button>
          <button
            onClick={() => setFilter('text')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'text'
                ? 'bg-primary text-white'
                : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
            }`}
          >
            텍스트
          </button>
          <button
            onClick={() => setFilter('video')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'video'
                ? 'bg-primary text-white'
                : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
            }`}
          >
            동영상
          </button>
          <button
            onClick={() => setFilter('notice')}
            className={`px-4 py-2 rounded-lg ${
              filter === 'notice'
                ? 'bg-primary text-white'
                : 'bg-secondary text-text-secondary hover:bg-secondary-dark'
            }`}
          >
            공지
          </button>
        </div>

        <select
          value={sortBy}
          onChange={(e: any) => setSortBy(e.target.value as 'date' | 'name')}
          className="px-4 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary"
        >
          <option value="date">등록일순</option>
          <option value="name">이름순</option>
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {filteredContents.map((content: any) => (
          <Link
            key={content.id}
            to={`/signage/${content.id}`}
            className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <div className="relative">
              <img
                src={content.thumbnail}
                alt={content.title}
                className="w-full h-48 object-cover rounded-t-xl"
              />
              <div className="absolute top-2 right-2">
                <span
                  className={`px-2 py-1 text-xs rounded-full ${
                    content.isActive
                      ? 'bg-success text-white'
                      : 'bg-secondary text-text-secondary'
                  }`}
                >
                  {content.isActive ? '송출중' : '대기중'}
                </span>
              </div>
            </div>
            <div className="p-4">
              <div className="flex items-center mb-2">
                {getTypeIcon(content.type)}
                <span className="ml-2 text-sm text-text-secondary">
                  {content.type === 'image'
                    ? '이미지'
                    : content.type === 'text'
                    ? '텍스트'
                    : content.type === 'video'
                    ? '동영상'
                    : '공지'}
                </span>
              </div>
              <h3 className="text-lg font-medium text-text-main mb-1">
                {content.title}
              </h3>
              <p className="text-sm text-text-secondary">
                {new Date(content.createdAt).toLocaleDateString()}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
};

export default SignageList; 