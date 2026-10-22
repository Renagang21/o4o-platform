import { useEffect, useState } from "react";
import {
  getExternalAi,
  saveExternalAi,
  type ExternalAiSnapshot,
  type ExternalAiSettings,
} from "../../../api/external-ai";

const names = {
  supplier: "공급자",
  store: "약국",
  organization: "협력조직",
  community: "커뮤니티",
};
const button =
  "rounded border border-gray-300 px-3 py-2 text-sm disabled:opacity-50";
export default function ExternalAiConnections() {
  const [data, setData] = useState<ExternalAiSnapshot | null>(null);
  const [draft, setDraft] = useState<ExternalAiSettings | null>(null);
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [retry, setRetry] = useState(0);
  useEffect(() => {
    let cancelled = false;
    setData(null);
    setDraft(null);
    setMessage("");
    getExternalAi()
      .then((value) => {
        if (!cancelled) {
          setData(value);
          setDraft(structuredClone(value.settings));
        }
      })
      .catch(() => {
        if (!cancelled)
          setMessage("연결 설정을 불러오지 못했습니다. 다시 불러와 주세요.");
      });
    return () => {
      cancelled = true;
    };
  }, [retry]);
  async function save() {
    if (!data || !draft) return;
    setBusy(true);
    setMessage("");
    try {
      await saveExternalAi(data.revision, draft);
      const value = await getExternalAi();
      setData(value);
      setDraft(structuredClone(value.settings));
      setMessage("설정을 저장했습니다. 이후 요청부터 적용됩니다.");
    } catch {
      setMessage(
        "저장하지 못했습니다. 다른 관리자가 변경했다면 다시 불러온 뒤 수정해 주세요.",
      );
    } finally {
      setBusy(false);
    }
  }
  const change = (update: (value: ExternalAiSettings) => void) =>
    setDraft((current) => {
      if (!current) return current;
      const next = structuredClone(current);
      update(next);
      return next;
    });
  return (
    <section className="space-y-5" aria-label="외부 AI 연결 설정">
      <div className="flex flex-wrap justify-between gap-3">
        <div>
          <h2 className="text-xl font-semibold">외부 AI 연결</h2>
          <p className="mt-2 text-sm text-gray-600">
            사용자가 자신의 AI에서 O4O 자료를 조회하고 콘텐츠 초안을 저장하도록
            허용합니다.
          </p>
        </div>
        <button
          className={button}
          disabled={busy}
          onClick={() => setRetry((v) => v + 1)}
        >
          다시 불러오기
        </button>
      </div>
      {message && (
        <p role="status" className="rounded border p-3">
          {message}
        </p>
      )}
      {!data || !draft ? (
        <p aria-live="polite">
          {message
            ? "설정 조회가 필요합니다."
            : "연결 설정을 불러오는 중입니다."}
        </p>
      ) : (
        <>
          <fieldset
            disabled={busy}
            className="space-y-4 rounded border bg-white p-4"
          >
            <legend className="px-2 font-semibold">연결 허용</legend>
            {!data.configured && (
              <p className="text-sm text-amber-800">
                연결 서버 준비가 필요합니다. 준비가 끝나면 연결을 사용할 수
                있습니다.
              </p>
            )}
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.enabled}
                disabled={!data.configured && !draft.enabled}
                onChange={(e) =>
                  change((v) => {
                    v.enabled = e.target.checked;
                  })
                }
              />
              외부 AI 연결 사용
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.chatgptEnabled}
                onChange={(e) =>
                  change((v) => {
                    v.chatgptEnabled = e.target.checked;
                  })
                }
              />
              ChatGPT 연결 허용
            </label>
            <p className="text-sm text-gray-600">
              연결을 중지해도 이미 저장된 콘텐츠는 유지됩니다.
            </p>
            {data.mcpUrl && (
              <p className="break-all text-sm">
                연결 주소: <code>{data.mcpUrl}</code>
              </p>
            )}
          </fieldset>
          <fieldset disabled={busy} className="rounded border bg-white p-4">
            <legend className="px-2 font-semibold">이용 대상과 기능</legend>
            <div className="space-y-4">
              {data.adapters.map((adapter) => (
                <div
                  key={adapter.kind}
                  role="group"
                  aria-label={names[adapter.kind]}
                  className="flex flex-wrap items-center gap-4"
                >
                  <span className="w-24 font-medium">
                    {names[adapter.kind]}
                  </span>
                  {!adapter.ready ? (
                    <span className="text-sm text-gray-500">연결 준비 중</span>
                  ) : (
                    <>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={draft.targets[adapter.kind].read}
                          onChange={(e) =>
                            change((v) => {
                              v.targets[adapter.kind].read = e.target.checked;
                              if (!e.target.checked)
                                v.targets[adapter.kind].write = false;
                            })
                          }
                        />
                        자료 조회
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          disabled={!draft.targets[adapter.kind].read}
                          checked={draft.targets[adapter.kind].write}
                          onChange={(e) =>
                            change((v) => {
                              v.targets[adapter.kind].write = e.target.checked;
                            })
                          }
                        />
                        초안 저장·수정
                      </label>
                    </>
                  )}
                </div>
              ))}
            </div>
            <p className="mt-4 text-sm text-gray-600">
              각 사용자의 기존 자료 접근·작성 권한 안에서만 작동합니다.
            </p>
          </fieldset>
          <fieldset
            disabled={busy}
            className="space-y-4 rounded border bg-white p-4"
          >
            <legend className="px-2 font-semibold">작성 예제</legend>
            {!draft.examples.length && (
              <p className="text-sm text-gray-600">등록된 예제가 없습니다.</p>
            )}
            {draft.examples.map((example, index) => (
              <div key={example.id} className="space-y-3 rounded border p-3">
                <label className="block text-sm">
                  예제 이름
                  <input
                    className="mt-1 block w-full rounded border p-2"
                    maxLength={100}
                    value={example.name}
                    onChange={(e) =>
                      change((v) => {
                        v.examples[index].name = e.target.value;
                      })
                    }
                  />
                </label>
                <label className="block text-sm">
                  용도
                  <select
                    className="mt-1 block w-full rounded border p-2"
                    value={example.purpose}
                    onChange={(e) =>
                      change((v) => {
                        v.examples[index].purpose = e.target
                          .value as typeof example.purpose;
                      })
                    }
                  >
                    <option value="product_description">상품 설명서</option>
                    <option value="general_content">일반 콘텐츠</option>
                  </select>
                </label>
                <label className="block text-sm">
                  예제 요청문
                  <textarea
                    className="mt-1 block min-h-28 w-full rounded border p-2"
                    maxLength={10000}
                    value={example.prompt}
                    onChange={(e) =>
                      change((v) => {
                        v.examples[index].prompt = e.target.value;
                      })
                    }
                  />
                </label>
                <button
                  className={button}
                  onClick={() =>
                    change((v) => {
                      v.examples.splice(index, 1);
                    })
                  }
                >
                  이 예제 삭제
                </button>
              </div>
            ))}
            <button
              className={button}
              disabled={draft.examples.length >= 50}
              onClick={() =>
                change((v) => {
                  v.examples.push({
                    id: crypto.randomUUID(),
                    name: "",
                    purpose: "product_description",
                    prompt: "",
                  });
                })
              }
            >
              예제 추가
            </button>
          </fieldset>
          <button
            className={`${button} bg-blue-600 text-white`}
            disabled={
              busy ||
              draft.examples.some((e) => !e.name.trim() || !e.prompt.trim())
            }
            onClick={() => void save()}
          >
            {busy ? "저장 중…" : "설정 저장"}
          </button>
          <section className="space-y-3 rounded border bg-white p-4">
            <h3 className="font-semibold">최근 연결 오류</h3>
            {!data.errors.length ? (
              <p className="text-sm text-gray-600">
                기록된 도구 실행 오류가 없습니다.
              </p>
            ) : (
              <ul className="space-y-2">
                {data.errors.map((error, index) => (
                  <li key={index} className="break-words text-sm">
                    {new Date(error.createdAt).toLocaleString("ko-KR")} ·{" "}
                    {error.tool} · {error.code}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </section>
  );
}
