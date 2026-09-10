/**
 * MyPageIndexPage — 회원 내 정보 · 해야 할 일
 * WO-O4O-KPA-BRANCH-IA-AND-NAVIGATION-FINALIZATION-V1 §3 · §5 · §10
 *
 * 회원 로그인 후 첫 화면이다. **새 통계 API 를 만들지 않는다** — 이미 있는 회원 축 조회
 * (신상신고 / 회비 / 연수교육 / 행사)를 그대로 호출해 상태만 요약한다.
 *
 * 각 축은 독립적으로 실패할 수 있다(원장이 아직 없는 분회 등). 하나가 실패해도 나머지는
 * 그린다 — 실패를 "정상 0건" 으로 삼키지 않고 '확인 불가' 로 구분해 표시한다.
 */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { getMyBranchHistory, listBranches, type BranchMembership } from '../lib/api/branch';
import { getAnnualReport, REPORT_STATUS_LABEL } from '../lib/api/annualReport';
import { listMyFees } from '../lib/api/branchFee';
import { listMyEducationCredits } from '../lib/api/educationCredit';
import { listMyEvents, type BranchEventItem } from '../lib/api/branchEvent';

type Cell = { tone: 'ok' | 'todo' | 'muted'; text: string };

const UNKNOWN: Cell = { tone: 'muted', text: '확인 불가' };

const TONE: Record<Cell['tone'], string> = {
  ok: 'bg-green-50 text-green-700',
  todo: 'bg-amber-50 text-amber-800',
  muted: 'bg-gray-100 text-gray-600',
};

export default function MyPageIndexPage({ slug, basePath }: { slug: string; basePath: string }) {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [affiliation, setAffiliation] = useState<{ membership: BranchMembership; name: string } | null | 'none'>(null);
  const [report, setReport] = useState<Cell | null>(null);
  const [fee, setFee] = useState<Cell | null>(null);
  const [education, setEducation] = useState<Cell | null>(null);
  const [events, setEvents] = useState<{ cell: Cell; next: BranchEventItem | null } | null>(null);

  useEffect(() => {
    // 비로그인 방문자에게 회원 조회를 쏘지 않는다 — 401 을 '확인 불가' 로 오인하게 만든다.
    if (isAuthLoading || !isAuthenticated) return;
    let alive = true;

    Promise.all([getMyBranchHistory(), listBranches()])
      .then(([history, list]) => {
        if (!alive) return;
        const current = history.find((h) => h.status === 'active') ?? null;
        if (!current) return setAffiliation('none');
        const name = list.find((b) => b.id === current.organizationId)?.name ?? current.organizationId;
        setAffiliation({ membership: current, name });
      })
      .catch(() => alive && setAffiliation('none'));

    getAnnualReport(slug)
      .then((s) => {
        if (!alive) return;
        if (!s.report) {
          setReport(
            s.period.canSubmit
              ? { tone: 'todo', text: `${s.template.year}년 미제출` }
              : { tone: 'muted', text: '신고 기간이 아닙니다' },
          );
          return;
        }
        const st = s.report.status;
        setReport({
          tone: st === 'approved' ? 'ok' : st === 'submitted' ? 'muted' : 'todo',
          text: `${s.template.year}년 ${REPORT_STATUS_LABEL[st]}`,
        });
      })
      .catch(() => alive && setReport(UNKNOWN));

    listMyFees(slug)
      .then((rows) => {
        if (!alive) return;
        if (rows.length === 0) return setFee({ tone: 'muted', text: '부과 내역 없음' });
        const outstanding = rows.reduce((sum, r) => sum + r.outstanding, 0);
        setFee(
          outstanding > 0
            ? { tone: 'todo', text: `미납 ${outstanding.toLocaleString('ko-KR')}원` }
            : { tone: 'ok', text: '미납 없음' },
        );
      })
      .catch(() => alive && setFee(UNKNOWN));

    listMyEducationCredits(slug)
      .then((rows) => {
        if (!alive) return;
        if (rows.length === 0) return setEducation({ tone: 'muted', text: '기록 없음' });
        const latest = rows.reduce((a, b) => (b.year > a.year ? b : a));
        setEducation(
          latest.status === 'incomplete'
            ? { tone: 'todo', text: `${latest.year}년 ${latest.remainingCredits}점 미이수` }
            : { tone: 'ok', text: `${latest.year}년 ${latest.status === 'exempt' ? '면제' : '이수완료'}` },
        );
      })
      .catch(() => alive && setEducation(UNKNOWN));

    listMyEvents(slug)
      .then((rows) => {
        if (!alive) return;
        const now = Date.now();
        const next =
          rows
            .filter((e) => e.status === 'published' && new Date(e.startsAt).getTime() >= now)
            .sort((a, b) => a.startsAt.localeCompare(b.startsAt))[0] ?? null;
        if (!next) return setEvents({ cell: { tone: 'muted', text: '예정된 행사 없음' }, next: null });
        setEvents({
          cell: next.myRsvp
            ? { tone: 'ok', text: '응답 완료' }
            : next.rsvpOpen
              ? { tone: 'todo', text: '참가 응답 필요' }
              : { tone: 'muted', text: '응답 마감' },
          next,
        });
      })
      .catch(() => alive && setEvents({ cell: UNKNOWN, next: null }));

    return () => {
      alive = false;
    };
  }, [slug, isAuthenticated, isAuthLoading]);

  if (isAuthLoading) return <p className="text-sm text-gray-500">확인 중입니다…</p>;
  if (!isAuthenticated) {
    return (
      <div className="py-12 text-sm">
        <p className="text-gray-700">로그인이 필요합니다.</p>
        <Link to="/login" className="mt-3 inline-block text-primary-700 hover:underline">로그인하기</Link>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-xl font-bold text-gray-900">내 정보</h1>
      </header>

      <section className="rounded border border-gray-200 p-4 text-sm">
        <h2 className="mb-2 font-semibold text-gray-900">현재 소속</h2>
        {affiliation === null && <p className="text-gray-500">확인 중입니다…</p>}
        {affiliation === 'none' && (
          <p className="text-gray-500">등록된 분회 소속이 없습니다. 분회 운영자에게 전입 등록을 요청하세요.</p>
        )}
        {affiliation && affiliation !== 'none' && (
          <p className="text-gray-800">
            {affiliation.name}
            <span className="ml-2 text-xs text-gray-500">
              {new Date(affiliation.membership.joinedAt).toLocaleDateString('ko-KR')} 전입
            </span>
          </p>
        )}
        <Link to="/me" className="mt-3 inline-block text-xs text-primary-700 hover:underline">
          소속 이력 보기
        </Link>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">해야 할 일</h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          <Card to={`${basePath}/mypage/annual-report`} title="신상신고" cell={report} />
          <Card to={`${basePath}/mypage/fees`} title="회비" cell={fee} />
          <Card to={`${basePath}/mypage/education`} title="연수교육" cell={education} />
          <Card
            to={`${basePath}/mypage/events`}
            title="행사 참가신청"
            cell={events?.cell ?? null}
            note={events?.next ? events.next.title : null}
          />
        </ul>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold text-gray-900">회원 전용 자료</h2>
        <Link to={`${basePath}/meetings`} className="text-sm text-primary-700 hover:underline">
          회의록 · 회의자료
        </Link>
      </section>
    </div>
  );
}

function Card({ to, title, cell, note }: { to: string; title: string; cell: Cell | null; note?: string | null }) {
  return (
    <li>
      <Link to={to} className="block rounded border border-gray-200 px-4 py-3 hover:border-primary-500 hover:bg-primary-50">
        <span className="flex items-center justify-between gap-2">
          <span className="font-medium text-gray-900">{title}</span>
          {cell ? (
            <span className={`shrink-0 rounded px-2 py-0.5 text-xs ${TONE[cell.tone]}`}>{cell.text}</span>
          ) : (
            <span className="shrink-0 text-xs text-gray-400">확인 중…</span>
          )}
        </span>
        {note && <span className="mt-1 block truncate text-xs text-gray-500">{note}</span>}
      </Link>
    </li>
  );
}
