interface ProductStatsProps {
    data?: {
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
    isLoading?: boolean;
}
declare const ProductStats: React.FC<ProductStatsProps>;
export default ProductStats;
//# sourceMappingURL=ProductStats.d.ts.map