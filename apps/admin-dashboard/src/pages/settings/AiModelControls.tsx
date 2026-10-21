import { useCallback, useEffect, useRef, useState } from "react";
import {
  getAiModelControls,
  createAiModel,
  updateAiModel,
  deleteAiModel,
  selectAiModel,
  type AiModelControls,
  type ManagedAiModel,
  type AiManagementSnapshot,
} from "@/api/ai-management";

const button = "min-h-11 rounded border px-3 py-2 text-sm disabled:opacity-50";
const field = "min-h-11 w-full rounded border bg-white p-2";
const capabilities = {
  text: "텍스트·구조화",
  image: "이미지·PDF",
  grounding: "검색 근거",
  speech: "음성 합성",
} as const;
type Capability = keyof typeof capabilities;
export function useAiModelControls() {
  const [data, setData] = useState<AiModelControls | null>(null);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const alive = useRef(false);
  const version = useRef(0);
  const pending = useRef(false);
  const refresh = useCallback(async () => {
    if (pending.current) return;
    const current = ++version.current;
    setLoading(true);
    setError("");
    try {
      const value = await getAiModelControls();
      if (alive.current && current === version.current) setData(value);
    } catch {
      if (alive.current && current === version.current) {
        setData(null);
        setError("모델 설정을 조회하지 못했습니다. 다시 불러와 주세요.");
      }
    } finally {
      if (alive.current && current === version.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    alive.current = true;
    void refresh();
    return () => {
      alive.current = false;
    };
  }, [refresh]);
  const run = async (
    action: () => Promise<AiModelControls>,
    success: string,
  ) => {
    if (pending.current || loading) return false;
    pending.current = true;
    ++version.current;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const value = await action();
      if (alive.current) {
        setData(value);
        setNotice(success);
      }
      return true;
    } catch (failure) {
      const detail = (failure as { response?: { data?: { error?: unknown } } })
        ?.response?.data?.error;
      if (alive.current)
        setError(
          typeof detail === "string"
            ? detail
            : "처리 결과를 확인하지 못했습니다. 최신 목록을 다시 조회해 주세요.",
        );
      return false;
    } finally {
      pending.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return { data, busy, loading, error, notice, refresh, run };
}
export type ModelController = ReturnType<typeof useAiModelControls>;
export function ModelControlStatus({ control }: { control: ModelController }) {
  return (
    <div className="space-y-2 text-sm">
      {control.loading && <p role="status">모델 설정을 불러오는 중입니다.</p>}
      {control.error && (
        <p role="alert" className="text-red-700">
          {control.error}{" "}
          <button
            className={button}
            disabled={control.busy || control.loading}
            onClick={() => void control.refresh()}
          >
            모델 설정 다시 불러오기
          </button>
        </p>
      )}
      {control.notice && (
        <output className="block text-blue-700">{control.notice}</output>
      )}
    </div>
  );
}

export function AiModelCatalog({
  providers,
  control,
}: {
  providers: AiManagementSnapshot["providers"];
  control: ModelController;
}) {
  const [editing, setEditing] = useState<{
    provider: ManagedAiModel["provider"];
    previous?: ManagedAiModel;
    revision: number;
  } | null>(null);
  const data = control.data;
  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-600">
        모델을 등록·수정·삭제하고 사용처에서 사용할 모델을 지정합니다. 등록은
        공급자의 실제 제공 여부·인증 성공·가격 확인을 뜻하지 않습니다. 지원
        기능은 확인한 범위로 등록하세요.
      </p>
      {!data && !control.loading && (
        <p>모델 목록을 확인할 수 없어 변경할 수 없습니다.</p>
      )}
      {providers.map((provider) => {
        const models =
          data?.models.filter((model) => model.provider === provider.id) ?? [];
        return (
          <article
            key={provider.id}
            className="space-y-3 rounded border bg-white p-4"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-semibold">{provider.name}</h3>
              <button
                className={button}
                disabled={!data || control.busy || control.loading}
                onClick={() =>
                  data &&
                  setEditing({
                    provider: provider.id as ManagedAiModel["provider"],
                    revision: data.revision,
                  })
                }
              >
                모델 등록
              </button>
            </div>
            <p>
              {
                {
                  present: "연결 정보 있음",
                  missing: "연결 정보 없음",
                  unknown: "조회 확인 불가",
                  unsupported: "실제 연결 미확인",
                }[provider.credential]
              }
            </p>
            <p className="text-sm text-gray-600">{provider.support}</p>
            {provider.databaseRead === "unavailable" && (
              <p className="text-sm text-amber-800">
                DB 연결 정보 조회 실패. 서버 환경 연결 유무만 반영할 수
                있습니다.
              </p>
            )}
            {provider.credential === "unsupported" && (
              <p className="text-sm text-amber-800">
                모델 목록을 관리할 수 있지만 현재 사용처의 실행 공급자로 선택할
                수 없습니다.
              </p>
            )}
            <details className="text-sm" open>
              <summary className="cursor-pointer">
                등록 모델 ({models.length})
              </summary>
              <p className="my-2 text-gray-600">
                실시간 공급자 목록이 아닙니다. 모델을 삭제해도 과거 사용량
                기록은 유지됩니다.
              </p>
              {models.length ? (
                <ul className="space-y-3">
                  {models.map((model) => {
                    const protectedModel = data!.protectedModels.includes(
                      model.provider + ":" + model.id,
                    );
                    return (
                      <li
                        key={model.id}
                        className="flex flex-wrap items-center justify-between gap-2 border-t pt-2"
                      >
                        <div className="min-w-0 flex-1 break-all">
                          <p className="font-medium">{model.name}</p>
                          {model.name !== model.id && (
                            <p className="text-gray-600">{model.id}</p>
                          )}
                          <p className="text-xs text-gray-600">
                            {model.capabilities
                              .map((x) => capabilities[x])
                              .join(" · ")}
                            {protectedModel && " · 사용 설정/기본 모델"}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className={button}
                            disabled={control.busy || control.loading}
                            aria-label={model.id + " 수정"}
                            onClick={() =>
                              setEditing({
                                provider: model.provider,
                                previous: model,
                                revision: data!.revision,
                              })
                            }
                          >
                            수정
                          </button>
                          <button
                            className={button + " text-red-700"}
                            disabled={
                              protectedModel || control.busy || control.loading
                            }
                            aria-label={model.id + " 삭제"}
                            title={
                              protectedModel
                                ? "사용 설정 또는 코드 기본 모델은 먼저 사용 관계를 정리해야 합니다."
                                : undefined
                            }
                            onClick={() => {
                              if (
                                !window.confirm(
                                  provider.name +
                                    "의 " +
                                    model.id +
                                    " 모델을 삭제할까요? 새로운 요청에서 이 모델을 사용할 수 없게 됩니다.",
                                )
                              )
                                return;
                              void control.run(
                                () => deleteAiModel(model, data!.revision),
                                "모델을 삭제했습니다.",
                              );
                            }}
                          >
                            삭제
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p>등록한 모델이 없습니다.</p>
              )}
            </details>
          </article>
        );
      })}
      {editing && data && (
        <ModelDialog
          initial={editing.previous}
          provider={editing.provider}
          protectedModel={
            !!editing.previous &&
            data.protectedModels.includes(
              editing.previous.provider + ":" + editing.previous.id,
            )
          }
          busy={control.busy}
          error={control.error}
          onClose={() => setEditing(null)}
          onSave={async (model) => {
            const done = await control.run(
              () =>
                editing.previous
                  ? updateAiModel(editing.previous, model, editing.revision)
                  : createAiModel(model, editing.revision),
              editing.previous
                ? "모델 정보를 수정했습니다."
                : "모델을 등록했습니다. 사용처에서 사용할 모델로 지정해 주세요.",
            );
            if (done) setEditing(null);
          }}
        />
      )}
    </div>
  );
}
function ModelDialog({
  initial,
  provider,
  protectedModel,
  busy,
  error,
  onClose,
  onSave,
}: {
  initial?: ManagedAiModel;
  provider: ManagedAiModel["provider"];
  protectedModel: boolean;
  busy: boolean;
  error: string;
  onClose: () => void;
  onSave: (model: ManagedAiModel) => Promise<void>;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [id, setId] = useState(initial?.id ?? "");
  const [name, setName] = useState(initial?.name ?? "");
  const [selected, setSelected] = useState<Capability[]>(
    initial?.capabilities ?? ["text"],
  );
  useEffect(() => {
    const dialog = ref.current;
    const previous = document.activeElement;
    if (dialog?.showModal) dialog.showModal();
    else dialog?.setAttribute("open", "");
    return () => {
      dialog?.close?.();
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      aria-label={initial ? "모델 수정" : "모델 등록"}
      className="fixed inset-0 max-h-[90vh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-xl p-5 backdrop:bg-black/40"
      onCancel={(event) => {
        event.preventDefault();
        if (!busy) onClose();
      }}
    >
      <h3 className="text-lg font-semibold">
        {initial ? "모델 수정" : "모델 등록"} · {provider}
      </h3>
      <form
        className="mt-4 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          void onSave({
            provider,
            id: id.trim(),
            name: name.trim() || id.trim(),
            capabilities: selected,
          });
        }}
      >
        <fieldset disabled={busy} className="space-y-3">
          <label className="block">
            모델 ID
            <input
              className={field}
              required
              pattern={"[a-z][a-z0-9._\\-]{0,99}"}
              maxLength={100}
              value={id}
              disabled={protectedModel}
              onChange={(e) => setId(e.target.value)}
              placeholder="공급자의 공식 모델 ID"
            />
          </label>
          <label className="block">
            표시 이름
            <input
              className={field}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="비워 두면 모델 ID를 사용합니다"
            />
          </label>
          <fieldset disabled={protectedModel} className="space-y-2">
            <legend className="font-medium">확인한 지원 기능</legend>
            {(Object.entries(capabilities) as [Capability, string][]).map(
              ([key, label]) => (
                <label
                  key={key}
                  className="mr-4 inline-flex min-h-11 items-center gap-2"
                >
                  <input
                    type="checkbox"
                    checked={selected.includes(key)}
                    onChange={(e) =>
                      setSelected((previous) =>
                        key === "speech"
                          ? e.target.checked
                            ? ["speech"]
                            : []
                          : e.target.checked
                            ? [...previous.filter((x) => x !== "speech"), key]
                            : previous.filter((x) => x !== key),
                      )
                    }
                  />
                  {label}
                </label>
              ),
            )}
          </fieldset>
          {protectedModel && (
            <p className="text-sm text-gray-600">
              사용 설정/기본 모델은 표시 이름만 수정할 수 있습니다.
            </p>
          )}
          <p className="text-sm text-gray-600">
            이미지·검색·음성 기능은 해당 기능이 확인된 모델만 선택합니다.
            등록만으로 가격·연결·지원 여부를 검증하지 않습니다.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={button} onClick={onClose}>
              취소
            </button>
            <button
              className={button + " bg-blue-600 text-white"}
              disabled={!id.trim() || !selected.length}
            >
              {busy ? "저장 중…" : "저장"}
            </button>
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        )}
      </form>
    </dialog>
  );
}

export function UsageModelSelection({
  usageId,
  control,
}: {
  usageId: string;
  control: ModelController;
}) {
  const data = control.data;
  if (!data)
    return (
      <p className="text-sm text-gray-600">
        모델 설정을 조회한 후 사용할 모델을 지정할 수 있습니다.
      </p>
    );
  const ids =
    usageId === "audio.synthesis"
      ? ["audio.synthesis.gemini", "audio.synthesis.openai"]
      : [
          data.usageTargets[usageId],
          ...(usageId === "work.planning" ? ["work.planning.strong"] : []),
        ];
  const targets = ids
    .map((id) => data.targets.find((x) => x.id === id))
    .filter((x): x is AiModelControls["targets"][number] => !!x);
  if (!targets.length)
    return (
      <p className="text-sm text-gray-600">
        이전 HUB 경로는 현행 이용 여부가 확인되지 않아 모델 지정 대상에 포함하지
        않습니다.
      </p>
    );
  return (
    <div className="space-y-3">
      {targets.map((target) => (
        <SelectionForm
          key={target.id + ":" + data.revision}
          target={target}
          control={control}
        />
      ))}
    </div>
  );
}
function SelectionForm({
  target,
  control,
}: {
  target: AiModelControls["targets"][number];
  control: ModelController;
}) {
  const data = control.data!;
  const current = data.selections[target.id];
  const [selected, setSelected] = useState(
    current ? current.provider + ":" + current.model : "",
  );
  const options = data.models.filter(
    (x) =>
      target.providers.includes(x.provider) &&
      x.capabilities.includes(target.capability),
  );
  const shared =
    Object.values(data.usageTargets).filter((x) => x === target.id).length > 1;
  return (
    <form
      className="space-y-2 rounded border bg-white p-3"
      onSubmit={(event) => {
        event.preventDefault();
        const model = options.find((x) => x.provider + ":" + x.id === selected);
        void control.run(
          () =>
            selectAiModel(
              target.id,
              model ? { provider: model.provider, model: model.id } : null,
              data.revision,
            ),
          "사용 모델을 저장했습니다. 다음 새 AI 호출부터 적용됩니다.",
        );
      }}
    >
      <label className="block font-medium">
        {target.name} · 사용 모델
        <select
          aria-label={target.name + " · 사용 모델"}
          className={field + " mt-2 font-normal"}
          value={selected}
          disabled={control.busy || control.loading}
          onChange={(e) => setSelected(e.target.value)}
        >
          <option value="">기존 설정 사용 (관리자 지정 해제)</option>
          {options.map((model) => (
            <option
              key={model.provider + ":" + model.id}
              value={model.provider + ":" + model.id}
            >
              {model.name} · {model.provider} · {model.id}
            </option>
          ))}
        </select>
      </label>
      {shared && (
        <p className="text-sm text-amber-800">
          매장 콘텐츠 번역과 약국 상담 번역이 같은 설정을 사용합니다. 두
          사용처에 함께 적용됩니다.
        </p>
      )}
      <p className="text-sm text-gray-600">
        진행 중인 요청과 이미 생성된 결과는 바뀌지 않습니다. 과금 경로는 기존
        가격·한도 검사를 통과해야 실행됩니다. 기존 재시도·장애 시 대체 모델
        정책은 유지됩니다.
      </p>
      <button className={button} disabled={control.busy || control.loading}>
        {control.busy ? "저장 중…" : "사용 모델 저장"}
      </button>
    </form>
  );
}
