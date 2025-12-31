import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPatients } from '../api/patients';
import type { PatientSummary, PatientStatus, TrendDirection } from '../types/patient';

/** 상태별 스타일 */
const STATUS_STYLES: Record<PatientStatus, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-100', text: 'text-green-800', label: '정상' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '주의' },
  risk: { bg: 'bg-red-100', text: 'text-red-800', label: '위험' },
};

/** 변화 방향별 스타일 */
const TREND_STYLES: Record<TrendDirection, { icon: string; text: string; label: string }> = {
  improving: { icon: '↗', text: 'text-green-600', label: '개선' },
  worsening: { icon: '↘', text: 'text-red-600', label: '악화' },
  stable: { icon: '→', text: 'text-gray-600', label: '유지' },
};

/** 상태 배지 컴포넌트 */
function StatusBadge({ status }: { status: PatientStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

/** 변화 방향 컴포넌트 */
function TrendIndicator({ trend }: { trend: TrendDirection }) {
  const style = TREND_STYLES[trend];
  return (
    <span className={`flex items-center gap-1 text-sm font-medium ${style.text}`}>
      <span className="text-lg">{style.icon}</span>
      {style.label}
    </span>
  );
}

/** 환자 카드 컴포넌트 */
function PatientCard({ patient }: { patient: PatientSummary }) {
  return (
    <Link
      to={`/patients/${patient.id}`}
      className="block bg-white rounded-lg shadow hover:shadow-md transition-shadow"
    >
      <div className="p-4">
        {/* 상단: 환자명 + 상태 */}
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900">{patient.alias}</h3>
          <StatusBadge status={patient.status} />
        </div>

        {/* 하단: 기간 + 변화 방향 */}
        <div className="flex items-center justify-between text-sm text-gray-500">
          <span>최근 {patient.periodDays}일</span>
          <TrendIndicator trend={patient.trend} />
        </div>
      </div>
    </Link>
  );
}

/** 우선순위 정렬: 위험 > 주의 > 정상, 악화 > 유지 > 개선 */
function sortByPriority(patients: PatientSummary[]): PatientSummary[] {
  const statusOrder: Record<PatientStatus, number> = { risk: 0, warning: 1, normal: 2 };
  const trendOrder: Record<TrendDirection, number> = { worsening: 0, stable: 1, improving: 2 };

  return [...patients].sort((a, b) => {
    // 상태 우선
    const statusDiff = statusOrder[a.status] - statusOrder[b.status];
    if (statusDiff !== 0) return statusDiff;

    // 변화 방향 차순
    return trendOrder[a.trend] - trendOrder[b.trend];
  });
}

export default function PatientListPage() {
  const [patients, setPatients] = useState<PatientSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPatients()
      .then((response) => {
        // 우선순위대로 정렬
        const sorted = sortByPriority(response.data);
        setPatients(sorted);
      })
      .catch((err) => {
        setError(err.message || '환자 목록을 불러오는데 실패했습니다.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  // 상태별 카운트
  const statusCounts = {
    risk: patients.filter((p) => p.status === 'risk').length,
    warning: patients.filter((p) => p.status === 'warning').length,
    normal: patients.filter((p) => p.status === 'normal').length,
  };

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">환자 목록</h1>
        <p className="mt-1 text-sm text-gray-500">
          최근 7일 기준 혈당 상태 요약
        </p>
      </div>

      {/* 상태 요약 */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-red-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-red-700">{statusCounts.risk}</div>
          <div className="text-sm text-red-600">위험</div>
        </div>
        <div className="bg-yellow-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-yellow-700">{statusCounts.warning}</div>
          <div className="text-sm text-yellow-600">주의</div>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <div className="text-2xl font-bold text-green-700">{statusCounts.normal}</div>
          <div className="text-sm text-green-600">정상</div>
        </div>
      </div>

      {/* 환자 리스트 */}
      {patients.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          등록된 환자가 없습니다.
        </div>
      ) : (
        <div className="space-y-3">
          {patients.map((patient) => (
            <PatientCard key={patient.id} patient={patient} />
          ))}
        </div>
      )}
    </div>
  );
}
