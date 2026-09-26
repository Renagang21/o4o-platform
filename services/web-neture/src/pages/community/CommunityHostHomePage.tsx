/**
 * community.neture.co.kr `/` — 커뮤니티 진입 (CHECK-O4O-URL-FIRST-CENSUS-V1 §21-10)
 *
 * 약사 · 소매업소 커뮤니티로 들어가는 주소 진입점이다. 현재 커뮤니티 활동(포럼)은 각 서비스
 * 앱이 제공하므로 `/pharmacist` · `/retail` 은 그 포럼으로 이어진다(HostBoundary).
 * 커뮤니티별 독립 가입 · 승인은 아직 없다 — 이 화면은 그 기능을 대신하지 않는다.
 */
import { Link } from 'react-router-dom';

const COMMUNITIES = [
  { path: '/pharmacist', title: '약사 커뮤니티', desc: '약사 회원이 함께 쓰는 포럼과 자료' },
  { path: '/retail', title: '소매업소 커뮤니티', desc: '소매업소 경영자가 함께 쓰는 포럼과 자료' },
];

export default function CommunityHostHomePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">O4O 커뮤니티</h1>
      <p className="mt-2 text-sm text-slate-600">참여할 커뮤니티를 선택하세요.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {COMMUNITIES.map((c) => (
          <Link
            key={c.path}
            to={c.path}
            className="block rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-slate-300 hover:shadow"
          >
            <div className="text-lg font-semibold text-slate-900">{c.title}</div>
            <div className="mt-1 text-sm text-slate-600">{c.desc}</div>
          </Link>
        ))}
      </div>
    </div>
  );
}
