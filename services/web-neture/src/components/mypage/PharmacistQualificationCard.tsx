import { useEffect, useRef, useState } from "react";
import { api } from "../../lib/apiClient";
const labels: Record<string, string> = {
  unrequested: "미신청 · 재확인 필요",
  pending: "검토 대기",
  approved: "승인",
  rejected: "반려",
  revoked: "승인 취소",
};
type Qualification = {
  licenseNumber: string | null;
  status: string;
  reason: string | null;
};
export default function PharmacistQualificationCard() {
  const [value, setValue] = useState<Qualification | null>(null),
    [license, setLicense] = useState(""),
    [confirmed, setConfirmed] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  useEffect(() => {
    let alive = true;
    void api
      .get("/qualifications/pharmacist/me")
      .then((r: { data: { data?: Qualification } }) => {
        if (!r.data?.data?.status) throw new Error();
        if (alive) {
          setValue(r.data.data);
          setLicense(r.data.data.licenseNumber ?? "");
        }
      })
      .catch(() => {
        if (alive)
          setError(
            "약사 자격 상태를 불러오지 못했습니다. 설정 화면을 다시 열어 주세요.",
          );
      });
    return () => {
      alive = false;
    };
  }, []);
  const submit = async () => {
    if (lock.current || !confirmed) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      const r = await api.post("/qualifications/pharmacist/me", {
        licenseNumber: license.trim(),
        ownLicenseConfirmed: true,
      });
      setValue(r.data.data);
      setConfirmed(false);
    } catch {
      setError(
        "자격 신청을 처리하지 못했습니다. 계정 상태와 면허번호를 확인해 주세요.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="my-6 rounded-xl border bg-white p-5">
      <h2 className="text-lg font-semibold">약사 자격</h2>
      <p>
        일반 회원은 약사 자격 없이 이용할 수 있습니다. 약사 전용 기능과 약국
        경영 업무에 필요한 자격만 별도로 신청하세요.
      </p>
      {value && (
        <p role="status">현재 상태: {labels[value.status] ?? "확인 필요"}</p>
      )}
      {value?.reason && <p>확인·반려 사유: {value.reason}</p>}
      {error && <p role="alert">{error}</p>}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <label className="my-3 block">
          본인 약사 면허번호
          <input
            className="ml-3 rounded border p-2"
            aria-label="약사 면허번호"
            disabled={busy || !value}
            maxLength={100}
            value={license}
            onChange={(e) => setLicense(e.target.value)}
          />
        </label>
        <label className="block">
          <input
            type="checkbox"
            checked={confirmed}
            disabled={busy || !value}
            onChange={(e) => setConfirmed(e.target.checked)}
          />{" "}
          본인의 면허 정보이며, 변경 시 기존 자격은 다시 검토받는 데 동의합니다.
        </label>
        <button
          className="mt-3 rounded bg-blue-700 px-4 py-2 text-white disabled:opacity-50"
          disabled={busy || !value || !confirmed || !license.trim()}
        >
          {busy ? "신청 중…" : "자격 검토 신청"}
        </button>
      </form>
      <p className="mt-3 text-sm text-slate-600">
        신청·반려·승인 취소는 공통 계정을 삭제하거나 일반 회원 자격을 반려하지
        않습니다.
      </p>
    </section>
  );
}
