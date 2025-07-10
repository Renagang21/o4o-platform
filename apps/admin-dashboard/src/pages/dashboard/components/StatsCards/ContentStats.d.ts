interface ContentStatsProps {
    data?: {
        publishedPages: number;
        draftContent: number;
        totalMedia: number;
        todayViews: number;
        change: number;
        trend: 'up' | 'down';
    };
    isLoading?: boolean;
}
declare const ContentStats: React.FC<ContentStatsProps>;
export default ContentStats;
//# sourceMappingURL=ContentStats.d.ts.map