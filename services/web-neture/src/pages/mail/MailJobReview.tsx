import { useEffect, useState } from "react";
import {
  mailActionLabels,
  mailErrorMessage,
  type MailJob,
} from "../../api/personalMail";

export function MailJobReview({
  job,
  busy,
  onConfirm,
  onControl,
}: {
  readonly job: MailJob;
  readonly busy: boolean;
  readonly onConfirm: () => void;
  readonly onControl: (command: "pause" | "resume" | "cancel") => void;
}) {
  const [acknowledged, setAcknowledged] = useState(false);
  useEffect(() => setAcknowledged(false), [job.id, job.status]);
  const preview = job.status === "preview",
    active = ["pending", "running", "paused", "failed"].includes(job.status);
  return (
    <section
      aria-label="메일 작업 확인"
      className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-4"
    >
      <h2 className="text-lg font-semibold">
        {preview ? "대상과 처리 방식 확인" : "메일 작업 현황"}
      </h2>
      <dl className="grid gap-2 sm:grid-cols-2">
        <div>
          <dt>처리 방식</dt>
          <dd className="font-semibold">{mailActionLabels[job.action]}</dd>
        </div>
        <div>
          <dt>확인 대상</dt>
          <dd className="font-semibold">
            {job.total.toLocaleString()}
            {job.kind === "rule" ? "개 발신처" : "건 메일"}
          </dd>
        </div>
      </dl>
      {!!job.proposal.senders?.length && (
        <p className="break-all text-sm">
          발신처: {job.proposal.senders.join(", ")}
        </p>
      )}
      {job.kind === "rule" ? (
        <p>
          승인 이후 수신되는 메일에 적용합니다. 기존 메일과 이미 정리된 메일을
          복원하지 않습니다. 중요 메일은 보호합니다.
        </p>
      ) : (
        <p>
          검토 시점에 수집된 대상만 처리합니다.{" "}
          {job.includeImportant
            ? "중요 메일을 포함합니다."
            : "중요 메일은 정리에서 보호합니다."}{" "}
          실제 메일은 원래 메일 서비스에 있습니다.
        </p>
      )}
      {job.lastError && (
        <p role="alert">
          {mailErrorMessage({ response: { data: { code: job.lastError } } })}
        </p>
      )}
      {preview ? (
        <>
          <p className="text-sm">
            검토 유효 시간:{" "}
            {new Date(job.confirmationExpiresAt).toLocaleString()}
          </p>
          <label className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={acknowledged}
              disabled={busy}
              onChange={(e) => setAcknowledged(e.target.checked)}
            />
            대상·건수와 처리 방식을 확인했습니다.
          </label>
          <button
            className="rounded bg-blue-700 px-4 py-3 text-white disabled:opacity-50"
            disabled={busy || !acknowledged || !job.confirmationToken}
            onClick={onConfirm}
          >
            {job.kind === "rule"
              ? "확인한 규칙 활성화"
              : `확인한 ${job.total.toLocaleString()}건 실행`}
          </button>
          <button
            className="ml-3 rounded border px-4 py-3"
            disabled={busy}
            onClick={() => onControl("cancel")}
          >
            검토 취소
          </button>
        </>
      ) : (
        <>
          <p role="status">
            {job.kind === "rule" && job.status === "completed"
              ? "규칙 적용 완료"
              : `완료 ${job.counts.done} · 건너뜀 ${job.counts.skipped} · 실패 ${job.counts.failed} · 대기 ${job.counts.pending}`}
          </p>
          {active && (
            <div className="flex flex-wrap gap-3">
              {["pending", "running"].includes(job.status) && (
                <button
                  className="rounded border bg-white px-4 py-2"
                  disabled={busy}
                  onClick={() => onControl("pause")}
                >
                  작업 중단
                </button>
              )}
              {["paused", "failed"].includes(job.status) && (
                <button
                  className="rounded border bg-white px-4 py-2"
                  disabled={busy}
                  onClick={() => onControl("resume")}
                >
                  내 권한으로 재개
                </button>
              )}
              <button
                className="rounded border bg-white px-4 py-2"
                disabled={busy}
                onClick={() => onControl("cancel")}
              >
                남은 작업 취소
              </button>
            </div>
          )}
          <p className="text-sm">
            중단·취소 전 완료된 메일 처리는 유지됩니다. 재개는 이미 승인한 동일
            대상에 적용합니다.
          </p>
        </>
      )}
    </section>
  );
}
