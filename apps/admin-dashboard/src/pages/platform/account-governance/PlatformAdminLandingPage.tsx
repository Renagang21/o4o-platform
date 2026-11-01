import { Link } from 'react-router-dom';
import { Users, UserCog, ArrowRight } from 'lucide-react';

const CARDS = [
  { icon: UserCog, title: '업무 운영', description: '위임받은 직영 서비스의 회원·약국·강의·문의 업무를 처리합니다.', to: '/operations' },
  { icon: UserCog, title: '전체 관리자 계정', description: '관리자 계정을 조회하고 활성 상태를 관리합니다.', to: '/settings/admin-accounts' },
  { icon: Users, title: '사용자 조회', description: '전체 계정 현황을 확인합니다. 일상업무는 업무 운영, 독립 사업 업무는 해당 사업에서 처리합니다.', to: '/admin/platform/users' },
  { icon: UserCog, title: '서비스 관리자', description: '각 서비스 Admin의 초대·해제를 관리합니다.', to: '/operators' },
];

export default function PlatformAdminLandingPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">O4O 플랫폼 관리</h1>
      <p className="text-sm text-slate-500 mb-6">플랫폼 계정과 서비스 운영 권한을 관리합니다.</p>
      <section aria-labelledby="central-assignment-title" className="mb-6 rounded-xl border border-blue-200 bg-blue-50 p-5">
        <h2 id="central-assignment-title" className="font-semibold text-slate-900">업무 운영자 지정</h2>
        <p className="mt-2 text-sm text-slate-700">관리자 사이트에서 일상업무를 처리할 업무 운영자를 초대합니다. 본인 수락 후 Google 로그인으로 업무 운영을 이용할 수 있습니다.</p>
        <p className="mt-2 text-sm text-slate-600">전체 관리자는 관리자 사이트 전체와 업무 운영을 모두 이용합니다. 업무 운영자는 지정된 일상업무만 처리하며 서비스 Admin으로 지정되지 않습니다.</p>
        <Link to="/admin/operations-operators" className="mt-4 inline-flex rounded-lg bg-blue-700 px-4 py-2 text-sm font-medium text-white no-underline">업무 운영자 지정</Link>
      </section>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {CARDS.map(({ icon: Icon, title, description, to }) => (
          <Link key={to} to={to} className="group block rounded-xl bg-white border border-slate-200 shadow-sm p-5 hover:border-slate-400 no-underline">
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5 text-slate-600" />
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </div>
            <h2 className="font-semibold text-slate-800 mb-1">{title}</h2>
            <p className="text-xs text-slate-500 leading-relaxed">{description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
