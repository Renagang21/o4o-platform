import { useState } from "react";
import { Link } from "react-router-dom";
import { neturePharmacyAdminApi as api, type SemiFranchise } from "./api";

export function BusinessSettingsPanel({
  business,
  onSaved,
  onBusyChange,
}: {
  business: SemiFranchise;
  onSaved: () => Promise<void>;
  onBusyChange: (busy: boolean) => void;
}) {
  const [form, setForm] = useState({
    name: business.name,
    status: business.status,
    registrationConditions: business.registration_conditions ?? "",
    communityKey: business.community_key ?? "",
    paymentReceiverKey: business.payment_receiver_key ?? "",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  return (
    <details className="rounded-lg border bg-white p-4">
      <summary className="cursor-pointer font-medium">
        사업 정보 · {business.name}
      </summary>
      <form
        className="mt-4 space-y-3"
        onSubmit={async (event) => {
          event.preventDefault();
          if (!form.name.trim()) {
            setError("사업 이름을 입력해 주세요.");
            return;
          }
          setBusy(true);
          onBusyChange(true);
          setError("");
          setNotice("");
          let saved = false;
          try {
            const { paymentReceiverKey, ...details } = form;
            const patch: Parameters<typeof api.updateSemiFranchise>[1] = {
              ...details,
              communityKey: form.communityKey.trim() || null,
            };
            if (
              (business.payment_receiver_key ?? "") !==
              paymentReceiverKey.trim()
            ) {
              patch.paymentReceiverKey = paymentReceiverKey.trim() || null;
            }
            await api.updateSemiFranchise(business.key, patch);
            saved = true;
            await onSaved();
            setNotice("사업 정보를 저장했습니다.");
          } catch {
            setError(
              saved
                ? "사업 정보는 저장됐지만 최신 상태를 확인하지 못했습니다. 설정을 다시 불러와 주세요."
                : "사업 정보를 저장하지 못했습니다. 다시 시도해 주세요.",
            );
          } finally {
            setBusy(false);
            onBusyChange(false);
          }
        }}
      >
        <fieldset disabled={busy} className="space-y-3">
          <label className="block">
            사업 이름
            <input
              required
              maxLength={255}
              className="mt-1 block w-full rounded border p-2"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </label>
          <label className="block">
            사업 상태
            <select
              className="mt-1 block w-full rounded border p-2"
              value={form.status}
              onChange={(e) =>
                setForm({
                  ...form,
                  status: e.target.value as "active" | "closed",
                })
              }
            >
              <option value="active">운영</option>
              <option value="closed">마감</option>
            </select>
          </label>
          <label className="block">
            가입 조건
            <textarea
              maxLength={4000}
              className="mt-1 block w-full rounded border p-2"
              value={form.registrationConditions}
              onChange={(e) =>
                setForm({ ...form, registrationConditions: e.target.value })
              }
            />
          </label>
          <details>
            <summary className="cursor-pointer text-sm">추가 연결 설정</summary>
            <label className="mt-2 block">
              회원 커뮤니티 주소 식별자
              <input
                className="mt-1 block w-full rounded border p-2"
                value={form.communityKey}
                onChange={(e) =>
                  setForm({ ...form, communityKey: e.target.value })
                }
              />
            </label>
            <label className="mt-2 block">
              결제 수취 주체 키
              <input
                className="mt-1 block w-full rounded border p-2"
                value={form.paymentReceiverKey}
                onChange={(e) =>
                  setForm({ ...form, paymentReceiverKey: e.target.value })
                }
              />
            </label>
            <p className="mt-2 text-sm text-gray-600">
              연결 정보를 확정한 경우에만 입력하세요. 수취 주체 설정은 실제 결제
              연동을 완료하지 않습니다.
            </p>
          </details>
          <button type="submit" className="min-h-11 rounded border px-4 py-2">
            {busy ? "저장 중…" : "사업 정보 저장"}
          </button>
        </fieldset>
        {error && (
          <p role="alert" className="text-red-700">
            {error}
          </p>
        )}
        {notice && <output className="block">{notice}</output>}
      </form>
      <section className="mt-4 border-t pt-3" aria-label="담당 운영자">
        <h3 className="font-medium">담당 운영자</h3>
        {(business.roleOperators ?? []).map((op) => (
          <p key={`${op.userId}:${op.role}`} className="mt-1 break-all text-sm">
            {op.name || op.email || "이름 미등록"} ·{" "}
            {op.role.endsWith("_admin") ? "Admin" : "Operator"}
            {op.membershipStatus !== "active" && " · 메인 이용 자격 확인 필요"}
          </p>
        ))}
        {!(business.roleOperators?.length || business.operators?.length) && (
          <p className="mt-1 text-sm text-gray-600">
            지정된 운영자가 없습니다.
          </p>
        )}
        {!!business.operators?.length && (
          <p className="mt-1 text-sm">
            기존 개별 지정 {business.operators.length}건 · 운영자 관리에서
            확인·해제할 수 있습니다.
          </p>
        )}
        <Link
          to="/operators"
          className="mt-2 inline-block min-h-11 py-2 text-blue-700 underline"
        >
          운영자 관리
        </Link>
        <p className="text-sm text-gray-600">
          회원 가입·신청 승인은 해당 서비스에서 처리합니다.
        </p>
      </section>
    </details>
  );
}
