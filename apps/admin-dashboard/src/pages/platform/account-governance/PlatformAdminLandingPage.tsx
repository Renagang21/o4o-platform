import { Link } from 'react-router-dom';
import { Users, UserCog, ArrowRight } from 'lucide-react';

const CARDS = [
  { icon: UserCog, title: '전체 관리자 계정', description: '관리자 계정을 조회하고 활성 상태를 관리합니다.', to: '/settings/admin-accounts' },
  { icon: Users, title: '사용자 조회', description: '전체 계정 현황을 확인합니다. 서비스별 회원·이용 업무는 해당 서비스에서 처리합니다.', to: '/admin/platform/users' },
  { icon: UserCog, title: '서비스 관리자·운영자', description: '서비스별 관리자와 운영자를 지정하거나 권한을 해제합니다.', to: '/operators' },
];

export default function PlatformAdminLandingPage() {
  return (
    <div>
      <h1 className="text-xl font-bold text-slate-900 mb-2">O4O 플랫폼 관리</h1>
      <p className="text-sm text-slate-500 mb-6">플랫폼 계정과 서비스 운영 권한을 관리합니다.</p>
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
