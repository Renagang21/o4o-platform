/**
 * ForumPage - GlycoPharm 포럼 게시글 목록 (테이블 + 페이지네이션)
 *
 * Phase 22-F: 테이블 형태 + 20건 단위 페이지 넘김
 *
 * 컬럼: 카테고리 | 제목 | 작성자 | 작성일 | 댓글
 * 검색 + 카테고리 필터 + 정렬
 */

import { useState, useEffect, useMemo } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { apiClient } from '@/services/api';

interface ForumPost {
  id: string;
  title: string;
  author: string;
  authorRole: string;
  category: string;
  views: number;
  likes: number;
  comments: number;
  createdAt: string;
  isHot: boolean;
}

const categories = ['전체', 'CGM', '혈당측정기', '상담', '영양', '의약품', '기타'];

const SORT_OPTIONS = [
  { value: 'latest', label: '최신순' },
  { value: 'popular', label: '조회수순' },
  { value: 'oldest', label: '오래된순' },
];

const PAGE_SIZE = 20;

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days > 7) return date.toLocaleDateString('ko-KR');
  if (days > 0) return `${days}일 전`;
  const hours = Math.floor(diff / (1000 * 60 * 60));
  if (hours > 0) return `${hours}시간 전`;
  const minutes = Math.floor(diff / (1000 * 60));
  return minutes > 0 ? `${minutes}분 전` : '방금 전';
}

export default function ForumPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const searchQuery = searchParams.get('q') || '';
  const categoryFilter = searchParams.get('category') || '전체';
  const sortBy = (searchParams.get('sort') || 'latest') as 'latest' | 'popular' | 'oldest';
  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const hasFilters = !!searchQuery || categoryFilter !== '전체' || sortBy !== 'latest';

  const [searchInput, setSearchInput] = useState(searchQuery);
  const [allPosts, setAllPosts] = useState<ForumPost[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => { setSearchInput(searchQuery); }, [searchQuery]);

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    apiClient.get<ForumPost[]>('/api/v1/glycopharm/forum/posts')
      .then((res) => {
        if (res.data) setAllPosts(res.data);
      })
      .catch(() => {
        setError('게시글을 불러오지 못했습니다.');
        setAllPosts([]);
      })
      .finally(() => setIsLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let result = [...allPosts];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(p =>
        p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
      );
    }
    if (categoryFilter && categoryFilter !== '전체') {
      result = result.filter(p => p.category === categoryFilter);
    }

    if (sortBy === 'popular') result.sort((a, b) => b.views - a.views);
    else if (sortBy === 'oldest') result.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    else result.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return result;
  }, [allPosts, searchQuery, categoryFilter, sortBy]);

  const totalCount = filtered.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const posts = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const hotPosts = filtered.filter(p => p.isHot).slice(0, 5);

  const updateParam = (key: string, value: string) => {
    const next = new URLSearchParams(searchParams);
    if (value) next.set(key, value);
    else next.delete(key);
    if (key !== 'page') next.delete('page');
    setSearchParams(next);
  };

  const goToPage = (p: number) => {
    if (p < 1 || p > totalPages) return;
    updateParam('page', p === 1 ? '' : String(p));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateParam('q', searchInput.trim());
  };

  const handleClearAll = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const pageNumbers = useMemo(() => {
    const pages: number[] = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    const end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start + 1 < maxVisible) start = Math.max(1, end - maxVisible + 1);
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }, [currentPage, totalPages]);

  return (
    <div className="max-w-[960px] mx-auto py-10 px-5">
      {/* Header */}
      <header className="mb-6">
        <div className="flex justify-between items-start gap-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">GlycoPharm 포럼</h1>
            <p className="text-sm text-slate-500">약사들의 지식과 경험을 나눠보세요</p>
          </div>
          <Link to="/forum" className="inline-flex items-center px-5 py-2.5 text-sm font-semibold text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors whitespace-nowrap shrink-0">
            글쓰기
          </Link>
        </div>
      </header>

      {/* Search + Filters */}
      <div className="mb-4">
        <form className="flex gap-2 mb-3" onSubmit={handleSearchSubmit}>
          <input
            type="text"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder="검색어를 입력하세요"
            className="flex-1 px-3.5 py-2 text-sm border border-slate-200 rounded-md outline-none bg-white"
          />
          <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 whitespace-nowrap">
            검색
          </button>
        </form>
        <div className="flex justify-between items-center gap-2 flex-wrap mb-2">
          <div className="flex gap-1 flex-wrap">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => updateParam('category', cat === '전체' ? '' : cat)}
                className={`px-3 py-1 text-xs font-medium rounded-full border transition-colors ${
                  (cat === '전체' && categoryFilter === '전체') || categoryFilter === cat
                    ? 'bg-primary-600 text-white border-primary-600'
                    : 'bg-white text-slate-500 border-slate-200 hover:border-primary-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
          <select
            value={sortBy}
            onChange={(e) => updateParam('sort', e.target.value === 'latest' ? '' : e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-200 rounded-md bg-white text-slate-600 outline-none cursor-pointer"
          >
            {SORT_OPTIONS.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {hasFilters && (
          <div className="flex items-center justify-between px-3 py-1.5 bg-blue-50 rounded-md border border-blue-200">
            <span className="text-xs text-blue-700">
              {searchQuery && `"${searchQuery}" `}
              {categoryFilter !== '전체' && `${categoryFilter} `}
              {sortBy !== 'latest' && SORT_OPTIONS.find(o => o.value === sortBy)?.label}
            </span>
            <button onClick={handleClearAll} className="text-xs text-blue-700 underline bg-transparent border-none cursor-pointer">초기화</button>
          </div>
        )}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
          <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left" style={{ width: '80px' }}>카테고리</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left">제목</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left" style={{ width: '100px' }}>작성자</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left" style={{ width: '100px' }}>작성일</th>
                <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-center" style={{ width: '60px' }}>댓글</th>
              </tr>
            </thead>
            <tbody>
              {[1,2,3,4,5].map(i => (
                <tr key={i}><td colSpan={5} className="px-3 py-3 border-b border-slate-50">
                  <div className="h-3.5 bg-slate-200 rounded" style={{ width: `${50 + i * 8}%` }} />
                </td></tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="py-10 text-center bg-red-50 rounded-lg mb-4">
          <p className="text-red-600 text-sm mb-3">{error}</p>
          <button onClick={() => window.location.reload()} className="px-4 py-2 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-md cursor-pointer">다시 시도</button>
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && (
        <>
          {/* Hot posts on page 1 */}
          {!hasFilters && currentPage === 1 && hotPosts.length > 0 && (
            <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
              <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
                <tbody>
                  {hotPosts.map(post => (
                    <tr key={post.id} className="bg-amber-50 cursor-pointer hover:bg-amber-100 transition-colors">
                      <td className="px-3 py-3 text-center border-b border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: '80px' }}>
                        <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-500">{post.category}</span>
                      </td>
                      <td className="px-3 py-3 border-b border-slate-100 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-slate-800">
                        <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold rounded bg-red-50 text-red-600 mr-1.5">HOT</span>
                        <span className="font-medium">{post.title}</span>
                        {post.comments > 0 && <span className="ml-1.5 text-xs text-primary-600 font-medium">[{post.comments}]</span>}
                      </td>
                      <td className="px-3 py-3 border-b border-slate-100 text-xs text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: '100px' }}>{post.author}</td>
                      <td className="px-3 py-3 border-b border-slate-100 text-xs text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: '100px' }}>{formatDate(post.createdAt)}</td>
                      <td className="px-3 py-3 border-b border-slate-100 text-xs text-slate-500 text-center" style={{ width: '60px' }}>{post.comments}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Info bar */}
          <div className="flex justify-between items-center py-2 mb-1">
            <span className="text-xs text-slate-500">
              {hasFilters ? `검색 결과 ${totalCount}건` : `총 ${totalCount}개의 게시글`}
            </span>
            {totalPages > 1 && (
              <span className="text-xs text-slate-400">{currentPage} / {totalPages} 페이지</span>
            )}
          </div>

          {/* Posts table */}
          <div className="bg-white rounded-lg border border-slate-200 overflow-hidden mb-2">
            <table className="w-full border-collapse" style={{ tableLayout: 'fixed' }}>
              <thead>
                <tr>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left" style={{ width: '80px' }}>카테고리</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left">제목</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left" style={{ width: '100px' }}>작성자</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-left" style={{ width: '100px' }}>작성일</th>
                  <th className="px-3 py-2.5 text-xs font-semibold text-slate-500 bg-slate-50 border-b border-slate-200 text-center" style={{ width: '60px' }}>댓글</th>
                </tr>
              </thead>
              <tbody>
                {posts.length > 0 ? posts.map(post => (
                  <tr key={post.id} className="cursor-pointer hover:bg-slate-50 transition-colors">
                    <td className="px-3 py-3 text-center border-b border-slate-50 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: '80px' }}>
                      <span className="inline-block px-2 py-0.5 text-[11px] font-medium rounded bg-slate-100 text-slate-500">{post.category}</span>
                    </td>
                    <td className="px-3 py-3 border-b border-slate-50 overflow-hidden text-ellipsis whitespace-nowrap text-sm text-slate-800">
                      {post.isHot && <span className="inline-block px-1.5 py-0.5 text-[11px] font-semibold rounded bg-red-50 text-red-600 mr-1.5">HOT</span>}
                      <span className="font-medium">{post.title}</span>
                      {post.comments > 0 && <span className="ml-1.5 text-xs text-primary-600 font-medium">[{post.comments}]</span>}
                    </td>
                    <td className="px-3 py-3 border-b border-slate-50 text-xs text-slate-500 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: '100px' }}>{post.author}</td>
                    <td className="px-3 py-3 border-b border-slate-50 text-xs text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap" style={{ width: '100px' }}>{formatDate(post.createdAt)}</td>
                    <td className="px-3 py-3 border-b border-slate-50 text-xs text-slate-500 text-center" style={{ width: '60px' }}>{post.comments}</td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="py-16 text-center">
                      {hasFilters ? (
                        <>
                          <p className="text-sm text-slate-500 mb-3">검색 결과가 없습니다</p>
                          <button onClick={handleClearAll} className="inline-flex items-center px-4 py-2 text-xs font-semibold text-white bg-primary-600 rounded-md border-none cursor-pointer">전체 목록 보기</button>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">아직 등록된 글이 없습니다</p>
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-center items-center gap-1 py-6">
              <button
                onClick={() => goToPage(1)}
                disabled={currentPage === 1}
                className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all ${
                  currentPage === 1 ? 'text-slate-300 cursor-default opacity-50 bg-white border-slate-200' : 'text-slate-600 bg-white border-slate-200 cursor-pointer hover:bg-slate-50'
                }`}
              >&laquo;</button>
              <button
                onClick={() => goToPage(currentPage - 1)}
                disabled={currentPage === 1}
                className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all ${
                  currentPage === 1 ? 'text-slate-300 cursor-default opacity-50 bg-white border-slate-200' : 'text-slate-600 bg-white border-slate-200 cursor-pointer hover:bg-slate-50'
                }`}
              >&lsaquo;</button>
              {pageNumbers.map(p => (
                <button
                  key={p}
                  onClick={() => goToPage(p)}
                  className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all cursor-pointer ${
                    p === currentPage ? 'bg-primary-600 text-white border-primary-600' : 'text-slate-600 bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >{p}</button>
              ))}
              <button
                onClick={() => goToPage(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all ${
                  currentPage === totalPages ? 'text-slate-300 cursor-default opacity-50 bg-white border-slate-200' : 'text-slate-600 bg-white border-slate-200 cursor-pointer hover:bg-slate-50'
                }`}
              >&rsaquo;</button>
              <button
                onClick={() => goToPage(totalPages)}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center justify-center min-w-[36px] h-9 px-2 text-sm font-medium rounded-md border transition-all ${
                  currentPage === totalPages ? 'text-slate-300 cursor-default opacity-50 bg-white border-slate-200' : 'text-slate-600 bg-white border-slate-200 cursor-pointer hover:bg-slate-50'
                }`}
              >&raquo;</button>
            </div>
          )}
        </>
      )}

      {/* Footer */}
      <div className="mt-6 text-center">
        <Link to="/" className="text-sm text-slate-500 no-underline hover:text-primary-600">&larr; 홈으로 돌아가기</Link>
      </div>
    </div>
  );
}
