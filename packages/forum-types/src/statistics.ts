export interface ForumStatistics {
  // Overview
  totalCategories: number;
  totalPosts: number;
  totalComments: number;
  totalUsers: number;
  totalViews: number;
  totalLikes: number;
  
  // Time-based
  postsToday: number;
  postsThisWeek: number;
  postsThisMonth: number;
  commentsToday: number;
  commentsThisWeek: number;
  commentsThisMonth: number;
  
  // Engagement
  averageCommentsPerPost: number;
  averageViewsPerPost: number;
  engagementRate: number;
  
  // Popular content
  topPosts: Array<{
    id: string;
    title: string;
    viewCount: number;
    commentCount: number;
    likeCount: number;
  }>;
  
  topCategories: Array<{
    id: string;
    name: string;
    postCount: number;
    engagementScore: number;
  }>;
  
  topContributors: Array<{
    id: string;
    name: string;
    postCount: number;
    commentCount: number;
    likeCount: number;
    reputation?: number;
  }>;
  
  // Activity timeline
  recentActivity: Array<{
    type: 'post' | 'comment' | 'like';
    targetType?: 'post' | 'comment';
    targetId: string;
    targetTitle?: string;
    userId: string;
    userName: string;
    timestamp: Date | string;
  }>;
}

export interface CategoryStatistics {
  categoryId: string;
  totalPosts: number;
  totalComments: number;
  totalViews: number;
  activeUsers: number;
  averageResponseTime?: number;
  popularTags: string[];
  growthRate: number; // percentage
}

export interface UserForumStatistics {
  userId: string;
  totalPosts: number;
  totalComments: number;
  totalLikesReceived: number;
  totalLikesGiven: number;
  totalViews: number;
  reputation?: number;
  badges?: string[];
  joinedAt: Date | string;
  lastActiveAt: Date | string;
}