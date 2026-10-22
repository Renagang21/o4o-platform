import { useEffect } from "react";
import { Navigate, useParams, useSearchParams } from "react-router-dom";
import { useUnifiedStore } from "../contexts/StoreContext";
import { StoreGate } from "../components/StoreGate";

/** A deep link selects only a store already authorized by the existing work-scope API. */
export default function ExternalAiDraftEntry() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const target = params.get("organizationId");
  const store = useUnifiedStore();
  const { organizationId, selectStore } = store;
  const allowed = store.stores.some((item) => item.organizationId === target);
  useEffect(() => {
    if (allowed && target && organizationId !== target) selectStore(target);
  }, [allowed, target, organizationId, selectStore]);
  if (
    store.status === "idle" ||
    store.status === "error" ||
    store.status === "none"
  )
    return (
      <StoreGate>
        <span />
      </StoreGate>
    );
  if (store.status === "loading")
    return <p role="status">약국 이용 권한을 확인하고 있습니다…</p>;
  if (!allowed || !target || !id)
    return (
      <p role="alert">
        이 약국의 자료를 열 수 없습니다. 내 매장 이용 권한을 확인해 주세요.
      </p>
    );
  if (store.status !== "ready" || store.organizationId !== target)
    return <p role="status">선택한 약국으로 이동하고 있습니다…</p>;
  return (
    <Navigate
      replace
      to={`/store/library/production-materials/${encodeURIComponent(id)}/edit`}
    />
  );
}
