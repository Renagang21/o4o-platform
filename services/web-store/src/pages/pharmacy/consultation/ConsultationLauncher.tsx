import { useEffect, useState } from "react";
import {
  fetchConsultationLayout,
  type OperatingType,
} from "../../../api/consultationWorkspace";
import { useUnifiedStore } from "../../../contexts/StoreContext";
const layouts = {
  standard: [
    [
      "counter-pharmacist",
      "매대 약사 상담",
      "약사 화면과 고객 화면을 각각 엽니다.",
    ],
  ],
  large: [
    [
      "floor-pharmacist",
      "매장 약사 상담",
      "약사와 고객이 한 태블릿을 함께 봅니다.",
    ],
    [
      "floor-staff",
      "매장 직원 안내",
      "음성과 안내 버튼으로 고객을 응대합니다.",
    ],
    ["counter-staff", "매대 직원 안내", "직원 화면과 고객 화면을 각각 엽니다."],
  ],
} as const;
export function ConsultationLauncher() {
  const { organizationId } = useUnifiedStore();
  const [counter, setCounter] = useState("1");
  const [layout, setLayout] = useState<OperatingType | null>(null),
    [error, setError] = useState(false),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let alive = true;
    setLayout(null);
    setError(false);
    fetchConsultationLayout()
      .then((data) => {
        if (data.organizationId !== organizationId)
          throw new Error("Store changed");
        if (alive) setLayout(data.operatingType);
      })
      .catch(() => {
        if (alive) setError(true);
      });
    return () => {
      alive = false;
    };
  }, [organizationId, retry]);
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        이곳에서는 상담 화면을 준비합니다. 실제 상담은 별도 화면에서 진행하세요.
      </p>
      {error ? (
        <div role="alert">
          <p>매장의 상담 화면 구성을 확인하지 못했습니다.</p>
          <button
            className="min-h-11 rounded border px-4"
            onClick={() => setRetry((n) => n + 1)}
          >
            다시 확인
          </button>
        </div>
      ) : !layout ? (
        <p role="status">상담 화면 구성을 확인하는 중…</p>
      ) : (
        <>
          <p className="text-sm">
            {layout === "large"
              ? "대형 약국 · 매장 공간과 매대에서 응대"
              : "일반 약국 · 매대에서 약사 상담"}{" "}
            <span className="text-slate-500">
              (관리자가 설정 · 이용 권한은 상담 화면에서 확인)
            </span>
          </p>
          <label className="block text-sm">
            매대 번호{" "}
            <input
              className="min-h-11 w-20 rounded border p-2"
              aria-label="상담 매대 번호"
              inputMode="numeric"
              maxLength={2}
              value={counter}
              onChange={(e) => setCounter(e.target.value.replace(/\D/g, ""))}
            />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            {layouts[layout].map(([mode, title, description]) => (
              <a
                key={mode}
                target="_blank"
                rel="noreferrer"
                href={`/consultation/staff?${new URLSearchParams({ store: organizationId || "", mode, station: `counter-${Number(counter) || 1}` })}`}
                className="min-h-24 rounded-xl border p-4 hover:bg-teal-50"
              >
                <strong className="block text-teal-800">{title} ↗</strong>
                <span className="mt-2 block text-sm text-slate-600">
                  {description}
                </span>
              </a>
            ))}
            <a
              target="_blank"
              rel="noreferrer"
              href="/consultation/customer"
              className="min-h-24 rounded-xl border p-4 hover:bg-teal-50"
            >
              <strong className="block text-teal-800">
                매대 소비자 화면 ↗
              </strong>
              <span className="mt-2 block text-sm text-slate-600">
                고객 태블릿에서 이 주소를 열고 직원 화면의 연결 코드를
                입력합니다.
              </span>
            </a>
          </div>
        </>
      )}
    </div>
  );
}
