import React from 'react';
import type { PatientStatus } from '../types';
import { clsx } from 'clsx';

interface StatusBadgeProps {
    status: PatientStatus;
    className?: string;
}

const statusConfig = {
    normal: {
        label: '정상',
        bgColor: 'bg-green-100',
        textColor: 'text-green-800',
        borderColor: 'border-green-200',
    },
    warning: {
        label: '주의',
        bgColor: 'bg-yellow-100',
        textColor: 'text-yellow-800',
        borderColor: 'border-yellow-200',
    },
    risk: {
        label: '위험',
        bgColor: 'bg-red-100',
        textColor: 'text-red-800',
        borderColor: 'border-red-200',
    },
};

export default function StatusBadge({ status, className }: StatusBadgeProps) {
    const config = statusConfig[status];

    return (
        <span
            className={clsx(
                'inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border',
                config.bgColor,
                config.textColor,
                config.borderColor,
                className
            )}
        >
            {config.label}
        </span>
    );
}
