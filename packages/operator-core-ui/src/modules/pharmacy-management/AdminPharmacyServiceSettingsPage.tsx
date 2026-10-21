import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useSearchParams } from "react-router-dom";
import { getPharmacyManagementClient, type SemiFranchise } from "./api";
import { ServiceFeatureSelector } from "./ServiceFeatureSelector";
import { MemberPaidFeaturesPanel } from "./MemberPaidFeaturesPanel";
import { BusinessSettingsPanel } from "./BusinessSettingsPanel";
import { BusinessRegistrationDialog } from "./BusinessRegistrationDialog";

type Target = {
  key: string;
  name: string;
  features: string[];
  status?: string;
  business?: SemiFranchise;
};
type Policy = {
  features: Array<{ key: string; label: string }>;
  targets: Target[];
};
const base = "/neture/admin/service-feature-policies";
const federationKey = "federation:pharmcoop";
function validPolicy(data: Policy) {
  if (
    !Array.isArray(data?.features) ||
    !Array.isArray(data?.targets) ||
    !data.targets.length
  )
    return false;
  if (
    data.features.some(
      (feature) =>
        typeof feature?.key !== "string" || typeof feature.label !== "string",
    )
  )
    return false;
  const keys = new Set(data.features.map((feature) => feature.key));
  if (
    new Set(data.targets.map((item) => item.key)).size !== data.targets.length
  )
    return false;
  return data.targets.every(
    (item) =>
      typeof item.key === "string" &&
      typeof item.name === "string" &&
      Array.isArray(item.features) &&
      item.features.every((key) => keys.has(key)) &&
      (!item.business ||
        (typeof item.business.key === "string" &&
          item.key === `business:${item.business.key}` &&
          typeof item.business.name === "string" &&
          ["active", "closed"].includes(item.business.status))),
  );
}
export default function AdminPharmacyServiceSettingsPage({
  federationPanel,
}: {
  federationPanel?: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const [policy, setPolicy] = useState<Policy | null>(null);
  const [target, setTarget] = useState("default");
  const [selected, setSelected] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [registration, setRegistration] = useState<string | null>(null);
  const alive = useRef(false);
  const request = useRef(0);
  const tab = params.get("tab") === "member" ? "member" : "features";
  const load = useCallback(
    async (preferred?: string, preserveSelection = false) => {
      const version = ++request.current;
      setError("");
      try {
        const response = await getPharmacyManagementClient().get(base);
        if (!alive.current || request.current !== version) return;
        const data: Policy = response.data.data;
        if (!response.data.success || !validPolicy(data))
          throw new Error("Invalid policy");
        setPolicy(data);
        const chosen =
          preferred === federationKey && federationPanel
            ? federationKey
            : data.targets.some((item) => item.key === preferred)
              ? preferred!
              : data.targets[0].key;
        setTarget(chosen);
        if (!preserveSelection)
          setSelected(
            data.targets.find((item) => item.key === chosen)?.features ?? [],
          );
        return data;
      } catch {
        if (alive.current && request.current === version)
          setError("제공 설정을 불러오지 못했습니다. 다시 시도해 주세요.");
      }
    },
    [federationPanel],
  );
  useEffect(() => {
    alive.current = true;
    const preset = params.get("register");
    const preferred =
      params.get("section") === "cooperatives" || preset === "pharmcoop"
        ? federationKey
        : (params.get("target") ?? (preset ? `business:${preset}` : undefined));
    void load(preferred).then((data) => {
      if (
        alive.current &&
        data &&
        preset &&
        ["pharmacy", "carepharm", "megapharm"].includes(preset) &&
        !data.targets.some((item) => item.key === `business:${preset}`)
      )
        setRegistration(preset);
    });
    return () => {
      alive.current = false;
    };
    // Query changes are handled by the target/tab controls; legacy presets apply only on entry.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [load]);
  const current = policy?.targets.find((item) => item.key === target);
  const federation = target === federationKey && !!federationPanel;
  const save = async () => {
    if (!policy || !current || busy) return;
    const capturedTarget = target,
      features = [...selected];
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await getPharmacyManagementClient().put(
        `${base}/${encodeURIComponent(capturedTarget)}`,
        { features },
      );
      if (!response.data.success) throw new Error("Save failed");
      if (!alive.current) return;
      setPolicy(
        (previous) =>
          previous && {
            ...previous,
            targets: previous.targets.map((item) =>
              item.key === capturedTarget ? { ...item, features } : item,
            ),
          },
      );
      setNotice(
        "제공 기능을 저장했습니다. 다음 이용 자격 확인부터 적용됩니다.",
      );
    } catch {
      if (alive.current) setError("저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const changeTab = (value: string) => {
    setNotice("");
    setError("");
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      next.set("tab", value);
      return next;
    });
  };
  return (
    <main className="mx-auto max-w-4xl space-y-5 p-4 sm:p-6">
      <h1 className="text-2xl font-bold text-gray-900">약국 서비스 설정</h1>
      <div
        role="tablist"
        aria-label="약국 서비스 설정"
        className="flex flex-wrap gap-2 border-b pb-3"
      >
        {[
          ["features", "기능 설정"],
          ["member", "회원 이용 자격"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            role="tab"
            aria-selected={tab === value}
            tabIndex={tab === value ? 0 : -1}
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(
                  event.key,
                ) ||
                busy
              )
                return;
              event.preventDefault();
              const next =
                event.key === "Home"
                  ? "features"
                  : event.key === "End"
                    ? "member"
                    : value === "features"
                      ? "member"
                      : "features";
              changeTab(next);
              document.getElementById(`pharmacy-${next}-tab`)?.focus();
            }}
            aria-controls={`pharmacy-${value}-panel`}
            id={`pharmacy-${value}-tab`}
            disabled={busy}
            onClick={() => changeTab(value)}
            className={`min-h-11 rounded border px-4 py-2 ${tab === value ? "border-blue-600 bg-blue-50 text-blue-700" : "bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "member" ? (
        <section
          role="tabpanel"
          id="pharmacy-member-panel"
          aria-labelledby="pharmacy-member-tab"
        >
          <MemberPaidFeaturesPanel />
        </section>
      ) : (
        <section
          role="tabpanel"
          id="pharmacy-features-panel"
          aria-labelledby="pharmacy-features-tab"
          className="space-y-4"
        >
          <p className="text-sm text-gray-600">
            대상별로 이용할 기능을 선택합니다. 기본 제공·유료 자격·활성 협력사업
            가입에서 제공하는 기능은 합산됩니다.
          </p>
          {error && (
            <p role="alert" className="text-red-700">
              {error}{" "}
              <button
                type="button"
                disabled={busy}
                className="ml-2 underline"
                onClick={() => void load(target)}
              >
                설정 다시 불러오기
              </button>
            </p>
          )}
          {notice && <output className="block text-blue-700">{notice}</output>}
          {!policy && !error && (
            <output className="block">제공 설정을 확인하는 중…</output>
          )}
          {policy && (
            <>
              <div className="flex flex-wrap items-end gap-3">
                <label className="block min-w-0 flex-1 space-y-2">
                  <span className="font-medium">설정 대상</span>
                  <select
                    className="block min-h-11 w-full rounded border p-2"
                    value={target}
                    disabled={busy}
                    onChange={(event) => {
                      const item = policy.targets.find(
                        (value) => value.key === event.target.value,
                      );
                      if (!item && event.target.value !== federationKey) return;
                      setTarget(event.target.value);
                      setSelected(item?.features ?? []);
                      setError("");
                      setNotice("");
                      setParams(
                        (previous) => {
                          const next = new URLSearchParams(previous);
                          next.delete("register");
                          next.delete("section");
                          next.set("target", event.target.value);
                          return next;
                        },
                        { replace: true },
                      );
                    }}
                  >
                    {policy.targets.map((item) => (
                      <option key={item.key} value={item.key}>
                        {item.key.startsWith("business:")
                          ? `${item.business?.name ?? item.name.replace(/^협력사업 · /, "")} 가입자`
                          : item.name}
                        {item.status === "closed" ? " · 마감" : ""}
                      </option>
                    ))}
                    {federationPanel && (
                      <option value={federationKey}>
                        약국·약사 협동조합 연합회 · 사업 정보
                      </option>
                    )}
                  </select>
                </label>
                <button
                  type="button"
                  disabled={busy}
                  className="min-h-11 rounded border px-4 py-2"
                  onClick={() => setRegistration("")}
                >
                  사업 추가
                </button>
              </div>
              {federation
                ? federationPanel
                : current && (
                    <>
                      <form
                        className="space-y-4 rounded-lg border bg-white p-4"
                        onSubmit={(event) => {
                          event.preventDefault();
                          void save();
                        }}
                      >
                        {current.status === "closed" && (
                          <p className="text-sm text-amber-800">
                            마감된 사업입니다. 저장한 기능은 사업이 활성 상태일
                            때만 제공됩니다.
                          </p>
                        )}
                        <ServiceFeatureSelector
                          features={policy.features}
                          selected={selected}
                          disabled={busy}
                          onChange={setSelected}
                          description="이 대상의 이용자에게 제공할 기능을 선택하세요. 체크를 해제해도 다른 자격으로 제공받는 기능은 유지됩니다."
                        />
                        <p className="text-sm text-gray-600">
                          유료 자격은 경영자 회원 기준이며, 직원의 사용 범위는
                          경영자가 My Home에서 관리합니다.
                        </p>
                        <button
                          type="submit"
                          disabled={busy}
                          className="min-h-11 rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
                        >
                          {busy ? "저장 중…" : "저장"}
                        </button>
                      </form>
                      {current.business && (
                        <BusinessSettingsPanel
                          key={current.key}
                          business={current.business}
                          onBusyChange={setBusy}
                          onSaved={async () => {
                            if (!(await load(current.key, true)))
                              throw new Error("Refresh failed");
                          }}
                        />
                      )}
                    </>
                  )}
            </>
          )}
        </section>
      )}
      {registration !== null && policy && (
        <BusinessRegistrationDialog
          existing={policy.targets
            .filter((item) => item.key.startsWith("business:"))
            .map((item) => item.key.slice(9))}
          preset={registration}
          onClose={() => setRegistration(null)}
          onCreated={async (key) => {
            const data = await load(`business:${key}`);
            if (
              !data ||
              !data.targets.some((item) => item.key === `business:${key}`)
            )
              throw new Error("Registration refresh failed");
            setRegistration(null);
            setNotice("사업을 등록했습니다. 제공할 기능을 선택해 저장하세요.");
            setParams({ target: `business:${key}` }, { replace: true });
          }}
        />
      )}
    </main>
  );
}
