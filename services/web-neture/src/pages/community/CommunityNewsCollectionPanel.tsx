import { useEffect, useRef, useState } from "react";
import { homeApi, type NewsCollection } from "./communityHomeApi";
const names: Record<string, string> = {
  kpanews: "약사공론",
  dailypharm: "데일리팜",
  medipana: "메디파나",
};
export function CommunityNewsCollectionPanel({
  onCollected,
}: Readonly<{ onCollected: () => void }>) {
  const [value, setValue] = useState<NewsCollection | null>(null),
    [busy, setBusy] = useState(true),
    [error, setError] = useState("");
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    let active = true;
    homeApi
      .collection()
      .then((v) => {
        if (active) setValue(v);
      })
      .catch(() => {
        if (active) setError("수집 결과를 불러오지 못했습니다.");
      })
      .finally(() => {
        if (active) setBusy(false);
      });
    return () => {
      active = false;
      mounted.current = false;
    };
  }, []);
  const load = async (run: boolean) => {
    setBusy(true);
    setError("");
    try {
      const result = await (run ? homeApi.collect() : homeApi.collection());
      if (!mounted.current) return;
      setValue(result);
      if (result && result.state !== "pending") onCollected();
    } catch {
      if (mounted.current)
        setError(
          "수집 결과를 확인하지 못했습니다. 결과 다시 확인을 눌러 주세요.",
        );
    } finally {
      if (mounted.current) setBusy(false);
    }
  };
  return (
    <section
      aria-label="뉴스 수집"
      className="space-y-3 rounded-xl border bg-white p-5"
    >
      <h2 className="font-semibold">전문지 주요 기사 수집</h2>
      <p className="text-sm text-slate-600">
        매일 오전 8시 이후 세 매체의 주요 기사 링크를 매체별 최대 2개씩 수집하고
        AI 검토 초안을 준비합니다. 게시 여부는 운영자가 결정합니다.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || value !== null}
          onClick={() => void load(true)}
          className="min-h-11 rounded bg-emerald-700 px-4 text-white disabled:opacity-50"
        >
          {busy ? "확인 중…" : "오늘의 기사 수집"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(false)}
          className="min-h-11 rounded border px-4"
        >
          수집 결과 다시 확인
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {value?.state === "pending" && (
        <output className="block">
          오늘의 수집 요청이 접수됐습니다. 결과를 다시 확인해 주세요.
        </output>
      )}
      {value && value.state !== "pending" && (
        <>
          <p className="text-sm">
            {value.day} 수집 결과입니다. 새로 등록한 기사는 아래 등록 항목에서
            확인해 주세요.
          </p>
          <ul className="space-y-2 text-sm">
            {value.sources.map((source) => (
              <li key={source.id}>
                {names[source.id] ?? source.id}:{" "}
                {source.status === "ok"
                  ? `신규 ${source.added}개`
                  : "수집 확인 필요 · 직접 기사 등록 가능"}
              </li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
