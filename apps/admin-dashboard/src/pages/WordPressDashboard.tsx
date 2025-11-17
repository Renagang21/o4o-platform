import { FC } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  FileTextIcon,
  MessageSquare,
  BarChart3,
  TrendingUp,
  Users,
  ShoppingCart,
  Package
} from 'lucide-react';
import { VERSION_DISPLAY } from '@/config/version';
import PendingApplicationsWidget from '@/components/widgets/PendingApplicationsWidget';

/**
 * WordPress 스타일 메인 대시보드
 * WordPress.com의 wp-admin 대시보드와 유사한 구조
 */
const WordPressDashboard: FC = () => {
  // 빠른 통계
  const stats = {
    posts: 24,
    pages: 8,
    comments: 156,
    users: 42
  };

  return (
    <div className="wordpress-dashboard">
      {/* 배포 테스트 배너 - 매우 눈에 띄게! */}
      <div className="bg-gradient-to-r from-red-500 via-yellow-500 to-green-500 text-white p-8 rounded-2xl shadow-2xl mb-6 animate-pulse">
        <h1 className="text-4xl font-bold mb-3">🎊 배포 성공 {VERSION_DISPLAY}! 🎊</h1>
        <p className="text-xl">정확한 경로: /admin (대시보드)</p>
        <p className="text-lg mt-2">최종 업데이트: {new Date().toLocaleString('ko-KR')}</p>
        <p className="text-md mt-1 opacity-90">GitHub Actions 자동 배포 완료 ✅</p>
      </div>

      {/* 페이지 타이틀 */}
      <h1 className="text-2xl font-semibold mb-6">대시보드 - {VERSION_DISPLAY} Updated</h1>

      {/* Welcome Panel - WordPress 스타일 */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6 border-4 border-green-500">
        <h2 className="text-lg font-semibold mb-4">O4O 플랫폼에 오신 것을 환영합니다! ({VERSION_DISPLAY})</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h3 className="font-medium mb-2">시작하기</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link to="/themes/customize" className="text-blue-600 hover:text-blue-800">
                  사이트 사용자 정의하기
                </Link>
              </li>
              <li>
                <Link to="/posts/new" className="text-blue-600 hover:text-blue-800">
                  첫 블로그 글 작성하기
                </Link>
              </li>
              <li>
                <Link to="/pages/new" className="text-blue-600 hover:text-blue-800">
                  정보 페이지 추가하기
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">다음 단계</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link to="/appearance/menus" className="text-blue-600 hover:text-blue-800">
                  메뉴 설정하기
                </Link>
              </li>
              <li>
                <Link to="/media" className="text-blue-600 hover:text-blue-800">
                  미디어 관리하기
                </Link>
              </li>
              <li>
                <Link to="/users" className="text-blue-600 hover:text-blue-800">
                  사용자 관리하기
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="font-medium mb-2">더 많은 작업</h3>
            <ul className="space-y-1 text-sm">
              <li>
                <Link to="/ecommerce/products" className="text-blue-600 hover:text-blue-800">
                  제품 관리하기
                </Link>
              </li>
              <li>
                <Link to="/settings" className="text-blue-600 hover:text-blue-800">
                  설정 관리하기
                </Link>
              </li>
              <li>
                <a href="https://docs.neture.co.kr" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800">
                  도움말 보기
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* 대시보드 위젯들 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 한눈에 보기 위젯 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-medium">한눈에 보기</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-4">
              <Link to="/posts" className="flex items-center gap-3 p-3 rounded hover:bg-gray-50">
                <FileText className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-2xl font-semibold">{stats.posts}</div>
                  <div className="text-sm text-gray-600">글</div>
                </div>
              </Link>
              <Link to="/pages" className="flex items-center gap-3 p-3 rounded hover:bg-gray-50">
                <FileTextIcon className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-2xl font-semibold">{stats.pages}</div>
                  <div className="text-sm text-gray-600">페이지</div>
                </div>
              </Link>
              <Link to="/comments" className="flex items-center gap-3 p-3 rounded hover:bg-gray-50">
                <MessageSquare className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-2xl font-semibold">{stats.comments}</div>
                  <div className="text-sm text-gray-600">댓글</div>
                </div>
              </Link>
              <Link to="/users" className="flex items-center gap-3 p-3 rounded hover:bg-gray-50">
                <Users className="w-5 h-5 text-gray-600" />
                <div>
                  <div className="text-2xl font-semibold">{stats.users}</div>
                  <div className="text-sm text-gray-600">사용자</div>
                </div>
              </Link>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-sm text-gray-600">
                WordPress 6.4.2 실행 중 | <Link to="/themes" className="text-blue-600 hover:text-blue-800">테마: O4O Theme</Link>
              </p>
            </div>
          </div>
        </div>

        {/* 활동 위젯 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-medium">활동</h3>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div>
                <h4 className="font-medium text-sm mb-2">최근 게시됨</h4>
                <ul className="space-y-1 text-sm">
                  <li className="flex justify-between">
                    <Link to="/posts/1" className="text-blue-600 hover:text-blue-800">
                      새로운 제품 출시 안내
                    </Link>
                    <span className="text-gray-500">12월 28일</span>
                  </li>
                  <li className="flex justify-between">
                    <Link to="/posts/2" className="text-blue-600 hover:text-blue-800">
                      연말 프로모션 이벤트
                    </Link>
                    <span className="text-gray-500">12월 25일</span>
                  </li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium text-sm mb-2">최근 댓글</h4>
                <ul className="space-y-1 text-sm">
                  <li>
                    <span className="text-gray-600">김철수</span>님이{' '}
                    <Link to="/posts/1" className="text-blue-600 hover:text-blue-800">
                      새로운 제품 출시 안내
                    </Link>
                    에 댓글을 남겼습니다
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* 빠른 초안 위젯 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3">
            <h3 className="font-medium">빠른 초안</h3>
          </div>
          <div className="p-4">
            <form className="space-y-3">
              <input
                type="text"
                placeholder="제목"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <textarea
                placeholder="무엇에 대해 쓰고 싶으신가요?"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="button"
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                초안 저장
              </button>
            </form>
          </div>
        </div>

        {/* 통계 위젯 */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
            <h3 className="font-medium">사이트 통계</h3>
            <Link to="/analytics" className="text-sm text-blue-600 hover:text-blue-800">
              더 보기 →
            </Link>
          </div>
          <div className="p-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm">오늘 방문자</span>
                </div>
                <span className="font-semibold">1,234</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-blue-600" />
                  <span className="text-sm">이번 주 페이지뷰</span>
                </div>
                <span className="font-semibold">8,765</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-purple-600" />
                  <span className="text-sm">오늘 주문</span>
                </div>
                <span className="font-semibold">23</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-600" />
                  <span className="text-sm">재고 부족 제품</span>
                </div>
                <span className="font-semibold text-orange-600">5</span>
              </div>
            </div>
          </div>
        </div>

        {/* 역할 신청 관리 위젯 */}
        <PendingApplicationsWidget />
      </div>

      {/* WordPress 뉴스 피드 */}
      <div className="mt-6 bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="border-b border-gray-200 px-4 py-3">
          <h3 className="font-medium">O4O 플랫폼 뉴스</h3>
        </div>
        <div className="p-4">
          <ul className="space-y-2 text-sm">
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-800">
                O4O 플랫폼 v2.0 출시 예정 - 새로운 기능 소개
              </a>
              <div className="text-gray-500 text-xs mt-1">2024년 1월 2일</div>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-800">
                보안 업데이트: 중요한 패치가 적용되었습니다
              </a>
              <div className="text-gray-500 text-xs mt-1">2023년 12월 28일</div>
            </li>
            <li>
              <a href="#" className="text-blue-600 hover:text-blue-800">
                새로운 테마와 플러그인이 추가되었습니다
              </a>
              <div className="text-gray-500 text-xs mt-1">2023년 12월 25일</div>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default WordPressDashboard;