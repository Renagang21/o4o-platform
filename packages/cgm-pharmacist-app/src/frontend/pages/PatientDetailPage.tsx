/**
 * Patient Detail Page
 *
 * 환자 상세 화면
 * - 최근 상태 요약
 * - 이전 대비 변화
 * - 관리 포인트 요약 (Insight)
 */

import React, { useState } from 'react';
import { usePatientDetail } from '../hooks/useCGMData.js';
import { CGMSummaryCard } from '../components/CGMSummaryCard.js';
import { InsightCard } from '../components/InsightCard.js';
import { AlertItem } from '../components/AlertItem.js';
import { RiskBadge } from '../components/RiskBadge.js';
import type { RiskLevel } from '../../backend/dto/index.js';

interface PatientDetailPageProps {
  patientId: string;
  onBack?: () => void;
  onStartCoaching?: () => void;
}

export const PatientDetailPage: React.FC<PatientDetailPageProps> = ({
  patientId,
  onBack,
  onStartCoaching,
}) => {
  const { data, isLoading, error } = usePatientDetail(patientId);
  const [activeTab, setActiveTab] = useState<'summary' | 'insights' | 'alerts' | 'history'>('summary');

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <p className="text-gray-500">환자 정보를 불러올 수 없습니다.</p>
          <button
            onClick={onBack}
            className="mt-4 px-4 py-2 bg-gray-100 text-gray-700 rounded hover:bg-gray-200"
          >
            목록으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  const { patient, cgmConnection, consent, cgmSummary, riskFlags, insights, recentCoachingSessions } = data;
  const unacknowledgedAlerts = riskFlags.filter((f) => !f.isAcknowledged);

  // 위험 레벨 계산
  const highRiskCount = riskFlags.filter((f) => f.severity === 'high' && !f.isAcknowledged).length;
  const mediumRiskCount = riskFlags.filter((f) => f.severity === 'medium' && !f.isAcknowledged).length;
  let riskLevel: RiskLevel = 'normal';
  if (highRiskCount > 0) riskLevel = 'high';
  else if (mediumRiskCount > 0) riskLevel = 'medium';
  else if (riskFlags.length > 0) riskLevel = 'low';

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="p-6">
      {/* 헤더 */}
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-gray-500 hover:text-gray-700 mb-4"
        >
          ← 목록으로
        </button>

        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{patient.displayName}</h1>
              <RiskBadge level={riskLevel} />
            </div>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span>{patient.age}세</span>
              <span>
                {patient.diabetesType === 'type1' ? '1형 당뇨' :
                 patient.diabetesType === 'type2' ? '2형 당뇨' :
                 patient.diabetesType === 'gestational' ? '임신성 당뇨' : '전당뇨'}
              </span>
              <span>등록일: {formatDate(patient.registeredAt)}</span>
            </div>
          </div>

          <button
            onClick={onStartCoaching}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            상담 시작
          </button>
        </div>
      </div>

      {/* CGM 연결 상태 */}
      <div className="bg-gray-50 rounded-lg p-4 mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span
              className={`w-3 h-3 rounded-full ${cgmConnection.isConnected ? 'bg-green-500' : 'bg-red-500'}`}
            />
            <div>
              <span className="font-medium text-gray-900">{cgmConnection.vendorDisplayName}</span>
              <span className="text-sm text-gray-500 ml-2">
                {cgmConnection.isConnected ? '연결됨' : '연결 끊김'}
              </span>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            마지막 동기화: {cgmConnection.lastSyncAt ? formatDate(cgmConnection.lastSyncAt) : '-'}
          </div>
        </div>
      </div>

      {/* 미확인 알림 */}
      {unacknowledgedAlerts.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <span className="text-red-600 font-medium">⚠ 확인 필요한 알림</span>
            <span className="text-sm text-red-500">{unacknowledgedAlerts.length}건</span>
          </div>
          <div className="space-y-2">
            {unacknowledgedAlerts.slice(0, 2).map((alert) => (
              <div key={alert.id} className="text-sm">
                <span className="font-medium text-red-700">{alert.title}</span>
                <span className="text-red-600 ml-2">{alert.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 탭 */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex gap-6">
          <button
            onClick={() => setActiveTab('summary')}
            className={`pb-3 border-b-2 font-medium text-sm ${
              activeTab === 'summary'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            CGM 요약
          </button>
          <button
            onClick={() => setActiveTab('insights')}
            className={`pb-3 border-b-2 font-medium text-sm ${
              activeTab === 'insights'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            인사이트
            {insights.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-600">
                {insights.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`pb-3 border-b-2 font-medium text-sm ${
              activeTab === 'alerts'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            알림
            {riskFlags.length > 0 && (
              <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-600">
                {riskFlags.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`pb-3 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            상담 이력
          </button>
        </nav>
      </div>

      {/* 탭 컨텐츠 */}
      {activeTab === 'summary' && (
        <div className="space-y-6">
          <CGMSummaryCard summary={cgmSummary} />

          {/* 주요 인사이트 요약 */}
          {insights.filter((i) => i.priority === 'high').length > 0 && (
            <div>
              <h3 className="font-semibold text-gray-900 mb-3">주요 관리 포인트</h3>
              <div className="space-y-3">
                {insights
                  .filter((i) => i.priority === 'high')
                  .map((insight) => (
                    <InsightCard key={insight.id} insight={insight} />
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-4">
          {insights.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              현재 분석된 인사이트가 없습니다.
            </div>
          ) : (
            insights.map((insight) => (
              <InsightCard key={insight.id} insight={insight} />
            ))
          )}
        </div>
      )}

      {activeTab === 'alerts' && (
        <div className="space-y-3">
          {riskFlags.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              발생한 알림이 없습니다.
            </div>
          ) : (
            riskFlags.map((alert) => (
              <AlertItem key={alert.id} alert={alert} />
            ))
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-4">
          {recentCoachingSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              상담 이력이 없습니다.
            </div>
          ) : (
            recentCoachingSessions.map((session) => (
              <div
                key={session.id}
                className="bg-white border border-gray-200 rounded-lg p-4"
              >
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <span className="font-medium text-gray-900">
                      {formatDate(session.sessionDate)}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      {session.type === 'initial' ? '초기 상담' :
                       session.type === 'followup' ? '추적 상담' :
                       session.type === 'urgent' ? '긴급 상담' : '정기 상담'}
                    </span>
                  </div>
                  <span
                    className={`px-2 py-1 rounded text-xs ${
                      session.status === 'completed'
                        ? 'bg-green-100 text-green-700'
                        : session.status === 'scheduled'
                        ? 'bg-blue-100 text-blue-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}
                  >
                    {session.status === 'completed' ? '완료' :
                     session.status === 'scheduled' ? '예정' :
                     session.status === 'cancelled' ? '취소' : '불참'}
                  </span>
                </div>

                {session.notes.filter((n) => !n.isPrivate).length > 0 && (
                  <div className="text-sm text-gray-600 mb-2">
                    {session.notes.filter((n) => !n.isPrivate)[0].content}
                  </div>
                )}

                {session.lifestyleSuggestions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {session.lifestyleSuggestions.map((s) => (
                      <span
                        key={s.id}
                        className={`px-2 py-0.5 rounded text-xs ${
                          s.isAccepted
                            ? 'bg-green-100 text-green-700'
                            : 'bg-gray-100 text-gray-600'
                        }`}
                      >
                        {s.title}
                      </span>
                    ))}
                  </div>
                )}

                <div className="text-xs text-gray-400 mt-2">
                  담당: {session.pharmacistName}
                  {session.duration && ` · ${session.duration}분`}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PatientDetailPage;
