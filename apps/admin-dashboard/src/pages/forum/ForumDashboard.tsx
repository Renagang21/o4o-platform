import { FC } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare, Users, FileText, TrendingUp, AlertTriangle, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

const ForumDashboard: FC = () => {
  const stats = [
    { label: '총 게시글', value: '1,234', icon: FileText, color: 'text-blue-600' },
    { label: '활성 사용자', value: '456', icon: Users, color: 'text-green-600' },
    { label: '오늘의 댓글', value: '89', icon: MessageSquare, color: 'text-purple-600' },
    { label: '신고 대기', value: '12', icon: AlertTriangle, color: 'text-red-600' }
  ];

  const recentPosts = [
    { id: 1, title: '새로운 기능 업데이트 안내', author: '관리자', replies: 23, views: 156 },
    { id: 2, title: '사용자 피드백 모음', author: '김철수', replies: 45, views: 234 },
    { id: 3, title: '이벤트 참여 방법 문의', author: '이영희', replies: 12, views: 89 }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">포럼 대시보드</h1>
          <p className="text-gray-600 mt-2">커뮤니티 활동 현황 및 관리</p>
        </div>
        <div className="flex gap-2">
          <Button asChild>
            <Link to="/forum/boards">게시판 관리</Link>
          </Button>
          <Button variant="outline" asChild>
            <Link to="/forum/settings">설정</Link>
          </Button>
        </div>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, index) => (
          <Card key={index}>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">{stat.label}</p>
                  <p className="text-2xl font-bold">{stat.value}</p>
                </div>
                <stat.icon className={`w-8 h-8 ${stat.color} opacity-80`} />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 활동 현황 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              최근 게시글
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentPosts.map(post => (
                <div key={post.id} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-lg">
                  <div>
                    <h4 className="font-medium">{post.title}</h4>
                    <p className="text-sm text-gray-500">작성자: {post.author}</p>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <p>답글 {post.replies}</p>
                    <p>조회 {post.views}</p>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4">
              <Button variant="outline" className="w-full" asChild>
                <Link to="/forum/posts">모든 게시글 보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              실시간 활동
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                <span>김민수님이 새 글을 작성했습니다</span>
                <span className="text-gray-500">방금</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-blue-500 rounded-full" />
                <span>박지영님이 댓글을 남겼습니다</span>
                <span className="text-gray-500">2분 전</span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <div className="w-2 h-2 bg-purple-500 rounded-full" />
                <span>이철호님이 게시글을 추천했습니다</span>
                <span className="text-gray-500">5분 전</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 관리 바로가기 */}
      <Card>
        <CardHeader>
          <CardTitle>빠른 관리</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Button variant="outline" asChild>
              <Link to="/forum/categories">카테고리 관리</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/forum/comments">댓글 관리</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/forum/reports">신고 관리</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/forum/settings">포럼 설정</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ForumDashboard;