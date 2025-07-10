import { useState, useCallback, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '../../../api/dashboard';
export const useDashboardData = () => {
    const [manualRefreshTrigger, setManualRefreshTrigger] = useState(0);
    const { data: stats, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useQuery({
        queryKey: ['dashboard', 'stats', manualRefreshTrigger],
        queryFn: () => dashboardApi.getStats(),
        enabled: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2
    });
    const { data: chartData, isLoading: chartLoading, error: chartError, refetch: refetchCharts } = useQuery({
        queryKey: ['dashboard', 'charts', manualRefreshTrigger],
        queryFn: () => dashboardApi.getChartData(),
        enabled: false,
        staleTime: 5 * 60 * 1000,
        gcTime: 10 * 60 * 1000,
        retry: 2
    });
    const { data: notificationsData, isLoading: notificationsLoading, refetch: refetchNotifications } = useQuery({
        queryKey: ['dashboard', 'notifications', manualRefreshTrigger],
        queryFn: () => dashboardApi.getNotifications(),
        enabled: false,
        staleTime: 2 * 60 * 1000,
        retry: 2
    });
    const { data: activities, isLoading: activitiesLoading, refetch: refetchActivities } = useQuery({
        queryKey: ['dashboard', 'activities', manualRefreshTrigger],
        queryFn: () => dashboardApi.getRecentActivities(),
        enabled: false,
        staleTime: 3 * 60 * 1000,
        retry: 2
    });
    const { data: systemHealth, isLoading: healthLoading, refetch: refetchHealth } = useQuery({
        queryKey: ['dashboard', 'health', manualRefreshTrigger],
        queryFn: () => dashboardApi.getSystemHealth(),
        enabled: false,
        staleTime: 30 * 1000,
        retry: 1
    });
    const isLoading = statsLoading || chartLoading || notificationsLoading ||
        activitiesLoading || healthLoading;
    const error = statsError || chartError;
    const refreshAllData = useCallback(async () => {
        const timestamp = Date.now();
        setManualRefreshTrigger(timestamp);
        const refreshPromises = [
            refetchStats(),
            refetchCharts(),
            refetchNotifications(),
            refetchActivities(),
            refetchHealth()
        ];
        try {
            await Promise.allSettled(refreshPromises);
        }
        catch (error) {
            console.error('Error refreshing dashboard data:', error);
            throw error;
        }
    }, [refetchStats, refetchCharts, refetchNotifications, refetchActivities, refetchHealth]);
    useEffect(() => {
        refreshAllData();
    }, []);
    const refreshStats = useCallback(() => refetchStats(), [refetchStats]);
    const refreshCharts = useCallback(() => refetchCharts(), [refetchCharts]);
    const refreshNotifications = useCallback(() => refetchNotifications(), [refetchNotifications]);
    return {
        stats,
        chartData,
        notifications: notificationsData,
        activities,
        systemHealth,
        isLoading,
        error,
        refreshAllData,
        refreshStats,
        refreshCharts,
        refreshNotifications,
        loadingStates: {
            stats: statsLoading,
            charts: chartLoading,
            notifications: notificationsLoading,
            activities: activitiesLoading,
            health: healthLoading
        }
    };
};
//# sourceMappingURL=useDashboardData.js.map