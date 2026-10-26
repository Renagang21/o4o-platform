import { useId, useState } from "react";
import { activitiesCsv, paymentsCsv } from "./imports";
import type { Workspace } from "./model";

function saveText(name: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function ActivityImporter({
  workspace,
  disabled,
  onSave,
}: {
  workspace: Workspace;
  disabled: boolean;
  onSave: (w: Workspace) => void | Promise<void>;
}) {
  const [proposal, setProposal] = useState(""),
    [creator, setCreator] = useState(""),
    [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false);
  const id = useId();
  return (
    <details className="utility-panel panel">
      <summary>게시 활동 CSV 일괄 등록</summary>
      <p className="hint">
        선택한 제안·홍보자에 대해 url,publishedAt,views,likes,comments,shares
        열을 가져옵니다. 날짜는 YYYY-MM-DD, 지표는 비워두거나 0 이상의 정수로
        입력하세요. 동일 홍보자의 같은 게시물은 중복 추가하지 않습니다.
      </p>
      <div className="inline-fields">
        <label className="field">
          가져올 홍보 제안
          <select
            aria-label="가져올 홍보 제안"
            value={proposal}
            disabled={disabled || busy}
            onChange={(e) => setProposal(e.target.value)}
          >
            <option value="">선택</option>
            {workspace.proposals.map((p) => (
              <option value={p.id} key={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          가져올 홍보자
          <select
            aria-label="가져올 홍보자"
            value={creator}
            disabled={disabled || busy}
            onChange={(e) => setCreator(e.target.value)}
          >
            <option value="">선택</option>
            {workspace.creators.map((c) => (
              <option value={c.id} key={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="button-row">
        <button
          className="button secondary"
          onClick={() =>
            saveText(
              "activity-template.csv",
              "\uFEFFurl,publishedAt,views,likes,comments,shares\r\n",
            )
          }
        >
          활동 CSV 양식 ↓
        </button>
        <label className="field" htmlFor={id}>
          활동 CSV 파일
          <input
            id={id}
            type="file"
            accept=".csv,text/csv"
            disabled={disabled || busy || !proposal || !creator}
            onChange={async (e) => {
              const file = e.currentTarget.files?.[0];
              e.currentTarget.value = "";
              if (!file) return;
              setError("");
              setMessage("");
              setBusy(true);
              try {
                if (file.size > 1024 * 1024)
                  throw new Error("CSV는 1MB 이내로 선택해 주세요.");
                const result = activitiesCsv(
                  await file.text(),
                  workspace,
                  proposal,
                  creator,
                );
                if (result.records.length)
                  await onSave({
                    ...workspace,
                    activities: [...result.records, ...workspace.activities],
                  });
                setMessage(
                  `${result.records.length}건 등록 · 중복 ${result.skipped}건 제외`,
                );
              } catch (e) {
                setError(
                  e instanceof Error ? e.message : "가져오지 못했습니다.",
                );
              } finally {
                setBusy(false);
              }
            }}
          />
        </label>
      </div>
      {error && (
        <p role="alert" className="message failure">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="message success">
          {message}
        </p>
      )}
    </details>
  );
}
export function PaymentImporter({
  workspace,
  disabled,
  onSave,
}: {
  workspace: Workspace;
  disabled: boolean;
  onSave: (w: Workspace) => void | Promise<void>;
}) {
  const [error, setError] = useState(""),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    id = useId();
  return (
    <details className="utility-panel panel">
      <summary>외부 지급 결과 CSV 가져오기</summary>
      <p className="hint">
        명세의 settlementId와 실제 외부 지급 결과의 paidAt(ISO 시각),reference
        열을 이용합니다. 송금을 실행하지 않습니다. 오류·중복 ID가 있으면 전체
        가져오기를 중지합니다.
      </p>
      <button
        className="button secondary"
        onClick={() =>
          saveText(
            "payment-template.csv",
            "\uFEFFsettlementId,paidAt,reference\r\n",
          )
        }
      >
        지급 결과 CSV 양식 ↓
      </button>
      <label className="field" htmlFor={id}>
        지급 결과 CSV 파일
        <input
          id={id}
          type="file"
          accept=".csv,text/csv"
          disabled={disabled || busy}
          onChange={async (e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = "";
            if (!file) return;
            setBusy(true);
            setError("");
            setMessage("");
            try {
              if (file.size > 1024 * 1024)
                throw new Error("CSV는 1MB 이내로 선택해 주세요.");
              const result = paymentsCsv(await file.text(), workspace);
              if (
                result.updated &&
                !confirm(
                  `${result.updated}건의 외부 지급 결과를 기록할까요? 실제 송금은 수행하지 않습니다.`,
                )
              )
                return;
              if (result.updated) await onSave(result.workspace);
              setMessage(
                `${result.updated}건의 외부 지급 결과를 기록했습니다.`,
              );
            } catch (e) {
              setError(e instanceof Error ? e.message : "가져오지 못했습니다.");
            } finally {
              setBusy(false);
            }
          }}
        />
      </label>
      {error && (
        <p role="alert" className="message failure">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="message success">
          {message}
        </p>
      )}
    </details>
  );
}
export function PerformanceReports({ workspace }: { workspace: Workspace }) {
  const [from, setFrom] = useState(""),
    [to, setTo] = useState(""),
    [creator, setCreator] = useState("");
  const invalid = !!from && !!to && from > to;
  const activities = invalid
    ? []
    : workspace.activities.filter(
        (a) =>
          (!from || a.publishedAt >= from) &&
          (!to || a.publishedAt <= to) &&
          (!creator || creator === a.creatorId),
      );
  const groups = new Map<
    string,
    {
      name: string;
      posts: number;
      views: bigint;
      reactions: bigint;
      missing: number;
    }
  >();
  for (const a of activities) {
    const key = a.assetId || `proposal:${a.proposalId}`,
      r = groups.get(key) || {
        name:
          (a.assetId
            ? workspace.assets.find((x) => x.id === a.assetId)?.title
            : workspace.proposals.find((x) => x.id === a.proposalId)?.title) ||
          "미분류",
        posts: 0,
        views: 0n,
        reactions: 0n,
        missing: 0,
      };
    r.posts++;
    if (a.views === null) r.missing++;
    else r.views += BigInt(a.views);
    r.reactions +=
      BigInt(a.metrics?.likes || 0) +
      BigInt(a.metrics?.comments || 0) +
      BigInt(a.metrics?.shares || 0);
    groups.set(key, r);
  }
  return (
    <section className="panel">
      <h2>콘텐츠별 활동 비교</h2>
      <p className="hint">
        직접 입력하거나 CSV로 가져온 지표입니다. 누락 지표는 합계에서 제외하며,
        반응 합계는 좋아요·댓글·공유 수의 합입니다. 자동 검증된 조회·매출·전환
        성과가 아닙니다.
      </p>
      <div className="inline-fields">
        <label className="field">
          게시일 시작
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </label>
        <label className="field">
          게시일 종료
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </label>
        <label className="field">
          리포트 홍보자
          <select
            aria-label="리포트 홍보자"
            value={creator}
            onChange={(e) => setCreator(e.target.value)}
          >
            <option value="">전체</option>
            {workspace.creators.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {invalid && (
        <p role="alert" className="message failure">
          시작일은 종료일 이전으로 선택해 주세요.
        </p>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              <th>콘텐츠 / 미연결 시 제안</th>
              <th>게시물</th>
              <th>입력 조회수 합계</th>
              <th>반응 합계</th>
              <th>조회수 미입력</th>
            </tr>
          </thead>
          <tbody>
            {[...groups]
              .sort((a, b) =>
                a[1].views > b[1].views ? -1 : a[1].views < b[1].views ? 1 : 0,
              )
              .map(([id, r]) => (
                <tr key={id}>
                  <td>{r.name}</td>
                  <td>{r.posts}</td>
                  <td>{r.views.toLocaleString()}</td>
                  <td>{r.reactions.toLocaleString()}</td>
                  <td>{r.missing}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
      {!groups.size && (
        <p className="hint">선택한 조건의 활동 기록이 없습니다.</p>
      )}
    </section>
  );
}
