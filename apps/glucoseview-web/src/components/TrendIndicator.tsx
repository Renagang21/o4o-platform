import React from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface TrendIndicatorProps {
    trend: 'improving' | 'stable' | 'worsening';
}

export default function TrendIndicator({ trend }: TrendIndicatorProps) {
    if (trend === 'improving') {
        return (
            <div className="inline-flex items-center text-green-600">
                <TrendingUp className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">개선</span>
            </div>
        );
    }

    if (trend === 'worsening') {
        return (
            <div className="inline-flex items-center text-red-600">
                <TrendingDown className="w-5 h-5 mr-1" />
                <span className="text-sm font-medium">악화</span>
            </div>
        );
    }

    return (
        <div className="inline-flex items-center text-gray-600">
            <Minus className="w-5 h-5 mr-1" />
            <span className="text-sm font-medium">유지</span>
        </div>
    );
}
