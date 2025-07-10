import { useState, useCallback } from 'react';
export const useRefresh = (minInterval = 10000) => {
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [lastRefreshTime, setLastRefreshTime] = useState(null);
    const canRefresh = !isRefreshing && (!lastRefreshTime ||
        Date.now() - lastRefreshTime.getTime() > minInterval);
    const refreshWithDelay = useCallback(async (refreshFn) => {
        if (!canRefresh) {
            const timeLeft = lastRefreshTime
                ? Math.ceil((minInterval - (Date.now() - lastRefreshTime.getTime())) / 1000)
                : 0;
            if (timeLeft > 0) {
                console.warn(`너무 빠른 새로고침 요청입니다. ${timeLeft}초 후에 다시 시도하세요.`);
                return;
            }
        }
        setIsRefreshing(true);
        try {
            const [,] = await Promise.all([
                refreshFn(),
                new Promise(resolve => setTimeout(resolve, 1000))
            ]);
            setLastRefreshTime(new Date());
        }
        catch (error) {
            console.error('Refresh failed:', error);
            throw error;
        }
        finally {
            setIsRefreshing(false);
        }
    }, [canRefresh, lastRefreshTime, minInterval]);
    return {
        isRefreshing,
        lastRefreshTime,
        refreshWithDelay,
        canRefresh
    };
};
//# sourceMappingURL=useRefresh.js.map