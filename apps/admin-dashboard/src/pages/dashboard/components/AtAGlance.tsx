import { useState } from 'react';
import { FileText, MessageSquare, Users, Package, Eye, Shield, Zap, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';
import { Link } from 'react-router-dom';

interface AtAGlanceProps {
  stats?: {
    posts?: number;
    pages?: number;
    comments?: number;
    users?: number;
    products?: number;
    orders?: number;
  };
}

const AtAGlance: FC<AtAGlanceProps> = ({ stats = {} }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  
  const {
    posts = 156,
    pages = 12,
    comments = 234,
    users = 1234,
    products = 89,
    orders = 45,
  } = stats;

  const currentTheme = 'O4O Modern';
  const wordpressVersion = '6.4.2';
  const phpVersion = 'PHP 8.2';

  const statItems = [
    { count: posts, label: 'Posts', icon: FileText, color: 'primary', link: '/posts' },
    { count: pages, label: 'Pages', icon: FileText, color: 'secondary', link: '/pages' },
    { count: comments, label: 'Comments', icon: MessageSquare, color: 'warning', link: '/comments' },
    { count: users, label: 'Users', icon: Users, color: 'success', link: '/users' },
    { count: products, label: 'Products', icon: Package, color: 'info', link: '/ecommerce/products' },
    { count: orders, label: 'Orders', icon: TrendingUp, color: 'error', link: '/ecommerce/orders' },
  ];

  return (
    <div className="wp-card">
      <div 
        className="wp-card-header flex items-center justify-between cursor-pointer select-none" 
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Eye className="w-5 h-5 text-primary-500" />
          At a Glance
        </h2>
        <button className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors">
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
      </div>
      
      {isExpanded && (
        <div className="wp-card-body">
          {/* Modern Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
            {statItems.map((item, index) => {
              const Icon = item.icon;
              return (
                <Link
                  key={index}
                  to={item.link}
                  className="group relative overflow-hidden rounded-lg p-4 transition-all duration-200 hover:shadow-lg hover:scale-[1.02] border"
                  style={{
                    background: `linear-gradient(135deg, var(--${item.color}-400) 0%, var(--${item.color}-600) 100%)`,
                    borderColor: `var(--${item.color}-500)`
                  }}
                >
                  <div className="relative z-10">
                    <div className="flex items-center justify-between text-white">
                      <div>
                        <div className="text-3xl font-bold">{item.count.toLocaleString()}</div>
                        <div className="text-sm opacity-90 mt-1">{item.label}</div>
                      </div>
                      <Icon className="w-8 h-8 opacity-80 group-hover:opacity-100 transition-opacity" />
                    </div>
                  </div>
                  <div className="absolute inset-0 bg-black opacity-0 group-hover:opacity-10 transition-opacity" />
                </Link>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="pt-6 border-t border-gray-200 dark:border-gray-800">
            <div className="flex flex-wrap gap-2 text-sm">
              <Link
                to="/posts/new"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Write a Post
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                to="/pages/new"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Create a Page
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                to="/ecommerce/products/new"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Add Product
              </Link>
              <span className="text-gray-400">•</span>
              <Link
                to="/media"
                className="text-primary-600 hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
              >
                Media Library
              </Link>
            </div>
          </div>

          {/* WordPress Version Info */}
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                <Shield className="w-3 h-3" />
                <span>WordPress {wordpressVersion} compatible</span>
              </div>
              <div className="flex items-center gap-1">
                <Zap className="w-3 h-3" />
                <span>{phpVersion}</span>
              </div>
              <div className="flex items-center gap-1">
                <Eye className="w-3 h-3" />
                <span>Theme: {currentTheme}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AtAGlance;