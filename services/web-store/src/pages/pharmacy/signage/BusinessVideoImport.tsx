import { useEffect, useRef, useState } from "react";
import {
  neturePharmacyApi,
  type SemiFranchiseContent,
} from "../../../api/neturePharmacy";
import { SignageSelectionTable } from "./SignageSelectionTable";
import { VideoPlayback } from "@o4o/tablet-kiosk-core";

/** Uses the existing member-only material catalog; every copy is authorized again by the server. */
export function BusinessVideoImport({
  organizationId,
  isCurrent,
  onImported,
  onClose,
}: Readonly<{
  organizationId: string;
  isCurrent: () => boolean;
  onImported: () => void;
  onClose: () => void;
}>) {
  const [page, setPage] = useState(1),
    [query, setQuery] = useState(""),
    [search, setSearch] = useState("");
  const [items, setItems] = useState<SemiFranchiseContent[]>([]),
    [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false),
    [revision, setRevision] = useState(0);
  const [preview, setPreview] = useState<{
    url: string;
    title: string;
    kind: "youtube" | "vimeo";
  } | null>(null);
  const lock = useRef(false),
    live = useRef(true);
  useEffect(() => {
    live.current = true;
    return () => {
      live.current = false;
    };
  }, []);
  useEffect(() => {
    let current = true;
    setItems([]);
    setError("");
    setLoading(true);
    setPreview(null);
    neturePharmacyApi
      .listContents({ q: search, page, limit: 20 })
      .then((result) => {
        if (current && isCurrent()) {
          setItems(result.items);
          setTotal(result.total);
        }
      })
      .catch(() => {
        if (current && isCurrent())
          setError("가입한 협업체의 영상을 불러오지 못했습니다.");
      })
      .finally(() => {
        if (current && isCurrent()) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [organizationId, isCurrent, page, search, revision]);
  const copy = async (item: SemiFranchiseContent, url: string) => {
    if (lock.current || !isCurrent()) return;
    lock.current = true;
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const result = await neturePharmacyApi.copyVideo(item.id, url);
      if (!result.snapshotId) throw new Error("UNCONFIRMED");
      if (live.current && isCurrent()) {
        setSaved(`${item.title} 영상을 동영상함에 가져왔습니다.`);
        onImported();
      }
    } catch {
      if (live.current && isCurrent())
        setError(
          "영상을 가져오지 못했습니다. 가입·게시 상태를 확인하고 다시 시도해 주세요.",
        );
    } finally {
      lock.current = false;
      if (live.current && isCurrent()) setBusy(false);
    }
  };
  const videos = items.flatMap((item) =>
    (item.videos ?? []).map((video) => ({
      id: `${item.id}:${video.sourceUrl}`,
      item,
      video,
    })),
  );
  return (
    <section
      aria-label="가입 협업체 영상 가져오기"
      className="space-y-3 rounded-xl border bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold">가입 협업체 영상</h2>
        <button
          type="button"
          disabled={busy}
          onClick={onClose}
          className="min-h-11 px-3"
        >
          닫기
        </button>
      </div>
      <form
        className="flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          setSearch(query);
          setRevision((value) => value + 1);
        }}
      >
        <input
          aria-label="협업체 영상 자료 검색"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          className="min-h-11 rounded border px-3"
        />
        <button
          type="submit"
          disabled={busy}
          className="min-h-11 rounded border px-3"
        >
          검색
        </button>
      </form>
      {error && (
        <p role="alert">
          {error}{" "}
          <button
            type="button"
            disabled={busy}
            onClick={() => setRevision((value) => value + 1)}
            className="min-h-11 underline"
          >
            다시 시도
          </button>
        </p>
      )}
      {saved && <p role="status">{saved}</p>}
      {loading ? (
        <p role="status">제공 영상을 확인하고 있습니다.</p>
      ) : (
        (
          <>
            {!error && !videos.length && (
              <p>
                이 페이지에 제공 영상이 없습니다. 검색하거나 다음 자료를
                확인하세요.
              </p>
            )}
            <SignageSelectionTable
              dataSource={videos}
              rowKey="id"
              selectionKey={`${organizationId}:${page}:${search}:${revision}`}
              emptyText="제공 영상이 없습니다"
              columns={[
                {
                  key: "title",
                  title: "영상",
                  render: (_value, row) => row.item.title,
                },
                {
                  key: "business",
                  title: "제공 협업체",
                  render: (_value, row) => row.item.semiFranchiseName,
                },
                {
                  key: "provider",
                  title: "영상 서비스",
                  render: (_value, row) => row.video.sourceType,
                },
              ]}
              actions={[
                {
                  key: "preview",
                  label: "미리보기",
                  disabled: () => busy,
                  onSelect: (row) =>
                    setPreview({
                      url: row.video.sourceUrl,
                      kind: row.video.sourceType,
                      title: row.item.title,
                    }),
                },
                {
                  key: "import",
                  label: "동영상함에 가져오기",
                  disabled: () => busy,
                  onSelect: (row) => copy(row.item, row.video.sourceUrl),
                },
              ]}
            />
            <nav
              aria-label="협업체 자료 페이지"
              className="flex items-center gap-3"
            >
              <button
                type="button"
                disabled={page === 1 || busy}
                onClick={() => setPage((value) => value - 1)}
                className="min-h-11 px-3"
              >
                이전
              </button>
              <span>
                {page} / {Math.max(1, Math.ceil(total / 20))}
              </span>
              <button
                type="button"
                disabled={page * 20 >= total || busy}
                onClick={() => setPage((value) => value + 1)}
                className="min-h-11 px-3"
              >
                다음
              </button>
            </nav>
          </>
        )
      )}
      {preview && (
        <div className="aspect-video max-w-lg">
          <VideoPlayback
            key={preview.url}
            url={preview.url}
            kind={preview.kind}
            title={preview.title}
          />
        </div>
      )}
    </section>
  );
}
