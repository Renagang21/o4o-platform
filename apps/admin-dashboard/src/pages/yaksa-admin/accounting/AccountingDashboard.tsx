/**
 * AccountingDashboard
 *
 * 회계 홈 화면
 *
 * === 정체성 ===
 * - "회계 프로그램"이 아닌 "사무국 장부"
 * - 지부/분회 사무실 운영비 관리
 */

import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Receipt,
  Lock,
  Download,
  Calculator,
} from 'lucide-react';

export function AccountingDashboard() {
  const menuItems = [
    {
      title: '지출 기록',
      description: '사무실 운영비 지출을 기록하고 관리합니다',
      icon: Receipt,
      path: '/admin/yaksa/accounting/expenses',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      title: '월 마감',
      description: '월별 지출을 마감하고 수정을 잠급니다',
      icon: Lock,
      path: '/admin/yaksa/accounting/close',
      color: 'bg-gray-50 text-gray-600',
    },
    {
      title: '집계 / 내보내기',
      description: '연간 집계 확인 및 총회 보고용 출력',
      icon: Download,
      path: '/admin/yaksa/accounting/export',
      color: 'bg-green-50 text-green-600',
    },
  ];

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <Link
          to="/admin/yaksa"
          className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          관리자 센터로 돌아가기
        </Link>
        <div className="flex items-center">
          <Calculator className="h-8 w-8 text-gray-400 mr-3" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">회계 (출납)</h1>
            <p className="text-gray-500 mt-1">
              사무실 운영비 지출을 기록하고 총회 보고용 자료를 관리합니다.
            </p>
          </div>
        </div>
      </div>

      {/* Info */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <p className="text-sm text-blue-700">
          <strong>안내:</strong> 이 시스템은 사무실 운영비(지출) 기록용입니다.
          수입(회비)은 회비 관리에서, 예산 관리는 별도로 진행해 주세요.
        </p>
      </div>

      {/* Menu Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {menuItems.map((item) => (
          <Link
            key={item.path}
            to={item.path}
            className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow"
          >
            <div className={`inline-flex p-3 rounded-lg ${item.color} mb-4`}>
              <item.icon className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              {item.title}
            </h2>
            <p className="text-sm text-gray-500">
              {item.description}
            </p>
          </Link>
        ))}
      </div>

      {/* Scope Reminder */}
      <div className="mt-8 p-4 bg-gray-50 border border-gray-200 rounded-lg">
        <h3 className="text-sm font-medium text-gray-700 mb-2">이 시스템이 지원하는 기능</h3>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>✓ 접대비/회의비, 일반관리비, 소모품비, 임원업무비 등 지출 기록</li>
          <li>✓ 월별 마감 (마감 후 수정 불가)</li>
          <li>✓ 카테고리별 집계</li>
          <li>✓ 총회 보고용 엑셀/PDF 출력</li>
        </ul>
        <h3 className="text-sm font-medium text-gray-700 mt-4 mb-2">이 시스템이 지원하지 않는 기능</h3>
        <ul className="text-sm text-gray-500 space-y-1">
          <li>✗ 복식부기 / 차변·대변</li>
          <li>✗ 예산 관리 / 예산 대비</li>
          <li>✗ 수입(회비) 입력</li>
          <li>✗ 세무 / 급여 / 원천세</li>
          <li>✗ 전자결재 워크플로우</li>
        </ul>
      </div>
    </div>
  );
}

export default AccountingDashboard;
