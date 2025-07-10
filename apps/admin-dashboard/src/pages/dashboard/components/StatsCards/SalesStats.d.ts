interface SalesStatsProps {
    data?: {
        today: number;
        changePercent: number;
        monthlyTotal: number;
        monthlyTarget: number;
        trend: 'up' | 'down';
    };
    isLoading?: boolean;
}
declare const SalesStats: React.FC<SalesStatsProps>;
export default SalesStats;
//# sourceMappingURL=SalesStats.d.ts.map