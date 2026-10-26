import { useCallback, useEffect, useId, useRef, useState } from "react";
import { partnerApi, type MediaFile } from "./api";
import type { Asset } from "./model";

export default function AssetResources({
  asset,
  spaceId,
  readOnly,
  onRestore,
}: {
  asset: Asset;
  spaceId?: string;
  readOnly: boolean;
  onRestore: (asset: Asset) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [files, setFiles] = useState<MediaFile[]>([]),
    [enabled, setEnabled] = useState(false);
  const [versions, setVersions] = useState<
      Awaited<ReturnType<typeof partnerApi.assetVersions>>
    >([]),
    [preview, setPreview] = useState<{ url: string; mime: string } | null>(
      null,
    );
  const busyRef = useRef(false),
    mounted = useRef(true),
    urls = useRef<string[]>([]),
    label = useId();
  const refresh = useCallback(async () => {
    if (!spaceId) return;
    const [f, v, c] = await Promise.all([
      partnerApi.files(spaceId),
      partnerApi.assetVersions(spaceId, asset.id),
      partnerApi.mediaCapabilities(spaceId),
    ]);
    setFiles(f.filter((file) => file.asset_id === asset.id));
    setVersions(v);
    setEnabled(c.enabled);
  }, [spaceId, asset.id]);
  const run = useCallback(async (work: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch (e) {
      setError(e instanceof Error ? e.message : "파일을 처리하지 못했습니다.");
    } finally {
      setBusy(false);
      busyRef.current = false;
    }
  }, []);
  useEffect(() => {
    if (open && spaceId) void run(refresh);
  }, [open, spaceId, refresh, run]);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      urls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);
  const upload = (file: File | undefined, previous?: string) => {
    if (!file || !spaceId) return;
    void run(async () => {
      if (file.size > 25 * 1024 * 1024)
        throw new Error("파일은 25MB 이내로 선택해 주세요.");
      await partnerApi.upload(spaceId, asset.id, file, previous);
      await refresh();
    });
  };
  const show = async (file: MediaFile, download = false) => {
    if (!spaceId) return;
    await run(async () => {
      const blob = await partnerApi.fileBlob(spaceId, file.id);
      if (!mounted.current) return;
      const url = URL.createObjectURL(blob);
      urls.current.push(url);
      if (download) {
        const a = document.createElement("a");
        a.href = url;
        a.download = file.name;
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          urls.current = urls.current.filter((u) => u !== url);
        }, 1000);
      } else {
        if (preview) URL.revokeObjectURL(preview.url);
        setPreview({ url, mime: file.mime });
      }
    });
  };
  const groups = new Map<string, MediaFile>();
  for (const file of files)
    if (
      !groups.has(file.group_id) ||
      groups.get(file.group_id)!.version < file.version
    )
      groups.set(file.group_id, file);
  return (
    <details
      className="asset-resources"
      onToggle={(e) => setOpen(e.currentTarget.open)}
    >
      <summary>첨부 파일 · 콘텐츠 버전</summary>
      {open && (
        <div>
          {!spaceId ? (
            <p className="hint">
              파일과 버전 관리는 서버 공동공간에서 이용할 수 있습니다.
            </p>
          ) : (
            <>
              {error && (
                <p role="alert" className="message failure">
                  {error}
                </p>
              )}
              <button
                className="text-button"
                disabled={busy}
                onClick={() => void run(refresh)}
              >
                파일·이력 새로고침
              </button>
              {!enabled && (
                <p className="hint">파일 저장소가 아직 연결되지 않았습니다.</p>
              )}
              {!readOnly && (
                <div className="field">
                  <label htmlFor={label}>이미지·영상 첨부 (25MB 이내)</label>
                  <input
                    id={label}
                    type="file"
                    accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
                    disabled={busy || !enabled}
                    onChange={(e) => {
                      upload(e.currentTarget.files?.[0]);
                      e.currentTarget.value = "";
                    }}
                  />
                </div>
              )}
              {[...groups.values()].map((file) => (
                <div className="media-card" key={file.group_id}>
                  <strong>{file.name}</strong>
                  <p className="hint">
                    v{file.version} · {(file.size / 1024 / 1024).toFixed(2)}MB ·{" "}
                    {file.mime}
                  </p>
                  <div className="button-row">
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void show(file)}
                    >
                      미리보기
                    </button>
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => void show(file, true)}
                    >
                      파일 다운로드
                    </button>
                    {!readOnly && (
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => {
                          if (confirm("이 첨부 파일의 모든 버전을 삭제할까요?"))
                            void run(async () => {
                              const result = await partnerApi.removeFile(
                                spaceId,
                                file.id,
                              );
                              await refresh();
                              setPreview(null);
                              if (result?.cleanupPending)
                                setError(
                                  "접근은 해제했지만 일부 파일의 저장소 정리가 남아 있습니다.",
                                );
                            });
                        }}
                      >
                        첨부 삭제
                      </button>
                    )}
                  </div>
                  {!readOnly && (
                    <label className="field">
                      다음 버전 파일
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp,video/mp4,video/webm"
                        disabled={busy || !enabled}
                        onChange={(e) => {
                          upload(e.currentTarget.files?.[0], file.id);
                          e.currentTarget.value = "";
                        }}
                      />
                    </label>
                  )}
                  <div className="file-versions">
                    {files
                      .filter(
                        (f) => f.group_id === file.group_id && f.id !== file.id,
                      )
                      .sort((a, b) => b.version - a.version)
                      .map((v) => (
                        <button
                          className="text-button"
                          key={v.id}
                          disabled={busy}
                          onClick={() => void show(v, true)}
                        >
                          v{v.version} 다운로드
                        </button>
                      ))}
                  </div>
                </div>
              ))}
              {preview &&
                (preview.mime.startsWith("image/") ? (
                  <img
                    className="media-preview"
                    src={preview.url}
                    alt={`${asset.title} 첨부 미리보기`}
                  />
                ) : (
                  <video
                    className="media-preview"
                    src={preview.url}
                    controls
                    preload="metadata"
                  />
                ))}
              <h3>텍스트·자료 정보 버전</h3>
              {!versions.length && (
                <p className="hint">다음 자료 저장부터 버전 이력이 남습니다.</p>
              )}
              {versions.map((v) => (
                <div key={v.id} className="version-row">
                  <span>
                    저장 버전 {v.revision} ·{" "}
                    {new Date(v.createdAt).toLocaleString("ko-KR")}
                  </span>
                  <p>{v.asset.content.slice(0, 120)}</p>
                  {!readOnly && (
                    <button
                      className="text-button"
                      disabled={busy}
                      onClick={() => {
                        if (
                          confirm(
                            "이 버전의 내용과 자료 정보를 새 변경으로 복원할까요?",
                          )
                        )
                          void run(async () => {
                            await onRestore(v.asset);
                            await refresh();
                          });
                      }}
                    >
                      이 내용으로 복원
                    </button>
                  )}
                </div>
              ))}
            </>
          )}
        </div>
      )}
    </details>
  );
}
