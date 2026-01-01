import { useState } from 'react';
import {
  Search,
  Play,
  FileText,
  Download,
  Calendar,
  Clock,
  Eye,
  Filter,
  BookOpen,
  Video,
  File,
} from 'lucide-react';

// Mock education content
const mockContents = [
  {
    id: '1',
    title: 'CGM 완벽 가이드 2024',
    description: '연속혈당측정기의 원리부터 실제 적용까지 상세하게 알아봅니다.',
    type: 'video',
    category: 'CGM',
    duration: 45,
    views: 2450,
    thumbnail: null,
    date: '2024-01-15',
    isNew: true,
  },
  {
    id: '2',
    title: '당뇨 환자 상담 실전 매뉴얼',
    description: '약국에서 당뇨 환자 상담 시 활용할 수 있는 실전 매뉴얼입니다.',
    type: 'pdf',
    category: '상담',
    pages: 32,
    downloads: 1280,
    thumbnail: null,
    date: '2024-01-12',
    isNew: true,
  },
  {
    id: '3',
    title: '혈당 관리와 영양 웨비나',
    description: '당뇨 환자의 영양 관리에 대한 전문가 웨비나입니다.',
    type: 'webinar',
    category: '영양',
    date: '2024-01-20',
    time: '14:00',
    duration: 60,
    registered: 156,
    thumbnail: null,
    isNew: false,
    isUpcoming: true,
  },
  {
    id: '4',
    title: '인슐린 펜 사용법 교육',
    description: '다양한 인슐린 펜의 올바른 사용법을 영상으로 배워봅니다.',
    type: 'video',
    category: '의약품',
    duration: 25,
    views: 890,
    thumbnail: null,
    date: '2024-01-10',
    isNew: false,
  },
  {
    id: '5',
    title: '약국 혈당관리 서비스 운영 가이드',
    description: '약국에서 혈당관리 서비스를 운영하기 위한 종합 가이드입니다.',
    type: 'article',
    category: '운영',
    readTime: 15,
    views: 1560,
    thumbnail: null,
    date: '2024-01-08',
    isNew: false,
  },
];

const categories = ['전체', 'CGM', '혈당측정기', '상담', '영양', '의약품', '운영'];
const typeFilters = [
  { value: 'all', label: '전체', icon: Filter },
  { value: 'video', label: '영상', icon: Video },
  { value: 'pdf', label: 'PDF', icon: File },
  { value: 'article', label: '아티클', icon: FileText },
  { value: 'webinar', label: '웨비나', icon: Calendar },
];

export default function EducationPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [selectedType, setSelectedType] = useState('all');

  const filteredContents = mockContents.filter((content) => {
    const matchesSearch =
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      content.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === '전체' || content.category === selectedCategory;
    const matchesType = selectedType === 'all' || content.type === selectedType;
    return matchesSearch && matchesCategory && matchesType;
  });

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Video className="w-5 h-5" />;
      case 'pdf':
        return <File className="w-5 h-5" />;
      case 'article':
        return <FileText className="w-5 h-5" />;
      case 'webinar':
        return <Calendar className="w-5 h-5" />;
      default:
        return <BookOpen className="w-5 h-5" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'video':
        return '영상';
      case 'pdf':
        return 'PDF';
      case 'article':
        return '아티클';
      case 'webinar':
        return '웨비나';
      default:
        return type;
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">교육/자료</h1>
        <p className="text-slate-500">혈당관리 전문성을 높이는 다양한 교육 자료</p>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="교육 자료 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex flex-col md:flex-row gap-4">
          {/* Category Filter */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto pb-2 md:pb-0">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === category
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {category}
              </button>
            ))}
          </div>

          {/* Type Filter */}
          <div className="flex items-center gap-2">
            {typeFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <button
                  key={filter.value}
                  onClick={() => setSelectedType(filter.value)}
                  className={`p-2 rounded-lg transition-colors ${
                    selectedType === filter.value
                      ? 'bg-accent-100 text-accent-700'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                  title={filter.label}
                >
                  <Icon className="w-5 h-5" />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Upcoming Webinar Banner */}
      {mockContents.some((c) => c.type === 'webinar' && 'isUpcoming' in c && c.isUpcoming) && (
        <div className="bg-gradient-to-r from-accent-600 to-primary-600 rounded-2xl p-6 mb-6 text-white">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-sm mb-2">
                예정된 웨비나
              </span>
              <h3 className="text-xl font-bold mb-1">혈당 관리와 영양 웨비나</h3>
              <p className="text-white/80 text-sm">2024년 1월 20일 오후 2:00</p>
            </div>
            <button className="px-6 py-3 bg-white text-accent-700 font-medium rounded-xl hover:bg-accent-50 transition-colors">
              지금 등록하기
            </button>
          </div>
        </div>
      )}

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContents.map((content) => (
          <div
            key={content.id}
            className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-white/90 shadow flex items-center justify-center text-primary-600">
                {content.type === 'video' ? (
                  <Play className="w-8 h-8 ml-1" />
                ) : (
                  getTypeIcon(content.type)
                )}
              </div>
              {content.isNew && (
                <span className="absolute top-3 left-3 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg">
                  NEW
                </span>
              )}
              {'isUpcoming' in content && content.isUpcoming && (
                <span className="absolute top-3 left-3 px-2 py-1 bg-accent-500 text-white text-xs font-medium rounded-lg">
                  예정
                </span>
              )}
              <span className="absolute top-3 right-3 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded-lg flex items-center gap-1">
                {getTypeIcon(content.type)}
                {getTypeLabel(content.type)}
              </span>
            </div>

            {/* Content Info */}
            <div className="p-5">
              <span className="text-xs text-primary-600 font-medium">{content.category}</span>
              <h3 className="font-semibold text-slate-800 mt-1 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                {content.title}
              </h3>
              <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                {content.description}
              </p>

              <div className="flex items-center justify-between text-xs text-slate-400">
                <div className="flex items-center gap-3">
                  {content.type === 'video' && 'duration' in content && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {content.duration}분
                    </span>
                  )}
                  {content.type === 'pdf' && 'pages' in content && (
                    <span className="flex items-center gap-1">
                      <FileText className="w-4 h-4" />
                      {content.pages}페이지
                    </span>
                  )}
                  {content.type === 'article' && 'readTime' in content && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-4 h-4" />
                      {content.readTime}분 읽기
                    </span>
                  )}
                  {content.type === 'webinar' && 'time' in content && (
                    <span className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {content.date} {content.time}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {'views' in content && (
                    <>
                      <Eye className="w-4 h-4" />
                      {content.views.toLocaleString()}
                    </>
                  )}
                  {'downloads' in content && (
                    <>
                      <Download className="w-4 h-4" />
                      {content.downloads.toLocaleString()}
                    </>
                  )}
                  {'registered' in content && (
                    <>
                      {content.registered}명 등록
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredContents.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">콘텐츠가 없습니다</h3>
          <p className="text-slate-500">검색 조건에 맞는 교육 자료가 없습니다.</p>
        </div>
      )}
    </div>
  );
}
