import { BusinessFeatureSummary } from "./BusinessFeatureSummary";
import { StaffDemandSummary } from "./StaffDemandSummary";
import { MemberPaidFeaturesPanel } from "./MemberPaidFeaturesPanel";
/**
 * AdminSemiFranchisePage — 약국 협력사업 관리 (/admin/semi-franchises)
 *
 * WO-NETURE-PHARMACY-STORE-COMMERCE-REFACTOR-V1 · DESIGN §3-2
 *   약국 협력사업 = 데이터 행. 생성(행 + 운영 조직) · 이름/상태/커뮤니티 연결 수정 · 담당 운영자 지정/해제.
 *   담당 지정은 이미 Neture 운영자 role 을 가진 사용자만(API 판정).
 *   결제 수취 주체 키는 사업 결정(D1) 전이라 미정 — 화면이 값을 미리 채우지 않는다.
 */
import { useCallback, useEffect, useState } from "react";
import { PHARMACY_COLLABORATORS } from "@o4o/types";
import {
  neturePharmacyAdminApi as api,
  formatDateTime,
  type SemiFranchise,
} from "./api";
import { INPUT, Message, PageHeader, StatusBadge } from "./PharmacyCommerceUi";
import { ServiceFeatureSelector } from "./ServiceFeatureSelector";

type Msg = { type: "success" | "error"; text: string } | null;

/**
 * 운영자 관리 화면의 "사업 등록" 링크(`?register=<key>`)가 넘기는 등록 양식 프리셋.
 * 역할 지정만으로는 사업 행이 생기지 않는다 — 양식만 채우고 저장은 관리자가 "만들기"로 한다.
 * 협동조합(pharmcoop)은 별도 등록 절차라 대상이 아니다.
 */
const REGISTER_PRESET_KEYS = ["carepharm", "megapharm"] as const;
type RegisterPresetKey = (typeof REGISTER_PRESET_KEYS)[number];

function readRegisterPreset(): RegisterPresetKey | null {
  if (typeof window === "undefined") return null;
  const key = new URLSearchParams(window.location.search).get("register");
  return (REGISTER_PRESET_KEYS as readonly string[]).includes(key ?? "")
    ? (key as RegisterPresetKey)
    : null;
}

function roleLevelLabel(role: string): string {
  if (role.endsWith("_admin")) return "Admin";
  if (role.endsWith("_operator")) return "Operator";
  return role;
}

interface EditForm {
  name: string;
  status: "active" | "closed";
  communityKey: string;
  paymentReceiverKey: string;
  registrationConditions: string;
  serviceFeatures: string[];
}

export default function AdminSemiFranchisePage() {
  const [items, setItems] = useState<SemiFranchise[]>([]);
  const [features, setFeatures] = useState<
    Array<{ key: string; label: string }>
  >([]);
  const [settingsReady, setSettingsReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [message, setMessage] = useState<Msg>(null);
  const [busy, setBusy] = useState(false);
  const [registerPreset] = useState(readRegisterPreset);
  const [createForm, setCreateForm] = useState({
    key: registerPreset ?? "",
    name: registerPreset ? PHARMACY_COLLABORATORS[registerPreset].label : "",
    communityKey: "",
    registrationConditions: "",
    serviceFeatures: [] as string[],
  });
  const [editKey, setEditKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<EditForm>({
    name: "",
    status: "active",
    communityKey: "",
    paymentReceiverKey: "",
    registrationConditions: "",
    serviceFeatures: [],
  });
  const [operatorInput, setOperatorInput] = useState<Record<string, string>>(
    {},
  );

  const load = useCallback(async () => {
    setLoading(true);
    setSettingsReady(false);
    setLoadError(null);
    try {
      const [businesses, catalog] = await Promise.all([
        api.listSemiFranchises(),
        api.listServiceFeatures(),
      ]);
      setItems(businesses);
      setFeatures(catalog);
      setSettingsReady(true);
    } catch (err) {
      setLoadError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const act = async (fn: () => Promise<unknown>, success: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage({ type: "success", text: success });
      await load();
      return true;
    } catch (err) {
      setMessage({ type: "error", text: (err as Error).message });
      return false;
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    const ok = await act(
      () =>
        api.createSemiFranchise({
          key: createForm.key.trim(),
          name: createForm.name.trim(),
          communityKey: createForm.communityKey.trim() || undefined,
          registrationConditions: createForm.registrationConditions.trim(),
          serviceFeatures: createForm.serviceFeatures,
        }),
      "약국 협력사업을 만들었습니다.",
    );
    if (ok)
      setCreateForm({
        key: "",
        name: "",
        communityKey: "",
        registrationConditions: "",
        serviceFeatures: [],
      });
  };

  const startEdit = (sf: SemiFranchise) => {
    setEditKey(sf.key);
    setEditForm({
      name: sf.name,
      status: sf.status,
      communityKey: sf.community_key ?? "",
      paymentReceiverKey: sf.payment_receiver_key ?? "",
      registrationConditions: sf.registration_conditions ?? "",
      serviceFeatures: sf.service_features ?? [],
    });
  };

  const saveEdit = async (sf: SemiFranchise) => {
    const patch: Parameters<typeof api.updateSemiFranchise>[1] = {
      name: editForm.name.trim(),
      status: editForm.status,
      communityKey: editForm.communityKey.trim() || null,
      registrationConditions: editForm.registrationConditions.trim(),
      serviceFeatures: editForm.serviceFeatures,
    };
    // 수취 주체 키는 바뀐 경우에만 보낸다(빈 값 = 미정으로 되돌림).
    if (
      (sf.payment_receiver_key ?? "") !== editForm.paymentReceiverKey.trim()
    ) {
      patch.paymentReceiverKey = editForm.paymentReceiverKey.trim() || null;
    }
    const ok = await act(
      () => api.updateSemiFranchise(sf.key, patch),
      "저장했습니다.",
    );
    if (ok) setEditKey(null);
  };

  const assign = async (sf: SemiFranchise) => {
    const userId = (operatorInput[sf.key] ?? "").trim();
    if (!userId) return;
    const ok = await act(
      () => api.assignOperator(sf.key, userId),
      "담당 운영자를 지정했습니다.",
    );
    if (ok) setOperatorInput((prev) => ({ ...prev, [sf.key]: "" }));
  };

  const revoke = async (sf: SemiFranchise, userId: string) => {
    if (!window.confirm(`담당 운영자(${userId})를 해제할까요?`)) return;
    await act(
      () => api.revokeOperator(sf.key, userId),
      "담당 운영자를 해제했습니다.",
    );
  };

  return (
    <div className="space-y-6 p-6">
      <PageHeader
        title="약국 협력사업 관리"
        description="약국 협력사업을 만들고, 담당 운영자를 지정합니다. 담당 운영자는 Neture 운영자 역할이 있는 사용자만 지정할 수 있습니다."
      />

      <Message message={message} />
      <section
        className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-gray-600"
        aria-label="협력사업 설정 안내"
      >
        <h2 className="mb-2 font-semibold text-gray-900">등록과 기능 적용</h2>
        <p>
          기존 사업은 목록에서 수정하세요. 새 사업은 만들면 운영 상태로
          등록되며, 약국의 가입 승인은 별도로 진행합니다.
        </p>
        <p className="mt-2">
          선택한 기능은 활성 가입 약국에 제공됩니다. 무료 초대 직원도 소속
          매장의 자격으로 이용합니다.
        </p>
        <p className="mt-2">
          기능을 해제하거나 사업을 마감해도 다른 가입 사업이나 경영자 유료
          자격에서 제공하는 기능은 유지됩니다. 사업 등록만으로 사이트 주소가
          연결되지는 않습니다.
        </p>
      </section>
      {registerPreset && (
        <div
          role="status"
          className="rounded-md border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900"
        >
          {!settingsReady
            ? `${PHARMACY_COLLABORATORS[registerPreset].label} 등록 현황을 확인하는 중입니다.`
            : items.some((sf) => sf.key === registerPreset)
              ? `${PHARMACY_COLLABORATORS[registerPreset].label} 사업은 이미 등록되어 있습니다. 아래 목록에서 상태를 확인하세요.`
              : `${PHARMACY_COLLABORATORS[registerPreset].label} 등록 양식을 미리 채웠습니다. 내용을 확인하고 "만들기"를 눌러야 등록됩니다.`}
        </div>
      )}
      <MemberPaidFeaturesPanel />
      <StaffDemandSummary />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h2 className="mb-3 text-base font-semibold text-gray-900">
          새 약국 협력사업
        </h2>
        <fieldset
          disabled={busy || !settingsReady}
          aria-label="새 사업 등록"
          className="space-y-3"
        >
          <div className="grid gap-3 md:grid-cols-4">
            <input
              className={INPUT}
              aria-label="사업 key"
              maxLength={63}
              placeholder="key (영문 소문자 · 숫자 · -)"
              value={createForm.key}
              onChange={(e) =>
                setCreateForm({ ...createForm, key: e.target.value })
              }
            />
            <input
              className={INPUT}
              aria-label="새 사업 이름"
              maxLength={255}
              placeholder="이름"
              value={createForm.name}
              onChange={(e) =>
                setCreateForm({ ...createForm, name: e.target.value })
              }
            />
            <input
              className={INPUT}
              aria-label="새 사업 커뮤니티 key"
              placeholder="커뮤니티 key (선택)"
              value={createForm.communityKey}
              onChange={(e) =>
                setCreateForm({ ...createForm, communityKey: e.target.value })
              }
            />
            <textarea
              aria-label="서비스 가입 조건"
              className={INPUT}
              maxLength={4000}
              placeholder="운영자와 협의한 가입 조건"
              value={createForm.registrationConditions}
              onChange={(e) =>
                setCreateForm({
                  ...createForm,
                  registrationConditions: e.target.value,
                })
              }
            />
            <button
              type="button"
              disabled={
                busy ||
                !settingsReady ||
                !createForm.key.trim() ||
                !createForm.name.trim()
              }
              onClick={create}
              className="rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              만들기
            </button>
          </div>
          <ServiceFeatureSelector
            features={features}
            selected={createForm.serviceFeatures}
            disabled={busy || !settingsReady}
            onChange={(serviceFeatures) =>
              setCreateForm((previous) => ({ ...previous, serviceFeatures }))
            }
          />
        </fieldset>
      </section>
      {loadError && (
        <div
          role="alert"
          className="rounded border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          <p>
            등록·설정 현황을 확인하지 못했습니다. 미등록 상태를 의미하지
            않습니다.
          </p>
          <p>{loadError}</p>
          <button
            type="button"
            disabled={busy || loading}
            onClick={load}
            className="mt-2 rounded border px-4 py-2 text-sm"
          >
            설정 다시 불러오기
          </button>
        </div>
      )}

      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
        결제 수취 주체(실제 수취인 · PG 연동)는 아직 정해지지 않았습니다. 수취
        주체 키는 사업 결정이 내려진 뒤에만 입력하세요. 비어 있으면 약국
        협력사업별 &lsquo;미정&rsquo;으로 따로 묶이고, 결제는 테스트 결제로만
        처리됩니다.
      </div>

      {loading && <div className="text-sm text-gray-500">불러오는 중...</div>}
      {!loading && settingsReady && items.length === 0 && (
        <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
          약국 협력사업이 없습니다.
        </div>
      )}
      {!loading && settingsReady && items.length > 0 && (
        <div className="space-y-4">
          {items.map((sf) => (
            <section
              key={sf.key}
              aria-label={`${sf.name} 설정`}
              className="rounded-lg border border-gray-200 bg-white p-4"
            >
              {editKey === sf.key ? (
                <fieldset
                  disabled={busy || !settingsReady}
                  aria-label="사업 설정 수정"
                  className="space-y-3"
                >
                  <div className="grid gap-3 md:grid-cols-2">
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">이름</span>
                      <input
                        className={INPUT}
                        value={editForm.name}
                        onChange={(e) =>
                          setEditForm({ ...editForm, name: e.target.value })
                        }
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">상태</span>
                      <select
                        className={INPUT}
                        value={editForm.status}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            status: e.target.value as "active" | "closed",
                          })
                        }
                      >
                        <option value="active">운영</option>
                        <option value="closed">마감</option>
                      </select>
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">
                        커뮤니티 key
                      </span>
                      <input
                        className={INPUT}
                        value={editForm.communityKey}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            communityKey: e.target.value,
                          })
                        }
                      />
                    </label>
                    <label className="text-sm">
                      <span className="mb-1 block text-gray-600">
                        결제 수취 주체 키 (미정 — 사업 결정 후 입력)
                      </span>
                      <input
                        className={INPUT}
                        placeholder="미정"
                        value={editForm.paymentReceiverKey}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            paymentReceiverKey: e.target.value,
                          })
                        }
                      />
                    </label>
                  </div>
                  <textarea
                    aria-label="서비스 가입 조건 수정"
                    className={INPUT}
                    maxLength={4000}
                    value={editForm.registrationConditions}
                    onChange={(e) =>
                      setEditForm({
                        ...editForm,
                        registrationConditions: e.target.value,
                      })
                    }
                  />
                  <ServiceFeatureSelector
                    features={features}
                    selected={editForm.serviceFeatures}
                    disabled={busy || !settingsReady}
                    onChange={(serviceFeatures) =>
                      setEditForm((previous) => ({
                        ...previous,
                        serviceFeatures,
                      }))
                    }
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={busy || !settingsReady || !editForm.name.trim()}
                      onClick={() => saveEdit(sf)}
                      className="rounded-md bg-blue-600 hover:bg-blue-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => setEditKey(null)}
                      className="rounded-md border px-4 py-2 text-sm"
                    >
                      취소
                    </button>
                  </div>
                </fieldset>
              ) : (
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-semibold text-gray-900">
                        {sf.name}
                      </h3>
                      <span className="text-xs text-gray-500">{sf.key}</span>
                      <StatusBadge
                        status={sf.status}
                        label={sf.status === "active" ? "운영" : "마감"}
                      />
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      활성 가입 약국 {sf.activeMemberCount ?? 0}곳 · 커뮤니티{" "}
                      {sf.community_key || "-"} · 수취 주체{" "}
                      {sf.payment_receiver_key || "미정"}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={busy || !settingsReady}
                    onClick={() => startEdit(sf)}
                    className="rounded-md border px-3 py-1.5 text-sm"
                  >
                    수정
                  </button>
                </div>
              )}

              <BusinessFeatureSummary business={sf} features={features} />
              <div className="mt-4 border-t border-gray-100 pt-3">
                <div className="mb-2 text-sm font-medium text-gray-700">
                  담당 운영자
                </div>
                {(sf.operators ?? []).length === 0 ? (
                  <div className="text-xs text-gray-400">
                    이 화면에서 개별 지정한 담당 운영자가 없습니다.
                  </div>
                ) : (
                  <ul className="space-y-1">
                    {(sf.operators ?? []).map((op) => (
                      <li
                        key={op.userId}
                        className="flex items-center justify-between gap-2 text-sm"
                      >
                        <span className="font-mono text-xs text-gray-700">
                          {op.userId}{" "}
                          <span className="text-gray-400">
                            · {formatDateTime(op.assignedAt)}
                          </span>
                        </span>
                        <button
                          type="button"
                          disabled={busy || !settingsReady}
                          onClick={() => revoke(sf, op.userId)}
                          className="rounded border border-red-200 px-2 py-0.5 text-xs text-red-600 hover:bg-red-50"
                        >
                          해제
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {(sf.roleOperators ?? []).length > 0 && (
                  <div
                    className="mt-3"
                    aria-label={`${sf.name} 지정 역할 보유자`}
                  >
                    <div className="mb-1 text-xs font-medium text-gray-600">
                      운영자 관리에서 지정한 사업 역할 (조회 전용 — 해제는
                      운영자 관리 화면에서)
                    </div>
                    <ul className="space-y-1">
                      {(sf.roleOperators ?? []).map((op) => (
                        <li
                          key={`${op.userId}::${op.role}`}
                          className="text-sm text-gray-700"
                        >
                          <span className="mr-2 rounded bg-teal-50 px-1.5 py-0.5 text-xs text-teal-700">
                            {roleLevelLabel(op.role)}
                          </span>
                          {op.name || op.email || "이름 미등록"}
                          {op.name && op.email && (
                            <span className="ml-1 text-xs text-gray-400">
                              {op.email}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="mt-3 flex gap-2">
                  <input
                    className={INPUT}
                    aria-label={`${sf.name} 담당 운영자 ID`}
                    disabled={busy || !settingsReady}
                    placeholder="운영자 사용자 ID (UUID)"
                    value={operatorInput[sf.key] ?? ""}
                    onChange={(e) =>
                      setOperatorInput((prev) => ({
                        ...prev,
                        [sf.key]: e.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    disabled={
                      busy ||
                      !settingsReady ||
                      !(operatorInput[sf.key] ?? "").trim()
                    }
                    onClick={() => assign(sf)}
                    className="whitespace-nowrap rounded-md bg-gray-800 px-3 py-2 text-sm text-white disabled:opacity-50"
                  >
                    담당 지정
                  </button>
                </div>
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
