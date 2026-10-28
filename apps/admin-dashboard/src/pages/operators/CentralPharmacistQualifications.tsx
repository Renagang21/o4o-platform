import { useCallback, useEffect, useRef, useState } from "react";
import { authClient } from "@o4o/auth-client";
type Qualification = {
  userId: string;
  name: string;
  licenseNumber: string | null;
  status: string;
  reason: string | null;
  version: string;
};
const labels: Record<string, string> = {
  pending: "검토 대기",
  unrequested: "기존 자료 · 재확인 필요",
  approved: "승인",
  rejected: "반려",
  revoked: "승인 취소",
};
const base = "/qualifications/pharmacist/review";
export default function CentralPharmacistQualifications({
  actorId,
}: {
  actorId: string;
}) {
  const [rows, setRows] = useState<Qualification[]>([]),
    [status, setStatus] = useState("pending"),
    [page, setPage] = useState(1),
    [hasNext, setHasNext] = useState(false);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false),
    [selected, setSelected] = useState<{
      row: Qualification;
      action: "approve" | "reject" | "revoke";
    } | null>(null);
  const [reason, setReason] = useState(""),
    [checked, setChecked] = useState(false);
  const locked = useRef(false),
    sequence = useRef(0);
  const load = useCallback(async () => {
    const seq = ++sequence.current;
    setRows([]);
    setError("");
    try {
      const r = await authClient.api.get(base, { params: { status, page } });
      if (!Array.isArray(r.data?.data?.items)) throw new Error();
      if (seq === sequence.current) {
        setRows(r.data.data.items);
        setHasNext(r.data.data.hasNext === true);
      }
    } catch {
      if (seq === sequence.current)
        setError("약사 자격 신청을 불러오지 못했습니다.");
    }
  }, [status, page]);
  useEffect(() => {
    setSelected(null);
    setReason("");
    setChecked(false);
    void load();
    return () => {
      sequence.current += 1;
    };
  }, [load]);
  const choose = (
    row: Qualification,
    action: "approve" | "reject" | "revoke",
  ) => {
    setSelected({ row, action });
    setReason("");
    setChecked(false);
    setNotice("");
  };
  const decide = async () => {
    if (
      !selected ||
      locked.current ||
      !reason.trim() ||
      (selected.action === "approve" && !checked)
    )
      return;
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      await authClient.api.post(
        `${base}/${encodeURIComponent(selected.row.userId)}`,
        {
          action: selected.action,
          reason: reason.trim(),
          version: selected.row.version,
          ...(selected.action === "approve"
            ? { licenseEvidenceChecked: true }
            : {}),
        },
      );
      setSelected(null);
      setNotice(
        "자격 검토 결과를 저장했습니다. 공통 계정 상태는 변경하지 않았습니다.",
      );
      await load();
    } catch {
      setSelected(null);
      setRows([]);
      setError(
        "처리하지 못했습니다. 신청 정보·검토 권한을 다시 조회해 주세요.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="central-qualification space-y-4">
      <h2 className="text-xl font-bold">공통 약사 자격 검토</h2>
      <p>
        면허 근거를 별도로 확인한 뒤 처리 사유를 기록합니다. 기존 분회·약국 승인
        자료는 자동으로 자격 승인되지 않습니다.
      </p>
      <label>
        검토 상태{" "}
        <select
          value={status}
          disabled={busy}
          onChange={(e) => {
            setPage(1);
            setStatus(e.target.value);
          }}
        >
          {Object.entries(labels).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </label>
      <button disabled={busy} onClick={() => void load()}>
        새로고침
      </button>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <ul>
        {rows.map((row) => (
          <li key={row.userId} className="my-3 rounded border bg-white p-4">
            <h3>
              {row.name} · {labels[row.status]}
            </h3>
            <p>면허번호: {row.licenseNumber || "미등록"}</p>
            {row.reason && <p>처리 사유: {row.reason}</p>}
            <div className="mt-3 flex gap-4">
              {row.status !== "approved" && row.licenseNumber && (
                <button
                  disabled={busy || row.userId === actorId}
                  onClick={() => choose(row, "approve")}
                >
                  승인 검토
                </button>
              )}
              {["pending", "unrequested"].includes(row.status) && (
                <button disabled={busy} onClick={() => choose(row, "reject")}>
                  반려
                </button>
              )}
              {row.status === "approved" && (
                <button disabled={busy} onClick={() => choose(row, "revoke")}>
                  승인 취소
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
      <nav>
        <button disabled={busy || page === 1} onClick={() => setPage(page - 1)}>
          이전
        </button>
        <span>{page} 페이지</span>
        <button disabled={busy || !hasNext} onClick={() => setPage(page + 1)}>
          다음
        </button>
      </nav>
      {selected && (
        <form
          className="rounded border bg-white p-5"
          onSubmit={(e) => {
            e.preventDefault();
            void decide();
          }}
        >
          <h3>
            {selected.row.name} · 면허번호 {selected.row.licenseNumber}
          </h3>
          <p>
            {selected.action === "approve"
              ? "자격 승인"
              : selected.action === "reject"
                ? "자격 반려"
                : "자격 승인 취소"}{" "}
            처리
          </p>
          <label className="block">
            신청자에게 안내할 확인·반려 사유{" "}
            <textarea
              required
              maxLength={2000}
              disabled={busy}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {selected.action === "approve" && (
            <label className="block">
              <input
                type="checkbox"
                checked={checked}
                disabled={busy}
                onChange={(e) => setChecked(e.target.checked)}
              />{" "}
              신청자 본인의 면허 근거를 별도로 확인했습니다.
            </label>
          )}
          <button
            type="submit"
            disabled={
              busy ||
              !reason.trim() ||
              (selected.action === "approve" && !checked)
            }
          >
            검토 결과 저장
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => setSelected(null)}
          >
            닫기
          </button>
        </form>
      )}
    </section>
  );
}
