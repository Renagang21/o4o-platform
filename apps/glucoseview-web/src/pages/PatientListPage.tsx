import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { glucoseviewApi } from '../services/glucoseviewApi';
import type { PatientWithSummary } from '../types';
import StatusBadge from '../components/StatusBadge';
import TrendIndicator from '../components/TrendIndicator';
import { Eye, Search, Users } from 'lucide-react';

export default function PatientListPage() {
    const [patients, setPatients] = useState<PatientWithSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadPatients();
    }, []);

    const loadPatients = async () => {
        try {
            setLoading(true);
            const data = await glucoseviewApi.getPatients();
            setPatients(data);
        } catch (err) {
            setError('환자 목록을 불러오는데 실패했습니다.');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const filteredPatients = patients.filter((patient) =>
        patient.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const getTrend = (patient: PatientWithSummary): 'improving' | 'stable' | 'worsening' => {
        if (!patient.latest_summary) return 'stable';

        // Simple heuristic: based on status
        if (patient.latest_summary.status === 'normal') return 'improving';
        if (patient.latest_summary.status === 'risk') return 'worsening';
        return 'stable';
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">환자 목록을 불러오는 중...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-red-600 mb-4">{error}</p>
                    <button
                        onClick={loadPatients}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                    >
                        다시 시도
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">환자 목록</h1>
                            <p className="text-gray-600 mt-1">CGM 혈당 분석이 필요한 환자들을 관리하세요</p>
                        </div>
                        <Link
                            to="/"
                            className="px-4 py-2 text-indigo-600 hover:text-indigo-700 font-medium"
                        >
                            홈으로
                        </Link>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                {/* Search Bar */}
                <div className="mb-6">
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="환자 이름으로 검색..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                    </div>
                </div>

                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">전체 환자</p>
                                <p className="text-3xl font-bold text-gray-900 mt-1">{patients.length}</p>
                            </div>
                            <Users className="w-12 h-12 text-indigo-600" />
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">주의 필요</p>
                                <p className="text-3xl font-bold text-yellow-600 mt-1">
                                    {patients.filter((p) => p.latest_summary?.status === 'warning').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">⚠️</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white p-6 rounded-lg shadow-sm border">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm text-gray-600">위험</p>
                                <p className="text-3xl font-bold text-red-600 mt-1">
                                    {patients.filter((p) => p.latest_summary?.status === 'risk').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <span className="text-2xl">🚨</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Patient Table */}
                <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50 border-b">
                            <tr>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">환자명</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">상태</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">최근 기간</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">변화</th>
                                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-900">요약</th>
                                <th className="px-6 py-4 text-center text-sm font-semibold text-gray-900">작업</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                            {filteredPatients.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                                        {searchQuery ? '검색 결과가 없습니다.' : '등록된 환자가 없습니다.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredPatients.map((patient) => (
                                    <tr key={patient.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="font-medium text-gray-900">{patient.name}</div>
                                            <div className="text-sm text-gray-500">등록일: {new Date(patient.registered_at).toLocaleDateString('ko-KR')}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            {patient.latest_summary ? (
                                                <StatusBadge status={patient.latest_summary.status} />
                                            ) : (
                                                <span className="text-sm text-gray-400">데이터 없음</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-700">
                                            {patient.latest_summary ? (
                                                <>
                                                    {new Date(patient.latest_summary.period_start).toLocaleDateString('ko-KR')}
                                                    {' ~ '}
                                                    {new Date(patient.latest_summary.period_end).toLocaleDateString('ko-KR')}
                                                </>
                                            ) : (
                                                '-'
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <TrendIndicator trend={getTrend(patient)} />
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm text-gray-700 max-w-xs truncate">
                                                {patient.latest_summary?.summary_text || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <Link
                                                to={`/patients/${patient.id}`}
                                                className="inline-flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                                            >
                                                <Eye className="w-4 h-4 mr-2" />
                                                상세보기
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
