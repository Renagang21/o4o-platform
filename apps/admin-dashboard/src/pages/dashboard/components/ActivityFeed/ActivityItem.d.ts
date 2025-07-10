interface ActivityData {
    id: string;
    type: 'user' | 'order' | 'product' | 'content';
    message: string;
    time: string;
    user?: string;
    icon: string;
}
interface ActivityItemProps {
    activity: ActivityData;
    typeColor: string;
}
declare const ActivityItem: React.FC<ActivityItemProps>;
export default ActivityItem;
//# sourceMappingURL=ActivityItem.d.ts.map