import React from 'react';
import { Activity, FileText, MessageCircle, Edit, User } from 'lucide-react';

interface ActivityItem {
  id: string;
  type: 'post' | 'comment' | 'edit' | 'user';
  title: string;
  description: string;
  date: string;
  author: string;
  link?: string;
}

export function ActivityWidget() {
  const activities: ActivityItem[] = [
    {
      id: '1',
      type: 'post',
      title: '새로운 제품 소개',
      description: '관리자가 글을 발행했습니다',
      date: '2시간 전',
      author: '관리자',
      link: '/admin/posts/123'
    },
    {
      id: '2',
      type: 'comment',
      title: '"고객 서비스 개선"에 대한 댓글',
      description: '김철수가 댓글을 남겼습니다',
      date: '4시간 전',
      author: '김철수',
      link: '/admin/comments'
    },
    {
      id: '3',
      type: 'edit',
      title: '회사 소개 페이지',
      description: '에디터가 페이지를 수정했습니다',
      date: '6시간 전',
      author: '에디터',
      link: '/admin/pages/456'
    },
    {
      id: '4',
      type: 'user',
      title: '새 사용자 등록',
      description: '이영희가 회원가입했습니다',
      date: '1일 전',
      author: '시스템',
      link: '/admin/users'
    },
    {
      id: '5',
      type: 'post',
      title: '마케팅 전략 업데이트',
      description: '관리자가 글을 초안으로 저장했습니다',
      date: '2일 전',
      author: '관리자',
      link: '/admin/posts/789'
    }
  ];

  const getActivityIcon = (type: ActivityItem['type']) => {
    switch (type) {
      case 'post':
        return <FileText className="h-4 w-4 text-blue-600" />;
      case 'comment':
        return <MessageCircle className="h-4 w-4 text-green-600" />;
      case 'edit':
        return <Edit className="h-4 w-4 text-yellow-600" />;
      case 'user':
        return <User className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="border-b border-gray-200 px-4 py-3">
        <h3 className="text-lg font-medium text-gray-900 flex items-center">
          <Activity className="h-5 w-5 mr-2 text-green-600" />
          최근 활동
        </h3>
      </div>

      {/* Widget Content */}
      <div className="p-4">
        {activities.length > 0 ? (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3 py-2">
                {/* Activity Icon */}
                <div className="flex-shrink-0 mt-1">
                  <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                    {getActivityIcon(activity.type)}
                  </div>
                </div>

                {/* Activity Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {activity.link ? (
                        <a 
                          href={activity.link} 
                          className="hover:text-blue-600 transition-colors"
                        >
                          {activity.title}
                        </a>
                      ) : (
                        activity.title
                      )}
                    </p>
                    <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                      {activity.date}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    작성자: {activity.author}
                  </p>
                </div>
              </div>
            ))}

            {/* View All Link */}
            <div className="border-t border-gray-200 pt-4">
              <a 
                href="/admin/activity" 
                className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              >
                모든 활동 보기 →
              </a>
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Activity className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">최근 활동이 없습니다.</p>
          </div>
        )}
      </div>
    </div>
  );
}