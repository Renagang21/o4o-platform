import { NavLink } from 'react-router-dom';
import { Activity, Mail, Phone, MapPin } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300">
      {/* Main Footer */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <NavLink to="/" className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 flex items-center justify-center">
                <Activity className="w-5 h-5 text-white" />
              </div>
              <span className="font-bold text-xl text-white">GlycoPharm</span>
            </NavLink>
            <p className="text-sm text-slate-400 mb-4">
              약사를 위한 혈당관리 전문 B2B 플랫폼.
              CGM, 혈당측정기, 건강기능식품을 만나보세요.
            </p>
            <a
              href="mailto:support@glycopharm.co.kr"
              className="flex items-center gap-2 text-sm hover:text-white transition-colors"
            >
              <Mail className="w-4 h-4" />
              support@glycopharm.co.kr
            </a>
          </div>

          {/* 서비스 */}
          <div>
            <h4 className="font-semibold text-white mb-4">서비스</h4>
            <ul className="space-y-2">
              <li>
                <NavLink to="/forum" className="text-sm hover:text-white transition-colors">
                  포럼
                </NavLink>
              </li>
              <li>
                <NavLink to="/education" className="text-sm hover:text-white transition-colors">
                  교육/자료
                </NavLink>
              </li>
            </ul>
          </div>

          {/* 참여하기 */}
          <div>
            <h4 className="font-semibold text-white mb-4">참여하기</h4>
            <ul className="space-y-2">
              <li>
                <NavLink to="/register" className="text-sm hover:text-white transition-colors">
                  약국 입점 신청
                </NavLink>
              </li>
              <li>
                <NavLink to="/contact" className="text-sm hover:text-white transition-colors">
                  제휴/파트너 문의
                </NavLink>
              </li>
            </ul>
          </div>

          {/* 고객지원 */}
          <div>
            <h4 className="font-semibold text-white mb-4">고객지원</h4>
            <ul className="space-y-2">
              <li>
                <NavLink to="/contact" className="text-sm hover:text-white transition-colors">
                  문의하기
                </NavLink>
              </li>
            </ul>
            <div className="mt-4 pt-4 border-t border-slate-700">
              <p className="text-sm flex items-center gap-2">
                <Phone className="w-4 h-4" />
                02-0000-0000
              </p>
              <p className="text-xs text-slate-500 mt-1">
                평일 09:00 - 18:00
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-col md:flex-row items-center gap-4 text-sm text-slate-500">
              <p>&copy; 2025 GlycoPharm. All rights reserved.</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-xs text-slate-600">
                <MapPin className="w-3 h-3" />
                <span>서울특별시 서초구 강남대로 000, 0층</span>
              </div>
            </div>
          </div>

          {/* 사업자 정보 */}
          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-600 text-center md:text-left">
            <p>
              (주)글라이코팜 | 대표: 홍길동 | 사업자등록번호: 000-00-00000 | 통신판매업: 2025-서울서초-0000
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
