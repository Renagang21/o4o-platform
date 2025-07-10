interface DashboardStats {
    users: {
        total: number;
        pending: number;
        today: number;
        activeRate: number;
        change: number;
        trend: 'up' | 'down';
    };
    sales: {
        today: number;
        changePercent: number;
        monthlyTotal: number;
        monthlyTarget: number;
        trend: 'up' | 'down';
    };
    products: {
        active: number;
        lowStock: number;
        newThisWeek: number;
        bestsellers: Array<{
            id: string;
            name: string;
            sales: number;
        }>;
        change: number;
        trend: 'up' | 'down';
    };
    content: {
        publishedPages: number;
        draftContent: number;
        totalMedia: number;
        todayViews: number;
        change: number;
        trend: 'up' | 'down';
    };
    partners: {
        active: number;
        pending: number;
        totalCommission: number;
        topPartners: Array<{
            id: string;
            name: string;
            commission: number;
        }>;
        change: number;
        trend: 'up' | 'down';
    };
}
interface ChartData {
    sales: Array<{
        date: string;
        amount: number;
        orders: number;
    }>;
    orders: Array<{
        status: string;
        count: number;
        color: string;
    }>;
    users: Array<{
        date: string;
        newUsers: number;
        activeUsers: number;
    }>;
}
interface NotificationItem {
    id: string;
    type: 'urgent' | 'approval' | 'success' | 'info';
    title: string;
    message: string;
    time: string;
    read: boolean;
    actionUrl?: string;
}
interface ActivityItem {
    id: string;
    type: 'user' | 'order' | 'product' | 'content';
    message: string;
    time: string;
    user?: string;
    icon: string;
}
interface SystemHealth {
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
export declare const useDashboardData: () => {
    stats: DashboardStats | undefined;
    chartData: ChartData | undefined;
    notifications: {
        items: NotificationItem[];
        total: number;
        urgent: number;
        approval: number;
    } | undefined;
    activities: ActivityItem[] | undefined;
    systemHealth: SystemHealth | undefined;
    isLoading: boolean;
    error: Error | null;
    refreshAllData: () => Promise<void>;
    refreshStats: () => Promise<import("@tanstack/query-core").QueryObserverResult<DashboardStats, Error>>;
    refreshCharts: () => Promise<import("@tanstack/query-core").QueryObserverResult<ChartData, Error>>;
    refreshNotifications: () => Promise<import("@tanstack/query-core").QueryObserverResult<{
        items: NotificationItem[];
        total: number;
        urgent: number;
        approval: number;
    }, Error>>;
    loadingStates: {
        stats: boolean;
        charts: boolean;
        notifications: boolean;
        activities: boolean;
        health: boolean;
    };
};
export {};
//# sourceMappingURL=useDashboardData.d.ts.map