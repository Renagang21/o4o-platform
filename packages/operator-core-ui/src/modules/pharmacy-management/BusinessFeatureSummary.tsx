import type { SemiFranchise } from "./api";

/** Read-only reflection of saved settings; never calculates store eligibility. */
export function BusinessFeatureSummary({
  business,
  features,
}: Readonly<{
  business: SemiFranchise;
  features: Array<{ key: string; label: string }>;
}>) {
  const selected = business.service_features ?? [];
  return (
    <div className="mt-3 space-y-2 text-sm">
      <div className="font-medium text-gray-700">설정된 제공 기능</div>
      {selected.length === 0 ? (
        <p className="text-gray-500">
          이 사업에서 추가 제공하는 기능이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-wrap gap-2" aria-label="설정된 제공 기능">
          {selected.map((key) => (
            <li key={key} className="rounded bg-slate-100 px-2 py-1">
              {features.find((feature) => feature.key === key)?.label ??
                "카탈로그에 없는 기능 — 설정 확인 필요"}
            </li>
          ))}
        </ul>
      )}
      {business.status === "closed" && (
        <p className="text-amber-800">
          마감된 사업의 기능은 가입 약국에 제공되지 않습니다.
        </p>
      )}
      {(business.operators ?? []).length === 0 &&
        (business.roleOperators ?? []).length === 0 && (
        <p className="text-gray-500">
          가입 승인·자료 운영을 맡을 담당 운영자를 지정해 주세요.
        </p>
      )}
    </div>
  );
}
