import { useEffect, useRef, useState } from "react";
import { ActionBar } from "@o4o/ui";
import {
  createKioskPairing,
  readConsultationTablets,
  saveConsultationTablets,
  type ConsultationTablet,
  type ConsultationTabletRole,
} from "../../../api/consultationWorkspace";
import { useUnifiedStore } from "../../../contexts/StoreContext";
import { ConsultationExpressionSettings } from './ConsultationExpressionSettings';

/**
 * 상담 태블릿 = 한 화면에서 문의와 답변을 끝내는 기기. 약사용 · 근무자용을 매장에서 여러 대 둔다.
 * 고객 화면 2대 연결 · 일반/대형 구성은 이 구조로 교체했다(2026-11-13).
 */
const ROLES: ReadonlyArray<{ role: ConsultationTabletRole; title: string; description: string; fallback: string }> = [
  { role: "pharmacist", title: "약사 태블릿", description: "약사와 고객이 함께 봅니다. 약사용 전문 상담 내용이 보입니다.", fallback: "약사 태블릿 1" },
  { role: "staff", title: "근무자 태블릿", description: "근무자와 고객이 함께 봅니다. 상품 찾기 · 위치 · 제품 설명 등 근무자용 내용만 보입니다.", fallback: "근무자 태블릿 1" },
  { role: "consumer", title: "소비자 태블릿(키오스크)", description: "고객이 직접 사용합니다. 직원 로그인 없이 연결 코드로 한 번 연결하며, 상품 찾기 · 위치 · 게시된 제품 설명과 약사 연결 안내만 보입니다.", fallback: "" },
];
const KIOSK_PATH = "/consultation/kiosk";
/** 상담 언어(서버 CONSULTATION_SCREEN_LANGUAGES 와 같은 순서). */
const SPEECH_LANGUAGES = [
  ["ko", "한국어"], ["en", "영어"], ["zh", "중국어"], ["ja", "일본어"], ["vi", "베트남어"], ["th", "태국어"], ["id", "인도네시아어"],
] as const;
/** Google 음성 자동 감지는 요청당 후보 언어를 최대 3개까지 받는다(적을수록 정확). */
const MAX_SPEECH_LANGUAGES = 3;
const languageName = (key: string) => SPEECH_LANGUAGES.find(([code]) => code === key)?.[1] ?? key;

function SpeechCandidates({ tablet, canEdit, busy, onSave }: Readonly<{
  tablet: ConsultationTablet; canEdit: boolean; busy: boolean; onSave: (languages: string[]) => void;
}>) {
  const [draft, setDraft] = useState<string[]>(tablet.speechLanguages ?? []);
  // 저장값이 바뀌면 렌더 중에 바로 맞춘다. useEffect 로 맞추면 늦게 실행되는 effect 가 그 사이 사용자가 고른 값을 덮어쓴다.
  const [syncedFrom, setSyncedFrom] = useState(tablet.speechLanguages);
  if (syncedFrom !== tablet.speechLanguages) {
    setSyncedFrom(tablet.speechLanguages);
    setDraft(tablet.speechLanguages ?? []);
  }
  const current = tablet.speechLanguages?.length ? tablet.speechLanguages.map(languageName).join(" · ") : "관리자 기본 후보";
  if (!canEdit) return <p className="w-full text-xs text-slate-500">음성 자동 감지 언어: {current}</p>;
  return (
    <details className="w-full text-sm">
      <summary className="min-h-11 cursor-pointer content-center text-slate-600">음성 자동 감지 언어: {current}</summary>
      <fieldset className="space-y-2 pb-2" disabled={busy} aria-label={`${tablet.name} 음성 자동 감지 언어`}>
        <p className="text-xs text-slate-500">
          이 태블릿에서 고객이 자동 감지로 말할 때 후보로 쓸 언어를 최대 {MAX_SPEECH_LANGUAGES}개 고릅니다. 적을수록 정확합니다.
          고르지 않으면 관리자 기본 후보를 씁니다. 언어를 직접 고른 경우와 문자 번역에는 영향이 없습니다.
        </p>
        <div className="flex flex-wrap gap-3">
          {SPEECH_LANGUAGES.map(([code, label]) => (
            <label key={code} className="flex min-h-11 items-center gap-1">
              <input type="checkbox" checked={draft.includes(code)}
                disabled={!draft.includes(code) && draft.length >= MAX_SPEECH_LANGUAGES}
                onChange={(event) => setDraft((previous) => event.target.checked
                  ? SPEECH_LANGUAGES.map(([key]) => key).filter((key) => key === code || previous.includes(key))
                  : previous.filter((key) => key !== code))} />
              {label}
            </label>
          ))}
        </div>
        <button type="button" className="min-h-11 rounded border px-3" onClick={() => onSave(draft)}>자동 감지 언어 저장</button>
      </fieldset>
    </details>
  );
}
const MAX_TABLETS = 30;
const newId = (role: ConsultationTabletRole) =>
  `${role}-${Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

export function tabletHref(organizationId: string, tablet: ConsultationTablet) {
  return `/consultation/staff?${new URLSearchParams({ store: organizationId, role: tablet.role, tablet: tablet.id, name: tablet.name })}`;
}

export function ConsultationLauncher() {
  const { organizationId } = useUnifiedStore();
  const [saved, setSaved] = useState<ConsultationTablet[] | null>(null);
  const [configured, setConfigured] = useState(false);
  // O4O 표준 리스트(AGENTS.md §3-1): 행 체크 → 상단 ActionBar. 매장 · 저장 결과가 바뀌면 선택을 비운다.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [names, setNames] = useState<Record<ConsultationTabletRole, string>>({ pharmacist: "", staff: "", consumer: "" });
  const generation = useRef(0), lock = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    setSaved(null); setConfigured(false); setSelected(new Set()); setCanEdit(false); setError(false); setMessage(""); setBusy(false); lock.current = false;
    readConsultationTablets()
      .then((data) => {
        if (generation.current !== current) return;
        if (data.organizationId !== organizationId) throw new Error("Store changed");
        setSaved(data.tablets); setConfigured(data.configured); setCanEdit(data.canEdit);
      })
      .catch(() => { if (generation.current === current) setError(true); });
    return () => { generation.current = current + 1; };
  }, [organizationId, retry]);

  // 한 번도 저장하지 않았으면 종류별 기본 태블릿 1대를 보여 준다. 저장한 뒤에는 빈 목록도 그대로 보여 준다.
  const tablets: ConsultationTablet[] = saved && configured ? saved
    : ROLES.filter(({ fallback }) => fallback).map(({ role, fallback }) => ({ id: `${role}-1`, role, name: fallback }));
  const [pairing, setPairing] = useState<{ tabletId: string; code: string; expiresAt: string } | null>(null);
  const pair = async (tablet: ConsultationTablet) => {
    if (!canEdit || lock.current) return;
    const current = generation.current;
    lock.current = true; setBusy(true); setMessage(""); setPairing(null);
    try {
      const data = await createKioskPairing(tablet.id);
      if (generation.current === current) setPairing({ tabletId: tablet.id, ...data });
    } catch {
      if (generation.current === current) setMessage("연결 코드를 만들지 못했습니다. 태블릿 목록 저장과 경영자 권한을 확인해 주세요.");
    } finally {
      if (generation.current === current) { lock.current = false; setBusy(false); }
    }
  };
  const update = async (next: ConsultationTablet[], done: string) => {
    if (!canEdit || lock.current) return;
    const current = generation.current;
    lock.current = true; setBusy(true); setMessage("");
    try {
      const data = await saveConsultationTablets(next);
      if (generation.current !== current) return;
      if (data.organizationId !== organizationId) throw new Error("Store changed");
      setSaved(data.tablets); setConfigured(data.configured); setCanEdit(data.canEdit); setMessage(done);
      setSelected(new Set());
    } catch {
      if (generation.current === current) setMessage("저장하지 못했습니다. 현재 매장과 경영자 권한을 확인해 주세요.");
    } finally {
      if (generation.current === current) { lock.current = false; setBusy(false); }
    }
  };
  const add = (role: ConsultationTabletRole) => {
    const count = tablets.filter((t) => t.role === role).length;
    const label = role === "consumer" ? "키오스크" : ROLES.find((r) => r.role === role)!.title;
    const name = names[role].trim() || `${label} ${count + 1}`;
    if (name.length > 40 || /[<>]/.test(name)) { setMessage("태블릿 이름은 40자 이내로 입력해 주세요."); return; }
    void update([...tablets, { id: newId(role), role, name }], `${name}을(를) 추가했습니다.`)
      .then(() => setNames((prev) => ({ ...prev, [role]: "" })));
  };
  const toggle = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const allSelected = tablets.length > 0 && tablets.every((t) => selected.has(t.id));
  const removeSelected = () => {
    const removing = tablets.filter((t) => selected.has(t.id));
    if (!removing.length) return;
    return update(tablets.filter((t) => !selected.has(t.id)), `태블릿 ${removing.length}대를 목록에서 뺐습니다.`);
  };

  return (
    <div className="space-y-3">
      {organizationId && <ConsultationExpressionSettings key={organizationId} organizationId={organizationId} />}
      <p className="text-sm text-slate-600">
        상담은 태블릿 한 대에서 문의와 답변을 함께 진행합니다. 모든 상담 화면은 고객 언어 번역과 음성 입력 · 읽어 주기를 지원합니다.
        매장에서 쓰는 태블릿마다 아래에서 화면을 열어 두시기 바랍니다.
      </p>
      {error ? (
        <div role="alert">
          <p>상담 태블릿 목록을 확인하지 못했습니다.</p>
          <button className="min-h-11 rounded border px-4" onClick={() => setRetry((n) => n + 1)}>다시 확인</button>
        </div>
      ) : !saved ? (
        <p role="status">상담 태블릿 목록을 확인하는 중…</p>
      ) : (
        <>
        {canEdit && (
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" checked={allSelected} disabled={busy || !tablets.length}
                onChange={() => setSelected(allSelected ? new Set() : new Set(tablets.map((t) => t.id)))} />
              전체 선택
            </label>
            <ActionBar selectedCount={selected.size} onClearSelection={() => setSelected(new Set())}
              actions={[{ key: "remove", label: "선택 삭제", variant: "danger", disabled: busy,
                confirm: `선택한 태블릿 ${selected.size}대를 목록에서 뺄까요? 연결된 키오스크는 다시 연결해야 합니다.`,
                onClick: removeSelected }]} />
          </div>
        )}
        <div className="grid gap-3 lg:grid-cols-3 sm:grid-cols-2">
          {ROLES.map(({ role, title, description }) => (
            <section key={role} aria-label={title} className="space-y-3 rounded-xl border p-4">
              <div>
                <h3 className="font-semibold text-teal-800">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              </div>
              <ul className="space-y-2">
                {tablets.filter((t) => t.role === role).map((tablet) => (
                  <li key={tablet.id} className="flex flex-wrap items-center gap-2">
                    {canEdit && (
                      <input type="checkbox" className="h-5 w-5" aria-label={`${tablet.name} 선택`} disabled={busy}
                        checked={selected.has(tablet.id)} onChange={() => toggle(tablet.id)} />
                    )}
                    {role === "consumer" ? (
                      <span className="min-h-11 flex-1 content-center rounded border px-3 py-2">{tablet.name}</span>
                    ) : (
                      <a target="_blank" rel="noreferrer" href={tabletHref(organizationId || "", tablet)}
                        className="min-h-11 flex-1 rounded border px-3 py-2 hover:bg-teal-50">
                        {tablet.name} 화면 열기 ↗
                      </a>
                    )}
                    {role === "consumer" && canEdit && (
                      <button type="button" className="min-h-11 rounded border px-3" disabled={busy}
                        aria-label={`${tablet.name} 연결 코드 만들기`} onClick={() => void pair(tablet)}>연결 코드</button>
                    )}
                    {role === "consumer" && !canEdit && (
                      <p className="w-full text-xs text-slate-500">외국어 화면에 한국어 함께 보기: {tablet.showKorean === false ? "꺼짐" : "켜짐"}</p>
                    )}
                    {role === "consumer" && canEdit && (
                      <label className="flex min-h-11 w-full items-center gap-2 text-sm">
                        <input type="checkbox" disabled={busy} checked={tablet.showKorean !== false}
                          aria-label={`${tablet.name} 외국어 화면에 한국어 함께 보기`}
                          onChange={(event) => void update(
                            tablets.map((item) => {
                              if (item.id !== tablet.id) return item;
                              // 켜짐은 기본값이라 저장하지 않는다(필드 없음 = 켜짐).
                              const rest = { id: item.id, role: item.role, name: item.name,
                                ...(item.speechLanguages ? { speechLanguages: item.speechLanguages } : {}) };
                              return event.target.checked ? rest : { ...rest, showKorean: false };
                            }),
                            `${tablet.name}의 한국어 함께 보기를 ${event.target.checked ? "켰습니다" : "껐습니다"}.`,
                          )} />
                        외국어 화면에 한국어 함께 보기(AI 번역 표시 겸용 · 기본 켜짐)
                      </label>
                    )}
                    {pairing?.tabletId === tablet.id && (
                      <output className="w-full rounded bg-teal-50 p-2 text-sm">
                        연결 코드 <strong className="text-lg tracking-widest">{pairing.code}</strong> ·{" "}
                        {new Date(pairing.expiresAt).toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })}까지 사용
                      </output>
                    )}
                    <SpeechCandidates tablet={tablet} canEdit={canEdit} busy={busy}
                      onSave={(languages) => void update(
                        tablets.map((item) => {
                          if (item.id !== tablet.id) return item;
                          const base = { id: item.id, role: item.role, name: item.name,
                            ...(item.showKorean === false ? { showKorean: false } : {}) };
                          return languages.length ? { ...base, speechLanguages: languages } : base;
                        }),
                        `${tablet.name}의 음성 자동 감지 언어를 저장했습니다.`,
                      )} />
                  </li>
                ))}
              </ul>
              {role === "consumer" && (
                <p className="text-sm text-slate-600">
                  키오스크 기기에서 <a className="underline" target="_blank" rel="noreferrer" href={KIOSK_PATH}>{KIOSK_PATH} ↗</a> 를 열고 연결 코드를 입력합니다.
                </p>
              )}
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <input className="min-h-11 flex-1 rounded border p-2" maxLength={40}
                    aria-label={`새 ${title} 이름`} placeholder={`예: ${role === "pharmacist" ? "조제실 앞" : role === "consumer" ? "입구 키오스크" : "입구"}`}
                    value={names[role]} onChange={(e) => setNames((prev) => ({ ...prev, [role]: e.target.value }))} />
                  <button type="button" className="min-h-11 rounded border px-3" disabled={busy || tablets.length >= MAX_TABLETS}
                    onClick={() => add(role)}>{title} 추가</button>
                </div>
              )}
            </section>
          ))}
        </div>
        </>
      )}
      {saved && !canEdit && <p className="text-sm text-slate-500">태블릿 추가 · 삭제는 매장 경영자가 할 수 있습니다.</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
    </div>
  );
}
