/**
 * Patient List Page
 *
 * 환자 목록 화면 (약사 첫 진입 화면)
 * - 관리 우선순위 중심 UI
 * - 카드 요약 중심
 */

import React, { useState } from 'react';
import type { RiskLevel, PatientSummary } from '../../backend/dto/index.js';
import { usePatientList, useRiskPatients, useTodayCoachingPatients, useAlerts } from '../hooks/useCGMData.js';
import { PatientCard } from '../components/PatientCard.js';
import { RiskBadge } from '../components/RiskBadge.js';

interface PatientListPageProps {
  onPatientSelect?: (patientId: string) => void;
}

export const PatientListPage: React.FC<PatientListPageProps> = ({ onPatientSelect }) => {
  const [activeTab, setActiveTab] = useState<'risk' | 'all' | 'today'>('risk');
  const [riskFilter, setRiskFilter] = useState<RiskLevel | undefined>();
  const [searchQuery, setSearchQuery] = useState('');

  const { patients: riskPatients, isLoading: riskLoading } = useRiskPatients();
  const { patients: allPatients, total, isLoading: allLoading } = usePatientList({
    riskLevel: riskFilter,
    search: searchQuery,
    sortBy: 'riskLevel',
    sortOrder: 'desc',
  });
  const { patients: todayPatients, isLoading: todayLoading } = useTodayCoachingPatients();
  const { unacknowledgedCount } = useAlerts();

  const handlePatientClick = (patient: PatientSummary) => {
    onPatientSelect?.(patient.patient.id);
  };

  const renderPatientList = (patients: PatientSummary[], loading: boolean) => {
    if (loading) {
      return (
        <div className="flex justify-center items-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      );
    }

    if (patients.length === 0) {
      return (
        <div className="text-center py-12 text-gray-500">
          {activeTab === 'risk' ? '주의가 필요한 환자가 없습니다.' :
           activeTab === 'today' ? '오늘 예정된 상담이 없습니다.' :
           '조건에 맞는 환자가 없습니다.'}
        </div>
      );
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {patients.map((patient) => (
          <PatientCard
            key={patient.patient.id}
            patient={patient}
            onClick={() => handlePatientClick(patient)}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">CGM 환자 관리</h1>
        <p className="text-gray-500 mt-1">CGM 연동 환자의 혈당 관리 현황을 확인하세요.</p>
      </div>

      {/* 요약 카드 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-sm text-gray-500">전체 환자</div>
          <div className="text-2xl font-bold text-gray-900">{total}</div>
        </div>
        <div className="bg-red-50 rounded-lg border border-red-200 p-4">
          <div className="text-sm text-red-600">주의 필요</div>
          <div className="text-2xl font-bold text-red-700">
            {riskPatients.filter((p) => p.riskLevel === 'high').length}
          </div>
        </div>
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-4">
          <div className="text-sm text-yellow-600">관찰 필요</div>
          <div className="text-2xl font-bold text-yellow-700">
            {riskPatients.filter((p) => p.riskLevel === 'medium').length}
          </div>
        </div>
        <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
          <div className="text-sm text-blue-600">오늘 상담</div>
          <div className="text-2xl font-bold text-blue-700">{todayPatients.length}</div>
        </div>
      </div>

      {/* 미확인 알림 배너 */}
      {unacknowledgedCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-red-600 font-medium">⚠ 미확인 알림 {unacknowledgedCount}건</span>
            <span className="text-sm text-red-500">확인이 필요한 위험 알림이 있습니다.</span>
          </div>
          <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">
            알림 보기
          </button>
        </div>
      )}

      {/* 탭 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('risk')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'risk'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            주의 필요
            {riskPatients.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">
                {riskPatients.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('today')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'today'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            오늘 상담
            {todayPatients.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-600">
                {todayPatients.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`pb-3 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            전체 환자
          </button>
        </nav>
      </div>

      {/* 전체 탭일 때만 필터 표시 */}
      {activeTab === 'all' && (
        <div className="flex flex-wrap gap-4 mb-6">
          <input
            type="text"
            placeholder="환자 검색..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          <div className="flex gap-2">
            <button
              onClick={() => setRiskFilter(undefined)}
              className={`px-3 py-1 rounded-full text-sm ${
                !riskFilter ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              전체
            </button>
            <button
              onClick={() => setRiskFilter('high')}
              className={`px-3 py-1 rounded-full text-sm ${
                riskFilter === 'high' ? 'bg-red-600 text-white' : 'bg-red-50 text-red-700 hover:bg-red-100'
              }`}
            >
              고위험
            </button>
            <button
              onClick={() => setRiskFilter('medium')}
              className={`px-3 py-1 rounded-full text-sm ${
                riskFilter === 'medium' ? 'bg-yellow-600 text-white' : 'bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
              }`}
            >
              주의
            </button>
            <button
              onClick={() => setRiskFilter('normal')}
              className={`px-3 py-1 rounded-full text-sm ${
                riskFilter === 'normal' ? 'bg-green-600 text-white' : 'bg-green-50 text-green-700 hover:bg-green-100'
              }`}
            >
              정상
            </button>
          </div>
        </div>
      )}

      {/* 환자 목록 */}
      {activeTab === 'risk' && renderPatientList(riskPatients, riskLoading)}
      {activeTab === 'all' && renderPatientList(allPatients, allLoading)}
      {activeTab === 'today' && renderPatientList(todayPatients, todayLoading)}
    </div>
  );
};

export default PatientListPage;
