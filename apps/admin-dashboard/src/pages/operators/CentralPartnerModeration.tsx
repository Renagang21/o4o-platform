import { useRef, useState } from "react";
import { authClient } from "@o4o/auth-client";
import {
  createPartnerCommunityApi,
  PartnerCommunityOperator,
} from "@o4o/operator-core-ui";
const api = createPartnerCommunityApi(
  async <T,>(path: string, method = "GET", body?: unknown): Promise<T> => {
    const response = await authClient.api.request({
      url: path.replace(/^\/api\/v1/, ""),
      method,
      data: body,
    });
    if (response.data?.success !== true)
      throw new Error("파트너 운영 요청을 처리하지 못했습니다.");
    return response.data.data as T;
  },
);
export default function CentralPartnerModeration({
  userId,
  admin = false,
}: {
  userId: string;
  admin?: boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const lock = useRef(false);
  const run = async (work: () => Promise<void>) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await work();
    } catch {
      setError("처리하지 못했습니다. 최신 상태를 다시 확인해 주세요.");
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="central-partner-operations">
      {error && <p role="alert">{error}</p>}
      <PartnerCommunityOperator
        api={api}
        user={{ id: userId }}
        busy={busy}
        run={run}
        admin={admin}
      />
    </section>
  );
}
