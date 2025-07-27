import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { MessageSquare, Users, FileText, Settings, Shield, Folder } from 'lucide-react';
import { Suspense, lazy } from 'react';
import { Button } from '@/components/ui/button';

// Lazy load forum components
const ForumBoardList = lazy(() => import('./forum/ForumBoardList'));
const ForumPostDetail = lazy(() => import('./forum/ForumPostDetail'));
const ForumPostForm = lazy(() => import('./forum/ForumPostForm'));
const ForumCategories = lazy(() => import('./forum/ForumCategories'));

const PageLoader = () => (
  <div className="flex items-center justify-center h-96">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-modern-primary"></div>
  </div>
);

const ForumApp = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isMainPage = location.pathname === '/forum';

  if (!isMainPage) {
    return (
      <Routes>
        <Route path="/" element={
          <Suspense fallback={<PageLoader />}>
            <ForumBoardList />
          </Suspense>
        } />
        <Route path="/posts/new" element={
          <Suspense fallback={<PageLoader />}>
            <ForumPostForm />
          </Suspense>
        } />
        <Route path="/posts/:id" element={
          <Suspense fallback={<PageLoader />}>
            <ForumPostDetail />
          </Suspense>
        } />
        <Route path="/posts/:id/edit" element={
          <Suspense fallback={<PageLoader />}>
            <ForumPostForm />
          </Suspense>
        } />
        <Route path="/categories" element={
          <Suspense fallback={<PageLoader />}>
            <ForumCategories />
          </Suspense>
        } />
      </Routes>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-modern-text-primary flex items-center gap-2">
            <MessageSquare className="w-8 h-8 text-modern-primary" />
            포럼 관리
          </h1>
          <p className="text-modern-text-secondary mt-1">
            커뮤니티 포럼을 관리하고 모더레이션하세요.
          </p>
        </div>
        <Button onClick={() => navigate('/forum/categories')}>
          <Settings className="w-4 h-4 mr-2" />
          포럼 설정
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">전체 게시글</p>
                <p className="text-2xl font-bold text-modern-text-primary">1,234</p>
                <p className="text-xs text-modern-success mt-1">+12% 이번 주</p>
              </div>
              <FileText className="w-8 h-8 text-modern-primary opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">활성 사용자</p>
                <p className="text-2xl font-bold text-modern-success">456</p>
                <p className="text-xs text-modern-text-secondary mt-1">최근 7일</p>
              </div>
              <Users className="w-8 h-8 text-modern-success opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">답글 수</p>
                <p className="text-2xl font-bold text-modern-warning">3,456</p>
                <p className="text-xs text-modern-success mt-1">+8% 이번 주</p>
              </div>
              <MessageSquare className="w-8 h-8 text-modern-warning opacity-20" />
            </div>
          </div>
        </div>
        <div className="wp-card">
          <div className="wp-card-body">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-modern-text-secondary">신고된 게시글</p>
                <p className="text-2xl font-bold text-modern-danger">12</p>
                <p className="text-xs text-modern-text-secondary mt-1">검토 대기</p>
              </div>
              <Shield className="w-8 h-8 text-modern-danger opacity-20" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Forum Categories */}
        <div className="lg:col-span-2 wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">포럼 카테고리</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-modern-bg-tertiary rounded-lg">
                <div>
                  <h3 className="font-medium text-modern-text-primary">일반 토론</h3>
                  <p className="text-sm text-modern-text-secondary">일반적인 주제에 대한 토론</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-modern-text-primary">234</p>
                  <p className="text-xs text-modern-text-secondary">게시글</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-modern-bg-tertiary rounded-lg">
                <div>
                  <h3 className="font-medium text-modern-text-primary">제품 리뷰</h3>
                  <p className="text-sm text-modern-text-secondary">제품에 대한 사용 후기</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-modern-text-primary">567</p>
                  <p className="text-xs text-modern-text-secondary">게시글</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 bg-modern-bg-tertiary rounded-lg">
                <div>
                  <h3 className="font-medium text-modern-text-primary">Q&A</h3>
                  <p className="text-sm text-modern-text-secondary">질문과 답변</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-modern-text-primary">433</p>
                  <p className="text-xs text-modern-text-secondary">게시글</p>
                </div>
              </div>
            </div>
            <button className="mt-4 w-full py-2 border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
              모든 카테고리 보기
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="wp-card">
          <div className="wp-card-header">
            <h2 className="text-lg font-semibold">빠른 작업</h2>
          </div>
          <div className="wp-card-body">
            <div className="space-y-3">
              <button 
                onClick={() => navigate('/forum/posts/new')}
                className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <FileText className="w-5 h-5 text-modern-primary" />
                  <div>
                    <p className="font-medium text-modern-text-primary">공지사항 작성</p>
                    <p className="text-sm text-modern-text-secondary">새 공지사항 등록</p>
                  </div>
                </div>
              </button>
              <button 
                onClick={() => navigate('/forum', { replace: true })}
                className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageSquare className="w-5 h-5 text-modern-primary" />
                  <div>
                    <p className="font-medium text-modern-text-primary">게시판 관리</p>
                    <p className="text-sm text-modern-text-secondary">전체 게시글 보기</p>
                  </div>
                </div>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <Users className="w-5 h-5 text-modern-success" />
                  <div>
                    <p className="font-medium text-modern-text-primary">사용자 관리</p>
                    <p className="text-sm text-modern-text-secondary">권한 및 차단 관리</p>
                  </div>
                </div>
              </button>
              <button className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors">
                <div className="flex items-center gap-3">
                  <Shield className="w-5 h-5 text-modern-danger" />
                  <div>
                    <p className="font-medium text-modern-text-primary">신고 검토</p>
                    <p className="text-sm text-modern-text-secondary">12개 대기 중</p>
                  </div>
                </div>
              </button>
              <button 
                onClick={() => navigate('/forum/categories')}
                className="w-full p-3 text-left border border-modern-border-primary rounded-lg hover:bg-modern-bg-hover transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Folder className="w-5 h-5 text-modern-text-secondary" />
                  <div>
                    <p className="font-medium text-modern-text-primary">카테고리 설정</p>
                    <p className="text-sm text-modern-text-secondary">포럼 카테고리 관리</p>
                  </div>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="wp-card">
        <div className="wp-card-header">
          <h2 className="text-lg font-semibold">최근 활동</h2>
        </div>
        <div className="wp-card-body">
          <div className="space-y-4">
            <div className="flex items-start gap-3 pb-4 border-b border-modern-border-primary">
              <div className="w-10 h-10 bg-modern-primary text-white rounded-full flex items-center justify-center text-sm font-medium">
                김철수
              </div>
              <div className="flex-1">
                <p className="text-sm text-modern-text-primary">
                  <span className="font-medium">김철수</span>님이 "제품 리뷰" 카테고리에 새 글을 작성했습니다
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">5분 전</p>
              </div>
            </div>
            <div className="flex items-start gap-3 pb-4 border-b border-modern-border-primary">
              <div className="w-10 h-10 bg-modern-success text-white rounded-full flex items-center justify-center text-sm font-medium">
                이영희
              </div>
              <div className="flex-1">
                <p className="text-sm text-modern-text-primary">
                  <span className="font-medium">이영희</span>님이 답글을 작성했습니다
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">15분 전</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-modern-warning text-white rounded-full flex items-center justify-center text-sm font-medium">
                박민수
              </div>
              <div className="flex-1">
                <p className="text-sm text-modern-text-primary">
                  <span className="font-medium">박민수</span>님이 게시글을 신고했습니다
                </p>
                <p className="text-xs text-modern-text-secondary mt-1">30분 전</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumApp;