/**
 * SignagePreviewPage - 사이니지 미리보기 안내
 *
 * WO-O4O-GLYCOPHARM-SIGNAGE-PREVIEW-MOCK-SURFACE-CLEANUP-V1:
 *   기존 화면은 mockPlaylist/mockChannels 하드코딩(YouTube/Neture 샘플)으로 동작하는
 *   가짜 재생 시뮬레이터였다(실 API 연결 없음). live-routed mock surface 를 제거하고,
 *   실제 재생목록 관리(StoreSignageMainPage)·플레이어(SignagePlayerSelectPage)로 안내하는
 *   정직한 화면으로 정리한다. route 는 유지(signage/preview, marketing/signage/preview).
 *   실 미리보기 기능은 후속 signage 연동 WO 에서 제공한다.
 */

import { NavLink } from 'react-router-dom';
import { Tv, ArrowLeft, ListVideo, MonitorPlay, Info } from 'lucide-react';

export default function SignagePreviewPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <NavLink
          to="/store/marketing/signage/playlist"
          className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </NavLink>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Tv className="w-7 h-7 text-primary-600" />
            사이니지 미리보기
          </h1>
          <p className="text-slate-500 mt-1">실제 방영 화면 미리보기</p>
        </div>
      </div>

      {/* 준비 중 안내 (mock 제거) */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 flex items-start gap-3">
        <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-sm font-semibold text-blue-800">사이니지 미리보기 기능 준비 중</p>
          <p className="text-sm text-blue-700 mt-1 leading-relaxed">
            현재 이 화면에서는 실제 플레이리스트 데이터를 표시하지 않습니다.
            사이니지 콘텐츠와 재생 목록이 연결되면 이곳에서 미리보기를 제공할 예정입니다.
            그동안 아래에서 재생 목록을 구성하거나 플레이어로 실제 재생을 확인할 수 있습니다.
          </p>
        </div>
      </div>

      {/* 실제 관리/재생 진입점 */}
      <div className="grid sm:grid-cols-2 gap-4">
        <NavLink
          to="/store/marketing/signage/playlist"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all flex items-start gap-3"
        >
          <div className="w-11 h-11 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
            <ListVideo className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">재생 목록 관리</p>
            <p className="text-sm text-slate-500 mt-0.5">
              사이니지 콘텐츠와 재생 목록을 먼저 구성하세요.
            </p>
          </div>
        </NavLink>

        <NavLink
          to="/store/marketing/signage/player"
          className="bg-white rounded-xl border border-slate-200 p-5 hover:border-primary-300 hover:shadow-sm transition-all flex items-start gap-3"
        >
          <div className="w-11 h-11 rounded-lg bg-primary-100 flex items-center justify-center shrink-0">
            <MonitorPlay className="w-5 h-5 text-primary-600" />
          </div>
          <div>
            <p className="font-semibold text-slate-800">플레이어로 재생</p>
            <p className="text-sm text-slate-500 mt-0.5">
              연결된 화면에서 실제 재생을 확인합니다.
            </p>
          </div>
        </NavLink>
      </div>
    </div>
  );
}
