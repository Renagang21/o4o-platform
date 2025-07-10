interface UserStatsProps {
    data?: {
        total: number;
        pending: number;
        today: number;
        activeRate: number;
        change: number;
        trend: 'up' | 'down';
    };
    isLoading?: boolean;
}
declare const UserStats: React.FC<UserStatsProps>;
export default UserStats;
//# sourceMappingURL=UserStats.d.ts.map