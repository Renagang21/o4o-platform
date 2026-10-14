import { useCallback, useEffect, useRef, useState } from "react";
import { getActiveStoreOrganizationId } from "../../../lib/storeOrganizationHeader";
import { getActiveServiceKey } from "../../../lib/serviceContext";
import { useLatestStoreRequest } from "./useLatestStoreRequest";

interface Options<D, R> {
  organizationId: string;
  serviceKey: string;
  target: string;
  enabled?: boolean;
  initialDraft: D;
  load?: () => Promise<R>;
  toDraft: (record: R) => D;
  persist: (draft: D, record: R | null) => Promise<R>;
  validate?: (draft: D) => string | null;
  remove?: (record: R) => Promise<void>;
  onSaved?: (record: R, unchanged: boolean, visible: boolean) => void;
  onRemoved?: () => void;
}
export interface AuthoringNotice {
  ok: boolean;
  message: string;
}

/** Store-local request owner; content formats and APIs remain in their adapters. */
export function useContentAuthoringSession<D, R>(options: Options<D, R>) {
  const { organizationId, serviceKey, target, enabled = true } = options;
  const scope = `${organizationId}:${serviceKey}:${target}`;
  const view = `${scope}:${enabled}`;
  const currentScope = useRef(scope);
  currentScope.current = scope;
  const currentView = useRef(view),
    viewEpoch = useRef(0);
  if (currentView.current !== view) {
    currentView.current = view;
    viewEpoch.current++;
  }
  const renderEpoch = viewEpoch.current;
  const settings = useRef(options);
  settings.current = options;
  const busy = useRef(new Map<string, "save" | "delete">());
  const readyView = useRef(view);
  const [preparedView, setPreparedView] = useState(view);
  const readRequest = useLatestStoreRequest(view);
  const writeRequest = useLatestStoreRequest(scope);
  const [record, setRecord] = useState<R | null>(null);
  const recordRef = useRef<R | null>(null);
  const [draft, setDraft] = useState(options.initialDraft);
  const draftRef = useRef(draft),
    draftRevision = useRef(0);
  const [seed, setSeed] = useState(options.initialDraft);
  const [loading, setLoading] = useState(enabled && !!options.load);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<AuthoringNotice | null>(null);
  const [saving, setSaving] = useState(false),
    [deleting, setDeleting] = useState(false);
  const hasContext = useCallback(
    () =>
      !!organizationId &&
      currentScope.current === scope &&
      getActiveStoreOrganizationId() === organizationId &&
      getActiveServiceKey() === serviceKey,
    [organizationId, serviceKey, scope],
  );
  const replaceDraft = useCallback((next: D) => {
    draftRevision.current++;
    draftRef.current = next;
    setDraft(next);
    setSeed(next);
  }, []);
  const changeDraft = useCallback(
    (patch: Partial<D>, replaceEditor = false) => {
      if (
        currentView.current !== view ||
        readyView.current !== view ||
        viewEpoch.current !== renderEpoch
      )
        return;
      draftRevision.current++;
      const next = { ...draftRef.current, ...patch };
      draftRef.current = next;
      setDraft(next);
      if (replaceEditor) setSeed(next);
    },
    [view, renderEpoch],
  );
  const reload = useCallback(async () => {
    if (!enabled) return;
    const config = settings.current;
    if (!hasContext()) {
      setLoading(false);
      setError("매장을 선택한 뒤 다시 시도해 주세요.");
      return;
    }
    const isCurrent = readRequest.begin();
    setError(null);
    setNotice(null);
    if (!config.load) {
      setLoading(false);
      return;
    }
    setLoading(true);
    recordRef.current = null;
    setRecord(null);
    try {
      const result = await config.load();
      if (!isCurrent() || !hasContext()) return;
      recordRef.current = result;
      setRecord(result);
      replaceDraft(config.toDraft(result));
    } catch {
      if (isCurrent() && hasContext())
        setError("자료를 불러오지 못했습니다. 다시 시도해 주세요.");
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [enabled, hasContext, readRequest, replaceDraft]);
  useEffect(() => {
    readyView.current = view;
    setPreparedView(view);
    recordRef.current = null;
    setRecord(null);
    replaceDraft(settings.current.initialDraft);
    setError(null);
    setNotice(null);
    setLoading(false);
    setSaving(busy.current.get(scope) === "save");
    setDeleting(busy.current.get(scope) === "delete");
    void reload();
  }, [view, scope, reload, replaceDraft]);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), notice.ok ? 3000 : 5000);
    return () => clearTimeout(timer);
  }, [notice]);
  const resetDraft = useCallback(() => {
    if (
      currentView.current !== view ||
      readyView.current !== view ||
      viewEpoch.current !== renderEpoch
    )
      return;
    const next = recordRef.current
      ? settings.current.toDraft(recordRef.current)
      : settings.current.initialDraft;
    replaceDraft(next);
    setNotice(null);
  }, [view, renderEpoch, replaceDraft]);
  const notify = useCallback(
    (message: string, ok: boolean) => {
      if (
        currentView.current === view &&
        viewEpoch.current === renderEpoch &&
        hasContext()
      )
        setNotice({ message, ok });
    },
    [view, renderEpoch, hasContext],
  );
  const save = async () => {
    if (
      !enabled ||
      readyView.current !== view ||
      loading ||
      error ||
      !hasContext() ||
      busy.current.has(scope)
    )
      return;
    const config = settings.current,
      submitted = draftRef.current;
    const invalid = config.validate?.(submitted);
    if (invalid) {
      setNotice({ ok: false, message: invalid });
      return;
    }
    if (config.load && !recordRef.current) return;
    const isCurrent = writeRequest.begin(),
      epoch = viewEpoch.current,
      revision = draftRevision.current;
    busy.current.set(scope, "save");
    setSaving(true);
    setNotice(null);
    try {
      const saved = await config.persist(submitted, recordRef.current);
      if (!isCurrent() || !hasContext()) return;
      const visible = epoch === viewEpoch.current;
      const unchanged = visible && revision === draftRevision.current;
      if (visible) {
        recordRef.current = saved;
        setRecord(saved);
        setNotice({
          ok: true,
          message: unchanged
            ? "저장되었습니다."
            : "제출한 내용은 저장되었습니다. 이후 수정 내용은 아직 저장되지 않았습니다.",
        });
      }
      config.onSaved?.(saved, unchanged, visible);
    } catch {
      if (isCurrent() && hasContext() && epoch === viewEpoch.current)
        setNotice({
          ok: false,
          message:
            "저장하지 못했습니다. 입력 내용을 유지한 채 다시 시도해 주세요.",
        });
    } finally {
      busy.current.delete(scope);
      if (currentScope.current === scope) setSaving(false);
    }
  };
  const remove = async () => {
    const config = settings.current,
      current = recordRef.current;
    if (
      !enabled ||
      readyView.current !== view ||
      loading ||
      error ||
      !current ||
      !config.remove ||
      !hasContext() ||
      busy.current.has(scope)
    )
      return;
    const isCurrent = writeRequest.begin();
    busy.current.set(scope, "delete");
    setDeleting(true);
    setNotice(null);
    try {
      await config.remove(current);
      if (isCurrent() && hasContext()) config.onRemoved?.();
    } catch {
      if (isCurrent() && hasContext())
        setNotice({
          ok: false,
          message: "삭제하지 못했습니다. 다시 시도해 주세요.",
        });
    } finally {
      busy.current.delete(scope);
      if (currentScope.current === scope) setDeleting(false);
    }
  };
  const ready = preparedView === view;
  return {
    record: ready ? record : null,
    draft: ready ? draft : options.initialDraft,
    seed: ready ? seed : options.initialDraft,
    loading: enabled && (!ready || loading),
    error: ready ? error : null,
    notice: ready ? notice : null,
    saving: busy.current.get(scope) === "save" || (ready && saving),
    deleting: busy.current.get(scope) === "delete" || (ready && deleting),
    changeDraft,
    resetDraft,
    reload,
    save,
    remove,
    notify,
  };
}
