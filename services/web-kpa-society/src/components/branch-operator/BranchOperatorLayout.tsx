/**
 * BranchOperatorLayout - 분회 운영자 레이아웃
 *
 * WO-KPA-C-BRANCH-OPERATOR-IMPLEMENTATION-V1
 * WO-KPA-ADMIN-OPERATOR-MENU-REALIGNMENT-V1:
 * - 콘텐츠 CRUD (공지사항, 게시판, 자료실) BranchAdmin에서 이동 추가
 * - 7개 메뉴: 대시보드, 공지사항, 게시판, 자료실, 포럼 관리, 콘텐츠 허브, 운영자 관리
 */

import { Link, Outlet, useParams, useLocation } from 'react-router-dom';

export function BranchOperatorLayout() {
  const { branchId } = useParams();
  const location = useLocation();
  const basePath = `/branch-services/${branchId}/operator`;

  const navItems = [
    { label: '대시보드', path: basePath },
    { label: '공지사항', path: `${basePath}/news` },
    { label: '게시판', path: `${basePath}/forum` },
    { label: '자료실', path: `${basePath}/docs` },
    { label: '포럼 관리', path: `${basePath}/forum-management` },
    { label: '콘텐츠 허브', path: `${basePath}/signage/content` },
    { label: '운영자 관리', path: `${basePath}/operators` },
  ];

  const isActive = (path: string) => {
    if (path === basePath) {
      return location.pathname === basePath || location.pathname === basePath + '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={`/branch-services/${branchId}`} className="text-xl font-bold text-blue-600">
              KPA Society
            </Link>
            <span className="text-slate-300">|</span>
            <span className="text-slate-600 font-medium">분회 운영자</span>
          </div>
          <nav className="flex items-center gap-6">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`text-sm transition-colors ${
                  isActive(item.path)
                    ? 'text-blue-600 font-semibold'
                    : 'text-slate-600 hover:text-blue-600'
                }`}
              >
                {item.label}
              </Link>
            ))}
            <Link
              to={`/branch-services/${branchId}`}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              분회 사이트
            </Link>
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="pb-20">
        <Outlet />
      </main>
    </div>
  );
}
