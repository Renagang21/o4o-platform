import { useEffect, useState } from "react";
import { homeApi, type HomeItem, type NewsReview } from "./communityHomeApi";

export function CommunityNewsReviewPanel({
  onApply,
}: Readonly<{ onApply: (item: HomeItem, reviewId: string) => void }>) {
  const [review, setReview] = useState<NewsReview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    homeApi
      .review()
      .then((value) => {
        if (active) setReview(value);
      })
      .catch(() => {
        if (active) setError("뉴스 정리 결과를 불러오지 못했습니다.");
      });
    return () => {
      active = false;
    };
  }, []);
  const load = async (run: boolean) => {
    setBusy(true);
    setError("");
    try {
      setReview(await (run ? homeApi.runReview() : homeApi.review()));
    } catch (e) {
      setError(
        (e as { response?: { data?: { error?: string } } }).response?.data
          ?.error ?? "뉴스 정리를 완료하지 못했습니다.",
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <section
      aria-label="뉴스 AI 정리"
      className="space-y-3 rounded-xl border bg-white p-5"
    >
      <h2 className="font-semibold">등록한 뉴스 초안 AI 정리</h2>
      <p className="text-sm text-slate-600">
        세 매체의 미처리 초안을 매체별 최대 2개씩 정리합니다. 하루 한 번만
        실행하며 결과 조회에는 AI를 다시 호출하지 않습니다.
      </p>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={busy || review !== null}
          onClick={() => void load(true)}
          className="min-h-11 rounded bg-emerald-700 px-4 text-white disabled:opacity-50"
        >
          {busy ? "확인 중…" : "오늘의 초안 정리"}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(false)}
          className="min-h-11 rounded border px-4"
        >
          저장된 결과 다시 확인
        </button>
      </div>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {review?.state === "pending" && (
        <output className="block">
          오늘의 정리 요청이 접수됐습니다. 저장된 결과를 다시 확인해 주세요.
        </output>
      )}
      {review?.state === "failed" && (
        <p role="alert">
          오늘의 AI 정리를 완료하지 못했습니다. 추가 호출 없이 기존 뉴스
          편집에서 직접 정리할 수 있습니다.
        </p>
      )}
      {review?.state === "done" && (
        <>
          <p className="text-sm">
            {review.day} 검토용 초안입니다. 적용 후에도 저장·게시를 직접
            선택합니다.
          </p>
          {review.items.map((item) => (
            <article key={item.id} className="space-y-2 border-t py-3">
              <a
                href={item.linkUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-emerald-700"
              >
                {item.title} ↗
              </a>
              <p className="text-sm">
                {item.sourceName}
                {item.recommended ? " · AI 추천 후보" : ""}
              </p>
              <p className="whitespace-pre-wrap break-words text-sm">
                {item.summary}
              </p>
              {item.reason && (
                <p className="text-sm text-slate-600">
                  선정 이유: {item.reason}
                </p>
              )}
              <button
                type="button"
                onClick={() => onApply(item, review.id)}
                className="min-h-11 rounded border px-4"
              >
                편집 초안에 적용
              </button>
            </article>
          ))}
        </>
      )}
    </section>
  );
}
