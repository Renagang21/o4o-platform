import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Building2,
  Shield,
  UserCircle,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import type { UserRole } from '@/types';

// 이 서비스에서 사용 가능한 역할 (공급자/파트너는 Neture에서 관리)
const roleOptions: Array<{ role: UserRole; label: string; description: string; icon: typeof Building2; color: string }> = [
  {
    role: 'pharmacy',
    label: '약사',
    description: '약국 운영, 상품 판매, 고객 관리',
    icon: Building2,
    color: 'primary',
  },
  {
    role: 'operator',
    label: '운영자',
    description: '플랫폼 운영, 회원 관리, 시스템 설정',
    icon: Shield,
    color: 'red',
  },
  {
    role: 'consumer',
    label: '소비자',
    description: '약국 매장에서 제품 구매',
    icon: UserCircle,
    color: 'green',
  },
];

export default function RoleSelectPage() {
  const navigate = useNavigate();
  const { selectRole, user } = useAuth();

  const handleRoleSelect = (role: UserRole) => {
    selectRole(role);

    // Navigate to role-specific dashboard
    const dashboardPaths: Record<UserRole, string> = {
      pharmacy: '/pharmacy',
      supplier: '/supplier',
      partner: '/partner',
      operator: '/operator',
      consumer: '/',
    };

    navigate(dashboardPaths[role]);
  };

  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-800">역할 선택</h1>
          <p className="text-slate-500 mt-2">
            {user?.name}님, 어떤 역할로 접속하시겠습니까?
          </p>
        </div>

        <div className="grid gap-4">
          {roleOptions.map((option) => {
            const Icon = option.icon;
            return (
              <button
                key={option.role}
                onClick={() => handleRoleSelect(option.role)}
                className="w-full p-6 bg-white border-2 rounded-2xl text-left hover:border-primary-500 hover:shadow-lg transition-all group flex items-center gap-4"
              >
                <div className={`w-14 h-14 rounded-xl bg-${option.color}-100 flex items-center justify-center flex-shrink-0`}>
                  <Icon className={`w-7 h-7 text-${option.color}-600`} />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg text-slate-800">{option.label}</h3>
                  <p className="text-sm text-slate-500">{option.description}</p>
                </div>
                <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-primary-600 group-hover:translate-x-1 transition-all" />
              </button>
            );
          })}
        </div>

        {/* Neture 안내 */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200">
          <p className="text-sm text-slate-600 text-center">
            공급자/파트너 역할은{' '}
            <a
              href="https://neture.co.kr"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-primary-600 font-medium hover:underline"
            >
              Neture 플랫폼
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            에서 관리됩니다.
          </p>
        </div>
      </div>
    </div>
  );
}
