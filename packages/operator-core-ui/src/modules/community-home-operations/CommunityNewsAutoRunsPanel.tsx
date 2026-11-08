import { useEffect, useRef, useState } from "react";
import { ActionBar, BaseDetailDrawer } from "@o4o/ui";
import { DataTable, type ListColumnDef } from "@o4o/operator-ux-core";
import {
  type CommunityHomeOperationsApi,
  type NewsAutoRun,
} from "./communityHomeApi";
const SOURCE_NAMES: Record<string, string> = {
  kpanews: "약사공론",
  dailypharm: "데일리팜",
  medipana: "메디파나",
};
const WINDOW_NAMES = { morning: "오전", afternoon: "오후" };
const STATE_NAMES: Record<NewsAutoRun["state"], string> = {
  running: "실행 중",
  done: "완료",
  partial: "일부 매체 실패",
  no_articles: "최근 기사 없음",
  ai_disabled: "중앙 AI 비활성 · 게시 없음",
  failed: "실패 · 게시 없음",
};
const errorText = (error: unknown) =>
  (error as { response?: { data?: { error?: string } } }).response?.data
    ?.error ?? "결과를 확인하지 못했습니다. 다시 확인해 주시기 바랍니다.";
const runLabel = (run: NewsAutoRun) =>
  `${run.day} ${WINDOW_NAMES[run.window]}${run.trigger === "manual" ? " · 수동" : ""}`;

const COLUMNS: ListColumnDef<NewsAutoRun>[] = [
  { key: "run", header: "실행", sticky: true, render: (_v, run) => runLabel(run) },
  { key: "state", header: "상태", render: (_v, run) => STATE_NAMES[run.state] },
  { key: "candidates", header: "후보", width: "80px" },
  { key: "published", header: "게시", width: "80px" },
  { key: "suppressed", header: "숨김 유지", width: "96px" },
];

/** Viewing reads stored results only; the feed fetch and AI call run once per day and window. */
export function CommunityNewsAutoRunsPanel({
  onFinished,
  api: homeApi,
}: Readonly<{ onFinished: () => void; api: CommunityHomeOperationsApi }>) {
  const [runs, setRuns] = useState<NewsAutoRun[]>([]),
    [busy, setBusy] = useState(true),
    [error, setError] = useState(""),
    [selected, setSelected] = useState<Set<string>>(new Set()),
    [detail, setDetail] = useState<NewsAutoRun | null>(null);
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    homeApi
      .autoRuns()
      .then((value) => {
        if (active) setRuns(value);
      })
      .catch((e) => {
        if (active) setError(errorText(e));
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, [homeApi]);
  const load = async (run: boolean) => {
    setBusy(true);
    setError("");
    // A reload may drop or change records; never keep a stale selection or detail.
    setSelected(new Set());
    setDetail(null);
    try {
      if (run) await homeApi.runAutoNews();
      const value = await homeApi.autoRuns();
      if (!mounted.current) return;
      setRuns(value);
      if (run) onFinished();
    } catch (e) {
      if (mounted.current) setError(errorText(e));
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  // Records are read-only; the only follow-up is inspecting one run, so it needs a single selection.
  const single =
    selected.size === 1 ? runs.find((r) => selected.has(r.id)) : undefined;
  return (
    <section
      aria-label="뉴스 자동 게시"
      className="space-y-3 rounded-xl border bg-white p-5"
    >
      <h2 className="font-semibold">약업계 주요 소식 자동 게시</h2>
      <p className="text-sm text-slate-600">
        한국시간 오전 8시와 오후 3시 이후 세 매체의 최근 24시간 기사를 AI가
        선별해 자동으로 게시합니다. 같은 이슈에 약사공론 기사가 있으면 약사공론을
        대표로 연결합니다. 게시 중지는 아래 항목의 게시 상태를 보관 · 게시 중지로,
        고정은 상시 노출로 지정하며 이후 실행이 이를 되돌리지 않습니다.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(true)}
          className="min-h-11 rounded bg-emerald-700 px-4 text-white disabled:opacity-50"
        >
          {busy ? "확인 중…" : "이번 시간대 수동 실행"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(false)}
          className="min-h-11 rounded border px-4"
        >
          결과 다시 확인
        </button>
      </div>
      <p className="text-xs text-slate-500">
        시간대별 실행은 하루 한 번입니다. 이미 실행한 시간대는 수동 실행해도
        저장된 결과만 표시합니다.
      </p>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {!busy && !error && (
        <ActionBar
          selectedCount={selected.size}
          onClearSelection={() => setSelected(new Set())}
          actions={[
            {
              key: "detail",
              label: "상세 보기",
              onClick: () => {
                if (single) setDetail(single);
              },
              variant: "primary",
              disabled: !single,
            },
          ]}
        />
      )}
      <DataTable<NewsAutoRun>
        columns={COLUMNS}
        data={runs}
        rowKey="id"
        loading={busy}
        emptyMessage="아직 실행 기록이 없습니다."
        selectable
        selectedKeys={selected}
        onSelectionChange={(keys) => {
          if (!busy) setSelected(keys);
        }}
        onRowClick={(run) => {
          if (!busy) setDetail(run);
        }}
      />
      <BaseDetailDrawer
        open={!!detail}
        onClose={() => setDetail(null)}
        title={detail ? runLabel(detail) : ""}
        width={480}
      >
        {detail && (
          <div className="space-y-3 text-sm">
            <p className="font-medium">{STATE_NAMES[detail.state]}</p>
            <p className="text-slate-600">
              후보 {detail.candidates}건 · 이슈 {detail.clusters}개 · 게시{" "}
              {detail.published}건 · 약사공론 대표 교체 {detail.swapped}건 ·
              운영자 숨김 유지 {detail.suppressed}건
            </p>
            <ul className="space-y-1 text-slate-600">
              {detail.sources.map((source) => (
                <li key={source.id}>
                  {SOURCE_NAMES[source.id] ?? source.id}:{" "}
                  {source.status === "ok"
                    ? `수신 ${source.fetched}건 · 신규 ${source.added}건 · 중복 ${source.duplicates}건 · 24시간 밖 ${source.outOfWindow}건`
                    : `수집 실패 (${source.status})`}
                </li>
              ))}
            </ul>
          </div>
        )}
      </BaseDetailDrawer>
    </section>
  );
}
