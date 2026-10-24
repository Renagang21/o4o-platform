import { useEffect, useMemo, useState } from "react";
import { getPharmacyManagementClient } from "./api";
import { ServiceLegalSettingsPage } from "../service-legal/ServiceLegalSettingsPage";
import type { ServiceLegalApi } from "../service-legal/types";

type Store = { id: string; name: string; counts: Record<string, number> };
type Summary = {
  businessKey: string;
  businessName: string;
  month: string;
  canManagePolicies: boolean;
  stores: Store[];
};
const reasons = [
  ["not-found", "위치를 못 찾음"],
  ["not-carried", "미취급 상품 요청"],
  ["pharmacist-help", "약사 연결"],
] as const;

function legalApiFor(key: string): ServiceLegalApi {
  const base = `/neture/operator/semi-franchises/${encodeURIComponent(key)}/legal`;
  const client = getPharmacyManagementClient();
  const unwrap = (response: {
    data: { success?: boolean; data?: unknown };
  }) => {
    if (!response.data?.success)
      throw new Error("사업 설정을 불러오거나 저장하지 못했습니다.");
    return response.data.data;
  };
  return {
    getLegalProfile: async () =>
      unwrap(await client.get(`${base}/legal-profile`)) as Awaited<
        ReturnType<ServiceLegalApi["getLegalProfile"]>
      >,
    updateLegalProfile: async (_, body) =>
      unwrap(await client.put(`${base}/legal-profile`, body)) as Awaited<
        ReturnType<ServiceLegalApi["updateLegalProfile"]>
      >,
    listPolicies: async () =>
      unwrap(await client.get(`${base}/policies`)) as Awaited<
        ReturnType<ServiceLegalApi["listPolicies"]>
      >,
    createPolicy: async (_, body) =>
      unwrap(await client.post(`${base}/policies`, body)) as Awaited<
        ReturnType<ServiceLegalApi["createPolicy"]>
      >,
    updatePolicy: async (_, id, body) =>
      unwrap(
        await client.put(`${base}/policies/${encodeURIComponent(id)}`, body),
      ) as Awaited<ReturnType<ServiceLegalApi["updatePolicy"]>>,
    publishPolicy: async (_, id, action) =>
      unwrap(
        await client.patch(
          `${base}/policies/${encodeURIComponent(id)}/publish`,
          { action },
        ),
      ) as Awaited<ReturnType<ServiceLegalApi["publishPolicy"]>>,
    changePolicyLifecycle: async (_, id, action) =>
      unwrap(
        await client.patch(
          `${base}/policies/${encodeURIComponent(id)}/lifecycle`,
          { action },
        ),
      ) as Awaited<ReturnType<ServiceLegalApi["changePolicyLifecycle"]>>,
  };
}

/** Explicitly opened: no extra requests in the existing approval workflow. */
export function BusinessOperationsPanel({
  businessKey,
}: Readonly<{ businessKey: string }>) {
  const [open, setOpen] = useState(false);
  return (
    <section className="rounded-lg border p-4">
      <button
        type="button"
        aria-expanded={open}
        className="min-h-11"
        onClick={() => setOpen((value) => !value)}
      >
        현장 요구 · 사업 약관
      </button>
      {open && (
        <BusinessOperations key={businessKey} businessKey={businessKey} />
      )}
    </section>
  );
}

function BusinessOperations({
  businessKey,
}: Readonly<{ businessKey: string }>) {
  const [month, setMonth] = useState(() =>
    new Date()
      .toLocaleDateString("sv-SE", { timeZone: "Asia/Seoul" })
      .slice(0, 7),
  );
  const [retry, setRetry] = useState(0);
  const [state, setState] = useState<Summary | null>(null);
  const [error, setError] = useState(false);
  const [legal, setLegal] = useState(false);
  const legalApi = useMemo(() => legalApiFor(businessKey), [businessKey]);
  useEffect(() => {
    let active = true;
    setState(null);
    setError(false);
    setLegal(false);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
      setError(true);
      return;
    }
    getPharmacyManagementClient()
      .get(
        `/neture/operator/semi-franchises/${encodeURIComponent(businessKey)}/staff-demands`,
        { params: { month } },
      )
      .then((response) => {
        const data = response.data?.data as Summary;
        if (
          !response.data?.success ||
          data?.businessKey !== businessKey ||
          data.month !== month ||
          !Array.isArray(data.stores) ||
          typeof data.canManagePolicies !== "boolean"
        )
          throw new Error("Invalid summary");
        if (active) setState(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [businessKey, month, retry]);
  return (
    <div className="mt-4 space-y-4">
      <p>
        현재 이 사업에 가입·승인된 약국의 매장 공통 집계입니다. 복수 사업 가입
        약국의 기록을 포함하며, 이 사업만의 실적을 뜻하지 않습니다.
      </p>
      <label>
        조회 월{" "}
        <input
          aria-label="고객 요구 조회 월"
          type="month"
          value={month}
          onChange={(event) => setMonth(event.target.value)}
        />
      </label>
      <button
        type="button"
        className="ml-3 min-h-11 rounded border px-3"
        onClick={() => setRetry((value) => value + 1)}
      >
        다시 조회
      </button>
      {error && (
        <p role="alert">
          집계를 확인하지 못했습니다. 담당 사업과 연결 상태를 확인한 뒤 다시
          조회해 주세요.
        </p>
      )}
      {!state && !error && <output>현장 요구를 확인하고 있습니다…</output>}
      {state && (
        <>
          {!state.stores.length ? (
            <p>현재 조회할 가입 약국이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <caption className="text-left">
                  {state.businessName} · {state.month}
                </caption>
                <thead>
                  <tr>
                    <th>약국</th>
                    {reasons.map(([key, label]) => (
                      <th key={key}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.stores.map((store) => (
                    <tr key={store.id}>
                      <th scope="row">{store.name}</th>
                      {reasons.map(([key]) => (
                        <td key={key}>{store.counts[key] ?? 0}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {state.canManagePolicies ? (
            <>
              <button
                type="button"
                className="min-h-11 rounded border px-3"
                aria-expanded={legal}
                onClick={() => setLegal((value) => !value)}
              >
                이 사업 법정정보·약관 설정
              </button>
              {legal && (
                <>
                  <p>
                    이용약관과 개인정보처리방침을 같은 버전으로 게시하면 이 사업
                    참여 신청에 적용됩니다. 실제 확인한 문안과 정보만 입력해
                    주세요.
                  </p>
                  <ServiceLegalSettingsPage
                    key={businessKey}
                    serviceKey={state.businessName}
                    title={`${state.businessName} 법정정보·약관`}
                    api={legalApi}
                  />
                </>
              )}
            </>
          ) : (
            <p>법정정보·약관의 작성과 게시는 해당 사업 관리자가 진행합니다.</p>
          )}
        </>
      )}
    </div>
  );
}
