import { FC } from 'react';
// import { formatDistanceToNow } from 'date-fns';
import { FileText, MessageSquare, User } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'post' | 'comment' | 'user';
  title: string;
  author?: string;
  date: Date;
  status?: string;
}

interface ActivityDashboardWidgetProps {
  showPosts?: boolean;
  showComments?: boolean;
  showUsers?: boolean;
  maxItems?: number;
}

/**
 * WordPress Activity Widget
 */
const ActivityWidget: FC<ActivityDashboardWidgetProps> = ({
  showPosts = true,
  showComments = true,
  showUsers = true,
  maxItems = 5
}) => {
  // Activity data - empty until API integration
  const recentActivity: ActivityItem[] = [];

  const getIcon = (type: string) => {
    switch (type) {
      case 'post':
        return <FileText className="w-4 h-4" />;
      case 'comment':
        return <MessageSquare className="w-4 h-4" />;
      case 'user':
        return <User className="w-4 h-4" />;
      default:
        return null;
    }
  };

  // Filter activities based on settings
  const filteredActivity = recentActivity.filter((item: any) => {
    if (item.type === 'post' && !showPosts) return false;
    if (item.type === 'comment' && !showComments) return false;
    if (item.type === 'user' && !showUsers) return false;
    return true;
  }).slice(0, maxItems);

  return (
    <div id="dashboard_activity" className="activity-widget">
      {showPosts && filteredActivity.some((item: any) => item.type === 'post') && (
        <div className="activity-block">
          <h3>Recently Published</h3>
          <ul id="published-posts" className="activity-list">
            {filteredActivity
              .filter((item: any) => item.type === 'post')
              .map((item: any) => (
              <li key={item.id}>
                <span className="activity-icon">{getIcon(item.type)}</span>
                <span>
                  {'/* date removed */'},{' '}
                  <a href={`/posts/${item.id}/edit`}>{item.title}</a>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {showComments && filteredActivity.some((item: any) => item.type === 'comment') && (
        <div className="activity-block">
          <h3>Recent Comments</h3>
          <ul id="recent-comments" className="activity-list">
            {filteredActivity
              .filter((item: any) => item.type === 'comment')
              .map((item: any) => (
              <li key={item.id}>
                <div className="dashboard-comment-wrap">
                  <span className="comment-meta">
                    From <cite className="comment-author">{item.author}</cite> on{' '}
                    <a href={`/comments/${item.id}`}>{item.title}</a>
                  </span>
                  <blockquote>
                    <p className="comment-excerpt">This is a sample comment excerpt...</p>
                  </blockquote>
                  <p className="row-actions">
                    <span className="approve">
                      <a href="#">Approve</a>
                    </span>{' '}
                    |{' '}
                    <span className="reply">
                      <a href="#">Reply</a>
                    </span>{' '}
                    |{' '}
                    <span className="edit">
                      <a href="#">Edit</a>
                    </span>{' '}
                    |{' '}
                    <span className="trash">
                      <a href="#">Trash</a>
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {showUsers && filteredActivity.some((item: any) => item.type === 'user') && (
        <div className="activity-block">
          <h3>Recent User Activity</h3>
          <ul id="recent-users" className="activity-list">
            {filteredActivity
              .filter((item: any) => item.type === 'user')
              .map((item: any) => (
              <li key={item.id}>
                <span className="activity-icon">{getIcon(item.type)}</span>
                <span>
                  {item.title}: <strong>{item.author}</strong>
                  {' '}
                  <span className="activity-time">
                    {'/* date removed */'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
      
      {filteredActivity.length === 0 && (
        <div className="no-activity">
          <p>No recent activity to display.</p>
        </div>
      )}
    </div>
  );
};

export default ActivityWidget;