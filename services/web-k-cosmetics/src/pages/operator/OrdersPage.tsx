/**
 * OrdersPage - K-Cosmetics 주문 관리
 *
 * WO-O4O-OPERATOR-ORDER-MOCK-SURFACE-GUARD-V1:
 *   하드코딩 가짜 주문/통계(mock) 제거 → 준비중(미연결) 안내 화면으로 전환.
 *   운영자가 가짜 주문 데이터를 실데이터로 오인하는 위험 제거.
 *   실제 operator 주문 조회/처리 기능은 backend operator 주문 API 계약
 *   (WO-O4O-OPERATOR-ORDER-API-CONTRACT-V1, 예정) 구현 후 제공한다.
 *   IR 근거: IR-O4O-OPERATOR-ORDER-SETTLEMENT-SURFACE-AUDIT-V1 (K-Cos OrdersPage = E + F).
 */

export default function OrdersPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-800">주문 관리</h1>
        <p className="text-slate-500 mt-1">B2B 주문 현황을 관리합니다</p>
      </div>

      {/* 준비중 안내 — 실제 주문 API 연동 전까지 운영 기능으로 사용하지 않는다 */}
      <div className="bg-white rounded-xl border border-slate-100 p-10 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-pink-50 text-2xl">
          🧾
        </div>
        <h2 className="text-lg font-semibold text-slate-800">주문 관리 기능 준비 중</h2>
        <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
          운영자 주문 조회·처리 기능은 실제 주문 API 연동 후 제공됩니다.
          연동 전까지 이 화면은 운영 기능으로 사용하지 않으며, 표시할 주문 데이터가 없습니다.
        </p>
      </div>
    </div>
  );
}
