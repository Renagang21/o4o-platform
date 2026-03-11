/**
 * CommunityPage - 커뮤니티 허브
 *
 * Work Order: WO-O4O-NETURE-COMMUNITY-PAGE-V1
 *
 * 3개 섹션: Announcements, Forum, Digital Signage
 */

import { Link } from 'react-router-dom';
import { Bell, MessageSquare, Monitor, ArrowRight } from 'lucide-react';

export default function CommunityPage() {
  return (
    <div className="min-h-screen">
      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-600 to-primary-800 text-white py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h1 className="text-3xl font-bold mb-3">Community</h1>
          <p className="text-lg text-white/80">
            공지사항, 포럼, 디지털 사이니지 안내
          </p>
        </div>
      </section>

      {/* Sections */}
      <section className="py-16">
        <div className="max-w-5xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Announcements */}
            <Link
              to="/community/announcements"
              className="group p-8 bg-white rounded-2xl border border-gray-200 hover:border-amber-300 hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-amber-100 rounded-xl flex items-center justify-center mb-6">
                <Bell className="w-7 h-7 text-amber-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Announcements</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                플랫폼 공지와 업데이트 안내
              </p>
              <span className="inline-flex items-center text-sm font-medium text-amber-600 group-hover:text-amber-700">
                공지 보기
                <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>

            {/* Forum */}
            <Link
              to="/community/forum"
              className="group p-8 bg-white rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-primary-100 rounded-xl flex items-center justify-center mb-6">
                <MessageSquare className="w-7 h-7 text-primary-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Forum</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                공급자, 파트너, 판매자 커뮤니티
              </p>
              <span className="inline-flex items-center text-sm font-medium text-primary-600 group-hover:text-primary-700">
                포럼 참여
                <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>

            {/* Digital Signage */}
            <Link
              to="/community/signage"
              className="group p-8 bg-white rounded-2xl border border-gray-200 hover:border-violet-300 hover:shadow-lg transition-all"
            >
              <div className="w-14 h-14 bg-violet-100 rounded-xl flex items-center justify-center mb-6">
                <Monitor className="w-7 h-7 text-violet-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900 mb-3">Digital Signage</h2>
              <p className="text-gray-600 text-sm leading-relaxed mb-6">
                매장에서 사용하는 디지털 콘텐츠 안내
              </p>
              <span className="inline-flex items-center text-sm font-medium text-violet-600 group-hover:text-violet-700">
                Signage 보기
                <ArrowRight className="ml-1 w-4 h-4" />
              </span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
