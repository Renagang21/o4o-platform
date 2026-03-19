/**
 * PatientLandingPage — GlucoseView 환자 전용 랜딩
 * WO-O4O-GLUCOSEVIEW-PATIENT-ENTRY-FLOW-V1
 *
 * 비로그인 사용자가 `/`에 접속했을 때 보여주는 첫 화면.
 * 서비스 소개 + 로그인/회원가입 + 테스트 로그인.
 */

import { Link } from 'react-router-dom';
import { Activity, Sparkles, MessageCircle } from 'lucide-react';

export default function PatientLandingPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Hero */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm text-center">
          {/* Logo */}
          <div className="w-16 h-16 rounded-2xl bg-teal-600 flex items-center justify-center mx-auto mb-5">
            <Activity className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">GlucoseView</h1>
          <p className="text-sm text-slate-500 leading-relaxed mb-8">
            혈당 기록과 분석을 확인하는<br />환자 전용 서비스입니다.
          </p>

          {/* CTA Buttons */}
          <div className="space-y-3 mb-6">
            <Link
              to="/login"
              className="block w-full py-3 text-sm font-semibold text-white bg-teal-600 rounded-xl hover:bg-teal-700 transition-colors text-center"
            >
              로그인
            </Link>
            <Link
              to="/register"
              className="block w-full py-3 text-sm font-semibold text-teal-700 bg-teal-50 rounded-xl hover:bg-teal-100 transition-colors text-center"
            >
              회원가입
            </Link>
          </div>

          {/* Test Login — LoginPage의 테스트 로그인 흐름 재사용 */}
          <div className="border-t border-dashed border-slate-200 pt-4">
            <Link
              to="/login"
              className="block w-full py-2.5 text-xs font-medium text-slate-500 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors text-center"
            >
              테스트 로그인
            </Link>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 pb-8">
        <div className="max-w-sm mx-auto grid grid-cols-3 gap-3">
          {[
            { icon: Activity, label: '혈당 기록', desc: '간편한 기록 관리', color: 'text-teal-600', bg: 'bg-teal-50' },
            { icon: Sparkles, label: 'AI 인사이트', desc: '맞춤 분석 제공', color: 'text-violet-600', bg: 'bg-violet-50' },
            { icon: MessageCircle, label: '건강 상담', desc: '전문가 맞춤 안내', color: 'text-blue-600', bg: 'bg-blue-50' },
          ].map((f) => (
            <div key={f.label} className="text-center">
              <div className={`w-10 h-10 rounded-xl ${f.bg} flex items-center justify-center mx-auto mb-2`}>
                <f.icon className={`w-5 h-5 ${f.color}`} />
              </div>
              <p className="text-xs font-medium text-slate-700">{f.label}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="px-6 pb-6">
        <p className="text-[10px] text-slate-300 text-center">
          본 서비스는 의료 진단이나 치료를 목적으로 하지 않습니다
        </p>
      </div>
    </div>
  );
}
