import { useEffect, useState } from "react";
import { authClient } from "@o4o/auth-client";
import type { MemberDetail } from "./member-workspace-model";

/** Access termination leaves business records intact. Sale changes their owner link. */
export default function MemberLifecycleActions({
  detail,
  actorId,
  busy,
  perform,
  adminMode = false,
  initialAction = null,
}: Readonly<{
  adminMode?: boolean;
  initialAction?: "stop" | "terminate" | null;
  detail: MemberDetail;
  actorId: string;
  busy: boolean;
  perform: (work: () => Promise<unknown>) => Promise<void>;
}>) {
  const [action, setAction] = useState<
    "stop" | "terminate" | "transfer" | "close" | null
  >(initialAction);
  const [reason, setReason] = useState("");
  const [email, setEmail] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [plan, setPlan] = useState<{
      deleteRows: number;
      reviewRows: number;
      businessDocuments: number;
    } | null>(null),
    [planError, setPlanError] = useState("");
  useEffect(() => {
    let active = true;
    setPlan(null);
    setPlanError("");
    setConfirmed(false);
    if (action === "close" && organizationId)
      void authClient.api
        .get(
          `/qualifications/pharmacist/members/${encodeURIComponent(detail.member.userId)}/pharmacies/${encodeURIComponent(organizationId)}/closure-plan`,
        )
        .then((response) => {
          if (active) setPlan(response.data.data);
        })
        .catch(() => {
          if (active)
            setPlanError(
              "폐업 자료 범위를 확인하지 못했습니다. 약국과 현재 권한을 다시 확인해 주세요.",
            );
        });
    return () => {
      active = false;
    };
  }, [action, organizationId, detail.member.userId]);
  const pharmacies = detail.pharmacies.filter((pharmacy) =>
    ["active", "suspended", "terminated"].includes(pharmacy.status),
  );
  const choices =
    action === "transfer"
      ? pharmacies.filter((pharmacy) => pharmacy.status === "active")
      : pharmacies;
  if (!detail.permissions.edit || actorId === detail.member.userId) return null;
  const choose = (next: "stop" | "terminate" | "transfer" | "close") => {
    setAction(next);
    setReason("");
    setEmail("");
    setConfirmed(false);
    setOrganizationId(
      (next === "transfer"
        ? pharmacies.filter((pharmacy) => pharmacy.status === "active")
        : pharmacies)[0]?.organizationId ?? "",
    );
  };
  return (
    <section
      className="rounded border bg-white p-4 space-y-3"
      aria-label="회원 이용 관리"
    >
      <h4 className="font-semibold">이용 관리</h4>
      <div className="flex flex-wrap gap-3">
        <button type="button" disabled={busy} onClick={() => choose("stop")}>
          이용 정지
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => choose("terminate")}
        >
          회원 해지
        </button>
        {adminMode &&
          detail.permissions.manageAccount &&
          pharmacies.some((pharmacy) => pharmacy.status === "active") && (
            <button
              type="button"
              disabled={busy}
              onClick={() => choose("transfer")}
            >
              약국 매도·경영자 이전
            </button>
          )}
        {adminMode &&
          detail.permissions.manageAccount &&
          pharmacies.length > 0 && (
            <button
              type="button"
              disabled={busy}
              onClick={() => choose("close")}
            >
              약국 완전폐업·자료삭제
            </button>
          )}
      </div>
      {action && (
        <form
          className="space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            if (
              busy ||
              !reason.trim() ||
              !confirmed ||
              (action === "close" && !plan)
            )
              return;
            const base = `/qualifications/pharmacist/members/${encodeURIComponent(detail.member.userId)}`;
            void perform(() =>
              action === "stop" || action === "terminate"
                ? authClient.api.post(
                    `${base}/${action === "terminate" ? "terminate-access" : "stop-access"}`,
                    { reason: reason.trim(), version: detail.member.version },
                  )
                : action === "close"
                  ? authClient.api.post(
                      `${base}/pharmacies/${encodeURIComponent(organizationId)}/close`,
                      { reason: reason.trim(), closureConfirmed: true },
                    )
                  : authClient.api.post(
                      `${base}/pharmacies/${encodeURIComponent(organizationId)}/transfer`,
                      {
                        reason: reason.trim(),
                        nextOwnerEmail: email.trim(),
                        transferConfirmed: true,
                      },
                    ),
            );
          }}
        >
          <p>
            {action === "terminate"
              ? "Neture 서비스 이용 자격과 직원 소속·접근을 해제합니다. 공통 계정과 사업체 자료는 유지합니다. 다른 서비스의 회원 자격은 변경하지 않습니다."
              : action === "stop"
                ? "Neture 서비스 이용을 일시 정지합니다. 계정·직원 소속·사업체 자료는 유지합니다."
                : action === "close"
                  ? "완전폐업한 약국의 모든 소속과 이용을 종료하고 기존 약국 자료·파일 파기 절차를 실행합니다. 매도한 약국에는 사용하지 마세요. 실패한 경우 같은 버튼으로 재시도할 수 있습니다. 회원 계정은 별도로 삭제합니다."
                  : "약국 자료를 유지하고 새 경영자에게 관리 권한을 이전합니다. 이전 경영자의 해당 약국 접근은 해제됩니다. 새 경영자의 사업자 정보는 이전 후 확인·정정해 주세요."}
          </p>
          {(action === "transfer" || action === "close") && (
            <>
              <label className="block">
                이전할 약국
                <select
                  className="block w-full rounded border p-2"
                  value={organizationId}
                  disabled={busy}
                  onChange={(event) => {
                    setOrganizationId(event.target.value);
                    setPlan(null);
                    setConfirmed(false);
                  }}
                >
                  {choices.map((pharmacy) => (
                    <option
                      key={pharmacy.organizationId}
                      value={pharmacy.organizationId}
                    >
                      {pharmacy.name}
                    </option>
                  ))}
                </select>
              </label>
              {action === "transfer" && (
                <label className="block">
                  새 경영자 가입 이메일{" "}
                  <input
                    type="email"
                    required
                    className="block w-full rounded border p-2"
                    value={email}
                    disabled={busy}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </label>
              )}
            </>
          )}
          {action === "close" && (
            <div role="status">
              {plan ? (
                <p>
                  현재 삭제 대상 매장 자료: {plan.deleteRows}건 · 사업 증빙:{" "}
                  {plan.businessDocuments}건 · 별도 검토 자료: {plan.reviewRows}
                  건. 공용 미디어 원본과 회원 계정은 유지합니다. 검토·파일
                  처리가 남으면 미완료로 표시합니다.
                </p>
              ) : (
                <p>{planError || "폐업 자료 범위를 확인하는 중…"}</p>
              )}
            </div>
          )}
          <label className="block">
            이용 관리 사유
            <textarea
              required
              className="block w-full rounded border p-2"
              maxLength={2000}
              disabled={busy}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
            />
          </label>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              disabled={busy}
              checked={confirmed}
              onChange={(event) => setConfirmed(event.target.checked)}
            />
            {action === "transfer"
              ? "약국 매도와 자료 이전에 대해 양측의 확인을 받았습니다."
              : action === "close"
                ? "매도가 아닌 완전폐업이며 약국 자료 삭제를 확인했습니다."
                : action === "terminate"
                  ? "서비스 회원 해지와 직원 접근 해제를 확인했습니다."
                  : "일시 이용 정지와 자료 유지를 확인했습니다."}
          </label>
          <button
            type="submit"
            disabled={
              busy ||
              (action === "close" && !plan) ||
              !confirmed ||
              !reason.trim() ||
              ((action === "transfer" || action === "close") &&
                !organizationId) ||
              (action === "transfer" && !email.trim())
            }
          >
            {action === "terminate"
              ? "회원 해지 실행"
              : action === "stop"
                ? "이용 정지 실행"
                : action === "close"
                  ? "완전폐업·자료삭제 실행"
                  : "경영자 이전 실행"}
          </button>
          <button type="button" disabled={busy} onClick={() => setAction(null)}>
            취소
          </button>
        </form>
      )}
    </section>
  );
}
