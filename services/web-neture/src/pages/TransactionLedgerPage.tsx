import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { useAuth } from "../contexts";
import { useLoginModal } from "../contexts/LoginModalContext";
import {
  ledgerConfirm,
  ledgerEnableServer,
  ledgerGet,
  ledgerImage,
  ledgerList,
  ledgerSave,
  ledgerWorkspaces,
  type LedgerInvoice,
  type PhotoInvoice,
} from "../api/transactionLedger";

const fieldLabels: Record<string, string> = {
  sellerName: "거래처",
  sellerBusinessNumber: "공급자 사업자번호",
  buyerBusinessNumber: "수취인 사업자번호",
  documentNumber: "명세서 번호",
  issuedOn: "거래일자",
  statedLineTotal: "인쇄된 행 금액 합계",
  productName: "상품명",
  supplierProductCode: "업체 상품코드",
  barcode: "바코드",
  manufacturer: "제조사",
  packageText: "규격",
  quantity: "수량",
  unit: "단위",
  unitPrice: "단가",
  amount: "금액",
  lotNumber: "제조번호",
  expiresOn: "유효기한",
  amountAdjustment: "행 할인·조정액",
  adjustmentReason: "행 조정 사유",
};
const messages: Record<string, string> = {
  LEDGER_CONFLICT:
    "다른 곳에서 내용이 바뀌었습니다. 입력값을 보존한 뒤 최신 내용을 다시 불러와 비교해 주세요.",
  LEDGER_DUPLICATE_REVIEW_REQUIRED:
    "중복 가능성이 있는 명세서가 있습니다. 같은 거래인지 확인하고 처리 방법과 사유를 입력해 주세요.",
  LEDGER_SCOPE_FORBIDDEN: "거래장 이용 권한을 확인해 주세요.",
  LEDGER_SERVER_STORAGE_CONSENT_REQUIRED:
    "매장 경영자가 서버 보관을 선택해야 합니다. PC 자료를 옮기는 중이라면 이전을 먼저 완료해 주세요.",
  LEDGER_REVIEW_REQUIRED:
    "누락·확인 필요 항목과 금액 불일치를 먼저 확인해 주세요.",
  INVOICE_REVIEW_REQUIRED:
    "누락·확인 필요 항목과 금액 불일치를 먼저 확인해 주세요.",
};
export default function TransactionLedgerPage() {
  const { id } = useParams(),
    location = useLocation(),
    { isAuthenticated, user } = useAuth(),
    { openLoginModal } = useLoginModal();
  const organizationId =
    new URLSearchParams(location.search).get("organizationId") ?? "";
  const [row, setRow] = useState<LedgerInvoice | null>(null),
    [draft, setDraft] = useState<PhotoInvoice | null>(null),
    [stores, setStores] = useState<Array<{ id: string; name: string }>>([]),
    [recent, setRecent] = useState<
      Array<{
        id: string;
        state: string;
        sellerName: string | null;
        issuedOn: string | null;
        version: number;
      }>
    >([]),
    [selected, setSelected] = useState(new Set<string>()),
    [nextCursor, setNextCursor] = useState<string | null>(null),
    [message, setMessage] = useState(""),
    [busy, setBusy] = useState(false),
    [dirty, setDirty] = useState(false),
    [reviewed, setReviewed] = useState(false),
    [missingAck, setMissingAck] = useState(false),
    [serverConsent, setServerConsent] = useState(false),
    [photos, setPhotos] = useState<Array<{ mimeType: string; base64: string }>>(
      [],
    ),
    [urls, setUrls] = useState<string[]>([]),
    [duplicate, setDuplicate] = useState(""),
    [duplicateReason, setDuplicateReason] = useState(""),
    [programStatus, setProgramStatus] = useState("unknown");
  const generation = useRef(0),
    confirmRequest = useRef(crypto.randomUUID()),
    // 같은 내용의 저장 재시도는 같은 requestId 로 보내 서버의 기존 요청 조회를 탄다.
    saveRequest = useRef<{ key: string; id: string } | null>(null);
  function fail(error: unknown) {
    const code = error instanceof Error ? error.message : "";
    setMessage(
      messages[code] ??
        "처리하지 못했습니다. 매장 권한과 최신 상태를 확인한 뒤 다시 시도해 주세요.",
    );
  }
  useEffect(() => {
    let active = true;
    const epoch = ++generation.current;
    setRow(null);
    setDraft(null);
    setStores([]);
    setServerConsent(false);
    setRecent([]);
    setNextCursor(null);
    setSelected(new Set());
    setPhotos([]);
    setDirty(false);
    setReviewed(false);
    setMissingAck(false);
    setProgramStatus("unknown");
    setDuplicate("");
    setDuplicateReason("");
    setMessage("");
    setBusy(false);
    confirmRequest.current = crypto.randomUUID();
    if (!isAuthenticated) return;
    void ledgerWorkspaces()
      .then((v) => {
        if (active) setStores(v.items);
      })
      .catch((e) => {
        if (active) fail(e);
      });
    if (id && organizationId)
      void ledgerGet(organizationId, id)
        .then((v) => {
          if (active && epoch === generation.current) {
            setRow(v);
            setDraft(v.invoice);
          }
        })
        .catch((e) => {
          if (active) fail(e);
        });
    else if (organizationId)
      void ledgerList(organizationId)
        .then((v) => {
          if (active) {
            setRecent(v.items);
            setNextCursor(v.next);
          }
        })
        .catch((e) => {
          if (active) fail(e);
        });
    return () => {
      active = false;
      generation.current = epoch + 1;
    };
  }, [id, organizationId, isAuthenticated, user?.id]);
  useEffect(() => {
    let active = true;
    const created: string[] = [];
    setUrls([]);
    if (row)
      void Promise.all(
        row.sources.map((s) =>
          ledgerImage(row.organization_id, row.id, s.page, row.version),
        ),
      )
        .then((blobs) => {
          if (!active) return;
          blobs.forEach((b) => created.push(URL.createObjectURL(b)));
          setUrls([...created]);
        })
        .catch(() => {
          if (active)
            setMessage(
              "원본 사진을 불러오지 못했습니다. 저장 내용과 원본 보관 상태를 다시 확인해 주세요.",
            );
        });
    return () => {
      active = false;
      created.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [row]);
  function edit(key: string, value: string, rowId?: string) {
    if (!draft) return;
    const path = rowId ? `rows.${rowId}.${key}` : key;
    setDraft({
      ...draft,
      ...(!rowId ? { [key]: value || null } : {}),
      rows: rowId
        ? draft.rows.map((r) =>
            r.id === rowId ? { ...r, [key]: value || null } : r,
          )
        : draft.rows,
      unresolved: draft.unresolved.filter((p) => p !== path),
    });
    setDirty(true);
    setReviewed(false);
    confirmRequest.current = crypto.randomUUID();
  }
  async function save() {
    if (!row || !draft) return;
    const epoch = generation.current;
    setBusy(true);
    setMessage("");
    try {
      const key = JSON.stringify([row.id, row.version, draft, photos]);
      if (saveRequest.current?.key !== key)
        saveRequest.current = { key, id: crypto.randomUUID() };
      const saved = await ledgerSave(
        row,
        draft,
        photos,
        saveRequest.current.id,
      );
      saveRequest.current = null;
      if (epoch === generation.current) {
        setRow(saved);
        setDraft(saved.invoice);
        setPhotos([]);
        setDirty(false);
        setReviewed(false);
        setMissingAck(false);
        setDuplicate("");
        setDuplicateReason("");
        setProgramStatus("unknown");
        setMessage(
          "수정한 내용을 저장했습니다. 다시 확인한 후 거래장에 반영해 주세요.",
        );
      }
    } catch (e) {
      if (epoch === generation.current) fail(e);
    } finally {
      if (epoch === generation.current) setBusy(false);
    }
  }
  async function confirm() {
    if (!row || !reviewed || dirty) return;
    const epoch = generation.current;
    setBusy(true);
    setMessage("");
    try {
      const confirmed = await ledgerConfirm(
        row,
        confirmRequest.current,
        missingAck,
        duplicate || undefined,
        duplicateReason || undefined,
        programStatus,
      );
      if (epoch === generation.current) {
        setRow(confirmed);
        setDraft(confirmed.invoice);
        setMessage(
          confirmed.state === "duplicate"
            ? "같은 거래로 표시했습니다. 새 거래와 상품 정비 후보를 중복 반영하지 않았습니다."
            : "거래장에 반영했습니다. 상품 정보는 관리자 정기 검토 대상으로 전달했습니다.",
        );
      }
    } catch (e) {
      if (epoch === generation.current) fail(e);
    } finally {
      if (epoch === generation.current) setBusy(false);
    }
  }
  async function upload(files: FileList | null) {
    if (!files) return;
    const epoch = generation.current;
    try {
      if (files.length > 8) throw Error();
      const selectedPhotos = await Promise.all(
        Array.from(files).map(async (file) => {
          if (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 2 * 1024 * 1024
          )
            throw Error();
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result).split(",")[1]);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          return { mimeType: file.type, base64 };
        }),
      );
      if (epoch === generation.current) {
        setPhotos(selectedPhotos);
        setDirty(true);
        setReviewed(false);
      }
    } catch {
      setMessage(
        "사진은 JPEG·PNG·WebP, 각 2MB 이하, 최대 8장으로 선택해 주세요.",
      );
    }
  }
  if (!isAuthenticated)
    return (
      <main className="mx-auto max-w-5xl space-y-4 p-4">
        <h1 className="text-xl">거래장 확인</h1>
        <button
          onClick={() => openLoginModal(location.pathname + location.search)}
        >
          O4O 로그인
        </button>
      </main>
    );
  const editable = row?.state === "draft";
  const field = (key: string, value: unknown, rowId?: string) => {
    const path = rowId ? `rows.${rowId}.${key}` : key,
      unclear = draft?.unresolved.includes(path);
    return (
      <label key={path} className="block min-w-0 text-sm">
        <span>
          {fieldLabels[key] ?? key}
          {unclear ? " · 확인 필요" : ""}
        </span>
        <input
          className="mt-1 block w-full rounded border p-2"
          value={value == null ? "" : String(value)}
          disabled={!editable || busy}
          onChange={(e) => edit(key, e.target.value, rowId)}
        />
        {unclear && editable && (
          <button
            type="button"
            className="mt-1 underline"
            disabled={busy}
            onClick={() => {
              if (draft) {
                setDraft({
                  ...draft,
                  unresolved: draft.unresolved.filter((p) => p !== path),
                });
                setDirty(true);
                setReviewed(false);
              }
            }}
          >
            현재 값 확인
          </button>
        )}
      </label>
    );
  };
  return (
    <main className="mx-auto max-w-5xl space-y-5 p-4 sm:p-8">
      <h1 className="text-2xl font-bold">거래장 확인</h1>
      <p>
        사진에서 정리한 내용을 확인·수정하고 거래장에 반영합니다. 약국 프로그램
        전기·결제·주문은 실행하지 않습니다.
      </p>
      {message && (
        <p role="status" className="rounded border p-3">
          {message}
        </p>
      )}
      {!id && (
        <>
          <label className="block">
            매장
            <select
              className="ml-2 rounded border p-2"
              value={organizationId}
              onChange={(e) => {
                window.location.assign(
                  "/work/ledger?organizationId=" +
                    encodeURIComponent(e.target.value),
                );
              }}
            >
              <option value="">선택해 주세요</option>
              {stores.map((s) => (
                <option key={s.id} value={s.id.slice(6)}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          {organizationId && (
            <section className="space-y-3 rounded border p-4">
              <h2>서버 보관 선택</h2>
              <p>
                매장 경영자가 선택합니다. 서버에서 새로 시작하며, PC 자료가
                있으면 기존 업무 자료 연결에서 이전을 먼저 진행하세요.
              </p>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  checked={serverConsent}
                  onChange={(e) => setServerConsent(e.target.checked)}
                />
                이 매장의 업무 자료와 명세서를 서버에 보관하는 데 동의합니다.
              </label>
              <button
                disabled={!serverConsent || busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await ledgerEnableServer(organizationId);
                    setMessage(
                      "서버 보관을 선택했습니다. 원래 채팅으로 돌아가 거래명세서 사진을 다시 요청해 주세요.",
                    );
                  } catch (e) {
                    fail(e);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                서버 보관 선택
              </button>
            </section>
          )}
          <p>
            O4O 또는 ChatGPT 채팅에 사진을 첨부하고 ‘거래장에 입력해 줘’라고
            요청하세요. 안내받은 주소에서 내용을 확인합니다.
          </p>
          {recent.length > 0 && (
            <section className="space-y-3">
              <h2>최근 명세서</h2>
              <div className="flex items-center gap-3">
                <span>{selected.size}개 선택</span>
                <button
                  disabled={selected.size !== 1}
                  onClick={() =>
                    window.location.assign(
                      `/work/ledger/${[...selected][0]}?organizationId=${organizationId}`,
                    )
                  }
                >
                  상세 확인
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr>
                      <th>
                        <input
                          type="checkbox"
                          aria-label="현재 목록 전체 선택"
                          checked={selected.size === recent.length}
                          onChange={(e) =>
                            setSelected(
                              e.target.checked
                                ? new Set(recent.map((r) => r.id))
                                : new Set(),
                            )
                          }
                        />
                      </th>
                      <th>거래처</th>
                      <th>일자</th>
                      <th>상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recent.map((item) => (
                      <tr key={item.id}>
                        <td>
                          <input
                            type="checkbox"
                            aria-label={`${item.sellerName ?? "거래처 미상"} 선택`}
                            checked={selected.has(item.id)}
                            onChange={(e) =>
                              setSelected((old) => {
                                const next = new Set(old);
                                if (e.target.checked) next.add(item.id);
                                else next.delete(item.id);
                                return next;
                              })
                            }
                          />
                        </td>
                        <td>{item.sellerName ?? "확인 필요"}</td>
                        <td>{item.issuedOn ?? "확인 필요"}</td>
                        <td>
                          {item.state === "draft"
                            ? "확인 중"
                            : item.state === "duplicate"
                              ? "중복"
                              : "반영됨"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {nextCursor && (
                <button
                  disabled={busy}
                  onClick={async () => {
                    const epoch = generation.current;
                    setBusy(true);
                    try {
                      const more = await ledgerList(organizationId, nextCursor);
                      if (epoch === generation.current) {
                        setRecent((old) => [...old, ...more.items]);
                        setNextCursor(more.next);
                        setSelected(new Set());
                      }
                    } catch (e) {
                      if (epoch === generation.current) fail(e);
                    } finally {
                      if (epoch === generation.current) setBusy(false);
                    }
                  }}
                >
                  더 보기
                </button>
              )}
            </section>
          )}
        </>
      )}
      {row && draft && (
        <>
          <p>
            {row.state === "draft"
              ? "확인 중"
              : row.state === "duplicate"
                ? "같은 거래로 분류됨"
                : "거래장 반영됨"}{" "}
            · 버전 {row.version}
          </p>
          <div className="grid gap-3 sm:grid-cols-2">
            {[
              "sellerName",
              "sellerBusinessNumber",
              "buyerBusinessNumber",
              "documentNumber",
              "issuedOn",
              "statedLineTotal",
            ].map((key) => field(key, draft[key as keyof PhotoInvoice]))}
          </div>
          <label className="block">
            거래 유형
            <select
              disabled={!editable || busy}
              value={draft.documentType}
              onChange={(e) => {
                setDraft({
                  ...draft,
                  documentType: e.target.value as "purchase" | "return",
                });
                setDirty(true);
                setReviewed(false);
              }}
            >
              <option value="purchase">매입</option>
              <option value="return">반품</option>
            </select>
          </label>
          <label className="block">
            세금 구분
            <select
              disabled={!editable || busy}
              value={draft.taxTreatment}
              onChange={(e) => {
                setDraft({
                  ...draft,
                  taxTreatment: e.target.value as PhotoInvoice["taxTreatment"],
                  unresolved: draft.unresolved.filter(
                    (p) => p !== "taxTreatment",
                  ),
                });
                setDirty(true);
                setReviewed(false);
              }}
            >
              {[
                ["unknown", "확인 안 됨"],
                ["included", "포함"],
                ["excluded", "별도"],
                ["exempt", "면세"],
              ].map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {draft.rows.map((r, index) => (
            <section key={r.id} className="space-y-3 rounded border p-4">
              <h2 className="font-semibold">품목 {index + 1}</h2>
              <details>
                <summary>원문 보기</summary>
                <p className="whitespace-pre-wrap break-words">{r.rawText}</p>
              </details>
              <div className="grid gap-3 sm:grid-cols-3">
                {[
                  "productName",
                  "packageText",
                  "quantity",
                  "unit",
                  "unitPrice",
                  "amount",
                ]
                  .filter((key) => key in r)
                  .map((key) => field(key, r[key as keyof typeof r], r.id))}
              </div>
              <details>
                <summary>상품 식별·제조번호·유효기한·금액 조정</summary>
                <div className="grid gap-3 sm:grid-cols-3">
                  {[
                    "supplierProductCode",
                    "barcode",
                    "manufacturer",
                    "lotNumber",
                    "expiresOn",
                    "amountAdjustment",
                    "adjustmentReason",
                  ]
                    .filter((key) => key in r)
                    .map((key) => field(key, r[key as keyof typeof r], r.id))}
                </div>
              </details>
            </section>
          ))}
          <p>
            {dirty
              ? "수정 저장 후 합계를 다시 계산합니다. 현재 저장된 내용 기준입니다. "
              : ""}
            행 금액 합계: {row.lineTotal ?? "확인 필요"}원 · 확인된 부분 합계:{" "}
            {row.knownLineSubtotal}원. 세금 포함 청구 총액과 다를 수 있습니다.
          </p>
          {row.issues.length > 0 && (
            <section role="alert">
              <h2>확인이 필요한 항목</h2>
              <ul>
                {row.issues.map((issue, index) => (
                  <li key={index}>
                    {fieldLabels[issue.path.split(".").at(-1) ?? ""] ??
                      issue.path}
                    :{" "}
                    {issue.code.includes("MISMATCH")
                      ? "금액이 일치하지 않음"
                      : "값 확인 필요"}
                  </li>
                ))}
              </ul>
            </section>
          )}
          <section className="space-y-3">
            <h2>원본 사진</h2>
            {urls.map((url, index) => (
              <img
                key={url}
                src={url}
                alt={`거래명세서 원본 ${index + 1}`}
                className="max-w-full rounded border"
              />
            ))}
            {!row.sources.length && (
              <p>
                사진 원본은 O4O에 보관되어 있지 않습니다. ChatGPT 첨부는
                자동으로 전송되지 않습니다.
              </p>
            )}
            {editable && (
              <label className="block">
                원본 사진 추가·교체
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  disabled={busy}
                  onChange={(e) => void upload(e.target.files)}
                />
              </label>
            )}
            {photos.length > 0 && (
              <p>
                {photos.length}장 선택됨. 수정 저장 후 원본과 값을 다시 확인해
                주세요.
              </p>
            )}
          </section>
          {editable && (
            <section className="space-y-3 rounded border p-4">
              <button
                className="rounded border px-4 py-2"
                disabled={busy || !dirty}
                onClick={() => void save()}
              >
                수정 저장
              </button>
              <label className="flex gap-2">
                <input
                  type="checkbox"
                  disabled={busy || dirty}
                  checked={reviewed}
                  onChange={(e) => setReviewed(e.target.checked)}
                />
                수량·단위·금액과 원본을 확인했습니다.
              </label>
              {!row.sources.length && (
                <label className="flex gap-2">
                  <input
                    type="checkbox"
                    disabled={busy || dirty}
                    checked={missingAck}
                    onChange={(e) => setMissingAck(e.target.checked)}
                  />
                  원본 사진이 O4O에 보관되지 않는 점을 확인했습니다.
                </label>
              )}
              <label className="block">
                약국 프로그램 등록 상태
                <select
                  value={programStatus}
                  disabled={busy}
                  onChange={(e) => setProgramStatus(e.target.value)}
                >
                  <option value="unknown">
                    확인 안 됨 · 프로그램 집계와 합산하지 않음
                  </option>
                  <option value="not_recorded">아직 등록하지 않음</option>
                  <option value="recorded_in_program">
                    이미 프로그램에 등록됨 · 이중 합산하지 않음
                  </option>
                </select>
              </label>
              {message === messages.LEDGER_DUPLICATE_REVIEW_REQUIRED && (
                <div className="space-y-2">
                  <label>
                    중복 처리
                    <select
                      value={duplicate}
                      onChange={(e) => setDuplicate(e.target.value)}
                    >
                      <option value="">선택해 주세요</option>
                      <option value="same_transaction">
                        같은 거래 · 추가 반영하지 않음
                      </option>
                      <option value="new">별개 거래</option>
                    </select>
                  </label>
                  <label className="block">
                    확인 사유
                    <input
                      value={duplicateReason}
                      onChange={(e) => setDuplicateReason(e.target.value)}
                      className="block w-full border p-2"
                    />
                  </label>
                </div>
              )}
              <button
                className="rounded bg-blue-700 px-4 py-3 text-white disabled:opacity-50"
                disabled={
                  busy ||
                  dirty ||
                  !reviewed ||
                  row.issues.length > 0 ||
                  (!row.sources.length && !missingAck)
                }
                onClick={() => void confirm()}
              >
                거래장에 반영
              </button>
              <p>
                상품 등록과 표준명·바코드 정비는 관리자가 정기적으로 진행합니다.
              </p>
            </section>
          )}
          <Link to={"/work/ledger?organizationId=" + row.organization_id}>
            명세서 목록
          </Link>
        </>
      )}
      {id && !row && (
        <p>
          명세서를 불러오는 중이거나 이용할 수 없습니다. 위 안내를 확인해
          주세요.
        </p>
      )}
    </main>
  );
}
