import { useEffect, useRef, useState } from "react";
import { getPharmacyManagementClient } from "./api";
type Member = {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  endsAt: string | null;
};
type Feature = {
  key: string;
  label: string;
  allowed: boolean | null;
  requiresProfessional?: boolean;
  sources: Array<{ type: string; key: string; name: string }>;
};
type Access = {
  paidEligible: boolean;
  accountStatus: string;
  accountActive: boolean;
  pharmacies: Array<{
    id: string;
    name: string;
    pharmacyStatus: string | null;
    memberships: Array<{
      key: string;
      name: string;
      status: string;
      businessStatus: string;
    }>;
    features: Feature[] | null;
  }>;
};
function validAccess(data: Access) {
  return (
    typeof data?.paidEligible === "boolean" &&
    typeof data.accountStatus === "string" &&
    typeof data.accountActive === "boolean" &&
    Array.isArray(data.pharmacies) &&
    data.pharmacies.every(
      (store) =>
        typeof store?.id === "string" &&
        typeof store.name === "string" &&
        (store.pharmacyStatus === null ||
          typeof store.pharmacyStatus === "string") &&
        Array.isArray(store.memberships) &&
        store.memberships.every(
          (item) =>
            typeof item?.key === "string" &&
            typeof item.name === "string" &&
            typeof item.status === "string" &&
            typeof item.businessStatus === "string",
        ) &&
        (store.features === null ||
          (Array.isArray(store.features) &&
            store.features.every(
              (feature) =>
                typeof feature?.key === "string" &&
                typeof feature.label === "string" &&
                (feature.allowed === null ||
                  typeof feature.allowed === "boolean") &&
                Array.isArray(feature.sources) &&
                feature.sources.every(
                  (source) =>
                    typeof source?.type === "string" &&
                    typeof source.key === "string" &&
                    typeof source.name === "string",
                ),
            ))),
    )
  );
}
const BASE = "/neture/admin/member-paid-entitlements";
const statusLabels: Record<string, string> = {
  active: "활성",
  pending: "심사 중",
  suspended: "정지",
  rejected: "반려",
  withdrawn: "탈퇴",
  terminated: "종료",
  closed: "마감",
};
export function MemberPaidFeaturesPanel() {
  const [email, setEmail] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [access, setAccess] = useState<Access | null>(null);
  const [accessError, setAccessError] = useState("");
  const [active, setActive] = useState(false);
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [failure, setFailure] = useState(false);
  const alive = useRef(false);
  const generation = useRef(0);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const readAccess = async (userId: string, version: number) => {
    setAccess(null);
    setAccessError("");
    try {
      const response = await getPharmacyManagementClient().get(
        `${BASE}/${userId}/access`,
      );
      if (!alive.current || version !== generation.current) return;
      const data: Access = response.data.data;
      if (!response.data.success || !validAccess(data))
        throw new Error("Invalid eligibility");
      setAccess(data);
    } catch {
      if (alive.current && version === generation.current)
        setAccessError(
          "이용 자격과 제공 근거를 확인하지 못했습니다. 다시 조회해 주세요.",
        );
    }
  };
  const find = async () => {
    const version = ++generation.current;
    setBusy(true);
    setMember(null);
    setAccess(null);
    setAccessError("");
    setMessage("");
    setFailure(false);
    try {
      const response = await getPharmacyManagementClient().get(
        `${BASE}?email=${encodeURIComponent(email.trim())}`,
      );
      if (!response.data.success || !response.data.data?.id)
        throw new Error("Member lookup failed");
      if (!alive.current || version !== generation.current) return;
      const found: Member = response.data.data;
      setMember(found);
      setActive(found.active);
      setEndsAt(
        found.endsAt
          ? new Date(Date.parse(found.endsAt) + 9 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 16)
          : "",
      );
      await readAccess(found.id, version);
    } catch {
      if (alive.current && version === generation.current) {
        setMessage(
          "회원을 조회하지 못했습니다. 이메일을 확인하고 다시 시도해 주세요.",
        );
        setFailure(true);
      }
    } finally {
      if (alive.current && version === generation.current) setBusy(false);
    }
  };
  const save = async () => {
    if (!member || busy) return;
    const version = ++generation.current;
    setBusy(true);
    setMessage("");
    setFailure(false);
    try {
      const response = await getPharmacyManagementClient().put(
        `${BASE}/${member.id}`,
        {
          active,
          endsAt: endsAt ? new Date(`${endsAt}:00+09:00`).toISOString() : null,
        },
      );
      if (!response.data.success) throw new Error("Save failed");
      if (!alive.current || version !== generation.current) return;
      setMessage("회원 유료 자격을 저장했습니다.");
      await readAccess(member.id, version);
    } catch {
      if (alive.current && version === generation.current) {
        setMessage("저장하지 못했습니다. 다시 시도해 주세요.");
        setFailure(true);
      }
    } finally {
      if (alive.current && version === generation.current) setBusy(false);
    }
  };
  return (
    <section
      className="space-y-4 rounded-lg border bg-white p-4"
      aria-label="회원 이용 자격"
    >
      <h2 className="font-semibold">회원 이용 자격</h2>
      <p className="text-sm text-gray-600">
        정확한 이메일로 회원을 조회합니다. 유료 자격은 경영자 회원에게 귀속하며
        직원의 사용 범위는 경영자가 My Home에서 허용합니다.
      </p>
      <form
        className="flex flex-wrap items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void find();
        }}
      >
        <label className="min-w-0 flex-1">
          회원 이메일
          <input
            aria-label="회원 이메일"
            type="email"
            required
            className="mt-1 block min-h-11 w-full rounded border p-2"
            disabled={busy}
            value={email}
            onChange={(e) => {
              ++generation.current;
              setEmail(e.target.value);
              setMember(null);
              setAccess(null);
              setAccessError("");
              setMessage("");
            }}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !email.trim()}
          className="min-h-11 rounded border px-3 py-2"
        >
          회원 조회
        </button>
      </form>
      {member && (
        <>
          <p className="break-all font-medium">
            {member.name || "이름 미등록"} · {member.email}
          </p>
          <fieldset disabled={busy} className="space-y-3 border-t pt-3">
            <legend className="font-medium">유료 이용 자격</legend>
            <p className="text-sm text-gray-600">
              현재 유료회원 자격을 관리합니다. 금액별 등급과 결제 자동 연동은
              아직 제공하지 않습니다.
            </p>
            <label className="flex min-h-11 items-center gap-2">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
              />
              유료 자격 활성
            </label>
            <label className="block">
              만료일(한국시간, 비우면 기한 없음)
              <input
                aria-label="유료 자격 만료일"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
                className="mt-1 block min-h-11 max-w-full rounded border p-2"
              />
            </label>
            <button
              type="button"
              onClick={() => void save()}
              className="min-h-11 rounded bg-blue-600 px-3 py-2 text-white"
            >
              유료 자격 저장
            </button>
          </fieldset>
          {accessError && (
            <p role="alert" className="text-red-700">
              {accessError}{" "}
              <button
                type="button"
                disabled={busy}
                className="underline"
                onClick={() => void readAccess(member.id, generation.current)}
              >
                이용 자격 다시 조회
              </button>
            </p>
          )}
          {access && (
            <section
              aria-label="현재 이용 자격과 제공 근거"
              className="space-y-3 border-t pt-3"
            >
              <h3 className="font-medium">현재 이용 자격과 제공 근거</h3>
              <p>유효한 유료 자격: {access.paidEligible ? "있음" : "없음"}</p>
              {(!access.accountActive || access.accountStatus !== "active") && (
                <p className="text-amber-800">계정 이용 상태 확인 필요</p>
              )}
              {!access.pharmacies.length && (
                <p className="text-sm text-gray-600">
                  현재 경영자로 연결된 약국이 없습니다.
                </p>
              )}
              {access.pharmacies.map((store) => (
                <section
                  key={store.id}
                  className="space-y-2 rounded border p-3"
                >
                  <h4 className="font-medium">{store.name}</h4>
                  <p className="text-sm">
                    내 매장 승인:{" "}
                    {statusLabels[store.pharmacyStatus ?? ""] ??
                      store.pharmacyStatus ??
                      "미신청"}
                  </p>
                  <p className="text-sm">
                    협력사업 가입:{" "}
                    {store.memberships.length
                      ? store.memberships
                          .map(
                            (item) =>
                              `${item.name} (${statusLabels[item.status] ?? item.status}${item.businessStatus === "closed" ? " · 사업 마감" : ""})`,
                          )
                          .join(", ")
                      : "없음"}
                  </p>
                  {store.features === null ? (
                    <p className="text-sm">
                      내 매장 승인이 활성 상태일 때 기능 제공 내역을 확인할 수
                      있습니다.
                    </p>
                  ) : (
                    <ul className="space-y-2 text-sm">
                      {store.features.map((feature) => (
                        <li key={feature.key} className="break-words">
                          <strong>{feature.label}</strong> ·{" "}
                          {feature.allowed ? "제공" : "미제공"}
                          {feature.allowed && (
                            <>
                              {" "}
                              ·{" "}
                              {feature.sources
                                .map((source) =>
                                  source.type === "semi-franchise"
                                    ? `${source.name} 가입으로 제공`
                                    : source.name,
                                )
                                .join(" + ")}
                            </>
                          )}
                          {feature.requiresProfessional && (
                            <span className="block text-gray-600">
                              약사 사용 확인이 별도로 필요합니다.
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
              <p className="text-sm text-gray-600">
                기능 제공 내역은 가입·유료 자격의 합산 결과입니다. 실제 이용 시
                계정·내 매장 접근·직원별 허용·약사 사용 확인을 별도로
                검사합니다. 가입·승인은 해당 서비스에서 처리합니다.
              </p>
            </section>
          )}
        </>
      )}
      {message &&
        (failure ? (
          <p role="alert" className="text-red-700">
            {message}
          </p>
        ) : (
          <output className="block">{message}</output>
        ))}
    </section>
  );
}
