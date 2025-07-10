import React from 'react';
interface ActivityData {
    id: string;
    type: 'user' | 'order' | 'product' | 'content';
    message: string;
    time: string;
    user?: string;
    icon: string;
}
interface ActivityFeedProps {
    activities: ActivityData[];
    isLoading?: boolean;
    onRefresh?: () => void;
}
declare const ActivityFeed: React.FC<ActivityFeedProps>;
export default ActivityFeed;
//# sourceMappingURL=index.d.ts.map