/**
 * ContentSurveysPage — /content/surveys
 *
 * WO-KPA-CONTENT-SURVEYS-LIST-V1
 * WO-O4O-SURVEY-CORE-PHASE1-V1: O4O 공통 Survey API 연결, 실제 목록 활성화
 * WO-O4O-CONTENT-LIST-CANONICAL-TABLE-ALIGN-V1:
 *   - 카드 그리드 → 테이블 형식으로 전환
 *   - 설문조사는 "참여형 기능" — 내 자료함 가져가기 제외 (checkbox/ActionBar 없음)
 *   - 검색 + 페이지네이션 유지
 *
 * 콘텐츠 허브의 "설문조사" 전용 목록.
 * 데이터: participationApi.getParticipationSets (내부적으로 /api/v1/surveys?serviceKey=kpa-society 호출)
 *
 * 행 클릭 분기 (ParticipationListPage 패턴 준수):
 *   - ACTIVE → /participation/${id}/respond
 *   - DRAFT/CLOSED → /participation/${id}/results
 */

import { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { participationApi } from '../../api/participation';
import type { ParticipationSet } from '../participation/types';
import { ParticipationStatus } from '../participation/types';
import { useAuth } from '../../contexts/AuthContext';
import { BaseTable, type O4OColumn } from '@o4o/ui';

const PAGE_LIMIT = 20;

const STATUS_LABEL: Record<string, string> = {
  [ParticipationStatus.ACTIVE]: '진행중',
  [ParticipationStatus.DRAFT]: '초안',
  [ParticipationStatus.CLOSED]: '종료',
};

function statusBadgeClass(status: string) {
  if (status === ParticipationStatus.ACTIVE) return 'inline-block px-2 py-0.5 text-[11px] font-semibold rounded bg-emerald-50 text-emerald-700';
  if (status === ParticipationStatus.CLOSED) return 'inline-block px-2 py-0.5 text-[11px] font-semibold rounded bg-red-50 text-red-700';
  return 'inline-block px-2 py-0.5 text-[11px] font-semibold rounded bg-slate-100 text-slate-500';
}

function formatDate(d: string | Date | null | undefined) {
  if (!d) return '-';
  try { return new Date(d).toLocaleDateString('ko-KR'); } catch { return '-'; }
}

function targetForSurvey(set: ParticipationSet): string {
  return set.status === ParticipationStatus.ACTIVE
    ? `/participation/${set.id}/respond`
    : `/participation/${set.id}/results`;
}

export function ContentSurveysPage() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentPage = parseInt(searchParams.get('page') || '1', 10);
  const currentSearch = searchParams.get('search') || '';

  const [surveys, setSurveys] = useState<ParticipationSet[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(currentSearch);

  const load = useCallback((pageNum: number, search: string) => {
    setLoading(true);
    setError(null);
    participationApi.getParticipationSets({ page: pageNum, limit: PAGE_LIMIT, search: search || undefined })
      .then((res) => {
        setSurveys(Array.isArray(res.data) ? res.data : []);
        setTotal(typeof res.total === 'number' ? res.total : 0);
      })
      .catch((e: any) => {
        setError(e?.message || '설문조사를 불러오지 못했습니다.');
        setSurveys([]);
        setTotal(0);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load(currentPage, currentSearch);
  }, [load, currentPage, currentSearch]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (searchInput) next.set('search', searchInput); else next.delete('search');
      next.delete('page');
      return next;
    });
  }

  function goPage(p: number) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('page', String(p));
      return next;
    });
  }

  const columns: O4OColumn<ParticipationSet>[] = [
    {
      key: 'title',
      header: '제목',
      render: (_v, row) => (
        <span className="font-semibold text-sm text-slate-800">{row.title}</span>
      ),
    },
    {
      key: 'status',
      header: '상태',
      width: '80px',
      render: (val) => (
        <span className={statusBadgeClass(val)}>
          {STATUS_LABEL[val] ?? val}
        </span>
      ),
    },
    {
      key: 'questions',
      header: '질문수',
      width: '70px',
      align: 'center',
      render: (_v, row) => (
        <span className="text-[13px] text-slate-400">{row.questions?.length ?? 0}</span>
      ),
    },
    {
      key: 'createdAt',
      header: '등록일',
      width: '100px',
      render: (val) => <span className="text-[13px] text-slate-400">{formatDate(val)}</span>,
    },
  ];

  return (
    <div className="max-w-[1100px] mx-auto px-4 pt-8 pb-16">
      {/* Header */}
      <header className="flex items-end justify-between mb-6 gap-3 flex-wrap">
        <div>
          <Link to="/content" className="text-[13px] text-slate-500 no-underline mb-2 inline-block hover:underline">
            ← 콘텐츠 허브
          </Link>
          <h1 className="text-2xl font-bold text-slate-900 mb-1 mt-0">설문조사</h1>
          <p className="text-[15px] text-slate-500 m-0">구성원 의견을 수집하는 설문 목록입니다.</p>
        </div>
        {isAuthenticated && (
          <Link
            to="/content/surveys/new"
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-primary text-white text-sm font-semibold rounded-lg no-underline whitespace-nowrap"
          >
            설문 등록
          </Link>
        )}
      </header>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2 mb-4">
        <input
          type="text"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="설문 제목 검색..."
          className="flex-1 px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="submit"
          className="px-4 py-2 text-sm font-semibold text-white bg-primary rounded-lg whitespace-nowrap"
        >
          검색
        </button>
        {currentSearch && (
          <button
            type="button"
            onClick={() => {
              setSearchInput('');
              setSearchParams((prev) => {
                const next = new URLSearchParams(prev);
                next.delete('search');
                next.delete('page');
                return next;
              });
            }}
            className="px-3 py-2 text-sm text-slate-500 border border-slate-200 rounded-lg"
          >
            초기화
          </button>
        )}
      </form>

      {error && (
        <div className="px-3 py-2.5 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
        {loading ? (
          <div className="py-12 text-sm text-slate-400 text-center">불러오는 중...</div>
        ) : (
          <BaseTable<ParticipationSet>
            columns={columns}
            data={surveys}
            rowKey={(row) => row.id}
            onRowClick={(row) => navigate(targetForSurvey(row))}
            emptyMessage={
              <div className="py-12 text-sm text-slate-400 text-center">
                {currentSearch ? `"${currentSearch}"에 해당하는 설문이 없습니다.` : '아직 등록된 설문이 없습니다.'}
                {!currentSearch && isAuthenticated && (
                  <div className="mt-2">
                    <Link to="/content/surveys/new" className="text-primary font-semibold no-underline hover:underline">
                      첫 설문 만들기 →
                    </Link>
                  </div>
                )}
              </div>
            }
          />
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center items-center gap-4 mt-5">
          <button
            onClick={() => goPage(Math.max(1, currentPage - 1))}
            disabled={currentPage <= 1}
            className="px-3.5 py-1.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            « 이전
          </button>
          <span className="text-[13px] text-slate-500">{currentPage} / {totalPages}</span>
          <button
            onClick={() => goPage(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="px-3.5 py-1.5 text-[13px] font-medium text-slate-600 bg-white border border-slate-200 rounded-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            다음 »
          </button>
        </div>
      )}
    </div>
  );
}

export default ContentSurveysPage;
