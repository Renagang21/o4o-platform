import { useEffect, useRef, useState } from "react";
import { supplierRecruitmentApi } from "../../lib/api/supplier";
import type { RecruitmentDetail } from "../../lib/api/supplier/recruitment.types";

type Props = {
  recruitment: RecruitmentDetail["recruitment"];
  onConfirmed: (price: number) => void;
  onReload?: () => void;
};
export default function RecruitmentSupplyPricePanel({
  recruitment: r,
  onConfirmed,
  onReload,
}: Readonly<Props>) {
  const [value, setValue] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [conflict, setConflict] = useState(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  const confirmed =
    typeof r.supplyUnitPrice === "number" && r.supplyUnitPrice > 0;
  const supported = r.recruitmentKind === "public" && r.serviceId === "neture";
  async function confirm() {
    if (pending) return;
    const price = Number(value);
    if (
      !value.trim() ||
      !Number.isInteger(price) ||
      price <= 0 ||
      price > 2147483647
    ) {
      setMessage("공급가는 1~2,147,483,647원의 정수로 입력해 주세요.");
      return;
    }
    setPending(true);
    setMessage("");
    const result = await supplierRecruitmentApi.confirmSupplyPrice(r.id, price);
    if (!mounted.current) return;
    setPending(false);
    if (
      result.success &&
      result.data?.id === r.id &&
      result.data.supplyUnitPrice === price
    ) {
      onConfirmed(price);
      setMessage("공급가를 확정했습니다.");
    } else {
      setMessage(
        result.message ||
          "확정 결과를 확인하지 못했습니다. 같은 금액으로 다시 확인해 주세요.",
      );
      setConflict(result.error === "SUPPLY_PRICE_ALREADY_CONFIRMED");
    }
  }
  return (
    <section
      className="mb-5 space-y-3 rounded-xl border border-slate-200 bg-white p-5"
      aria-label="모집 공급조건"
    >
      <h2 className="font-semibold">모집 공급가</h2>
      <p>
        {confirmed
          ? `${r.supplyUnitPrice?.toLocaleString()}원 · 확정`
          : "공급가 미확정 · 현재 주문 조건 확인 필요"}
      </p>
      <p className="text-sm text-slate-600">
        참여 승인·제품 공급 자격과 수취 주체·결제 준비는 별도로 확인합니다. 기존
        주문의 확정 가격은 유지합니다.
      </p>
      {!confirmed && supported && r.status === "recruiting" && (
        <div className="space-y-2">
          <label htmlFor="confirm-recruitment-price" className="block text-sm">
            확정할 공급가 (원)
          </label>
          <input
            id="confirm-recruitment-price"
            type="number"
            min={1}
            max={2147483647}
            step={1}
            value={value}
            disabled={pending}
            onChange={(e) => setValue(e.target.value)}
            className="w-full rounded border border-slate-200 p-2 sm:max-w-xs"
          />
          <p className="text-xs text-slate-500">
            직접 확인한 금액을 입력하세요. 확정 후 이 화면에서 변경할 수
            없습니다.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() => void confirm()}
            className="rounded bg-blue-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            {pending ? "확정 결과 확인 중…" : "공급가 확정"}
          </button>
        </div>
      )}
      {!confirmed && supported && r.status !== "recruiting" && (
        <p className="text-sm">모집 재개 후 공급가를 확정할 수 있습니다.</p>
      )}
      {!confirmed && !supported && (
        <p className="text-sm">
          이전 서비스·협업체 모집은 이 화면의 공급가 확정 대상이 아닙니다.
        </p>
      )}
      {conflict && onReload && (
        <button
          type="button"
          onClick={onReload}
          className="text-sm text-blue-700 underline"
        >
          최신 모집 정보 확인
        </button>
      )}
      {message && (
        <p role="status" className="text-sm text-slate-700">
          {message}
        </p>
      )}
    </section>
  );
}
