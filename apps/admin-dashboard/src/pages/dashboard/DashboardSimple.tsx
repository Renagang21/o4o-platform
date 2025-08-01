import { FC } from 'react';
import { 
  FileText, 
  MessageSquare, 
  Users, 
  Package, 
  Plus, 
  Eye,
  TrendingUp,
  Edit3,
  Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useDashboardData } from './hooks/useDashboardData';
import { formatDistanceToNow } from 'date-fns';
import { ScreenMeta } from '@/components/common/ScreenMeta';
import { DashboardHelp } from '@/components/help/DashboardHelp';

/**
 * Simple, mobile-friendly dashboard without complex widget system
 */
const DashboardSimple: FC = () => {
  const { stats, isLoading } = useDashboardData();

  // Mock recent activity - replace with real API
  const recentActivity = [
    {
      id: '1',
      type: 'post',
      title: 'Welcome to WordPress!',
      author: 'admin',
      date: new Date(Date.now() - 1000 * 60 * 30),
      icon: FileText
    },
    {
      id: '2',
      type: 'comment',
      title: 'Great article on React development',
      author: 'John Doe',
      date: new Date(Date.now() - 1000 * 60 * 60 * 2),
      icon: MessageSquare
    },
    {
      id: '3',
      type: 'user',
      title: 'New user registration',
      author: 'jane.smith@example.com',
      date: new Date(Date.now() - 1000 * 60 * 60 * 5),
      icon: Users
    }
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="wrap">
      <DashboardHelp />
      <ScreenMeta />
      
      <h1 className="wp-heading-inline">Dashboard</h1>
      
      {/* Quick Actions */}
      <div className="quick-actions-bar">
        <Link to="/posts/new">
          <Button className="button button-primary">
            <Plus className="w-4 h-4 mr-1" />
            New Post
          </Button>
        </Link>
        <Link to="/pages/new">
          <Button variant="secondary">
            <Plus className="w-4 h-4 mr-1" />
            New Page
          </Button>
        </Link>
        <Link to="/media/upload">
          <Button variant="secondary">
            <Plus className="w-4 h-4 mr-1" />
            Upload Media
          </Button>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="dashboard-stats-grid">
        <div className="stat-card">
          <Link to="/posts" className="stat-card-link">
            <div className="stat-icon">
              <FileText className="w-8 h-8" />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats?.posts || 0}</div>
              <div className="stat-label">Posts</div>
            </div>
          </Link>
        </div>

        <div className="stat-card">
          <Link to="/pages" className="stat-card-link">
            <div className="stat-icon">
              <FileText className="w-8 h-8" />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats?.pages || 0}</div>
              <div className="stat-label">Pages</div>
            </div>
          </Link>
        </div>

        <div className="stat-card">
          <Link to="/comments" className="stat-card-link">
            <div className="stat-icon">
              <MessageSquare className="w-8 h-8" />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats?.comments?.total || 0}</div>
              <div className="stat-label">Comments</div>
              {stats?.comments?.pending > 0 && (
                <div className="stat-badge">{stats.comments.pending} pending</div>
              )}
            </div>
          </Link>
        </div>

        <div className="stat-card">
          <Link to="/users" className="stat-card-link">
            <div className="stat-icon">
              <Users className="w-8 h-8" />
            </div>
            <div className="stat-content">
              <div className="stat-number">{stats?.users || 0}</div>
              <div className="stat-label">Users</div>
            </div>
          </Link>
        </div>

        {stats?.products !== undefined && (
          <div className="stat-card">
            <Link to="/ecommerce/products" className="stat-card-link">
              <div className="stat-icon">
                <Package className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.products}</div>
                <div className="stat-label">Products</div>
              </div>
            </Link>
          </div>
        )}

        {stats?.views !== undefined && (
          <div className="stat-card">
            <div className="stat-card-link">
              <div className="stat-icon">
                <Eye className="w-8 h-8" />
              </div>
              <div className="stat-content">
                <div className="stat-number">{stats.views.toLocaleString()}</div>
                <div className="stat-label">Views Today</div>
                <TrendingUp className="w-4 h-4 text-green-600 inline ml-1" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Activity */}
      <div className="dashboard-activity-section">
        <h2 className="section-title">Recent Activity</h2>
        <div className="activity-list">
          {recentActivity.map(item => {
            const Icon = item.icon;
            return (
              <div key={item.id} className="activity-item">
                <div className="activity-icon">
                  <Icon className="w-5 h-5" />
                </div>
                <div className="activity-content">
                  <div className="activity-title">
                    {item.type === 'post' && (
                      <Link to={`/posts/${item.id}/edit`}>{item.title}</Link>
                    )}
                    {item.type === 'comment' && (
                      <>Comment from <strong>{item.author}</strong> on <Link to={`/comments/${item.id}`}>{item.title}</Link></>
                    )}
                    {item.type === 'user' && (
                      <>{item.title}: <strong>{item.author}</strong></>
                    )}
                  </div>
                  <div className="activity-time">
                    {formatDistanceToNow(item.date, { addSuffix: true })}
                  </div>
                </div>
                <div className="activity-actions">
                  {item.type === 'post' && (
                    <Link to={`/posts/${item.id}/edit`} className="activity-action">
                      <Edit3 className="w-4 h-4" />
                    </Link>
                  )}
                  {item.type === 'comment' && (
                    <Link to={`/comments/${item.id}`} className="activity-action">
                      <MessageSquare className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="activity-footer">
          <Link to="/activity" className="view-all-link">View All Activity →</Link>
        </div>
      </div>

      {/* Quick Links */}
      <div className="dashboard-quick-links">
        <h2 className="section-title">Quick Links</h2>
        <div className="quick-links-grid">
          <Link to="/themes/customize" className="quick-link">
            <Settings className="w-5 h-5 mr-2" />
            Customize Your Site
          </Link>
          <Link to="/themes/menus" className="quick-link">
            Manage Menus
          </Link>
          <Link to="/themes/widgets" className="quick-link">
            Manage Widgets
          </Link>
          <Link to="/settings/general" className="quick-link">
            General Settings
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DashboardSimple;