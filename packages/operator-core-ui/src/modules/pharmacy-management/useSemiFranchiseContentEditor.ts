import { useEffect, useLayoutEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { neturePharmacyOperatorApi as api, type SemiFranchiseContent } from './api';
import { EMPTY_CONTENT_DRAFT, contentToDraft, buildContentInput, type ContentDraft } from './semiFranchiseContentModel';
import type { Msg } from './assignedBusinessModel';

/** 콘텐츠 초안·읽기/쓰기 수명. 보관·사업 범위·이전 요청의 이동 방어를 보존한다. */
export function useSemiFranchiseContentEditor(businessKey?: string, returnPath?: string) {
  const { key: routeKey, id } = useParams<{ key: string; id?: string }>();
  const key = routeKey || businessKey || '';
  const navigate = useNavigate();
  const isEdit = Boolean(id);
  const listPath = returnPath ?? `/operator/semi-franchises?key=${encodeURIComponent(key)}&tab=contents`;

  const [form, setForm] = useState<ContentDraft>(EMPTY_CONTENT_DRAFT);
  const [current, setCurrent] = useState<SemiFranchiseContent | null>(null);
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<Msg>(null);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [loadedScope, setLoadedScope] = useState('');
  const scope = `${businessKey ?? ''}:${key}:${id ?? 'new'}`;
  const lifecycle = useRef({ mounted: false, scope, saving: false });
  useLayoutEffect(() => {
    const state = { mounted: true, scope, saving: false };
    lifecycle.current = state;
    return () => { state.mounted = false; };
  }, [scope]);

  useEffect(() => {
    let active = true;
    setForm(EMPTY_CONTENT_DRAFT); setCurrent(null); setMessage(null); setLoadError(false); setSaving(false);
    if (!id || (businessKey && businessKey !== key)) {
      setLoading(false); setLoadedScope(scope);
      return () => { active = false; };
    }
    setLoading(true);
    api
      .getContent(key, id)
      .then((c) => {
        if (!active) return;
        setCurrent(c);
        setLoadedScope(scope);
        setForm(contentToDraft(c));
      })
      .catch((err: Error) => { if (active) { setLoadError(true); setMessage({ type: 'error', text: err.message }); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [key, id, businessKey, scope, reload]);

  const archived = current?.status === 'archived';
  const set = (field: keyof ContentDraft, value: string) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const state = lifecycle.current;
    if (state.saving || loading || loadError || loadedScope !== scope || archived || (businessKey && businessKey !== key)) return;
    const title = form.title.trim();
    if (!title) {
      setMessage({ type: 'error', text: '제목을 입력해 주세요.' });
      return;
    }
    const input = buildContentInput(form);
    state.saving = true; setSaving(true);
    setMessage(null);
    try {
      if (id) await api.updateContent(key, id, input);
      else await api.createContent(key, input);
      if (state.mounted && lifecycle.current === state) navigate(listPath);
    } catch (err) {
      if (state.mounted && lifecycle.current === state) setMessage({ type: 'error', text: (err as Error).message });
    } finally {
      state.saving = false;
      if (state.mounted && lifecycle.current === state) setSaving(false);
    }
  };

  return { key, listPath, isEdit, form, current, loading, saving, message, loadError, loadedScope, scope,
    archived, set, submit, reloadContent: () => setReload(value => value + 1) };
}
