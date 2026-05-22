/**
 * HomeLatestPage — 최신 활동 전체 보기
 * WO-O4O-KPA-HOME-LATEST-ACTIVITY-SECTION-V1
 */

import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { homeApi, type LatestItem } from '../api/home';

const TABS = [
  { key: 'all',      label: '전체' },
  { key: 'forum',    label: '포럼' },
  { key: 'course',   label: '강의' },
  { key: 'content',  label: '콘텐츠' },
  { key: 'signage',  label: '사이니지' },
  { key: 'resource', label: '자료실' },
] as const;

const TYPE_BADGE: Record<string, { label: string; cls: string }> = {
  forum:    { label: '포럼',     cls: 'bg-blue-100 text-blue-700' },
  course:   { label: '강의',     cls: 'bg-purple-100 text-purple-700' },
  content:  { label: '콘텐츠',   cls: 'bg-emerald-100 text-emerald-700' },
  resource: { label: '자료실',   cls: 'bg-amber-100 text-amber-700' },
  signage:  { label: '사이니지', cls: 'bg-rose-100 text-rose-700' },
};

export function HomeLatestPage() {
  const [items, setItems] = useState<LatestItem[]>([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await homeApi.getLatest({ type: tab, limit: 50 });
      setItems(res.data ?? []);
    } catch {
      setError('불러오기 실패');
    } finally {
      setLoading(false);
    }
  }, [tab]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* 헤더 */}
      <div className="mb-6">
        <Link to="/" className="text-sm text-slate-500 hover:text-slate-700 no-underline">← 홈으로</Link>
        <div className="flex items-center justify-between mt-2">
          <h1 className="text-2xl font-bold text-slate-800 m-0">최신 활동</h1>
          <button
            onClick={load}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded hover:bg-slate-50 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            새로고침
          </button>
        </div>
      </div>

      {/* 탭 필터 */}
      <div className="flex gap-2 flex-wrap mb-6">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              tab === t.key
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* 에러 */}
      {error && (
        <div className="flex items-center gap-2 p-3 mb-4 bg-red-50 text-red-700 text-sm rounded">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* 테이블 */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-16 text-slate-400">등록된 활동이 없습니다</div>
      ) : (
        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
          {/* 테이블 헤더 */}
          <div className="hidden sm:grid grid-cols-[100px_1fr_120px_100px] gap-4 px-4 py-3 bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wide">
            <span>종류</span>
            <span>제목</span>
            <span>작성자</span>
            <span>등록일</span>
          </div>
          {/* 행 */}
          {items.map((item) => {
            const badge = TYPE_BADGE[item.type];
            const date = new Date(item.createdAt).toLocaleDateString('ko-KR');
            return (
              <Link
                key={`${item.type}-${item.id}`}
                to={item.href}
                className="flex flex-col sm:grid sm:grid-cols-[100px_1fr_120px_100px] gap-1 sm:gap-4 sm:items-center px-4 py-3 border-b border-slate-100 last:border-b-0 hover:bg-slate-50 transition-colors no-underline group"
              >
                <span className={`inline-block w-fit px-2 py-0.5 text-xs font-semibold rounded ${badge?.cls ?? 'bg-slate-100 text-slate-600'}`}>
                  {badge?.label ?? item.type}
                </span>
                <span className="font-medium text-slate-800 group-hover:text-blue-600 transition-colors line-clamp-1">
                  {item.title}
                </span>
                <span className="text-sm text-slate-400 truncate">{item.authorName ?? '-'}</span>
                <span className="text-sm text-slate-400">{date}</span>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default HomeLatestPage;
