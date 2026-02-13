/**
 * StorePlaceholderPage - 아직 구현되지 않은 메뉴의 Placeholder
 * WO-O4O-STORE-DASHBOARD-ARCHITECTURE-UNIFICATION-V1 Phase 1
 */

export function StorePlaceholderPage({ title }: { title: string }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800">{title}</h1>
        <p className="text-slate-500 mt-1">이 기능은 준비 중입니다</p>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-12 text-center">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-teal-50 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-teal-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>
        <p className="text-lg font-medium text-slate-700">곧 출시 예정</p>
        <p className="mt-2 text-slate-500">
          이 기능은 현재 개발 중입니다. 잠시만 기다려주세요.
        </p>
      </div>
    </div>
  );
}
