interface UseRefreshReturn {
    isRefreshing: boolean;
    lastRefreshTime: Date | null;
    refreshWithDelay: (refreshFn: () => Promise<void>) => Promise<void>;
    canRefresh: boolean;
}
export declare const useRefresh: (minInterval?: number) => UseRefreshReturn;
export {};
//# sourceMappingURL=useRefresh.d.ts.map