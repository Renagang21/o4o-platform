import { useAuth } from "@o4o/auth-context";
import { useSearchParams } from "react-router-dom";
import CentralMemberWorkspace from "@/pages/operators/CentralMemberWorkspace";
import type { MemberTask } from "@/pages/operators/member-workspace-model";
/** Native Admin entry; delegated Operator never receives the destructive mode. */
export default function PlatformUsersPage({ initialTask }: Readonly<{ initialTask?: MemberTask }> = {}) {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const id = params.get("userId") ?? "";
  const query = /^[0-9a-f-]{36}$/i.test(id) ? id : "";
  const workspace = (
    <CentralMemberWorkspace
      key={`${user?.id}:${(Array.isArray(user?.roles)?user.roles:[]).join(':')}:${query}`}
      actorId={String(user?.id ?? "")}
      initialQuery={query}
      initialTask={initialTask}
      adminMode
    />
  );
  if (initialTask !== "inactive") return workspace;
  return (
    <div className="space-y-3">
      <p className="text-sm text-slate-600">
        이용이 해지된 회원을 먼저 보여 줍니다. 해지되지 않은 회원도 &apos;전체 회원&apos; 탭에서 바로 삭제할 수 있습니다.
      </p>
      {workspace}
    </div>
  );
}
