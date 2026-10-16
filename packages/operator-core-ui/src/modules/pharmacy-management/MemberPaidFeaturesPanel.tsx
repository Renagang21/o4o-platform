import { useState } from "react";
import { getPharmacyManagementClient } from "./api";

type Member = {
  id: string;
  email: string;
  name: string | null;
  active: boolean;
  endsAt: string | null;
};
const BASE = "/neture/admin/member-paid-entitlements";
export function MemberPaidFeaturesPanel() {
  const [email, setEmail] = useState("");
  const [member, setMember] = useState<Member | null>(null);
  const [active, setActive] = useState(false);
  const [endsAt, setEndsAt] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const find = async () => {
    setBusy(true);
    setMember(null);
    setMessage("");
    try {
      const response = await getPharmacyManagementClient().get(
        `${BASE}?email=${encodeURIComponent(email.trim())}`,
      );
      if (!response.data.success)
        throw new Error(response.data.error || "회원 조회 실패");
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
    } catch {
      setMessage(
        "회원을 조회하지 못했습니다. 이메일을 확인하고 다시 시도해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    if (!member) return;
    setBusy(true);
    setMessage("");
    try {
      const response = await getPharmacyManagementClient().put(
        `${BASE}/${member.id}`,
        {
          active,
          endsAt: endsAt ? new Date(`${endsAt}:00+09:00`).toISOString() : null,
        },
      );
      if (!response.data.success) throw new Error("Save failed");
      setMessage("회원 유료 자격을 저장했습니다.");
    } catch {
      setMessage("저장하지 못했습니다. 다시 시도해 주세요.");
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      className="rounded-lg border border-gray-200 bg-white p-4"
      aria-label="회원 유료 자격"
    >
      <h2 className="mb-2 font-semibold">회원 유료 자격</h2>
      <p className="mb-3 text-sm text-gray-600">
        경영자가 유료회원이면 해당 내 매장의 태블릿·다국어 상품 콘텐츠를 초대
        직원도 이용합니다.
      </p>
      <div className="flex flex-wrap gap-2">
        <input
          aria-label="회원 이메일"
          type="email"
          className="rounded border p-2"
          disabled={busy}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setMember(null);
            setMessage("");
          }}
        />
        <button
          type="button"
          disabled={busy || !email.trim()}
          onClick={() => void find()}
          className="rounded border px-3 py-2"
        >
          회원 조회
        </button>
      </div>
      {member && (
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <span>{member.name || member.email}</span>
          <label>
            <input
              type="checkbox"
              checked={active}
              disabled={busy}
              onChange={(e) => setActive(e.target.checked)}
            />{" "}
            유료 자격 활성
          </label>
          <label>
            만료일(한국시간, 비우면 기한 없음){" "}
            <input
              aria-label="유료 자격 만료일"
              type="datetime-local"
              value={endsAt}
              disabled={busy}
              onChange={(e) => setEndsAt(e.target.value)}
              className="rounded border p-2"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="rounded bg-blue-600 px-3 py-2 text-white"
          >
            유료 자격 저장
          </button>
        </div>
      )}
      {message && <output className="mt-3">{message}</output>}
    </section>
  );
}
