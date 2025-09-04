import React, { useState, useEffect } from 'react';
import { formatDate } from '@o4o/utils';
import { Clock, CheckCircle, XCircle, AlertCircle, User, Settings } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { api } from '@/api/base';
import toast from 'react-hot-toast';

interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  actionType: 'login' | 'logout' | 'role_change' | 'status_change' | 'profile_update' | 'approval' | 'rejection';
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  timestamp: string;
  performedBy?: {
    id: string;
    name: string;
    role: string;
  };
}

interface UserActivityLogProps {
  userId: string;
}

const getActivityIcon = (actionType: string) => {
  switch (actionType) {
    case 'login':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'logout':
      return <XCircle className="h-4 w-4 text-gray-500" />;
    case 'role_change':
      return <Settings className="h-4 w-4 text-blue-500" />;
    case 'status_change':
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case 'profile_update':
      return <User className="h-4 w-4 text-purple-500" />;
    case 'approval':
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case 'rejection':
      return <XCircle className="h-4 w-4 text-red-500" />;
    default:
      return <Clock className="h-4 w-4 text-gray-500" />;
  }
};

const getActivityBadgeColor = (actionType: string) => {
  switch (actionType) {
    case 'login':
    case 'approval':
      return 'bg-green-100 text-green-800';
    case 'logout':
      return 'bg-gray-100 text-gray-800';
    case 'role_change':
      return 'bg-blue-100 text-blue-800';
    case 'status_change':
      return 'bg-yellow-100 text-yellow-800';
    case 'profile_update':
      return 'bg-purple-100 text-purple-800';
    case 'rejection':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

export default function UserActivityLog({ userId }: UserActivityLogProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    fetchActivities();
  }, [userId, page]);

  const fetchActivities = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/v1/users/${userId}/activity-log?page=${page}&limit=20`);
      
      if (response.data.success) {
        if (page === 1) {
          setActivities(response.data.data.activities);
        } else {
          setActivities(prev => [...prev, ...response.data.data.activities]);
        }
        setHasMore(response.data.data.pagination.hasMore);
      }
    } catch (error) {
      toast.error('Failed to load activity log');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    setPage(prev => prev + 1);
  };

  const formatActivityDescription = (activity: ActivityLog) => {
    switch (activity.actionType) {
      case 'login':
        return 'User logged in';
      case 'logout':
        return 'User logged out';
      case 'role_change':
        return `Role changed from ${activity.details.oldRole} to ${activity.details.newRole}`;
      case 'status_change':
        return `Status changed from ${activity.details.oldStatus} to ${activity.details.newStatus}`;
      case 'profile_update':
        return `Profile updated: ${Object.keys(activity.details.changes || {}).join(', ')}`;
      case 'approval':
        return `User approved${activity.details.notes ? `: ${activity.details.notes}` : ''}`;
      case 'rejection':
        return `User rejected${activity.details.notes ? `: ${activity.details.notes}` : ''}`;
      default:
        return activity.action;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Activity Log</CardTitle>
        <CardDescription>
          Recent user activities and administrative actions
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading && activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">Loading activities...</div>
          </div>
        ) : activities.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-gray-500">No activities recorded yet</div>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="mt-0.5">
                  {getActivityIcon(activity.actionType)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">
                      {formatActivityDescription(activity)}
                    </span>
                    <Badge className={`text-xs ${getActivityBadgeColor(activity.actionType)}`}>
                      {activity.actionType.replace('_', ' ')}
                    </Badge>
                  </div>
                  
                  <div className="text-xs text-gray-500 space-y-1">
                    <div>
                      {formatDate(activity.timestamp, 'full')}
                    </div>
                    
                    {activity.performedBy && (
                      <div>
                        By: {activity.performedBy.name} ({activity.performedBy.role})
                      </div>
                    )}
                    
                    {activity.ipAddress && (
                      <div>
                        IP: {activity.ipAddress}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            
            {hasMore && (
              <div className="flex justify-center pt-4">
                <button
                  onClick={loadMore}
                  disabled={loading}
                  className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 disabled:text-gray-400"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}