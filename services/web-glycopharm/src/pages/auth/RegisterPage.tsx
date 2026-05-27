/**
 * RegisterPage — GlycoPharm 가입신청 진입 화면
 *
 * WO-O4O-GLYCOPHARM-REGISTER-MODAL-FLOW-V1:
 *   /register 페이지를 가입 안내 화면으로 교체.
 *   실제 가입신청 폼은 RegisterFlowModal 에서 진행 (3단계 유지).
 *
 * WO-O4O-GLYCOPHARM-REGISTRATION-ROLE-TYPE-ALIGNMENT-V1:
 *   1단계(공통정보) → 2단계(참여유형) → 3단계(유형별 추가정보) 구조 유지.
 */

import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Activity, Stethoscope, Building2, ShieldCheck, Clock } from 'lucide-react';
import { RegisterFlowModal } from './RegisterFlowModal';

export default function RegisterPage() {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col items-center justify-center px-4 py-16">
      {/* Logo / Brand */}
      <div className="flex flex-col items-center mb-10">
        <div className="w-20 h-20 rounded-2xl bg-blue-600 flex items-center justify-center mb-4 shadow-lg">
          <Activity className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-3xl font-bold text-slate-800">GlycoPharm</h1>
        <p className="text-slate-500 mt-2 text-center">약사와 약국 경영자를 위한 혈당관리 플랫폼</p>
      </div>

      {/* 참여 유형 안내 카드 */}
      <div className="w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
        <div className="bg-white rounded-2xl border border-blue-100 p-6 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center mb-4">
            <Stethoscope className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">약사 / 근무약사</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            약사 회원으로 가입합니다.<br />
            커뮤니티, 콘텐츠, 강의 등 일반 서비스를 이용하실 수 있습니다.
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-green-100 p-6 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-green-100 flex items-center justify-center mb-4">
            <Building2 className="w-6 h-6 text-green-600" />
          </div>
          <h3 className="font-semibold text-slate-800 mb-2">약국 경영자</h3>
          <p className="text-sm text-slate-500 leading-relaxed">
            약국을 운영하는 경영자로 가입합니다.<br />
            승인 후 매장 HUB와 내 매장 메뉴를 이용하실 수 있습니다.
          </p>
        </div>
      </div>

      {/* 안내 문구 */}
      <div className="w-full max-w-2xl bg-white rounded-2xl border border-slate-100 p-5 mb-8 shadow-sm">
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-3">
            <ShieldCheck className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">가입신청 후 운영자 승인 절차를 거칩니다.</p>
          </div>
          <div className="flex items-start gap-3">
            <Clock className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-slate-600">기존 O4O 계정이 있는 경우에도 GlycoPharm 비밀번호를 별도로 설정할 수 있습니다.</p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="w-full max-w-md flex flex-col gap-3">
        <button
          onClick={() => setModalOpen(true)}
          className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors shadow-sm text-lg"
        >
          가입신청 시작
        </button>
        <p className="text-center text-sm text-slate-500">
          이미 가입하셨나요?{' '}
          <NavLink to="/login" className="text-blue-600 font-medium hover:text-blue-700">
            로그인
          </NavLink>
        </p>
      </div>

      {/* 가입신청 모달 */}
      <RegisterFlowModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
