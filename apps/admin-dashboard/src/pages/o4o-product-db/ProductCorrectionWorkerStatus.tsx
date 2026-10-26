import type { PeriodicDashboard } from '@/api/product-correction-periodic.api';

/** Snapshot observations only: a heartbeat cannot establish Scheduler configuration. */
export default function ProductCorrectionWorkerStatus({ dashboard, now = Date.now() }: Readonly<{
  dashboard: PeriodicDashboard;
  now?: number;
}>) {
  const success = Date.parse(dashboard.worker?.lastSucceededAt ?? '');
  const age = now - success;
  let observation = '최근 성공 기록 없음: 실행 상태를 확인하세요.';
  if (dashboard.worker?.lastErrorCode) {
    observation = '최근 실행 실패: 실행 이력과 연결 상태를 확인하세요.';
  } else if (Number.isFinite(success) && age >= -60000) {
    observation = age > 5 * 60000
      ? '최근 성공 기록이 5분 이상 오래됐습니다. 현황을 새로고침하고 실행 상태를 확인하세요.'
      : '최근 5분 안에 성공한 실행이 관측됐습니다.';
  }
  return (
    <section className="space-y-1 rounded border p-3" aria-label="정기 실행 관측 상태">
      <p>{observation}</p>
      {dashboard.scheduleDue > 0 && <p>예정 시각이 지난 예약 {dashboard.scheduleDue}건: 예약과 실행 이력을 확인하세요.</p>}
      <p>조회 시점의 기록입니다. 최근 실행이 있어도 독립 예약의 활성화·서버 휴면 중 실행을 보장하지 않습니다.</p>
      <p>독립 정기 호출의 설정과 실제 실행 결과는 운영 담당자가 확인합니다. 후보 점검은 상품 자동 수정이 아닙니다.</p>
    </section>
  );
}
