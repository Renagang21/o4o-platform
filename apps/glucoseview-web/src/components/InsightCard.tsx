import React from 'react';
import type { GlucoseInsight } from '../types';
import { Lightbulb, User, Bot } from 'lucide-react';

interface InsightCardProps {
    insight: GlucoseInsight;
}

const insightTypeLabels: Record<string, string> = {
    meal_pattern: '식사 패턴',
    nocturnal_pattern: '야간 패턴',
    improvement: '개선 사항',
    pharmacist_comment: '약사 코멘트',
    risk_alert: '위험 알림',
};

export default function InsightCard({ insight }: InsightCardProps) {
    const getIcon = () => {
        if (insight.generated_by === 'pharmacist') {
            return <User className="w-5 h-5 text-blue-600" />;
        }
        if (insight.generated_by === 'ai') {
            return <Bot className="w-5 h-5 text-purple-600" />;
        }
        return <Lightbulb className="w-5 h-5 text-yellow-600" />;
    };

    const getBgColor = () => {
        if (insight.generated_by === 'pharmacist') return 'bg-blue-50 border-blue-200';
        if (insight.generated_by === 'ai') return 'bg-purple-50 border-purple-200';
        return 'bg-gray-50 border-gray-200';
    };

    return (
        <div className={`p-4 rounded-lg border-2 ${getBgColor()}`}>
            <div className="flex items-start gap-3">
                <div className="mt-1">{getIcon()}</div>
                <div className="flex-1">
                    <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">
                            {insightTypeLabels[insight.insight_type] || insight.insight_type}
                        </h4>
                        <span className="text-xs text-gray-500">
                            {new Date(insight.created_at).toLocaleDateString('ko-KR')}
                        </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                        {insight.description}
                    </p>
                    {insight.reference_period && (
                        <p className="text-xs text-gray-500 mt-2">
                            기준 기간: {insight.reference_period}
                        </p>
                    )}
                </div>
            </div>
        </div>
    );
}
