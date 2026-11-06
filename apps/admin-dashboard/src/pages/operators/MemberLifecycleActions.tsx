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
  initialAction?: "restore" | "terminate" | null;
  detail: MemberDetail;
  actorId: string;
  busy: boolean;
  perform: (work: () => Promise<unknown>) => Promise<void>;
}>) {
  const [action, setAction] = useState<
    "restore" | "terminate" | "transfer" | "close" | null
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
              "폐업 자료 범위를 확인하지 못했습니다. 약국과 현재 권한을 다시 확인해 주시기 바랍니다.",
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
  const choose = (next: "restore" | "terminate" | "transfer" | "close") => {
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
        {['suspended','withdrawn'].includes(detail.member.serviceStatus??'') ? <button type="button" disabled={busy} onClick={()=>choose('restore')}>이용 복구</button>
          : detail.member.serviceStatus==='active' && <button type="button" disabled={busy} onClick={()=>choose('terminate')}>회원 해지</button>}
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
              ((action === "transfer" || action === "close") && !confirmed) ||
              (action === "close" && !plan)
            )
              return;
            const base = `/qualifications/pharmacist/members/${encodeURIComponent(detail.member.userId)}`;
            void perform(() =>
              action === "restore" || action === "terminate"
                ? authClient.api.post(
                    `${base}/${action === "terminate" ? "terminate-access" : "restore-access"}`,
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
              ? "회원 이용을 해지합니다. 이후 이용 복구가 가능합니다."
              : action === "restore"
                ? "해지된 회원의 이용을 복구합니다."
                : action === "close"
                  ? "완전폐업한 약국의 모든 소속과 이용을 종료하고 기존 약국 자료·파일 파기 절차를 실행합니다. 매도한 약국에는 사용하지 마시기 바랍니다. 실패한 경우 같은 버튼으로 재시도할 수 있습니다. 회원 계정은 별도로 삭제합니다."
                  : "약국 자료를 유지하고 새 경영자에게 관리 권한을 이전합니다. 이전 경영자의 해당 약국 접근은 해제됩니다. 새 경영자의 사업자 정보는 이전 후 확인·정정해 주시기 바랍니다."}
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
          {(action === 'transfer' || action === 'close') && <label className="block"><input type="checkbox" disabled={busy} checked={confirmed} onChange={event=>setConfirmed(event.target.checked)}/>{action==='transfer'?'약국 매도와 자료 이전에 대해 양측의 확인을 받았습니다.':'매도가 아닌 완전폐업이며 약국 자료 삭제를 확인했습니다.'}</label>}
          <button
            type="submit"
            disabled={
              busy ||
              (action === "close" && !plan) ||
              ((action === "transfer" || action === "close") && !confirmed) ||
              !reason.trim() ||
              ((action === "transfer" || action === "close") &&
                !organizationId) ||
              (action === "transfer" && !email.trim())
            }
          >
            {action === "terminate"
              ? "회원 해지 실행"
              : action === "restore"
                ? "이용 복구 실행"
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
