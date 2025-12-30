/**
 * Footer Component
 *
 * Phase G-2: B2C 핵심 기능 확장
 */

import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-white font-bold text-xl mb-4">Neture</h3>
            <p className="text-sm mb-4">
              건강, 뷰티, 푸드, 라이프스타일 분야의 엄선된 상품을 제공합니다.
              신뢰할 수 있는 파트너들과 함께 최고의 품질을 약속합니다.
            </p>
            <p className="text-sm">O4O Platform Service</p>
          </div>

          {/* Links */}
          <div>
            <h4 className="text-white font-semibold mb-4">카테고리</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/products?category=healthcare" className="hover:text-white">
                  건강관리
                </Link>
              </li>
              <li>
                <Link to="/products?category=beauty" className="hover:text-white">
                  뷰티
                </Link>
              </li>
              <li>
                <Link to="/products?category=food" className="hover:text-white">
                  푸드
                </Link>
              </li>
              <li>
                <Link to="/products?category=lifestyle" className="hover:text-white">
                  라이프스타일
                </Link>
              </li>
            </ul>
          </div>

          {/* Support */}
          <div>
            <h4 className="text-white font-semibold mb-4">고객지원</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <span className="hover:text-white cursor-pointer">
                  이용약관
                </span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer">
                  개인정보처리방침
                </span>
              </li>
              <li>
                <span className="hover:text-white cursor-pointer">
                  고객센터
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-sm">
          <p>© 2025 Neture. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
