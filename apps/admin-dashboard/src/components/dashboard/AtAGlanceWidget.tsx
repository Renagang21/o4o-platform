import { FC } from 'react';
import { FileText, MessageSquare, Users, Package, Eye, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AtAGlanceProps {
  stats: {
    posts: number;
    pages: number;
    comments: {
      total: number;
      pending: number;
    };
    users: number;
    products?: number;
    views?: number;
  };
  theme?: string;
  version?: string;
}

const AtAGlanceWidget: FC<AtAGlanceProps> = ({ 
  stats, 
  theme = 'O4O Admin Theme',
  version = 'WordPress 6.4.2'
}) => {
  return (
    <div className="o4o-card">
      <div className="o4o-card-header border-b border-modern-border-primary">
        <h2 className="text-lg font-semibold text-modern-text-primary">At a Glance</h2>
      </div>
      <div className="o4o-card-body">
        {/* Content Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <Link 
              to="/content/posts" 
              className="flex items-center gap-2 text-modern-text-secondary hover:text-modern-primary transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="text-2xl font-bold text-modern-text-primary">{stats.posts}</span>
              <span>Posts</span>
            </Link>
            
            <Link 
              to="/pages" 
              className="flex items-center gap-2 text-modern-text-secondary hover:text-modern-primary transition-colors"
            >
              <FileText className="w-4 h-4" />
              <span className="text-2xl font-bold text-modern-text-primary">{stats.pages}</span>
              <span>Pages</span>
            </Link>
            
            {stats.products !== undefined && (
              <Link 
                to="/products" 
                className="flex items-center gap-2 text-modern-text-secondary hover:text-modern-primary transition-colors"
              >
                <Package className="w-4 h-4" />
                <span className="text-2xl font-bold text-modern-text-primary">{stats.products}</span>
                <span>Products</span>
              </Link>
            )}
          </div>
          
          <div className="space-y-2">
            <Link 
              to="/comments" 
              className="flex items-center gap-2 text-modern-text-secondary hover:text-modern-primary transition-colors"
            >
              <MessageSquare className="w-4 h-4" />
              <span className="text-2xl font-bold text-modern-text-primary">{stats.comments.total}</span>
              <span>Comments</span>
              {stats.comments.pending > 0 && (
                <span className="ml-2 px-2 py-0.5 text-xs bg-modern-warning-alpha text-modern-warning rounded-full">
                  {stats.comments.pending} pending
                </span>
              )}
            </Link>
            
            <Link 
              to="/users" 
              className="flex items-center gap-2 text-modern-text-secondary hover:text-modern-primary transition-colors"
            >
              <Users className="w-4 h-4" />
              <span className="text-2xl font-bold text-modern-text-primary">{stats.users}</span>
              <span>Users</span>
            </Link>
            
            {stats.views !== undefined && (
              <div className="flex items-center gap-2 text-modern-text-secondary">
                <Eye className="w-4 h-4" />
                <span className="text-2xl font-bold text-modern-text-primary">{stats.views.toLocaleString()}</span>
                <span>Views Today</span>
                <TrendingUp className="w-4 h-4 text-modern-success ml-1" />
              </div>
            )}
          </div>
        </div>
        
        {/* Theme and Version Info */}
        <div className="pt-4 border-t border-modern-border-primary">
          <div className="flex items-center justify-between text-sm text-modern-text-secondary">
            <div>
              <span className="font-medium">Active theme:</span>{' '}
              <Link to="/appearance/themes" className="text-modern-primary hover:underline">
                {theme}
              </Link>
            </div>
            <div>
              <span className="font-medium">Running:</span> {version}
            </div>
          </div>
          
          {/* Quick Actions */}
          <div className="mt-3 flex flex-wrap gap-2">
            <Link 
              to="/appearance/customize" 
              className="inline-flex items-center px-3 py-1 text-sm bg-modern-primary text-white rounded hover:bg-modern-primary-hover transition-colors"
            >
              Customize Your Site
            </Link>
            <Link
              to="/appearance/menus"
              className="inline-flex items-center px-3 py-1 text-sm border border-modern-border-primary text-modern-text-primary rounded hover:bg-modern-bg-hover transition-colors"
            >
              Manage Menus
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AtAGlanceWidget;