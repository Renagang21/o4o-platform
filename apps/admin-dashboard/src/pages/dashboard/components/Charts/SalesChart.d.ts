import React from 'react';
interface SalesData {
    date: string;
    amount: number;
    orders: number;
}
interface SalesChartProps {
    data: SalesData[];
    isLoading?: boolean;
}
declare const SalesChart: React.FC<SalesChartProps>;
export default SalesChart;
//# sourceMappingURL=SalesChart.d.ts.map