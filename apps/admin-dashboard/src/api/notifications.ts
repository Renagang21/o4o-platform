import type { 
  Notification, 
  NotificationListResponse, 
  NotificationActionResponse,
  NotificationFilters,
  NotificationSortOptions,
  NotificationSettings,
  UpdateNotification,
  CommentNotification
} from '@/types/notifications';

// Mock data for demonstration
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'update',
    updateType: 'plugin',
    title: 'WordPress 플러그인 업데이트',
    message: '3개의 플러그인에 새로운 업데이트가 있습니다.',
    timestamp: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30분 전
    status: 'unread',
    priority: 'medium',
    link: '/plugins',
    version: '2.3.1',
    requiresAction: true,
    autoUpdateAvailable: true
  } as UpdateNotification,
  {
    id: '2',
    type: 'update',
    updateType: 'security',
    title: '보안 업데이트 가능',
    message: '중요한 보안 패치가 포함된 업데이트입니다.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2시간 전
    status: 'unread',
    priority: 'high',
    link: '/updates/security',
    version: '6.4.2',
    requiresAction: true,
    autoUpdateAvailable: false
  } as UpdateNotification,
  {
    id: '3',
    type: 'comment',
    postId: 'post-123',
    postTitle: '새로운 기능 소개',
    commentId: 'comment-456',
    authorName: '김철수',
    authorEmail: 'kim@example.com',
    commentExcerpt: '정말 유용한 기능이네요! 언제부터 사용 가능한가요?',
    title: '새 댓글이 달렸습니다',
    message: '"새로운 기능 소개" 글에 김철수님이 댓글을 남겼습니다.',
    timestamp: new Date(Date.now() - 1000 * 60 * 60 * 5).toISOString(), // 5시간 전
    status: 'unread',
    priority: 'low',
    link: '/comments?id=comment-456'
  } as CommentNotification
];

class NotificationApi {
  private notifications: Notification[] = [...mockNotifications];
  private settings: NotificationSettings = {
    enableNotifications: true,
    enableEmailNotifications: true,
    enablePushNotifications: false,
    notificationTypes: {
      updates: true,
      comments: true,
      system: true,
      security: true
    },
    emailFrequency: 'daily',
    retentionDays: 30,
    soundEnabled: true,
    desktopNotifications: false
  };

  // Fetch notifications with filters
  async getNotifications(
    filters?: NotificationFilters,
    sort?: NotificationSortOptions,
    limit: number = 20,
    cursor?: string
  ): Promise<NotificationListResponse> {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 300));

    let filtered = [...this.notifications];

    // Apply filters
    if (filters) {
      if (filters.types && filters.types.length > 0) {
        filtered = filtered.filter(n => filters.types!.includes(n.type));
      }
      if (filters.status) {
        filtered = filtered.filter(n => n.status === filters.status);
      }
      if (filters.priority) {
        filtered = filtered.filter(n => n.priority === filters.priority);
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filtered = filtered.filter(n => 
          n.title.toLowerCase().includes(searchLower) ||
          n.message.toLowerCase().includes(searchLower)
        );
      }
    }

    // Apply sorting
    if (sort) {
      filtered.sort((a, b) => {
        let comparison = 0;
        
        switch (sort.field) {
          case 'timestamp':
            comparison = new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            break;
          case 'priority':
            const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
            comparison = priorityOrder[b.priority] - priorityOrder[a.priority];
            break;
          case 'type':
            comparison = a.type.localeCompare(b.type);
            break;
        }
        
        return sort.order === 'asc' ? -comparison : comparison;
      });
    } else {
      // Default sort by timestamp desc
      filtered.sort((a, b) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }

    // Apply pagination
    const startIndex = cursor ? parseInt(cursor) : 0;
    const paged = filtered.slice(startIndex, startIndex + limit);

    return {
      notifications: paged,
      total: filtered.length,
      unread: filtered.filter(n => n.status === 'unread').length,
      hasMore: startIndex + limit < filtered.length,
      nextCursor: startIndex + limit < filtered.length 
        ? String(startIndex + limit) 
        : undefined
    };
  }

  // Get notification counts by type
  async getNotificationCounts(): Promise<Record<string, number>> {
    await new Promise(resolve => setTimeout(resolve, 100));

    const counts = {
      total: this.notifications.length,
      unread: this.notifications.filter(n => n.status === 'unread').length,
      update: this.notifications.filter(n => n.type === 'update' && n.status === 'unread').length,
      comment: this.notifications.filter(n => n.type === 'comment' && n.status === 'unread').length,
      system: this.notifications.filter(n => n.type === 'system' && n.status === 'unread').length,
      security: this.notifications.filter(n => n.type === 'security' && n.status === 'unread').length
    };

    return counts;
  }

  // Mark notification as read
  async markAsRead(notificationId: string): Promise<NotificationActionResponse> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) {
      return {
        success: false,
        message: 'Notification not found'
      };
    }

    notification.status = 'read';
    return {
      success: true,
      notification
    };
  }

  // Mark all notifications as read
  async markAllAsRead(type?: 'update' | 'comment' | 'system' | 'security'): Promise<NotificationActionResponse> {
    await new Promise(resolve => setTimeout(resolve, 300));

    const toUpdate = type 
      ? this.notifications.filter(n => n.type === type && n.status === 'unread')
      : this.notifications.filter(n => n.status === 'unread');

    toUpdate.forEach(n => {
      n.status = 'read';
    });

    return {
      success: true,
      message: `${toUpdate.length}개의 알림을 읽음 처리했습니다.`
    };
  }

  // Delete notification
  async deleteNotification(notificationId: string): Promise<NotificationActionResponse> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const index = this.notifications.findIndex(n => n.id === notificationId);
    if (index === -1) {
      return {
        success: false,
        message: 'Notification not found'
      };
    }

    this.notifications.splice(index, 1);
    return {
      success: true,
      message: '알림이 삭제되었습니다.'
    };
  }

  // Archive notification
  async archiveNotification(notificationId: string): Promise<NotificationActionResponse> {
    await new Promise(resolve => setTimeout(resolve, 200));

    const notification = this.notifications.find(n => n.id === notificationId);
    if (!notification) {
      return {
        success: false,
        message: 'Notification not found'
      };
    }

    notification.status = 'archived';
    return {
      success: true,
      notification
    };
  }

  // Get notification settings
  async getSettings(): Promise<NotificationSettings> {
    await new Promise(resolve => setTimeout(resolve, 100));
    return { ...this.settings };
  }

  // Update notification settings
  async updateSettings(settings: Partial<NotificationSettings>): Promise<NotificationSettings> {
    await new Promise(resolve => setTimeout(resolve, 300));
    
    this.settings = {
      ...this.settings,
      ...settings
    };
    
    return { ...this.settings };
  }

  // Add new notification (for testing/simulation)
  async addNotification(notification: Omit<Notification, 'id'>): Promise<Notification> {
    await new Promise(resolve => setTimeout(resolve, 200));
    
    const newNotification: Notification = {
      ...notification,
      id: String(Date.now())
    } as Notification;
    
    this.notifications.unshift(newNotification);
    return newNotification;
  }

  // Simulate real-time notification
  subscribeToNotifications(callback: (notification: Notification) => void): () => void {
    // Simulate random notifications
    const interval = setInterval(() => {
      if (Math.random() > 0.8) { // 20% chance every 30 seconds
        const types = ['update', 'comment', 'system'] as const;
        const type = types[Math.floor(Math.random() * types.length)];
        
        let notification: Notification;
        
        switch (type) {
          case 'update':
            notification = {
              id: String(Date.now()),
              type: 'update',
              updateType: 'plugin',
              title: '새로운 업데이트',
              message: '플러그인 업데이트가 있습니다.',
              timestamp: new Date().toISOString(),
              status: 'unread',
              priority: 'medium',
              link: '/updates'
            } as UpdateNotification;
            break;
            
          case 'comment':
            notification = {
              id: String(Date.now()),
              type: 'comment',
              postId: 'post-' + Math.random(),
              postTitle: '샘플 포스트',
              commentId: 'comment-' + Math.random(),
              authorName: '사용자',
              commentExcerpt: '새로운 댓글입니다.',
              title: '새 댓글',
              message: '새로운 댓글이 달렸습니다.',
              timestamp: new Date().toISOString(),
              status: 'unread',
              priority: 'low',
              link: '/comments'
            } as CommentNotification;
            break;
            
          default:
            notification = {
              id: String(Date.now()),
              type: 'system',
              category: 'info',
              title: '시스템 알림',
              message: '시스템 메시지입니다.',
              timestamp: new Date().toISOString(),
              status: 'unread',
              priority: 'low'
            } as Notification;
        }
        
        this.notifications.unshift(notification);
        callback(notification);
      }
    }, 30000); // Check every 30 seconds
    
    // Return unsubscribe function
    return () => clearInterval(interval);
  }
}

export const notificationApi = new NotificationApi();