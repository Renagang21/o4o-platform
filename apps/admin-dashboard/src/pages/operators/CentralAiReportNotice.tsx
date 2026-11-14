/**
 * 「AI 운영 리포트」 자리 (2026-11-14).
 *
 * 예전에는 데이터 연결 없이 「분석 데이터 준비 중」만 보이는 빈 리포트(AiReportPage empty mode)였다.
 * 원래 의도한 지표(AI 응답의 카드 노출)는 서버 메모리에만 쌓여 재시작 · 다중 인스턴스에서 사라지므로 리포트로 쓸 수 없다.
 * 실제 쌓이는 AI 호출 · 오류 · 토큰 · 비용은 관리자 「AI 운영 관리」(/settings)에 있으므로 그곳으로 안내한다.
 */
export default function CentralAiReportNotice() {
  return (
    <section aria-label="AI 운영 리포트 안내" className="space-y-4">
      <header>
        <h2 className="text-xl font-bold">AI 운영 리포트</h2>
        <p className="text-sm text-slate-600">AI 사용 현황을 확인하는 위치를 안내합니다.</p>
      </header>
      <div className="space-y-3 rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-700">
        <p>
          AI 호출 수 · 오류 · 토큰 사용량 · 추정 비용은 관리자 <strong>설정 → AI 운영 관리</strong>에서 확인합니다.
        </p>
        <p>
          <a className="font-medium text-blue-700 underline" href="/settings">AI 운영 관리 열기</a>{' '}
          <span className="text-xs text-slate-500">(설정 조회 권한 필요)</span>
        </p>
        <p className="text-xs text-slate-500">
          AI 응답에 노출된 상품 · 매장 · 콘텐츠 카드 통계는 아직 저장하지 않아 이 화면에서 제공하지 않습니다.
        </p>
      </div>
    </section>
  );
}
