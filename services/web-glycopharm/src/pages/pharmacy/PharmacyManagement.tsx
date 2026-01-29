/**
 * PharmacyManagement - 약국 경영 페이지
 *
 * KPA Society PharmacyPage 대시보드와 동일한 구조.
 * 단, "약국 경영 지원 서비스" 섹션은 제외.
 *
 * 섹션:
 * - PharmacySummary (약국 상태)
 * - ActiveServicesSection (경영 서비스)
 * - AvailableServicesSection (추가 서비스)
 * - PharmacyUtilitySection (안내)
 */

import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  Package,
  ShoppingCart,
  ClipboardList,
  Users,
  Monitor,
  BarChart3,
  ArrowRight,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface ManagementCard {
  title: string;
  description: string;
  icon: LucideIcon;
  href: string;
  status: string;
  statusType: 'active' | 'ready' | 'coming';
  ownerOnly?: boolean;
}

const activeServices: ManagementCard[] = [
  {
    title: '상품 관리',
    description: '약국 판매 상품 등록·가격·재고 관리',
    icon: Package,
    href: '/pharmacy/products',
    status: '운영중',
    statusType: 'active',
  },
  {
    title: 'B2B 구매',
    description: '공급자 연결 및 도매 상품 구매',
    icon: ShoppingCart,
    href: '/pharmacy/management/b2b',
    status: '이용 가능',
    statusType: 'active',
  },
  {
    title: '주문 관리',
    description: '접수·처리·배송 주문 상태 관리',
    icon: ClipboardList,
    href: '/pharmacy/orders',
    status: '운영중',
    statusType: 'active',
  },
  {
    title: '고객 관리',
    description: '약국 고객 정보 및 구매 이력',
    icon: Users,
    href: '/pharmacy/patients',
    status: '이용 가능',
    statusType: 'active',
    ownerOnly: true,
  },
];

const availableServices: ManagementCard[] = [
  {
    title: '디지털 사이니지',
    description: '매장 디지털 디스플레이 콘텐츠 관리',
    icon: Monitor,
    href: '/pharmacy/signage/library',
    status: '참여 가능',
    statusType: 'ready',
  },
  {
    title: '매출 분석',
    description: '약국 경영 현황 리포트 (예정)',
    icon: BarChart3,
    href: '/pharmacy/management',
    status: '준비중',
    statusType: 'coming',
    ownerOnly: true,
  },
];

const STATUS_CLASSES: Record<string, string> = {
  active: 'bg-emerald-50 text-emerald-700',
  ready: 'bg-primary-50 text-primary-700',
  coming: 'bg-slate-100 text-slate-400',
};

function ServiceCard({ card }: { card: ManagementCard }) {
  const isComing = card.statusType === 'coming';
  const Icon = card.icon;

  const content = (
    <>
      <div className="flex items-center justify-between mb-3">
        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
          <Icon className="w-5 h-5 text-slate-600" />
        </div>
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-md ${STATUS_CLASSES[card.statusType]}`}>
          {card.status}
        </span>
      </div>
      <h3 className="text-sm font-semibold text-slate-900 mb-1">{card.title}</h3>
      <p className="text-xs text-slate-500 leading-relaxed mb-3">{card.description}</p>
      {!isComing ? (
        <span className="text-xs font-semibold text-primary-600 flex items-center gap-1">
          바로가기 <ArrowRight className="w-3.5 h-3.5" />
        </span>
      ) : (
        <span className="text-xs text-slate-400">준비중</span>
      )}
    </>
  );

  if (isComing) {
    return (
      <div
        className={`block bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all opacity-60 cursor-default`}
      >
        {content}
      </div>
    );
  }

  return (
    <Link
      to={card.href}
      className={`block bg-white rounded-2xl border border-slate-200 shadow-sm p-5 transition-all hover:shadow-md hover:border-slate-300 cursor-pointer`}
      style={{ textDecoration: 'none' }}
    >
      {content}
    </Link>
  );
}

export default function PharmacyManagement() {
  const { user } = useAuth();

  // GlycoPharm에서는 pharmacy role = 약국 관리자로 간주
  const isOwner = true;
  const roleLabel = '개설약사';

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      {/* PharmacySummary */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b-2 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user?.name || '약국'}님의 약국
          </h1>
          <p className="text-sm text-slate-500 mt-1">약국 경영 지원 서비스</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-700">
            운영중
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-primary-50 text-primary-700">
            {roleLabel}
          </span>
          <span className="text-sm text-slate-700">{user?.name || '사용자'}님</span>
        </div>
      </div>

      {/* ActiveServicesSection - 경영 서비스 */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">경영 서비스</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {activeServices
            .filter((s) => !s.ownerOnly || isOwner)
            .map((card) => (
              <ServiceCard key={card.title} card={card} />
            ))}
        </div>
      </section>

      {/* AvailableServicesSection - 추가 서비스 */}
      <section>
        <h2 className="text-lg font-semibold text-slate-800 mb-4">추가 서비스</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {availableServices
            .filter((s) => !s.ownerOnly || isOwner)
            .map((card) => (
              <ServiceCard key={card.title} card={card} />
            ))}
        </div>
      </section>

      {/* PharmacyUtilitySection */}
      <div className="p-4 bg-slate-100 rounded-xl">
        <p className="text-sm text-slate-600 leading-relaxed">
          약국 운영에 필요한 서비스를 한 곳에서 관리하세요. 향후 추가 서비스가 제공됩니다.
        </p>
      </div>
    </div>
  );
}
