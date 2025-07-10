interface PartnerStatsProps {
    data?: {
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
    isLoading?: boolean;
}
declare const PartnerStats: React.FC<PartnerStatsProps>;
export default PartnerStats;
//# sourceMappingURL=PartnerStats.d.ts.map