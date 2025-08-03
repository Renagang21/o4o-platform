import { FormEvent, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, Filter } from 'lucide-react';
import { ProjectCard } from '@/components/project/ProjectCard';
import { useFundingProjects } from '@/hooks/useProjects';
import { FundingCategory, FundingStatus } from '@o4o/crowdfunding-types';
import { Button } from '@o4o/ui';

const categories: { value: FundingCategory; label: string }[] = [
  { value: 'tech', label: '테크' },
  { value: 'art', label: '예술' },
  { value: 'design', label: '디자인' },
  { value: 'fashion', label: '패션' },
  { value: 'food', label: '푸드' },
  { value: 'social', label: '소셜' },
  { value: 'other', label: '기타' },
];

const statusOptions: { value: FundingStatus; label: string }[] = [
  { value: 'ongoing', label: '진행중' },
  { value: 'successful', label: '성공' },
  { value: 'failed', label: '실패' },
];

export function ProjectListPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchQuery, setSearchQuery] = useState(searchParams.get('search') || '');
  const [showFilters, setShowFilters] = useState(false);

  const filters = {
    search: searchParams.get('search') || undefined,
    category: searchParams.get('category') as FundingCategory | undefined,
    status: searchParams.get('status') as FundingStatus | undefined,
    sortBy: searchParams.get('sort') as any || 'latest',
    page: parseInt(searchParams.get('page') || '1'),
    limit: 12,
  };

  const { data, isLoading } = useFundingProjects(filters);

  const updateFilter = (key: string, value: string | null) => {
    const newParams = new URLSearchParams(searchParams);
    if (value) {
      newParams.set(key, value);
    } else {
      newParams.delete(key);
    }
    newParams.set('page', '1'); // Reset to first page
    setSearchParams(newParams);
  };

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    updateFilter('search', searchQuery || null);
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-main mb-4">프로젝트 둘러보기</h1>
          
          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-text-secondary" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e: any) => setSearchQuery(e.target.value)}
                placeholder="프로젝트 검색..."
                className="w-full pl-10 pr-4 py-2 border border-border-main rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <Button type="submit">검색</Button>
          </form>
        </div>

        <div className="flex gap-8">
          {/* Filters Sidebar */}
          <aside className={`${showFilters ? 'block' : 'hidden'} md:block w-64 space-y-6`}>
            {/* Category Filter */}
            <div>
              <h3 className="font-medium text-text-main mb-3">카테고리</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="category"
                    checked={!filters.category}
                    onChange={() => updateFilter('category', null)}
                    className="text-primary"
                  />
                  <span className="text-sm">전체</span>
                </label>
                {categories.map((cat: any) => (
                  <label key={cat.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="category"
                      checked={filters.category === cat.value}
                      onChange={() => updateFilter('category', cat.value)}
                      className="text-primary"
                    />
                    <span className="text-sm">{cat.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <h3 className="font-medium text-text-main mb-3">상태</h3>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="status"
                    checked={!filters.status}
                    onChange={() => updateFilter('status', null)}
                    className="text-primary"
                  />
                  <span className="text-sm">전체</span>
                </label>
                {statusOptions.map((status: any) => (
                  <label key={status.value} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="status"
                      checked={filters.status === status.value}
                      onChange={() => updateFilter('status', status.value)}
                      className="text-primary"
                    />
                    <span className="text-sm">{status.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Sort Options */}
            <div>
              <h3 className="font-medium text-text-main mb-3">정렬</h3>
              <select
                value={filters.sortBy}
                onChange={(e: any) => updateFilter('sort', e.target.value)}
                className="w-full px-3 py-2 border border-border-main rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="latest">최신순</option>
                <option value="popular">인기순</option>
                <option value="ending_soon">마감임박순</option>
                <option value="most_funded">펀딩금액순</option>
              </select>
            </div>
          </aside>

          {/* Project Grid */}
          <div className="flex-1">
            {/* Mobile Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="md:hidden mb-4 flex items-center gap-2 text-primary"
            >
              <Filter className="w-5 h-5" />
              필터 {showFilters ? '숨기기' : '보기'}
            </button>

            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-80 bg-surface animate-pulse rounded-lg" />
                ))}
              </div>
            ) : data?.projects.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-text-secondary">검색 결과가 없습니다.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {data?.projects.map((project: any) => (
                    <ProjectCard key={project.id} project={project} />
                  ))}
                </div>

                {/* Pagination */}
                {data && data.pagination.totalPages > 1 && (
                  <div className="mt-8 flex justify-center gap-2">
                    <Button
                      variant="outline"
                      onClick={() => updateFilter('page', String(Math.max(1, filters.page - 1)))}
                      disabled={filters.page === 1}
                    >
                      이전
                    </Button>
                    
                    <span className="px-4 py-2 text-text-secondary">
                      {filters.page} / {data.pagination.totalPages}
                    </span>
                    
                    <Button
                      variant="outline"
                      onClick={() => updateFilter('page', String(Math.min(data.pagination.totalPages, filters.page + 1)))}
                      disabled={filters.page === data.pagination.totalPages}
                    >
                      다음
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}