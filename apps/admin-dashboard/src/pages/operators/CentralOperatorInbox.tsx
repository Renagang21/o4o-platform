import { useSearchParams } from 'react-router-dom';
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
  const [params, setParams] = useSearchParams();
  const contacts = [
    ['neture', 'O4O 문의'], ['store', '내 매장 도구 문의'], ['hospital', '원내 약품 파일 도구 문의'],
    ['kpa-society', '약국 서비스 안내 문의'], ['kpa-branch', '분회 서비스 안내 문의'],
  ] as const;
  const requested = params.get('contactService');
  const contactKey = contacts.some(([key]) => key === requested) ? requested! : 'neture';
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
  return <section className="space-y-6">
    <p className="rounded border bg-blue-50 p-3 text-sm text-slate-700">새 문의를 확인하고 답변·상태 처리할 수 있습니다. 알림 읽음은 문의 처리 완료와 다릅니다.</p>
    {serviceKey === 'neture' && <nav aria-label="문의 대상" className="flex flex-wrap gap-2">
      {contacts.map(([key, label]) => <button key={key} type="button" aria-pressed={contactKey === key}
        className={`rounded border px-3 py-2 text-sm ${contactKey === key ? 'bg-blue-700 text-white' : 'bg-white'}`}
        onClick={() => setParams(previous => { const next = new URLSearchParams(previous); next.set('contactService', key); return next; })}>{label}</button>)}
    </nav>}
    {serviceKey === 'neture' && contactKey !== 'neture'
      ? <CentralServiceContactInquiry key={contactKey} serviceKey={contactKey} />
      : <OperatorInbox client={client} endpoint={`/operator-inbox/service/${serviceKey}`} />}
  </section>;
}
