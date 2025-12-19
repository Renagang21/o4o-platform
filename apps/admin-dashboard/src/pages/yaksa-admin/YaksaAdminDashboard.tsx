/**
 * YaksaAdminDashboard
 *
 * Phase 1: 지부/분회 관리자 대시보드
 *
 * yaksa-admin은 데이터를 생성하지 않고,
 * 승인(Approve)과 조회(Read Only)만 한다.
 */

import { Link } from 'react-router-dom';
import {
  UserCheck,
  FileText,
  Users,
  GraduationCap,
  CreditCard,
  MessageSquare,
  ArrowRight,
} from 'lucide-react';

interface MenuCard {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  path: string;
  badge?: string;
  badgeColor?: string;
}

const MENU_CARDS: MenuCard[] = [
  {
    id: 'members',
    title: '회원 승인/현황',
    description: '신규 가입 회원 승인 및 회원 현황 조회',
    icon: <UserCheck className="h-8 w-8" />,
    path: '/admin/yaksa/members',
    badge: 'Approval',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'reports',
    title: '신상신고 승인',
    description: '제출된 신상신고서 검토 및 승인',
    icon: <FileText className="h-8 w-8" />,
    path: '/admin/yaksa/reports',
    badge: 'Approval',
    badgeColor: 'bg-blue-100 text-blue-700',
  },
  {
    id: 'officers',
    title: '임원 관리',
    description: '지부/분회 임원 역할 할당 및 관리',
    icon: <Users className="h-8 w-8" />,
    path: '/admin/yaksa/officers',
    badge: 'Assign',
    badgeColor: 'bg-purple-100 text-purple-700',
  },
  {
    id: 'education',
    title: '교육 이수 현황',
    description: '소속 회원 교육 이수 현황 조회',
    icon: <GraduationCap className="h-8 w-8" />,
    path: '/admin/yaksa/education',
    badge: 'READ ONLY',
    badgeColor: 'bg-gray-100 text-gray-600',
  },
  {
    id: 'fees',
    title: '회비 납부 현황',
    description: '소속 회원 회비 납부 현황 조회',
    icon: <CreditCard className="h-8 w-8" />,
    path: '/admin/yaksa/fees',
    badge: 'READ ONLY',
    badgeColor: 'bg-gray-100 text-gray-600',
  },
  {
    id: 'forum',
    title: '커뮤니티 바로가기',
    description: 'forum-yaksa 커뮤니티로 이동',
    icon: <MessageSquare className="h-8 w-8" />,
    path: '/admin/forum',
    badge: 'Link',
    badgeColor: 'bg-green-100 text-green-700',
  },
];

export function YaksaAdminDashboard() {
  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">지부/분회 관리자 센터</h1>
        <p className="text-gray-500 mt-1">
          소속 회원의 승인과 현황을 관리합니다.
        </p>
      </div>

      {/* Info Banner */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>관제 센터 원칙:</strong> yaksa-admin은 데이터를 생성하거나 편집하지 않습니다.
          각 서비스에 이미 존재하는 데이터를 승인하고 조회하는 역할만 수행합니다.
        </p>
      </div>

      {/* Menu Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {MENU_CARDS.map((card) => (
          <Link
            key={card.id}
            to={card.path}
            className="block p-6 bg-white border border-gray-200 rounded-lg hover:border-blue-300 hover:shadow-md transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-2 bg-gray-100 rounded-lg text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-600 transition-colors">
                {card.icon}
              </div>
              {card.badge && (
                <span className={`px-2 py-1 text-xs font-medium rounded ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {card.title}
            </h3>
            <p className="text-sm text-gray-500 mb-3">
              {card.description}
            </p>
            <div className="flex items-center text-blue-600 text-sm font-medium">
              바로가기
              <ArrowRight className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default YaksaAdminDashboard;
