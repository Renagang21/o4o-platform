import React from 'react';
import { Link } from 'react-router-dom';
import { Activity } from 'lucide-react';

export default function HomePage() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-16">
                <div className="max-w-4xl mx-auto text-center">
                    {/* Hero Section */}
                    <div className="mb-12">
                        <div className="inline-flex items-center justify-center w-20 h-20 mb-6 rounded-full bg-indigo-600">
                            <Activity className="w-10 h-10 text-white" />
                        </div>
                        <h1 className="text-5xl font-bold text-gray-900 mb-4">
                            GlucoseView
                        </h1>
                        <p className="text-2xl text-gray-700 mb-2">
                            약사를 위한 CGM 혈당 분석 서비스
                        </p>
                        <p className="text-lg text-gray-600">
                            환자의 혈당 패턴을 한눈에 파악하고, 더 나은 복약 지도를 제공하세요
                        </p>
                    </div>

                    {/* Value Propositions */}
                    <div className="grid md:grid-cols-3 gap-8 mb-12">
                        <div className="bg-white rounded-lg p-6 shadow-md">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                데이터 저장 없음
                            </h3>
                            <p className="text-gray-600">
                                Raw CGM 데이터를 저장하지 않습니다. 요약과 해석만 제공합니다.
                            </p>
                        </div>
                        <div className="bg-white rounded-lg p-6 shadow-md">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                패턴 중심 분석
                            </h3>
                            <p className="text-gray-600">
                                식후 고혈당, 야간 저혈당 등 의미 있는 패턴을 자동으로 감지합니다.
                            </p>
                        </div>
                        <div className="bg-white rounded-lg p-6 shadow-md">
                            <h3 className="text-xl font-semibold text-gray-900 mb-3">
                                약사 전문 도구
                            </h3>
                            <p className="text-gray-600">
                                복약 지도에 활용할 수 있는 약사 중심의 인사이트를 제공합니다.
                            </p>
                        </div>
                    </div>

                    {/* CTA */}
                    <Link
                        to="/patients"
                        className="inline-block px-8 py-4 bg-indigo-600 text-white text-lg font-semibold rounded-lg hover:bg-indigo-700 transition-colors shadow-lg"
                    >
                        환자 분석 보기
                    </Link>
                </div>
            </div>
        </div>
    );
}
