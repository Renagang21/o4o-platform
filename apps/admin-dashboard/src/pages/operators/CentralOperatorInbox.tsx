import { CentralServiceContactInquiry } from './CentralSharedWork';
import { useMemo } from "react";
import { OperatorInbox, type InboxClient } from "@o4o/operator-core-ui";
import { authClient } from "@o4o/auth-client";
import { centralTaskHref } from "./central-operation-navigation";
export default function CentralOperatorInbox({
  serviceKey,
}: {
  serviceKey: string;
}) {
  const client = useMemo<InboxClient>(
    () => ({
      get: async (path: string) => {
        const r = await authClient.api.get(path);
        if (!path.endsWith("/manage") || !Array.isArray(r.data?.data?.tasks))
          return r;
        return {
          ...r,
          data: {
            ...r.data,
            data: {
              ...r.data.data,
              tasks: r.data.data.tasks.map((task: { href: string }) => ({
                ...task,
                href: centralTaskHref(serviceKey, task.href),
              })),
            },
          },
        };
      },
      post: (path, body) => authClient.api.post(path, body),
      patch: (path, body) => authClient.api.patch(path, body),
    }),
    [serviceKey],
  );
  return (
    <section className="space-y-6"><OperatorInbox
      client={client}
      endpoint={`/operator-inbox/service/${serviceKey}`}
    />{serviceKey === "neture" && <><details className="rounded border bg-white p-4"><summary className="cursor-pointer font-semibold">내 매장 도구 문의</summary><CentralServiceContactInquiry serviceKey="store" /></details><details className="rounded border bg-white p-4"><summary className="cursor-pointer font-semibold">원내 약품 파일 도구 문의</summary><CentralServiceContactInquiry serviceKey="hospital" /></details></>}</section>
  );
}
