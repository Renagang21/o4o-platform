// UAGB User Dashboard View - Spectra 스타일 (Part 1)
// 사용자별 포스트 관리 대시보드 뷰 컴포넌트

import React, { useState, useEffect } from 'react';
import { NodeViewWrapper } from '@tiptap/react';
import { 
  UAGBTabs, 
  UAGBPanel, 
  UAGBTextControl,
  UAGBSelectControl,
  UAGBToggleControl,
  UAGBColorControl,
  UAGBNumberControl
} from './tiptap-block';
import { 
  User, Settings, Palette, Layout, BarChart3, FileText, Plus,
  Bell, Activity, TrendingUp, Eye, MessageCircle, Share2,
  Edit3, Trash2, Calendar, Clock, Target, Award,
  RefreshCw, Download, Filter, Search, Grid, List
} from 'lucide-react';
import { 
  UAGBUserDashboardAttributes,
  DashboardWidget,
  UserStats,
  getUserStatsAPI,
  getUserRecentPostsAPI,
  getUserActivityAPI,
  getUserNotificationsAPI,
  executeQuickActionAPI
} from './UAGBUserDashboardBlock';

interface UAGBUserDashboardViewProps {
  node: {
    attrs: UAGBUserDashboardAttributes;
  };
  updateAttributes: (attrs: Partial<UAGBUserDashboardAttributes>) => void;
  selected: boolean;
}

export const UAGBUserDashboardView: React.FC<UAGBUserDashboardViewProps> = ({
  node,
  updateAttributes,
  selected
}) => {
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isLoading, setIsLoading] = useState(false);
  
  // 대시보드 데이터 상태
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [recentPosts, setRecentPosts] = useState<any[]>([]);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  
  const attrs = node.attrs;
  const currentUserId = attrs.userId || 'current-user'; // 실제로는 인증된 사용자 ID

  // 대시보드 데이터 로드
  const loadDashboardData = async () => {
    setIsLoading(true);
    try {
      const [stats, posts, activity, notifs] = await Promise.all([
        getUserStatsAPI(currentUserId),
        getUserRecentPostsAPI(currentUserId, attrs.postsLimit),
        getUserActivityAPI(currentUserId, attrs.activityLimit),
        getUserNotificationsAPI(currentUserId, 5)
      ]);
      
      setUserStats(stats);
      setRecentPosts(posts);
      setRecentActivity(activity);
      setNotifications(notifs);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 컴포넌트 마운트 시 데이터 로드
  useEffect(() => {
    loadDashboardData();
    
    // 자동 새로고침 설정
    const interval = setInterval(loadDashboardData, attrs.refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [currentUserId, attrs.refreshInterval]);

  // 통계 카드 위젯
  const renderStatsWidget = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Statistics</h3>
        <BarChart3 size={20} className="text-blue-600" />
      </div>
      
      {userStats ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{userStats.totalPosts}</div>
            <div className="text-sm text-gray-600">Total Posts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{userStats.publishedPosts}</div>
            <div className="text-sm text-gray-600">Published</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{userStats.draftPosts}</div>
            <div className="text-sm text-gray-600">Drafts</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{userStats.totalViews.toLocaleString()}</div>
            <div className="text-sm text-gray-600">Total Views</div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-20">
          <RefreshCw className="animate-spin text-gray-400" size={24} />
        </div>
      )}
    </div>
  );

  // 최근 포스트 위젯
  const renderRecentPostsWidget = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Recent Posts</h3>
        <FileText size={20} className="text-blue-600" />
      </div>
      
      <div className="space-y-3">
        {recentPosts.slice(0, 5).map((post) => (
          <div key={post.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex-1">
              <h4 className="font-medium text-gray-900 text-sm">{post.title}</h4>
              <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Calendar size={12} />
                  {new Date(post.date).toLocaleDateString()}
                </span>
                <span className="flex items-center gap-1">
                  <Eye size={12} />
                  {post.view_count || 0}
                </span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  post.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'
                }`}>
                  {post.status}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {attrs.canEditOwnPosts && (
                <button className="p-1 text-blue-600 hover:bg-blue-100 rounded">
                  <Edit3 size={14} />
                </button>
              )}
              {attrs.canDeleteOwnPosts && (
                <button className="p-1 text-red-600 hover:bg-red-100 rounded">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        ))}
        
        {recentPosts.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <FileText size={32} className="mx-auto mb-2 opacity-30" />
            <p>No posts yet</p>
            {attrs.canCreatePosts && (
              <button 
                onClick={() => executeQuickActionAPI('create_post')}
                className="mt-2 text-blue-600 hover:text-blue-700 text-sm"
              >
                Create your first post
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // 빠른 액션 위젯
  const renderQuickActionsWidget = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
        <Target size={20} className="text-blue-600" />
      </div>
      
      <div className="grid grid-cols-1 gap-3">
        {attrs.canCreatePosts && (
          <button
            onClick={() => executeQuickActionAPI('create_post')}
            className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
          >
            <Plus size={18} className="text-blue-600" />
            <span className="font-medium text-blue-900">Create New Post</span>
          </button>
        )}
        
        {attrs.canViewAnalytics && (
          <button
            onClick={() => executeQuickActionAPI('view_analytics')}
            className="flex items-center gap-3 p-3 bg-green-50 hover:bg-green-100 rounded-lg transition-colors"
          >
            <BarChart3 size={18} className="text-green-600" />
            <span className="font-medium text-green-900">View Analytics</span>
          </button>
        )}
        
        <button
          onClick={() => executeQuickActionAPI('manage_posts')}
          className="flex items-center gap-3 p-3 bg-purple-50 hover:bg-purple-100 rounded-lg transition-colors"
        >
          <FileText size={18} className="text-purple-600" />
          <span className="font-medium text-purple-900">Manage Posts</span>
        </button>
        
        <button
          onClick={() => executeQuickActionAPI('settings')}
          className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Settings size={18} className="text-gray-600" />
          <span className="font-medium text-gray-900">Settings</span>
        </button>
      </div>
    </div>
  );

  // 분석 위젯
  const renderAnalyticsWidget = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Analytics</h3>
        <TrendingUp size={20} className="text-blue-600" />
      </div>
      
      {userStats ? (
        <div>
          {/* 월별 조회수 차트 (간단한 막대 그래프) */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-700 mb-3">Monthly Views</h4>
            <div className="flex items-end gap-1 h-24">
              {userStats.monthlyViews.map((views, index) => {
                const maxViews = Math.max(...userStats.monthlyViews);
                const height = (views / maxViews) * 80;
                return (
                  <div
                    key={index}
                    className="bg-blue-500 rounded-t flex-1 min-w-0"
                    style={{ height: `${height}px` }}
                    title={`Month ${index + 1}: ${views} views`}
                  />
                );
              })}
            </div>
          </div>
          
          {/* 상위 포스트 */}
          <div>
            <h4 className="text-sm font-medium text-gray-700 mb-3">Top Posts</h4>
            <div className="space-y-2">
              {userStats.topPosts.slice(0, 3).map((post, index) => (
                <div key={post.id} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </span>
                    <span className="text-gray-900 truncate">{post.title}</span>
                  </div>
                  <span className="text-gray-600">{post.views} views</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-center h-32">
          <RefreshCw className="animate-spin text-gray-400" size={24} />
        </div>
      )}
    </div>
  );

  // 알림 위젯
  const renderNotificationsWidget = () => (
    <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
        <Bell size={20} className="text-blue-600" />
      </div>
      
      <div className="space-y-3">
        {notifications.map((notification) => (
          <div 
            key={notification.id} 
            className={`p-3 rounded-lg border ${
              notification.read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <h4 className={`text-sm font-medium ${
                  notification.read ? 'text-gray-700' : 'text-blue-900'
                }`}>
                  {notification.title}
                </h4>
                <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                <span className="text-xs text-gray-500">
                  {new Date(notification.date).toLocaleString()}
                </span>
              </div>
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                notification.priority === 'high' ? 'bg-red-100 text-red-800' :
                notification.priority === 'normal' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {notification.priority}
              </span>
            </div>
          </div>
        ))}
        
        {notifications.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Bell size={32} className="mx-auto mb-2 opacity-30" />
            <p>No new notifications</p>
          </div>
        )}
      </div>
    </div>
  );

  // 위젯 렌더링 함수
  const renderWidget = (widget: DashboardWidget) => {
    if (!widget.enabled) return null;
    
    switch (widget.type) {
      case 'stats':
        return renderStatsWidget();
      case 'recent_posts':
        return renderRecentPostsWidget();
      case 'quick_actions':
        return renderQuickActionsWidget();
      case 'analytics':
        return renderAnalyticsWidget();
      case 'notifications':
        return renderNotificationsWidget();
      default:
        return (
          <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
            <div className="text-center text-gray-500">
              <div className="text-lg font-medium">Unknown Widget</div>
              <div className="text-sm">Widget type: {widget.type}</div>
            </div>
          </div>
        );
    }
  };

  return (
    <NodeViewWrapper>
      <div 
        className="uagb-user-dashboard"
        style={{
          backgroundColor: attrs.backgroundColor,
          border: selected ? '2px solid #3b82f6' : `1px solid ${attrs.borderColor}`,
          borderRadius: `${attrs.borderRadius}px`,
          minHeight: '400px',
          position: 'relative'
        }}
      >
        {/* 편집 버튼 */}
        {selected && (
          <button
            onClick={() => setIsEditorOpen(true)}
            style={{
              position: 'absolute',
              top: '8px',
              right: '8px',
              background: '#3b82f6',
              color: '#fff',
              border: 'none',
              borderRadius: '4px',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              zIndex: 10,
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Settings size={12} />
            Settings
          </button>
        )}

        {/* 대시보드 헤더 */}
        <div 
          className="p-6 border-b"
          style={{ 
            borderColor: attrs.borderColor,
            height: `${attrs.headerHeight}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}
        >
          <div>
            {attrs.showTitle && (
              <h1 className="text-2xl font-bold" style={{ color: attrs.textColor }}>
                {attrs.dashboardTitle}
              </h1>
            )}
            {attrs.showWelcomeMessage && (
              <p className="text-gray-600 mt-1">{attrs.welcomeMessage}</p>
            )}
          </div>
          
          <div className="flex items-center gap-3">
            {isLoading && <RefreshCw className="animate-spin text-blue-600" size={20} />}
            <button
              onClick={loadDashboardData}
              className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              title="Refresh"
            >
              <RefreshCw size={18} />
            </button>
          </div>
        </div>

        {/* 대시보드 위젯 그리드 */}
        <div className="p-6">
          <div 
            className={`grid gap-6 ${
              attrs.layout === 'grid' ? 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3' :
              attrs.layout === 'list' ? 'grid-cols-1' :
              'grid-cols-1 md:grid-cols-4'
            }`}
          >
            {attrs.widgets
              .filter(widget => widget.enabled)
              .map((widget) => (
                <div 
                  key={widget.id}
                  style={{
                    gridColumn: attrs.layout === 'grid' ? 'span 1' : `span ${widget.position.w}`,
                    gridRow: attrs.layout === 'grid' ? 'span 1' : `span ${widget.position.h}`
                  }}
                >
                  {renderWidget(widget)}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* 설정 모달 - 계속해서 구현... */}
      {isEditorOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-4xl h-4/5 flex flex-col">
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between p-6 border-b">
              <h3 className="text-lg font-semibold">User Dashboard Settings</h3>
              <button
                onClick={() => setIsEditorOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>

            {/* 설정 탭들 - Part 2에서 계속... */}
            <div className="flex-1 overflow-hidden">
              <div className="p-6">
                <p className="text-gray-600">Dashboard settings will be implemented in Part 2...</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </NodeViewWrapper>
  );
};

export default UAGBUserDashboardView;