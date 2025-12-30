import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { glucoseviewApi } from '../services/glucoseviewApi';
import type { PatientDetail } from '../types';
import StatusBadge from '../components/StatusBadge';
import InsightCard from '../components/InsightCard';
import { ArrowLeft, Calendar, Activity, TrendingUp } from 'lucide-react';

export default function PatientDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const [patient, setPatient] = useState<PatientDetail | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriodIndex, setSelectedPeriodIndex] = useState(0);

    useEffect(() => {
        if (id) {
            loadPatientDetail(id);
        }
    }, [id]);

    const loadPatientDetail = async (patientId: string) => {
        try {
            setLoading(true);
            const data = await glucoseviewApi.getPatientDetail(patientId);
            setPatient(data);
        } catch (err) {
            setError('환자 정보를 불러오는데 실패했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">환자 정보를 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error || !patient) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error || '환자를 찾을 수 없습니다.'}</p>
                    <button
                        onClick={() => navigate('/patients')}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        환자 목록으로
                    </button>
                </div>
            </div>
        );
    }

    const currentSummary = patient.summaries[selectedPeriodIndex];
    const previousSummary = patient.summaries[selectedPeriodIndex + 1];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/patients')}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="w-6 h-6" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
                                <p className="text-gray-600 mt-1">
                                    등록일: {new Date(patient.registered_at).toLocaleDateString('ko-KR')}
                                </p>
                            </div>
                        </div>
                        {currentSummary && <StatusBadge status={currentSummary.status} />}
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Period Selector */}
                {patient.summaries.length > 1 && (
                    <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            분석 기간 선택
                        </label>
                        <select
                            value={selectedPeriodIndex}
                            onChange={(e) => setSelectedPeriodIndex(Number(e.target.value))}
                            className="w-full max-w-md px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {patient.summaries.map((summary, index) => (
                                <key = { index }
                  value = { index }
                                >
                  { new Date(summary.period_start).toLocaleDateString('ko-KR') } ~{ ' '}
                  { new Date(summary.period_end).toLocaleDateString('ko-KR') }
                  { index === 0 && ' (최근)'}
                        </option>
              ))}
                    </select>
          </div>
        )}

            {currentSummary ? (
                <>
                    {/* Summary Cards */}
                    <div className="grid md:grid-cols-3 gap-6 mb-8">
                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-gray-600">평균 혈당</h3>
                                <Activity className="w-5 h-5 text-indigo-600" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{currentSummary.avg_glucose}</p>
                            <p className="text-sm text-gray-500 mt-1">mg/dL</p>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-gray-600">목표 범위 시간</h3>
                                <TrendingUp className="w-5 h-5 text-green-600" />
                            </div>
                            <p className="text-3xl font-bold text-gray-900">{currentSummary.time_in_range}%</p>
                            <p className="text-sm text-gray-500 mt-1">
                                {currentSummary.time_above_range && `상승: ${currentSummary.time_above_range}%`}
                                {currentSummary.time_below_range && ` / 하강: ${currentSummary.time_below_range}%`}
                            </p>
                        </div>

                        <div className="bg-white p-6 rounded-lg shadow-sm border">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-sm font-medium text-gray-600">분석 기간</h3>
                                <Calendar className="w-5 h-5 text-blue-600" />
                            </div>
                            <p className="text-lg font-semibold text-gray-900">
                                {Math.ceil(
                                    (new Date(currentSummary.period_end).getTime() -
                                        new Date(currentSummary.period_start).getTime()) /
                                    (1000 * 60 * 60 * 24)
                                )}
                                일
                            </p>
                            <p className="text-sm text-gray-500 mt-1">
                                {new Date(currentSummary.period_start).toLocaleDateString('ko-KR', {
                                    month: 'short',
                                    day: 'numeric',
                                })}{' '}
                                ~{' '}
                                {new Date(currentSummary.period_end).toLocaleDateString('ko-KR', {
                                    month: 'short',
                                    day: 'numeric',
                                })}
                            </p>
                        </div>
                    </div>

                    {/* Period Summary */}
                    <div className="bg-white p-6 rounded-lg shadow-sm border mb-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-3">기간 요약</h3>
                        <p className="text-gray-700 leading-relaxed">
                            {currentSummary.summary_text || '요약 정보가 없습니다.'}
                        </p>
                    </div>

                    {/* Comparison with Previous Period */}
                    {previousSummary && (
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-lg border border-blue-200 mb-8">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">이전 기간 대비 변화</h3>
                            <div className="grid md:grid-cols-3 gap-4">
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">평균 혈당</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-gray-900">
                                            {currentSummary.avg_glucose}
                                        </span>
                                        <span
                                            className={`text-sm font-medium ${currentSummary.avg_glucose < previousSummary.avg_glucose
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                }`}
                                        >
                                            {currentSummary.avg_glucose < previousSummary.avg_glucose ? '↓' : '↑'}
                                            {Math.abs(currentSummary.avg_glucose - previousSummary.avg_glucose)}
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">목표 범위 시간</p>
                                    <div className="flex items-baseline gap-2">
                                        <span className="text-2xl font-bold text-gray-900">
                                            {currentSummary.time_in_range}%
                                        </span>
                                        <span
                                            className={`text-sm font-medium ${currentSummary.time_in_range > previousSummary.time_in_range
                                                    ? 'text-green-600'
                                                    : 'text-red-600'
                                                }`}
                                        >
                                            {currentSummary.time_in_range > previousSummary.time_in_range ? '↑' : '↓'}
                                            {Math.abs(currentSummary.time_in_range - previousSummary.time_in_range)}%
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <p className="text-sm text-gray-600 mb-1">상태 변화</p>
                                    <div className="flex items-center gap-2">
                                        <StatusBadge status={previousSummary.status} className="text-xs" />
                                        <span className="text-gray-400">→</span>
                                        <StatusBadge status={currentSummary.status} className="text-xs" />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Insights */}
                    <div>
                        <h3 className="text-xl font-semibold text-gray-900 mb-4">인사이트 및 패턴</h3>
                        {patient.insights.length === 0 ? (
                            <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
                                인사이트가 아직 생성되지 않았습니다.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {patient.insights.map((insight) => (
                                    <InsightCard key={insight.id} insight={insight} />
                                ))}
                            </div>
                        )}
                    </div>
                </>
            ) : (
                <div className="bg-white p-8 rounded-lg shadow-sm border text-center text-gray-500">
                    이 환자에 대한 분석 데이터가 없습니다.
                </div>
            )}
        </div>
    </div >
  );
}
