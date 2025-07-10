import React from 'react';
interface OrderData {
    status: string;
    count: number;
    color: string;
}
interface OrderChartProps {
    data: OrderData[];
    isLoading?: boolean;
}
declare const OrderChart: React.FC<OrderChartProps>;
export default OrderChart;
//# sourceMappingURL=OrderChart.d.ts.map