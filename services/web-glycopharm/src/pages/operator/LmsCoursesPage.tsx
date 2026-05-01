/**
 * Operator LMS Courses Page — GlycoPharm
 * WO-GLYCOPHARM-INSTRUCTOR-OPERATOR-V1
 *
 * GET /lms/courses (no status filter — admin view of all courses)
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BookOpen,
  Search,
  RefreshCw,
  Loader2,
  AlertCircle,
  Eye,
  EyeOff,
} from 'lucide-react';
import { DataTable } from '@o4o/ui';
import type { Column } from '@o4o/ui';
import { api } from '@/lib/apiClient';
import PageHeader from '@/components/common/PageHeader';

// ─── Types ───────────────────────────────────────────────────

interface CourseRow {
  id: string;
  title: string;
  status: string;
  isPublished: boolean;
  duration: number;
  createdAt: string;
  instructorId: string | null;
}

interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ─── Columns ─────────────────────────────────────────────────

const columns: Column<CourseRow>[] = [
  {
    key: 'title',
    header: '강의명',
    render: (row) => (
      <div>
        <p className="font-medium text-slate-800 truncate max-w-xs">{row.title}</p>
        <p className="text-xs text-slate-400">{row.id.slice(0, 8)}…</p>
      </div>
    ),
  },
  {
    key: 'isPublished',
    header: '공개',
    render: (row) => (
      <span className={`inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full font-medium ${
        row.isPublished
          ? 'bg-green-50 text-green-700'
          : 'bg-slate-100 text-slate-500'
      }`}>
        {row.isPublished
          ? <><Eye className="w-3 h-3" />공개</>
          : <><EyeOff className="w-3 h-3" />비공개</>
        }
      </span>
    ),
  },
  {
    key: 'duration',
    header: '시간',
    render: (row) => (
      <span className="text-sm text-slate-600">
        {row.duration > 0 ? `${row.duration}분` : '-'}
      </span>
    ),
  },
  {
    key: 'createdAt',
    header: '생성일',
    render: (row) => (
      <span className="text-sm text-slate-500">
        {new Date(row.createdAt).toLocaleDateString('ko-KR')}
      </span>
    ),
  },
];

// ─── Component ───────────────────────────────────────────────

export default function LmsCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [meta, setMeta] = useState<PaginationMeta>({ total: 0, page: 1, limit: 20, totalPages: 1 });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCourses = useCallback(async (currentPage = 1, searchStr = '') => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ page: String(currentPage), limit: '20' });
      if (searchStr) query.set('search', searchStr);
      const { data } = await api.get<{
        success: boolean;
        data: CourseRow[];
        meta: PaginationMeta;
      }>(`/lms/courses?${query.toString()}`);
      setCourses(data.data ?? []);
      if (data.meta) setMeta(data.meta);
    } catch {
      setError('강의 목록을 불러오지 못했습니다.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCourses(page, search);
  }, [fetchCourses, page, search]);

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPage(1);
    fetchCourses(1, search);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="강의 관리"
        subtitle={`총 ${meta.total}개 강의`}
        icon={<BookOpen className="w-6 h-6" />}
      />

      {/* Search */}
      <div className="bg-white rounded-2xl shadow-sm p-4">
        <form onSubmit={handleSearch} className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="강의 제목 검색..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-2 bg-primary-600 text-white rounded-xl text-sm font-medium hover:bg-primary-700 transition-colors"
          >
            검색
          </button>
          <button
            type="button"
            onClick={() => { setSearch(''); setPage(1); fetchCourses(1, ''); }}
            className="p-2 text-slate-500 hover:text-slate-700 transition-colors"
            title="새로고침"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary-500" />
          </div>
        ) : error ? (
          <div className="py-16 text-center">
            <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-3" />
            <p className="text-slate-600">{error}</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="py-16 text-center">
            <BookOpen className="w-10 h-10 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-500">등록된 강의가 없습니다.</p>
          </div>
        ) : (
          <DataTable
            columns={columns}
            data={courses}
            onRowClick={(row) => navigate(`/education/${row.id}`)}
          />
        )}
      </div>

      {/* Pagination */}
      {!loading && !error && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            이전
          </button>
          <span className="text-sm text-slate-500">
            {page} / {meta.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="px-4 py-2 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 disabled:opacity-40 hover:bg-slate-50 transition-colors"
          >
            다음
          </button>
        </div>
      )}
    </div>
  );
}
