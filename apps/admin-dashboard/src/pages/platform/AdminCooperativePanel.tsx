import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { authClient } from "@o4o/auth-client";
import { PHARMACY_COLLABORATORS } from "@o4o/types";

type Cooperative = {
  id: string;
  slug: string;
  name: string;
  cooperativeStatus: "active" | "suspended";
  businessKey: string;
  businessStatus: "active" | "closed";
  activeMemberCount: number;
};
type RoleOperator = {
  userId: string;
  name: string | null;
  email: string | null;
  role: "neture:pharmcoop_admin" | "neture:pharmcoop_operator";
  membershipStatus: string;
};
type Directory = { cooperatives: Cooperative[]; roleOperators: RoleOperator[] };

function parseCooperativeAdminDirectory(body: unknown): Directory {
  const response = body as { success?: boolean; data?: Directory } | null;
  const data = response?.data;
  if (
    response?.success !== true ||
    !data ||
    !Array.isArray(data.cooperatives) ||
    !Array.isArray(data.roleOperators) ||
    data.cooperatives.some(
      (c) =>
        !c ||
        typeof c.id !== "string" ||
        typeof c.name !== "string" ||
        typeof c.slug !== "string" ||
        !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.slug) ||
        typeof c.businessKey !== "string" ||
        !["active", "suspended"].includes(c.cooperativeStatus) ||
        !["active", "closed"].includes(c.businessStatus) ||
        !Number.isInteger(c.activeMemberCount) ||
        c.activeMemberCount < 0,
    ) ||
    data.roleOperators.some(
      (op) =>
        !op ||
        typeof op.userId !== "string" ||
        !["neture:pharmcoop_admin", "neture:pharmcoop_operator"].includes(
          op.role,
        ) ||
        typeof op.membershipStatus !== "string" ||
        (op.name !== null && typeof op.name !== "string") ||
        (op.email !== null && typeof op.email !== "string"),
    ) ||
    new Set(data.cooperatives.map((c) => c.id)).size !==
      data.cooperatives.length
  ) {
    throw new Error("협동조합 현황 응답을 확인하지 못했습니다.");
  }
  return data;
}

export default function AdminCooperativePanel() {
  const [data, setData] = useState<Directory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const response = await authClient.api.get("/neture/admin/cooperatives");
      setData(parseCooperativeAdminDirectory(response.data));
    } catch {
      setError("협동조합 현황을 불러오지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <section className="space-y-5 p-6" aria-label="협동조합 관리">
      <div>
        <h1 className="text-xl font-semibold">
          {PHARMACY_COLLABORATORS.pharmcoop.label}
        </h1>
        <p className="mt-2 text-sm text-gray-600">
          연합회 운영 권한과 등록된 개별 조합의 현황을 확인합니다. 조합원
          가입·승인과 일상 운영은 해당 조합에서 담당합니다.
        </p>
      </div>
      <div className="flex flex-wrap gap-4 text-sm">
        <Link to="/operators" className="text-blue-700 underline">
          연합회 Admin·Operator 지정
        </Link>
        <a
          href={`https://${PHARMACY_COLLABORATORS.pharmcoop.domain}/`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-700 underline"
        >
          협동조합 서비스 열기
        </a>
      </div>
      {loading ? (
        <p role="status">협동조합 현황을 불러오는 중입니다.</p>
      ) : error ? (
        <div
          role="alert"
          className="rounded border border-red-200 p-4 text-red-700"
        >
          <p>{error}</p>
          <button
            type="button"
            className="mt-2 underline"
            onClick={() => void load()}
          >
            다시 불러오기
          </button>
        </div>
      ) : (
        data && (
          <>
            <section className="rounded-lg border bg-white p-4">
              <h2 className="font-semibold">연합회 운영 권한</h2>
              <p className="my-2 text-sm text-gray-600">
                운영자 관리에서 대상 서비스 ‘
                {PHARMACY_COLLABORATORS.pharmcoop.label}’를 선택해
                지정·해제합니다. 역할 지정은 개별 조합 등록이나 조합원 가입을
                만들지 않습니다.
              </p>
              {data.roleOperators.length === 0 ? (
                <p className="text-sm text-gray-500">
                  지정된 연합회 Admin·Operator가 없습니다.
                </p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {data.roleOperators.map((op) => (
                    <li
                      key={`${op.userId}:${op.role}`}
                      className="flex flex-wrap gap-2 break-all"
                    >
                      <span className="rounded bg-teal-50 px-2 text-teal-700">
                        {op.role.endsWith("_admin") ? "Admin" : "Operator"}
                      </span>
                      <span>{op.name || op.email || "이름 미등록"}</span>
                      {op.membershipStatus !== "active" && (
                        <span className="text-amber-700">
                          메인 이용 자격 확인 필요
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <section className="space-y-3">
              <h2 className="font-semibold">개별 조합 현황</h2>
              <p className="text-sm text-gray-600">
                등록 {data.cooperatives.length}곳 · 운영 중{" "}
                {
                  data.cooperatives.filter(
                    (c) =>
                      c.cooperativeStatus === "active" &&
                      c.businessStatus === "active",
                  ).length
                }
                곳
              </p>
              {data.cooperatives.length === 0 ? (
                <div className="rounded-lg border bg-white p-4 text-sm text-gray-600">
                  등록된 개별 조합이 없습니다. 협동조합 연합회는 서비스 항목이며
                  개별 조합과 구분합니다.
                </div>
              ) : (
                data.cooperatives.map((c) => (
                  <article
                    key={c.id}
                    className="rounded-lg border bg-white p-4"
                  >
                    <h3 className="font-semibold break-all">{c.name}</h3>
                    <p className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm">
                      <span className="whitespace-nowrap">조합: {c.cooperativeStatus === "active" ? "운영" : "중지"}</span>
                      <span className="whitespace-nowrap">연결 사업: {c.businessStatus === "active" ? "운영" : "마감"}</span>
                      <span className="whitespace-nowrap">활성 조합원 {c.activeMemberCount}명</span>
                    </p>
                    {c.cooperativeStatus === "active" &&
                      c.businessStatus === "active" && (
                        <a
                          className="mt-2 inline-block text-sm text-blue-700 underline"
                          href={`https://${PHARMACY_COLLABORATORS.pharmcoop.domain}/${encodeURIComponent(c.slug)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          조합 서비스 열기
                        </a>
                      )}
                  </article>
                ))
              )}
            </section>
          </>
        )
      )}
    </section>
  );
}
