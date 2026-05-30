/**
 * FeatureIntroPage - 비로그인 사용자를 위한 기능 안내 페이지
 *
 * WO-GLYCOPHARM-SOFT-GUARD-INTRO-V1
 *
 * 비로그인 상태에서 보호된 기능에 접근할 때 표시.
 * 로그인 페이지로 직접 보내지 않고, 기능을 설명한 뒤 로그인/회원가입 CTA를 제공.
 */

import { ArrowRight, Activity, Store, UserCircle } from 'lucide-react';
import { useLoginModal } from '@/contexts/LoginModalContext';
// WO-O4O-GLYCOPHARM-REGISTER-MODAL-ENTRY-FIX-V1
import { useRegisterModal } from '@/contexts/RegisterModalContext';

// WO-O4O-GLYCOPHARM-FRONTEND-CARE-TYPE-UNION-CLEANUP-V1 (W5d-Frontend):
//   FeatureType 에서 'care' 제거 + FEATURE_CONFIG.care 안내 카드 제거.
//   App.tsx 의 SoftGuard 호출은 feature='mypage' 만 사용 — 'care' 호출 0건.
//   Care 재도입 시 새 Care Core 의 UI 안내로 별도 설계 (IR-O4O-CARE-CORE-REINTRODUCTION-ARCHITECTURE-V1).
type FeatureType = 'store' | 'mypage';

const FEATURE_CONFIG: Record<FeatureType, {
  icon: typeof Activity;
  title: string;
  description: string;
  details: string[];
}> = {
  store: {
    icon: Store,
    title: '약국 운영 관리',
    description: '상품 관리, 주문 처리, 매출 분석 등\n약국 운영에 필요한 기능을 제공합니다.',
    details: ['상품·재고 관리', '주문 처리', '매출 분석', '디지털 사이니지'],
  },
  mypage: {
    icon: UserCircle,
    title: '내 정보',
    description: '프로필 관리와 활동 내역을\n확인할 수 있습니다.',
    details: ['프로필 관리', '활동 내역', '알림 설정'],
  },
};

interface FeatureIntroPageProps {
  feature: FeatureType;
}

export default function FeatureIntroPage({ feature }: FeatureIntroPageProps) {
  const config = FEATURE_CONFIG[feature];
  const Icon = config.icon;
  const { openLoginModal } = useLoginModal();
  const { openRegisterModal } = useRegisterModal();

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4 py-12">
      <div className="max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-primary-50 flex items-center justify-center">
          <Icon className="w-8 h-8 text-primary-600" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-slate-800 mb-3">
          {config.title}
        </h1>

        {/* Description */}
        <p className="text-sm text-slate-500 leading-relaxed mb-6 whitespace-pre-line">
          {config.description}
        </p>

        {/* Feature chips */}
        <div className="flex flex-wrap justify-center gap-2 mb-8">
          {config.details.map((detail) => (
            <span
              key={detail}
              className="inline-block px-3 py-1.5 bg-slate-50 text-slate-600 text-xs font-medium rounded-full border border-slate-100"
            >
              {detail}
            </span>
          ))}
        </div>

        {/* Login notice */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <p className="text-sm text-amber-700">
            이 기능은 로그인 후 사용 가능합니다.
          </p>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={openLoginModal}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-primary-600 text-white font-medium rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-600/25"
          >
            로그인
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={openRegisterModal}
            className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-white text-slate-700 font-medium rounded-xl hover:bg-slate-100 transition-colors border border-slate-200"
          >
            회원가입
          </button>
        </div>
      </div>
    </div>
  );
}
