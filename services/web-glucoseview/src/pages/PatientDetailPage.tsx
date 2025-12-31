import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { fetchPatientDetail } from '../api/patients';
import type {
  PatientDetail,
  PatientStatus,
  TrendDirection,
  PatientInsight,
  InsightType,
} from '../types/patient';

// ============================================================================
// 스타일 정의
// ============================================================================

const STATUS_STYLES: Record<PatientStatus, { bg: string; text: string; label: string }> = {
  normal: { bg: 'bg-green-100', text: 'text-green-800', label: '정상' },
  warning: { bg: 'bg-yellow-100', text: 'text-yellow-800', label: '주의' },
  risk: { bg: 'bg-red-100', text: 'text-red-800', label: '위험' },
};

const TREND_STYLES: Record<TrendDirection, { icon: string; text: string; bg: string; label: string }> = {
  improving: { icon: '↗', text: 'text-green-700', bg: 'bg-green-50', label: '개선' },
  worsening: { icon: '↘', text: 'text-red-700', bg: 'bg-red-50', label: '악화' },
  stable: { icon: '→', text: 'text-gray-700', bg: 'bg-gray-50', label: '유지' },
};

const INSIGHT_TYPE_LABELS: Record<InsightType, { icon: string; label: string }> = {
  meal_pattern: { icon: '🍽', label: '식후 패턴' },
  nocturnal_pattern: { icon: '🌙', label: '야간 패턴' },
  improvement: { icon: '📈', label: '개선 관찰' },
  pharmacist_comment: { icon: '💊', label: '약사 메모' },
};

// ============================================================================
// 컴포넌트
// ============================================================================

/** 상태 배지 */
function StatusBadge({ status }: { status: PatientStatus }) {
  const style = STATUS_STYLES[status];
  return (
    <span className={`px-3 py-1 text-sm font-semibold rounded-full ${style.bg} ${style.text}`}>
      {style.label}
    </span>
  );
}

/** Section 1: 기간 요약 */
function PeriodSummarySection({ patient }: { patient: PatientDetail }) {
  const { currentSummary } = patient;

  // 날짜 포맷
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  const periodLabel = `${formatDate(currentSummary.periodStart)} ~ ${formatDate(currentSummary.periodEnd)}`;

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">기간 요약</h2>
        <StatusBadge status={currentSummary.status} />
      </div>

      <div className="text-sm text-gray-500 mb-3">
        기준 기간: {periodLabel}
      </div>

      <p className="text-gray-800 leading-relaxed">
        {currentSummary.summaryText}
      </p>
    </section>
  );
}

/** Section 2: 인사이트 카드 */
function InsightCard({ insight }: { insight: PatientInsight }) {
  const typeInfo = INSIGHT_TYPE_LABELS[insight.type];

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{typeInfo.icon}</span>
        <span className="text-sm font-medium text-gray-700">{typeInfo.label}</span>
      </div>
      <p className="text-gray-800 text-sm leading-relaxed">
        {insight.description}
      </p>
    </div>
  );
}

function InsightsSection({ insights }: { insights: PatientInsight[] }) {
  // 최대 3개만 표시
  const displayInsights = insights.slice(0, 3);

  return (
    <section className="bg-white rounded-lg shadow p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">주요 관찰 사항</h2>

      {displayInsights.length === 0 ? (
        <p className="text-gray-500 text-sm">관찰된 패턴이 없습니다.</p>
      ) : (
        <div className="space-y-3">
          {displayInsights.map((insight) => (
            <InsightCard key={insight.id} insight={insight} />
          ))}
        </div>
      )}
    </section>
  );
}

/** Section 3: 이전 대비 변화 */
function ComparisonSection({ patient }: { patient: PatientDetail }) {
  const { comparison } = patient;

  if (!comparison) {
    return null;
  }

  const trendStyle = TREND_STYLES[comparison.trend];

  return (
    <section className={`rounded-lg shadow p-6 ${trendStyle.bg}`}>
      <h2 className="text-lg font-semibold text-gray-900 mb-4">이전 대비 변화</h2>

      <div className="flex items-center gap-3 mb-3">
        <span className={`text-2xl font-bold ${trendStyle.text}`}>
          {trendStyle.icon}
        </span>
        <span className={`text-lg font-semibold ${trendStyle.text}`}>
          {trendStyle.label}
        </span>
      </div>

      <div className="text-sm text-gray-600 mb-3">
        {comparison.previousPeriod} → {comparison.currentPeriod}
      </div>

      <p className="text-gray-800 leading-relaxed">
        {comparison.description}
      </p>
    </section>
  );
}

// ============================================================================
// 메인 페이지
// ============================================================================

export default function PatientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [patient, setPatient] = useState<PatientDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;

    fetchPatientDetail(id)
      .then((data) => {
        if (!data) {
          setError('환자 정보를 찾을 수 없습니다.');
        } else {
          setPatient(data);
        }
      })
      .catch((err) => {
        setError(err.message || '환자 정보를 불러오는데 실패했습니다.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="text-gray-500">로딩 중...</div>
      </div>
    );
  }

  if (error || !patient) {
    return (
      <div>
        <div className="mb-6">
          <Link to="/patients" className="text-blue-600 hover:text-blue-800 text-sm">
            ← 환자 목록으로
          </Link>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || '환자 정보를 찾을 수 없습니다.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* 헤더 */}
      <div className="mb-6">
        <Link to="/patients" className="text-blue-600 hover:text-blue-800 text-sm">
          ← 환자 목록으로
        </Link>
      </div>

      {/* 환자 정보 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">{patient.alias}</h1>
        <p className="text-sm text-gray-500 mt-1">
          등록일: {new Date(patient.registeredAt).toLocaleDateString('ko-KR')}
        </p>
      </div>

      {/* 3개 섹션 */}
      <div className="space-y-6">
        {/* Section 1: 기간 요약 */}
        <PeriodSummarySection patient={patient} />

        {/* Section 2: 인사이트 카드 */}
        <InsightsSection insights={patient.insights} />

        {/* Section 3: 이전 대비 변화 */}
        <ComparisonSection patient={patient} />
      </div>
    </div>
  );
}
