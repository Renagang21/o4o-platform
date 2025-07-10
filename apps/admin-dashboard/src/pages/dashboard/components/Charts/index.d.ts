interface ChartsProps {
    data?: {
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
    };
    isLoading?: boolean;
}
declare const Charts: import("react").NamedExoticComponent<ChartsProps>;
export default Charts;
//# sourceMappingURL=index.d.ts.map