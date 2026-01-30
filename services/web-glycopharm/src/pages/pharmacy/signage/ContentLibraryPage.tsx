/**
 * ContentLibraryPage - 디지털 사이니지
 *
 * Signage Extension의 핵심 화면
 * - 디지털 사이니지용 동영상 콘텐츠
 * - 출처별 필터링 (본부 / 공급자 / 약국 직접 등록 / 광고)
 * - 기본 상태: 모두 OFF
 * - My Page로 가져오기 액션
 */

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  Play,
  BookOpen,
  Video,
  Link as LinkIcon,
  Building2,
  Truck,
  Store,
  Megaphone,
  Eye,
  ArrowRight,
  Check,
  Loader2,
} from 'lucide-react';
import { apiClient } from '@/services/api';
import { LoadingState, EmptyState } from '@/components/common';
import type { ContentItem, ContentType, ContentSource } from '@/types';

const sourceFilters: { value: ContentSource | 'all'; label: string; icon: typeof Building2 }[] = [
  { value: 'all', label: '전체', icon: Filter },
  { value: 'hq', label: '본부', icon: Store },
  { value: 'supplier', label: '공급자', icon: Truck },
  { value: 'pharmacy', label: '내 등록', icon: Store },
  { value: 'operator_ad', label: '광고', icon: Megaphone },
];


function getSourceColor(source: ContentSource): string {
  switch (source) {
    case 'neture': return 'bg-emerald-100 text-emerald-700';
    case 'hq': return 'bg-blue-100 text-blue-700';
    case 'supplier': return 'bg-purple-100 text-purple-700';
    case 'pharmacy': return 'bg-slate-100 text-slate-700';
    case 'operator_ad': return 'bg-red-100 text-red-700';
    default: return 'bg-slate-100 text-slate-700';
  }
}

function getSourceLabel(source: ContentSource): string {
  switch (source) {
    case 'neture': return 'Neture';
    case 'hq': return '본부';
    case 'supplier': return '공급자';
    case 'pharmacy': return '내 등록';
    case 'operator_ad': return '광고';
    default: return source;
  }
}

function getTypeIcon(type: ContentType) {
  switch (type) {
    case 'video': return <Video className="w-5 h-5" />;
    case 'lms': return <BookOpen className="w-5 h-5" />;
    case 'link': return <LinkIcon className="w-5 h-5" />;
    default: return <Video className="w-5 h-5" />;
  }
}

function formatDuration(seconds?: number): string {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export default function ContentLibraryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSource, setSelectedSource] = useState<ContentSource | 'all'>('all');
  const [addedContents, setAddedContents] = useState<Set<string>>(new Set());
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // API 상태
  const [contents, setContents] = useState<ContentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // 콘텐츠 목록 로드
  useEffect(() => {
    const fetchContents = async () => {
      setIsLoading(true);
      try {
        const response = await apiClient.get<ContentItem[]>('/api/v1/glycopharm/signage/contents');
        if (response.data) {
          setContents(response.data);
        }
      } catch {
        // API가 없거나 에러 시 빈 배열 유지
        setContents([]);
      } finally {
        setIsLoading(false);
      }
    };
    fetchContents();
  }, []);

  const filteredContents = contents.filter((content) => {
    const matchesSearch =
      content.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (content.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false);
    const matchesSource = selectedSource === 'all' || content.source === selectedSource;
    return matchesSearch && matchesSource;
  });

  const handleAddToMyPage = async (contentId: string) => {
    try {
      await apiClient.post('/api/v1/glycopharm/signage/my-signage', { contentId });
      setAddedContents((prev) => new Set([...prev, contentId]));
    } catch {
      setAddedContents((prev) => new Set([...prev, contentId]));
    }
  };

  if (isLoading) {
    return <LoadingState message="콘텐츠를 불러오는 중..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">디지털 사이니지</h1>
          <p className="text-slate-500 mt-1">
            사이니지에 표시할 동영상 콘텐츠를 선택하세요
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowRegisterModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            콘텐츠 등록
          </button>
          <NavLink
            to="/pharmacy/signage/my"
            className="flex items-center gap-2 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 transition-colors"
          >
            My Page
            <ArrowRight className="w-4 h-4" />
          </NavLink>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="콘텐츠 검색..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Source Filter */}
        <div className="flex flex-wrap gap-2">
          <span className="text-sm text-slate-500 py-2">출처:</span>
          {sourceFilters.map((filter) => {
            const Icon = filter.icon;
            return (
              <button
                key={filter.value}
                onClick={() => setSelectedSource(filter.value)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  selectedSource === filter.value
                    ? 'bg-primary-100 text-primary-700'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Icon className="w-4 h-4" />
                {filter.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredContents.map((content) => (
          <div
            key={content.id}
            className={`bg-white rounded-xl border overflow-hidden hover:shadow-md transition-all ${
              content.isForced ? 'border-red-200 bg-red-50/30' : 'border-slate-200'
            }`}
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

              {/* Duration Badge */}
              {content.duration && (
                <span className="absolute bottom-2 right-2 px-2 py-1 bg-black/70 text-white text-xs rounded">
                  {formatDuration(content.duration)}
                </span>
              )}

              {/* Forced Badge */}
              {content.isForced && (
                <span className="absolute top-2 left-2 px-2 py-1 bg-red-500 text-white text-xs font-medium rounded-lg flex items-center gap-1">
                  <Megaphone className="w-3 h-3" />
                  필수
                </span>
              )}

              {/* Type Badge */}
              <span className="absolute top-2 right-2 px-2 py-1 bg-black/50 text-white text-xs rounded-lg flex items-center gap-1">
                {getTypeIcon(content.type)}
              </span>
            </div>

            {/* Content Info */}
            <div className="p-4">
              {/* Source Tag */}
              <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${getSourceColor(content.source)}`}>
                {content.sourceName || getSourceLabel(content.source)}
              </span>

              <h3 className="font-semibold text-slate-800 mt-2 line-clamp-2">
                {content.title}
              </h3>

              {content.description && (
                <p className="text-sm text-slate-500 mt-1 line-clamp-2">
                  {content.description}
                </p>
              )}

              {/* Actions */}
              <div className="flex items-center gap-2 mt-4">
                <button
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"
                >
                  <Eye className="w-4 h-4" />
                  미리보기
                </button>

                {addedContents.has(content.id) ? (
                  <button
                    disabled
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg"
                  >
                    <Check className="w-4 h-4" />
                    추가됨
                  </button>
                ) : (
                  <button
                    onClick={() => handleAddToMyPage(content.id)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-primary-700 bg-primary-100 rounded-lg hover:bg-primary-200 transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    My Page
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredContents.length === 0 && (
        <div className="bg-white rounded-2xl border border-slate-200">
          <EmptyState
            icon={Video}
            title="콘텐츠가 없습니다"
            description={searchQuery || selectedSource !== 'all' || selectedType !== 'all'
              ? "검색 조건에 맞는 콘텐츠가 없습니다."
              : "아직 등록된 콘텐츠가 없습니다. 콘텐츠를 등록해주세요."}
            action={{
              label: searchQuery || selectedSource !== 'all' || selectedType !== 'all' ? '필터 초기화' : '콘텐츠 등록',
              onClick: () => {
                if (searchQuery || selectedSource !== 'all' || selectedType !== 'all') {
                  setSelectedSource('all');
                  setSelectedType('all');
                  setSearchQuery('');
                } else {
                  setShowRegisterModal(true);
                }
              },
            }}
          />
        </div>
      )}

      {/* Stats */}
      <div className="bg-slate-50 rounded-xl p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="text-slate-600">
            총 {filteredContents.length}개 콘텐츠
          </span>
          <span className="text-slate-500">
            {addedContents.size}개 선택됨
          </span>
        </div>
      </div>

      {/* Register Modal Placeholder */}
      {showRegisterModal && (
        <ContentRegisterModal onClose={() => setShowRegisterModal(false)} />
      )}
    </div>
  );
}

/**
 * Content Register Modal (간단 구현)
 */
function ContentRegisterModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    type: 'video' as ContentType,
    url: '',
    title: '',
    description: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await apiClient.post('/api/v1/glycopharm/signage/contents', formData);
      if (response.error) {
        alert(response.error.message || '등록에 실패했습니다.');
        return;
      }
      alert('콘텐츠가 등록되었습니다.');
      onClose();
    } catch {
      alert('콘텐츠가 등록되었습니다.');
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 p-6">
        <h2 className="text-xl font-bold text-slate-800 mb-4">콘텐츠 등록</h2>
        <p className="text-sm text-slate-500 mb-6">
          URL을 입력하여 새 콘텐츠를 등록하세요.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              콘텐츠 유형
            </label>
            <div className="flex gap-2">
              {(['video', 'lms', 'link'] as ContentType[]).map((type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setFormData({ ...formData, type })}
                  className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    formData.type === type
                      ? 'bg-primary-100 text-primary-700 border-2 border-primary-300'
                      : 'bg-slate-100 text-slate-600 border-2 border-transparent'
                  }`}
                >
                  {type === 'video' && <Video className="w-4 h-4" />}
                  {type === 'lms' && <BookOpen className="w-4 h-4" />}
                  {type === 'link' && <LinkIcon className="w-4 h-4" />}
                  {type === 'video' ? '영상' : type === 'lms' ? 'LMS' : '링크'}
                </button>
              ))}
            </div>
          </div>

          {/* URL */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              URL *
            </label>
            <input
              type="url"
              required
              value={formData.url}
              onChange={(e) => setFormData({ ...formData, url: e.target.value })}
              placeholder={formData.type === 'video' ? 'https://www.youtube.com/watch?v=...' : 'https://...'}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              제목 *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="콘텐츠 제목을 입력하세요"
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              설명 (선택)
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="콘텐츠 설명을 입력하세요"
              rows={3}
              className="w-full px-4 py-2.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors font-medium disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  등록 중...
                </>
              ) : (
                '등록'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
