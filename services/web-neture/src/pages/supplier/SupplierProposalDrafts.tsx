import { useEffect, useRef, useState } from "react";
import {
  neturePharmacySupplierApi as api,
  type SupplyProposal,
} from "../../lib/api/neturePharmacy";
import { INPUT } from "../../components/neture-pharmacy/PharmacyCommerceUi";
import {
  productLabel,
  type SupplierPharmacyOptions,
} from "../../components/neture-pharmacy/useSupplierPharmacyOptions";

import {
  EMPTY_PROPOSAL_TERMS as EMPTY,
  readProposalDrafts,
  writeProposalDrafts,
  type ProposalDraftFields as Terms,
  type ProposalDraft as Draft,
} from "./proposalDraftStorage";
const validMoney = (value: string) =>
  value !== "" &&
  Number.isInteger(Number(value)) &&
  Number(value) >= 0 &&
  Number(value) <= 2147483647;
const validTerms = (terms: Terms) =>
  validMoney(terms.baseShippingFee) &&
  validMoney(terms.minOrderAmount) &&
  (terms.freeShippingThreshold === "" ||
    (validMoney(terms.freeShippingThreshold) &&
      Number(terms.freeShippingThreshold) > 0));

function ShippingFields({
  terms,
  onChange,
  prefix = "",
}: {
  terms: Terms;
  onChange: (patch: Partial<Terms>) => void;
  prefix?: string;
}) {
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {(
        ["baseShippingFee", "freeShippingThreshold", "minOrderAmount"] as const
      ).map((key, index) => (
        <label key={key} className="min-w-0 text-sm">
          {prefix}
          {
            [
              "기본 배송비 (원)",
              "무료배송 기준 (원, 선택)",
              "최소 주문금액 (원)",
            ][index]
          }
          <input
            className={INPUT}
            inputMode="numeric"
            value={terms[key]}
            placeholder={
              key === "freeShippingThreshold"
                ? "비우면 무료배송 기준 없음"
                : "0 이상 정수"
            }
            onChange={(e) =>
              onChange({ [key]: e.target.value.replace(/[^0-9]/g, "") })
            }
          />
        </label>
      ))}
    </div>
  );
}

/** 탭의 계정·공급자 범위에서 복원하는 초안. 제출은 기존 단일 협업체 API로 각각 처리한다. */
export default function SupplierProposalDrafts({
  options,
  requestedProduct,
  proposals,
  onSubmitted,
  storageScope,
}: {
  storageScope?: string;
  options: SupplierPharmacyOptions;
  requestedProduct: string | null;
  proposals: SupplyProposal[];
  onSubmitted: () => Promise<void>;
}) {
  const [restored] = useState(() => readProposalDrafts(storageScope));
  const [terms, setTerms] = useState(restored.terms);
  const [selected, setSelected] = useState<string[]>([]);
  const [drafts, setDrafts] = useState<Draft[]>(restored.drafts);
  const [storageError, setStorageError] = useState(false);
  const [targetSearch, setTargetSearch] = useState("");
  const [source, setSource] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const sending = useRef(false);
  const offerId = terms.offerId;
  const hasWork =
    drafts.some((d) => d.status !== "submitted") ||
    Object.keys(EMPTY).some(
      (key) => terms[key as keyof Terms] !== EMPTY[key as keyof Terms],
    );
  useEffect(() => {
    if (storageScope)
      setStorageError(!writeProposalDrafts(storageScope, terms, drafts));
  }, [storageScope, terms, drafts]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (hasWork || busy) {
        event.preventDefault();
        event.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [hasWork, busy]);
  const knownTargets = [
    ...new Map(
      proposals
        .filter((p) => p.targetOrganizationId && p.targetOrganizationName)
        .map((p) => [
          p.targetOrganizationId!,
          { id: p.targetOrganizationId!, name: p.targetOrganizationName! },
        ]),
    ).values(),
  ].filter((p) =>
    p.name.toLocaleLowerCase().includes(targetSearch.toLocaleLowerCase()),
  );
  useEffect(() => {
    if (!requestedProduct || options.loading || options.error) return;
    if (restored.terms.offerId) return;
    setTerms((prev) => ({
      ...prev,
      offerId: options.products.some((p) => p.id === requestedProduct)
        ? requestedProduct
        : "",
    }));
  }, [
    requestedProduct,
    options.products,
    options.loading,
    options.error,
    restored.terms.offerId,
  ]);

  const addDrafts = () => {
    if (
      !validTerms(terms) ||
      !offerId ||
      !selected.length ||
      !Number.isSafeInteger(Number(terms.unitPrice)) ||
      Number(terms.unitPrice) <= 0
    ) {
      setMessage(
        "제품 · 협업체 · 공급 가격과 배송비·최소금액 조건을 확인해 주세요.",
      );
      return;
    }
    const additions = options.semiFranchises.filter(
      (sf) =>
        selected.includes(sf.key) && !drafts.some((d) => d.key === sf.key),
    );
    setDrafts((prev) => [
      ...prev,
      ...additions.map(
        (sf): Draft => ({
          ...terms,
          offerId,
          key: sf.key,
          name: sf.name,
          targetOrganizationId: "",
          status: "draft",
          requestId: crypto.randomUUID(),
        }),
      ),
    ]);
    setSelected([]);
    setMessage(
      additions.length
        ? `${additions.length}개 협업체의 초안을 만들었습니다. 각 조건을 확인한 후 승인 요청하세요.`
        : "선택한 협업체의 초안이 이미 있습니다. 기존 초안을 확인하세요.",
    );
  };

  const update = (
    key: string,
    patch: Partial<Terms & { targetOrganizationId: string }>,
  ) => {
    setDrafts((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    );
  };

  const submit = async (keys: string[]) => {
    if (sending.current) return;
    const pending = drafts.filter(
      (d) => keys.includes(d.key) && d.status !== "submitted",
    );
    if (!pending.length) return;
    if (
      pending.some(
        (d) =>
          d.status !== "error" &&
          (!validTerms(d) ||
            !options.products.some((p) => p.id === d.offerId) ||
            !options.semiFranchises.some((sf) => sf.key === d.key) ||
            !Number.isSafeInteger(Number(d.unitPrice)) ||
            Number(d.unitPrice) <= 0),
      )
    ) {
      setMessage(
        "각 초안의 제품 · 활성 협업체 · 공급 가격과 배송비·최소금액 조건을 확인해 주세요.",
      );
      return;
    }
    sending.current = true;
    setBusy(true);
    let succeeded = 0;
    let working = drafts;
    const record = (key: string, patch: Partial<Draft>) => {
      working = working.map((d) => (d.key === key ? { ...d, ...patch } : d));
      if (storageScope && !writeProposalDrafts(storageScope, terms, working))
        setStorageError(true);
      setDrafts(working);
    };
    try {
      for (const draft of pending) {
        record(draft.key, { status: "sending", error: undefined });
        try {
          await api.createProposal({
            requestId: draft.requestId,
            offerId: draft.offerId,
            semiFranchiseKey: draft.key,
            unitPrice: Number(draft.unitPrice),
            targetOrganizationId:
              draft.targetOrganizationId.trim() || undefined,
            note: draft.note.trim() || undefined,
            terms: {
              baseShippingFee: Number(draft.baseShippingFee),
              freeShippingThreshold:
                draft.freeShippingThreshold === ""
                  ? null
                  : Number(draft.freeShippingThreshold),
              minOrderAmount: Number(draft.minOrderAmount),
            },
          });
          succeeded++;
          record(draft.key, { status: "submitted" });
        } catch (error) {
          record(draft.key, {
            status: "error",
            error:
              error instanceof Error
                ? error.message
                : "요청 결과를 확인하지 못했습니다.",
          });
        }
      }
      setMessage(
        `${succeeded}건 요청 완료 · ${pending.length - succeeded}건 결과 확인 필요. 협업체별로 독립 심사됩니다.`,
      );
      try {
        await onSubmitted();
      } catch {
        setMessage(
          "접수 처리는 끝났지만 목록 갱신에 실패했습니다. 페이지를 다시 열어 상태를 확인하세요.",
        );
      }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  };

  return (
    <section
      className="space-y-4 rounded-lg border border-gray-200 bg-white p-4"
      aria-label="협업체별 공급 요청 초안"
    >
      <h2 className="text-base font-semibold text-gray-900">
        같은 조건으로 여러 협업체에 요청
      </h2>
      <p className="text-sm text-gray-600">
        공통 입력으로 협업체별 초안을 만든 뒤 각각 확인·수정하세요.
        요청·승인·변경·종료는 협업체별로 독립 처리되며, 다른 협업체로 자동
        반영되지 않습니다.
      </p>
      <p className="text-xs text-gray-500">
        가격·배송조건 변경은 기존 제안 종료 후 새 승인 요청으로 진행합니다.
        제출한 조건은 고정되며 공급자 공통 설정을 바꿔도 전파되지 않습니다.
        pharmacy 특별가격도 같은 승인을 거칩니다.{" "}
        {storageScope && !storageError
          ? "초안은 마지막 사용 후 24시간 이내에 이 탭에서 복원됩니다."
          : "초안은 현재 화면에서만 유지됩니다."}{" "}
        공용 기기에서는 작업 후 초안을 지우고 로그아웃하세요.
      </p>
      {(!storageScope || storageError) && (
        <p role="alert" className="text-sm text-amber-800">
          초안을 이 탭에 보관할 수 없습니다. 화면을 떠나기 전에 작성 내용을
          확인하세요.
        </p>
      )}
      {hasWork && (
        <button
          type="button"
          disabled={busy}
          className="text-sm text-gray-600"
          onClick={() => {
            if (
              window.confirm(
                "작성 중인 초안을 모두 지울까요? 응답을 확인하지 못한 요청도 이미 접수됐을 수 있으니 목록에서 확인하세요. 초안을 지워도 접수한 제안은 종료되지 않습니다.",
              )
            ) {
              setTerms({ ...EMPTY });
              setDrafts([]);
              setSelected([]);
            }
          }}
        >
          작성 초안 모두 지우기
        </button>
      )}
      {options.error && (
        <p role="alert" className="text-sm text-red-600">
          {options.error}
        </p>
      )}
      <fieldset
        disabled={busy || options.loading || !!options.error}
        className="space-y-3 disabled:opacity-70"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            제품
            <select
              className={INPUT}
              value={offerId}
              onChange={(e) => setTerms({ ...terms, offerId: e.target.value })}
            >
              <option value="">제품 선택 (등록 승인된 제품)</option>
              {options.products.map((p) => (
                <option key={p.id} value={p.id}>
                  {productLabel(p)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            공통 공급 가격 (원)
            <input
              className={INPUT}
              inputMode="numeric"
              value={terms.unitPrice}
              onChange={(e) =>
                setTerms({
                  ...terms,
                  unitPrice: e.target.value.replace(/[^0-9]/g, ""),
                })
              }
            />
          </label>
        </div>
        <ShippingFields
          terms={terms}
          prefix="공통 "
          onChange={(patch) => setTerms({ ...terms, ...patch })}
        />
        <label className="block text-sm">
          공통 메모 (선택)
          <textarea
            className={INPUT}
            maxLength={1000}
            value={terms.note}
            onChange={(e) => setTerms({ ...terms, note: e.target.value })}
          />
        </label>
        <label className="block text-sm">
          기존 제안에서 조건 가져오기
          <select
            className={INPUT}
            value={source}
            onChange={(e) => {
              setSource(e.target.value);
              const p = proposals.find((row) => row.id === e.target.value);
              if (p) {
                setTerms({
                  offerId: p.offerId,
                  unitPrice: String(p.unitPrice),
                  note: p.note || "",
                  baseShippingFee: p.termsSnapshot
                    ? String(p.termsSnapshot.baseShippingFee)
                    : "",
                  freeShippingThreshold:
                    p.termsSnapshot?.freeShippingThreshold == null
                      ? ""
                      : String(p.termsSnapshot.freeShippingThreshold),
                  minOrderAmount: String(p.termsSnapshot?.minOrderAmount ?? 0),
                });
                setMessage(
                  "제품 · 단가 · 고정 배송조건 · 메모를 가져왔습니다. 기존 방식의 제안은 배송비를 새로 입력하세요. 대상 약국은 복사하지 않습니다. 기존 초안은 변경하지 않습니다.",
                );
              }
            }}
          >
            <option value="">기존 제안 선택 (선택 사항)</option>
            {proposals.map((p) => (
              <option key={p.id} value={p.id}>
                {p.productName} · {p.semiFranchiseName} ·{" "}
                {p.unitPrice.toLocaleString("ko-KR")}원 · {p.id.slice(0, 8)}
              </option>
            ))}
          </select>
        </label>
        <fieldset className="rounded border border-gray-200 p-3">
          <legend className="px-1 text-sm">초안을 만들 협업체 선택</legend>
          <div className="flex flex-wrap gap-4">
            {options.semiFranchises.map((sf) => (
              <label key={sf.key} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selected.includes(sf.key)}
                  disabled={drafts.some((d) => d.key === sf.key)}
                  onChange={(e) =>
                    setSelected((prev) =>
                      e.target.checked
                        ? [...prev, sf.key]
                        : prev.filter((key) => key !== sf.key),
                    )
                  }
                />
                {sf.name}
              </label>
            ))}
          </div>
          {!options.loading &&
            !options.error &&
            !options.semiFranchises.length && (
              <p className="text-sm text-gray-500">
                요청할 수 있는 활성 협업체가 없습니다.
              </p>
            )}
        </fieldset>
        <button
          type="button"
          className="rounded border border-primary-300 px-3 py-2 text-sm text-primary-700"
          onClick={addDrafts}
        >
          협업체별 초안 만들기
        </button>
      </fieldset>
      {message && (
        <p role="status" className="text-sm text-blue-700">
          {message}
        </p>
      )}
      {!!drafts.length && (
        <div className="space-y-3">
          <label className="block text-sm">
            기존 제안 대상 약국 이름 검색
            <input
              className={INPUT}
              value={targetSearch}
              onChange={(e) => setTargetSearch(e.target.value)}
              placeholder="기존에 지정한 약국 이름"
            />
          </label>
          <p className="text-xs text-gray-500">
            본인 제안 이력에 있는 약국만 검색합니다. 신규 약국은 전달받은 조직
            ID로 지정할 수 있습니다. 협업체 가입 여부를 추가 검사하지 않습니다.
          </p>
          <p className="text-sm text-gray-600">
            약국을 지정하지 않으면 해당 협업체의 활성 회원 약국 전체를 대상으로
            합니다.
          </p>
          {drafts.map((d) => (
            <fieldset
              key={d.key}
              disabled={busy || d.status === "submitted"}
              aria-label={`${d.name} 초안`}
              className="min-w-0 space-y-3 rounded border border-gray-200 p-3"
            >
              <legend className="px-1 font-medium">
                {d.name} ·{" "}
                {d.status === "submitted"
                  ? "승인 요청 완료"
                  : d.status === "sending"
                    ? "요청 중"
                    : "미제출 초안"}
              </legend>
              <fieldset
                disabled={d.status === "error"}
                className="grid min-w-0 gap-3 md:grid-cols-2"
              >
                <label className="text-sm">
                  제품
                  <select
                    className={INPUT}
                    value={d.offerId}
                    onChange={(e) => update(d.key, { offerId: e.target.value })}
                  >
                    <option value="">제품 선택</option>
                    {options.products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {productLabel(p)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm">
                  공급 가격 (원)
                  <input
                    className={INPUT}
                    inputMode="numeric"
                    value={d.unitPrice}
                    onChange={(e) =>
                      update(d.key, {
                        unitPrice: e.target.value.replace(/[^0-9]/g, ""),
                      })
                    }
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  기존 대상 약국 선택
                  <select
                    className={INPUT}
                    value={
                      knownTargets.some((p) => p.id === d.targetOrganizationId)
                        ? d.targetOrganizationId
                        : ""
                    }
                    onChange={(e) =>
                      update(d.key, { targetOrganizationId: e.target.value })
                    }
                  >
                    <option value="">약국 선택 (선택 사항)</option>
                    {knownTargets.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="text-sm md:col-span-2">
                  대상 약국 조직 ID (선택)
                  <input
                    className={INPUT}
                    value={d.targetOrganizationId}
                    onChange={(e) =>
                      update(d.key, { targetOrganizationId: e.target.value })
                    }
                  />
                </label>
                <label className="text-sm md:col-span-2">
                  메모 (선택)
                  <textarea
                    className={INPUT}
                    maxLength={1000}
                    value={d.note}
                    onChange={(e) => update(d.key, { note: e.target.value })}
                  />
                </label>
                <ShippingFields
                  terms={d}
                  onChange={(patch) => update(d.key, patch)}
                />
              </fieldset>
              {d.error && (
                <p role="alert" className="text-sm text-red-600">
                  {d.error} 통신 오류라도 접수됐을 수 있습니다. 내용을 바꾸지
                  말고 같은 요청으로 접수 결과를 확인하세요.
                </p>
              )}
              {d.status === "error" && (
                <button
                  type="button"
                  className="text-sm text-gray-600"
                  onClick={() => {
                    if (
                      window.confirm(
                        "접수 목록을 확인했나요? 이미 접수됐다면 먼저 기존 제안을 종료하세요. 확인한 내용을 새 초안으로 바꾸겠습니까?",
                      )
                    ) {
                      setDrafts((prev) =>
                        prev.map((row) =>
                          row.key === d.key
                            ? {
                                ...row,
                                requestId: crypto.randomUUID(),
                                status: "draft",
                                error: undefined,
                              }
                            : row,
                        ),
                      );
                    }
                  }}
                >
                  접수 목록 확인 후 새 초안으로 변경
                </button>
              )}
              {d.status !== "submitted" && (
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={() => submit([d.key])}
                    className="rounded bg-primary-600 px-3 py-2 text-sm text-white"
                  >
                    {d.status === "error"
                      ? "같은 요청으로 접수 확인"
                      : `${d.name} 승인 요청`}
                  </button>
                  <button
                    type="button"
                    disabled={d.status === "error"}
                    onClick={() =>
                      setDrafts((prev) =>
                        prev.filter((row) => row.key !== d.key),
                      )
                    }
                    className="text-sm text-gray-600"
                  >
                    초안 삭제
                  </button>
                </div>
              )}
            </fieldset>
          ))}
          <button
            type="button"
            disabled={busy || !drafts.some((d) => d.status === "draft")}
            onClick={() =>
              submit(
                drafts.filter((d) => d.status === "draft").map((d) => d.key),
              )
            }
            className="rounded bg-primary-600 px-4 py-2 text-sm text-white disabled:opacity-50"
          >
            미제출 초안 승인 요청
          </button>
          {drafts.some((d) => d.status === "submitted") && (
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setDrafts((prev) =>
                  prev.filter((d) => d.status !== "submitted"),
                )
              }
              className="ml-3 text-sm text-gray-600"
            >
              완료 초안 정리
            </button>
          )}
          <p className="text-xs text-gray-500">
            완료된 요청과 오류가 난 요청은 묶음 요청에서 제외합니다. 오류가 난
            건은 같은 내용으로 접수 확인 후 새 조건의 초안을 만드세요.
          </p>
        </div>
      )}
    </section>
  );
}
