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
export declare const dashboardApi: {
    getStats(): Promise<DashboardStats>;
    getChartData(): Promise<{
        sales: any;
        orders: any;
        users: any;
    }>;
    getNotifications(): Promise<{
        items: any;
        total: any;
        urgent: any;
        approval: any;
    }>;
    getRecentActivities(): Promise<any>;
    getSystemHealth(): Promise<any>;
    getDefaultSalesData(): {
        date: string | undefined;
        amount: number;
        orders: number;
    }[];
    getDefaultOrdersData(): {
        status: string;
        count: number;
        color: string;
    }[];
    getDefaultUsersData(): {
        date: string | undefined;
        newUsers: number;
        activeUsers: number;
    }[];
    getDefaultNotifications(): ({
        id: string;
        type: "urgent";
        title: string;
        message: string;
        time: string;
        read: boolean;
        actionUrl: string;
    } | {
        id: string;
        type: "approval";
        title: string;
        message: string;
        time: string;
        read: boolean;
        actionUrl: string;
    } | {
        id: string;
        type: "success";
        title: string;
        message: string;
        time: string;
        read: boolean;
        actionUrl?: never;
    } | {
        id: string;
        type: "info";
        title: string;
        message: string;
        time: string;
        read: boolean;
        actionUrl?: never;
    })[];
    getDefaultActivities(): ({
        id: string;
        type: "user";
        message: string;
        time: string;
        user: string;
        icon: string;
    } | {
        id: string;
        type: "order";
        message: string;
        time: string;
        user: string;
        icon: string;
    } | {
        id: string;
        type: "product";
        message: string;
        time: string;
        icon: string;
        user?: never;
    } | {
        id: string;
        type: "content";
        message: string;
        time: string;
        user: string;
        icon: string;
    } | {
        id: string;
        type: "order";
        message: string;
        time: string;
        icon: string;
        user?: never;
    })[];
    getDefaultSystemHealth(): {
        api: {
            status: "healthy";
            responseTime: number;
            lastCheck: string;
        };
        database: {
            status: "healthy";
            connections: number;
            lastCheck: string;
        };
        storage: {
            status: "healthy";
            usage: number;
            total: number;
        };
        memory: {
            status: "warning";
            usage: number;
            total: number;
        };
    };
};
export {};
//# sourceMappingURL=dashboard.d.ts.map