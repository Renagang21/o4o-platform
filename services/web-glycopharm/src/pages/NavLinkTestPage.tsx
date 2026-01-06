/**
 * NavLink Test Page
 * NavLink 네비게이션 문제 디버깅용 테스트 페이지
 */

import { NavLink, Link, useNavigate } from 'react-router-dom';

export default function NavLinkTestPage() {
  const navigate = useNavigate();

  const handleButtonClick = (path: string) => {
    console.log('Button click - navigating to:', path);
    navigate(path);
  };

  const handleLinkClick = (e: React.MouseEvent, path: string) => {
    console.log('Link clicked:', path);
    console.log('Event:', e);
    console.log('defaultPrevented:', e.defaultPrevented);
  };

  return (
    <div className="min-h-screen bg-slate-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-slate-800 mb-8">NavLink Test Page</h1>

        {/* Test 1: 기본 NavLink */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Test 1: Basic NavLink</h2>
          <div className="flex gap-4 flex-wrap">
            <NavLink
              to="/pharmacy"
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              onClick={(e) => handleLinkClick(e, '/pharmacy')}
            >
              /pharmacy (대시보드)
            </NavLink>
            <NavLink
              to="/pharmacy/signage/my"
              className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              onClick={(e) => handleLinkClick(e, '/pharmacy/signage/my')}
            >
              /pharmacy/signage/my
            </NavLink>
            <NavLink
              to="/pharmacy/market-trial"
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
              onClick={(e) => handleLinkClick(e, '/pharmacy/market-trial')}
            >
              /pharmacy/market-trial
            </NavLink>
            <NavLink
              to="/forum-ext"
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600"
              onClick={(e) => handleLinkClick(e, '/forum-ext')}
            >
              /forum-ext (포럼)
            </NavLink>
          </div>
        </div>

        {/* Test 2: 기본 Link */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Test 2: Basic Link (not NavLink)</h2>
          <div className="flex gap-4 flex-wrap">
            <Link
              to="/pharmacy/signage/my"
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
              onClick={(e) => handleLinkClick(e, '/pharmacy/signage/my')}
            >
              Link to /pharmacy/signage/my
            </Link>
            <Link
              to="/pharmacy/market-trial"
              className="px-4 py-2 bg-teal-500 text-white rounded-lg hover:bg-teal-600"
              onClick={(e) => handleLinkClick(e, '/pharmacy/market-trial')}
            >
              Link to /pharmacy/market-trial
            </Link>
          </div>
        </div>

        {/* Test 3: useNavigate */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Test 3: useNavigate (button)</h2>
          <div className="flex gap-4 flex-wrap">
            <button
              onClick={() => handleButtonClick('/pharmacy/signage/my')}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
            >
              navigate('/pharmacy/signage/my')
            </button>
            <button
              onClick={() => handleButtonClick('/pharmacy/market-trial')}
              className="px-4 py-2 bg-pink-500 text-white rounded-lg hover:bg-pink-600"
            >
              navigate('/pharmacy/market-trial')
            </button>
          </div>
        </div>

        {/* Test 4: 일반 a 태그 (비교용) */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Test 4: Regular &lt;a&gt; tag (full reload expected)</h2>
          <div className="flex gap-4 flex-wrap">
            <a
              href="/pharmacy/signage/my"
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              &lt;a href&gt; to /pharmacy/signage/my
            </a>
            <a
              href="/pharmacy/market-trial"
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              &lt;a href&gt; to /pharmacy/market-trial
            </a>
          </div>
        </div>

        {/* Test 5: 카드 스타일 NavLink (대시보드와 동일) */}
        <div className="bg-white rounded-xl p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Test 5: Card-style NavLink (same as Dashboard)</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <NavLink
              to="/pharmacy/signage/my"
              className="p-5 border border-slate-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all group"
              onClick={(e) => handleLinkClick(e, '/pharmacy/signage/my')}
            >
              <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-3">
                <span className="text-2xl">📺</span>
              </div>
              <h3 className="font-semibold text-slate-800">Signage</h3>
              <p className="text-sm text-slate-500 mt-1">/pharmacy/signage/my</p>
            </NavLink>

            <NavLink
              to="/pharmacy/market-trial"
              className="p-5 border border-slate-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all group"
              onClick={(e) => handleLinkClick(e, '/pharmacy/market-trial')}
            >
              <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center mb-3">
                <span className="text-2xl">🧪</span>
              </div>
              <h3 className="font-semibold text-slate-800">Market Trial</h3>
              <p className="text-sm text-slate-500 mt-1">/pharmacy/market-trial</p>
            </NavLink>

            <NavLink
              to="/forum-ext"
              className="p-5 border border-slate-200 rounded-xl hover:border-primary-300 hover:shadow-md transition-all group"
              onClick={(e) => handleLinkClick(e, '/forum-ext')}
            >
              <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-3">
                <span className="text-2xl">💬</span>
              </div>
              <h3 className="font-semibold text-slate-800">Forum</h3>
              <p className="text-sm text-slate-500 mt-1">/forum-ext</p>
            </NavLink>
          </div>
        </div>

        {/* 현재 URL 표시 */}
        <div className="bg-slate-800 text-white rounded-xl p-6">
          <h2 className="text-xl font-semibold mb-4">Current Location</h2>
          <p className="font-mono">{window.location.href}</p>
          <p className="text-slate-400 mt-2 text-sm">
            콘솔(F12)을 열고 클릭 이벤트를 확인하세요.
          </p>
        </div>
      </div>
    </div>
  );
}
