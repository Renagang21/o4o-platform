import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Clock,
  BookOpen,
  Filter,
} from 'lucide-react';
import { lmsApi, type LmsCourse } from '@/api/lms';

const LEVEL_FILTERS = [
  { value: 'all', label: '전체' },
  { value: 'beginner', label: '초급' },
  { value: 'intermediate', label: '중급' },
  { value: 'advanced', label: '고급' },
];

const LEVEL_LABEL: Record<string, string> = {
  beginner: '초급',
  intermediate: '중급',
  advanced: '고급',
};

export default function EducationPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [courses, setCourses] = useState<LmsCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const fetchCourses = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await lmsApi.getCourses({
          search: searchQuery || undefined,
          level: selectedLevel !== 'all' ? selectedLevel : undefined,
          limit: 50,
        });
        if (!cancelled) {
          setCourses(result.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setError('강의 목록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchCourses();
    return () => { cancelled = true; };
  }, [searchQuery, selectedLevel]);

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">강의 / 마케팅 콘텐츠</h1>
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
            placeholder="강의 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400 flex-shrink-0" />
          <div className="flex items-center gap-2 flex-wrap">
            {LEVEL_FILTERS.map((filter) => (
              <button
                key={filter.value}
                onClick={() => setSelectedLevel(filter.value)}
                className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedLevel === filter.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm overflow-hidden animate-pulse">
              <div className="aspect-video bg-slate-100" />
              <div className="p-5 space-y-3">
                <div className="h-3 bg-slate-100 rounded w-1/4" />
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">오류가 발생했습니다</h3>
          <p className="text-slate-500">{error}</p>
        </div>
      )}

      {/* Content Grid */}
      {!loading && !error && (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div
              key={course.id}
              onClick={() => navigate(`/education/${course.id}`)}
              className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
            >
              {/* Thumbnail */}
              <div className="relative aspect-video bg-slate-100 flex items-center justify-center">
                {course.thumbnail ? (
                  <img
                    src={course.thumbnail}
                    alt={course.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-white/90 shadow flex items-center justify-center text-primary-600">
                    <BookOpen className="w-8 h-8" />
                  </div>
                )}
                <span className="absolute top-3 right-3 px-2 py-1 bg-black/50 text-white text-xs font-medium rounded-lg">
                  강의
                </span>
              </div>

              {/* Content Info */}
              <div className="p-5">
                <span className="text-xs text-primary-600 font-medium">
                  {LEVEL_LABEL[course.level] ?? course.level}
                </span>
                <h3 className="font-semibold text-slate-800 mt-1 mb-2 line-clamp-2 group-hover:text-primary-600 transition-colors">
                  {course.title}
                </h3>
                <p className="text-sm text-slate-500 line-clamp-2 mb-4">
                  {course.description ?? ''}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-3">
                    {course.duration > 0 && (
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {course.duration}분
                      </span>
                    )}
                  </div>
                  <span>
                    {new Date(course.createdAt).toLocaleDateString('ko-KR', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && courses.length === 0 && (
        <div className="text-center py-12 bg-white rounded-2xl">
          <BookOpen className="w-16 h-16 text-slate-200 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-800 mb-2">등록된 강의가 없습니다</h3>
          <p className="text-slate-500">
            {searchQuery
              ? '검색 조건에 맞는 강의가 없습니다.'
              : '아직 등록된 강의가 없습니다.'}
          </p>
        </div>
      )}
    </div>
  );
}
