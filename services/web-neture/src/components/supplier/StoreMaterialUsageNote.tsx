/**
 * StoreMaterialUsageNote — "매장 제공 자료" 활용 채널 안내
 *
 * WO-O4O-NETURE-SUPPLIER-DASHBOARD-STORE-MATERIALS-IA-V1
 * 근거: IR-O4O-KPA-STORE-QR-TABLET-CONTENT-FLOW-AUDIT-V1 §8.2 · §10.1
 *
 * 왜 문구인가 — 공급자는 QR 을 만들 수도, 태블릿 코너에 적용할 수도 없다(백엔드가 차단):
 *   supplier-screen-set.controller.ts:33
 *     "차단: 매장·코너 직접 적용 / current 지정 / 공개 타블렛 URL / Screen Set QR 생성 / 매장 제작 콘텐츠 조회"
 *   createSupplierContentSourceAdapter().fetchStoreContent() → 항상 null
 * 따라서 QR·태블릿을 **메뉴로 노출하면 클릭 시 403/빈 화면**이 되어 dead-end 가 된다.
 * 대신 "매장이 이 자료를 어디에 쓸 수 있는지"만 읽기 전용으로 알린다.
 *
 * 표시 금지: 공급자가 특정 매장·QR·태블릿·코너에 직접 배포한다는 뉘앙스.
 */

interface StoreMaterialUsageNoteProps {
  /**
   * 이 자료가 매장에서 실제로 쓰이는 채널. 자료 유형마다 다르므로 호출부가 지정한다.
   * 예) 설명서 → QR · 태블릿 · 자료함 / 사이니지 → 매장 사이니지 화면
   */
  channels: string;
  className?: string;
}

export default function StoreMaterialUsageNote({ channels, className = '' }: StoreMaterialUsageNoteProps) {
  return (
    <div
      className={`rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600 ${className}`}
      role="note"
    >
      <p>
        이 자료는 매장이 <span className="font-medium text-slate-700">{channels}</span>에서 활용할 수 있습니다.
      </p>
      <p className="mt-1 text-slate-500">
        실제 적용 여부와 적용 위치는 매장 경영자가 선택합니다. 공급자가 특정 매장·QR·태블릿 코너에 직접
        배포하지 않습니다.
      </p>
    </div>
  );
}
