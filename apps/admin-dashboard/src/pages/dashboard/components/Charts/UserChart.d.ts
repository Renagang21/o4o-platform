import React from 'react';
interface UserData {
    date: string;
    newUsers: number;
    activeUsers: number;
}
interface UserChartProps {
    data: UserData[];
    isLoading?: boolean;
}
declare const UserChart: React.FC<UserChartProps>;
export default UserChart;
//# sourceMappingURL=UserChart.d.ts.map