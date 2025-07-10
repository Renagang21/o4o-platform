import { api } from './base';
export const dashboardApi = {
    async getStats() {
        try {
            const [usersResponse, salesResponse, productsResponse, contentResponse] = await Promise.all([
                api.get('/users/stats'),
                api.get('/orders/stats'),
                api.get('/products/stats'),
                api.get('/pages/stats')
            ]);
            return {
                users: {
                    total: usersResponse.data.total || 0,
                    pending: usersResponse.data.pending || 0,
                    today: usersResponse.data.todayCount || 0,
                    activeRate: usersResponse.data.activeRate || 0,
                    change: usersResponse.data.monthlyChange || 0,
                    trend: usersResponse.data.monthlyChange >= 0 ? 'up' : 'down'
                },
                sales: {
                    today: salesResponse.data.todaySales || 0,
                    changePercent: salesResponse.data.changePercent || 0,
                    monthlyTotal: salesResponse.data.monthlyTotal || 0,
                    monthlyTarget: salesResponse.data.monthlyTarget || 1000000,
                    trend: salesResponse.data.changePercent >= 0 ? 'up' : 'down'
                },
                products: {
                    active: productsResponse.data.activeCount || 0,
                    lowStock: productsResponse.data.lowStockCount || 0,
                    newThisWeek: productsResponse.data.newThisWeek || 0,
                    bestsellers: productsResponse.data.bestsellers || [],
                    change: productsResponse.data.weeklyChange || 0,
                    trend: productsResponse.data.weeklyChange >= 0 ? 'up' : 'down'
                },
                content: {
                    publishedPages: contentResponse.data.publishedCount || 0,
                    draftContent: contentResponse.data.draftCount || 0,
                    totalMedia: contentResponse.data.mediaCount || 0,
                    todayViews: contentResponse.data.todayViews || 0,
                    change: contentResponse.data.viewsChange || 0,
                    trend: contentResponse.data.viewsChange >= 0 ? 'up' : 'down'
                },
                partners: {
                    active: 0,
                    pending: 0,
                    totalCommission: 0,
                    topPartners: [],
                    change: 0,
                    trend: 'up'
                }
            };
        }
        catch (error) {
            console.error('Failed to fetch dashboard stats:', error);
            throw new Error('통계 데이터를 불러올 수 없습니다.');
        }
    },
    async getChartData() {
        try {
            const [salesTrendResponse, orderStatusResponse, userActivityResponse] = await Promise.all([
                api.get('/orders/trend?period=30'),
                api.get('/orders/status-distribution'),
                api.get('/users/activity-trend?period=7')
            ]);
            return {
                sales: salesTrendResponse.data.trend || [],
                orders: orderStatusResponse.data.distribution || [
                    { status: '처리중', count: 45, color: '#3b82f6' },
                    { status: '배송중', count: 23, color: '#f59e0b' },
                    { status: '완료', count: 67, color: '#10b981' },
                    { status: '취소', count: 5, color: '#ef4444' }
                ],
                users: userActivityResponse.data.activity || []
            };
        }
        catch (error) {
            console.error('Failed to fetch chart data:', error);
            return {
                sales: this.getDefaultSalesData(),
                orders: this.getDefaultOrdersData(),
                users: this.getDefaultUsersData()
            };
        }
    },
    async getNotifications() {
        try {
            const response = await api.get('/admin/notifications?limit=20');
            const notifications = response.data.notifications || [];
            const urgent = notifications.filter((n) => n.type === 'urgent').length;
            const approval = notifications.filter((n) => n.type === 'approval').length;
            return {
                items: notifications,
                total: notifications.length,
                urgent,
                approval
            };
        }
        catch (error) {
            console.error('Failed to fetch notifications:', error);
            return {
                items: this.getDefaultNotifications(),
                total: 4,
                urgent: 2,
                approval: 1
            };
        }
    },
    async getRecentActivities() {
        try {
            const response = await api.get('/admin/activities?limit=15');
            return response.data.activities || this.getDefaultActivities();
        }
        catch (error) {
            console.error('Failed to fetch activities:', error);
            return this.getDefaultActivities();
        }
    },
    async getSystemHealth() {
        try {
            const response = await api.get('/system/health');
            return response.data;
        }
        catch (error) {
            console.error('Failed to fetch system health:', error);
            return this.getDefaultSystemHealth();
        }
    },
    getDefaultSalesData() {
        const data = [];
        const today = new Date();
        for (let i = 29; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toISOString().split('T')[0],
                amount: Math.floor(Math.random() * 500000) + 100000,
                orders: Math.floor(Math.random() * 50) + 10
            });
        }
        return data;
    },
    getDefaultOrdersData() {
        return [
            { status: '처리중', count: 45, color: '#3b82f6' },
            { status: '배송중', count: 23, color: '#f59e0b' },
            { status: '완료', count: 67, color: '#10b981' },
            { status: '취소', count: 5, color: '#ef4444' }
        ];
    },
    getDefaultUsersData() {
        const data = [];
        const today = new Date();
        for (let i = 6; i >= 0; i--) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            data.push({
                date: date.toISOString().split('T')[0],
                newUsers: Math.floor(Math.random() * 20) + 5,
                activeUsers: Math.floor(Math.random() * 100) + 50
            });
        }
        return data;
    },
    getDefaultNotifications() {
        return [
            {
                id: '1',
                type: 'urgent',
                title: '재고 부족 경고',
                message: '오메가3 제품의 재고가 5개 미만입니다.',
                time: '2분 전',
                read: false,
                actionUrl: '/products/low-stock'
            },
            {
                id: '2',
                type: 'approval',
                title: '사업자 승인 대기',
                message: '김사업자님의 사업자 등록 승인이 대기 중입니다.',
                time: '15분 전',
                read: false,
                actionUrl: '/users/pending'
            },
            {
                id: '3',
                type: 'success',
                title: '매출 목표 달성',
                message: '이번 주 매출 목표를 달성했습니다!',
                time: '1시간 전',
                read: true
            },
            {
                id: '4',
                type: 'info',
                title: '새로운 리뷰',
                message: '프리미엄 비타민 상품에 새 리뷰가 등록되었습니다.',
                time: '2시간 전',
                read: true
            }
        ];
    },
    getDefaultActivities() {
        return [
            {
                id: '1',
                type: 'user',
                message: '새로운 사업자 회원이 가입했습니다',
                time: '2분 전',
                user: '김사업자',
                icon: '👤'
            },
            {
                id: '2',
                type: 'order',
                message: '새 주문이 접수되었습니다 (#ORD-2025-001)',
                time: '15분 전',
                user: '이고객',
                icon: '🛒'
            },
            {
                id: '3',
                type: 'product',
                message: '오메가3 상품의 재고가 부족합니다',
                time: '1시간 전',
                icon: '📦'
            },
            {
                id: '4',
                type: 'content',
                message: '건강 가이드 페이지가 발행되었습니다',
                time: '2시간 전',
                user: '관리자',
                icon: '📄'
            },
            {
                id: '5',
                type: 'order',
                message: '주문 #ORD-2024-156이 배송 완료되었습니다',
                time: '3시간 전',
                icon: '✅'
            }
        ];
    },
    getDefaultSystemHealth() {
        return {
            api: {
                status: 'healthy',
                responseTime: 120,
                lastCheck: new Date().toISOString()
            },
            database: {
                status: 'healthy',
                connections: 8,
                lastCheck: new Date().toISOString()
            },
            storage: {
                status: 'healthy',
                usage: 2.4,
                total: 10
            },
            memory: {
                status: 'warning',
                usage: 1.2,
                total: 2
            }
        };
    }
};
//# sourceMappingURL=dashboard.js.map