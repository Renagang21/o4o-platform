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
    <OperatorInbox
      client={client}
      endpoint={`/operator-inbox/service/${serviceKey}`}
    />
  );
}
