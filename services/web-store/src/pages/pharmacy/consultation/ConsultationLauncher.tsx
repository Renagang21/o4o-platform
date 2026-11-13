import { useEffect, useRef, useState } from "react";
import {
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
];
const MAX_TABLETS = 30;
const newId = (role: ConsultationTabletRole) =>
  `${role}-${Array.from(crypto.getRandomValues(new Uint8Array(4)), (b) => b.toString(16).padStart(2, "0")).join("")}`;

export function tabletHref(organizationId: string, tablet: ConsultationTablet) {
  return `/consultation/staff?${new URLSearchParams({ store: organizationId, role: tablet.role, tablet: tablet.id, name: tablet.name })}`;
}

export function ConsultationLauncher() {
  const { organizationId } = useUnifiedStore();
  const [saved, setSaved] = useState<ConsultationTablet[] | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [error, setError] = useState(false), [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false), [message, setMessage] = useState("");
  const [names, setNames] = useState<Record<ConsultationTabletRole, string>>({ pharmacist: "", staff: "" });
  const generation = useRef(0), lock = useRef(false);
  useEffect(() => {
    const current = ++generation.current;
    setSaved(null); setCanEdit(false); setError(false); setMessage(""); setBusy(false); lock.current = false;
    readConsultationTablets()
      .then((data) => {
        if (generation.current !== current) return;
        if (data.organizationId !== organizationId) throw new Error("Store changed");
        setSaved(data.tablets); setCanEdit(data.canEdit);
      })
      .catch(() => { if (generation.current === current) setError(true); });
    return () => { generation.current = current + 1; };
  }, [organizationId, retry]);

  // 등록 전에는 종류별 기본 태블릿 1대를 보여 준다. 경영자가 추가 · 삭제하면 저장된 목록으로 바뀐다.
  const tablets = saved && saved.length ? saved
    : ROLES.map(({ role, fallback }) => ({ id: `${role}-1`, role, name: fallback }));
  const update = async (next: ConsultationTablet[], done: string) => {
    if (!canEdit || lock.current) return;
    const current = generation.current;
    lock.current = true; setBusy(true); setMessage("");
    try {
      const data = await saveConsultationTablets(next);
      if (generation.current !== current) return;
      if (data.organizationId !== organizationId) throw new Error("Store changed");
      setSaved(data.tablets); setCanEdit(data.canEdit); setMessage(done);
    } catch {
      if (generation.current === current) setMessage("저장하지 못했습니다. 현재 매장과 경영자 권한을 확인해 주세요.");
    } finally {
      if (generation.current === current) { lock.current = false; setBusy(false); }
    }
  };
  const add = (role: ConsultationTabletRole) => {
    const count = tablets.filter((t) => t.role === role).length;
    const label = ROLES.find((r) => r.role === role)!.title;
    const name = names[role].trim() || `${label} ${count + 1}`;
    if (name.length > 40 || /[<>]/.test(name)) { setMessage("태블릿 이름은 40자 이내로 입력해 주세요."); return; }
    void update([...tablets, { id: newId(role), role, name }], `${name}을(를) 추가했습니다.`)
      .then(() => setNames((prev) => ({ ...prev, [role]: "" })));
  };
  const remove = (tablet: ConsultationTablet) =>
    void update(tablets.filter((t) => t.id !== tablet.id), `${tablet.name}을(를) 목록에서 뺐습니다.`);

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
        <div className="grid gap-3 sm:grid-cols-2">
          {ROLES.map(({ role, title, description }) => (
            <section key={role} aria-label={title} className="space-y-3 rounded-xl border p-4">
              <div>
                <h3 className="font-semibold text-teal-800">{title}</h3>
                <p className="mt-1 text-sm text-slate-600">{description}</p>
              </div>
              <ul className="space-y-2">
                {tablets.filter((t) => t.role === role).map((tablet) => (
                  <li key={tablet.id} className="flex flex-wrap items-center gap-2">
                    <a target="_blank" rel="noreferrer" href={tabletHref(organizationId || "", tablet)}
                      className="min-h-11 flex-1 rounded border px-3 py-2 hover:bg-teal-50">
                      {tablet.name} 화면 열기 ↗
                    </a>
                    {canEdit && saved.length > 0 && (
                      <button type="button" className="min-h-11 rounded border px-3" disabled={busy}
                        aria-label={`${tablet.name} 삭제`} onClick={() => remove(tablet)}>삭제</button>
                    )}
                  </li>
                ))}
              </ul>
              {canEdit && (
                <div className="flex flex-wrap gap-2">
                  <input className="min-h-11 flex-1 rounded border p-2" maxLength={40}
                    aria-label={`새 ${title} 이름`} placeholder={`예: ${role === "pharmacist" ? "조제실 앞" : "입구"}`}
                    value={names[role]} onChange={(e) => setNames((prev) => ({ ...prev, [role]: e.target.value }))} />
                  <button type="button" className="min-h-11 rounded border px-3" disabled={busy || tablets.length >= MAX_TABLETS}
                    onClick={() => add(role)}>{title} 추가</button>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
      {saved && !canEdit && <p className="text-sm text-slate-500">태블릿 추가 · 삭제는 매장 경영자가 할 수 있습니다.</p>}
      {message && <p role="status" className="text-sm">{message}</p>}
      <p className="text-xs text-slate-500">
        고객이 직접 사용하는 소비자 화면(키오스크)은 다음 단계에서 추가합니다.
      </p>
    </div>
  );
}
