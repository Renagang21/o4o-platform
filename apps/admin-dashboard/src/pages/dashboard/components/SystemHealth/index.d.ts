import React from 'react';
interface SystemHealthData {
    api: {
        status: 'healthy' | 'warning' | 'error';
        responseTime: number;
        lastCheck: string;
    };
    database: {
        status: 'healthy' | 'warning' | 'error';
        connections: number;
        lastCheck: string;
    };
    storage: {
        status: 'healthy' | 'warning' | 'error';
        usage: number;
        total: number;
    };
    memory: {
        status: 'healthy' | 'warning' | 'error';
        usage: number;
        total: number;
    };
}
interface SystemHealthProps {
    health?: SystemHealthData;
    isLoading?: boolean;
    onRefresh?: () => void;
}
declare const SystemHealth: React.FC<SystemHealthProps>;
export default SystemHealth;
//# sourceMappingURL=index.d.ts.map