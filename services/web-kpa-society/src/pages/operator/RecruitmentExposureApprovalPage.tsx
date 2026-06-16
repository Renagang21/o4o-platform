/**
 * RecruitmentExposureApprovalPage — 판매자 모집 노출 승인 (준비중 안내)
 *
 * WO-O4O-OPERATOR-APPROVALS-SELLER-RECRUITMENT-EXPOSURE-MENU-REMODEL-V1
 *
 * 운영자 승인의 의미: 개별 판매자 승인이 아니라 "판매자 모집 제품을 우리 서비스에 노출할지" 결정.
 * 현재 노출 승인 backend(상태/API)가 없어 안내 화면만 제공(B안). 기능은 후속 작업에서 연결.
 */
export default function RecruitmentExposureApprovalPage() {
  return (
    <div className="max-w-3xl p-6">
      <h1 className="text-2xl font-bold text-slate-900">판매자 모집 노출 승인</h1>
      <div className="mt-4 rounded-xl border border-slate-200 bg-white p-6 text-sm leading-relaxed text-slate-600">
        <p>판매자 모집 제품을 우리 서비스에 노출할지 검토하는 화면입니다.</p>
        <p className="mt-2">개별 판매자 승인/반려는 공급자가 모집 상세에서 처리합니다.</p>
        <p className="mt-2 text-slate-400">노출 승인 기능은 후속 작업에서 연결됩니다.</p>
      </div>
    </div>
  );
}
