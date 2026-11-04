import { useAuth } from "@o4o/auth-context";
import { useSearchParams } from "react-router-dom";
import CentralMemberWorkspace from "@/pages/operators/CentralMemberWorkspace";
/** Native Admin entry; delegated Operator never receives the destructive mode. */
export default function PlatformUsersPage() {
  const { user } = useAuth();
  const [params] = useSearchParams();
  const id = params.get("userId") ?? "";
  const query = /^[0-9a-f-]{36}$/i.test(id) ? id : "";
  return (
    <CentralMemberWorkspace
      key={`${user?.id}:${(Array.isArray(user?.roles)?user.roles:[]).join(':')}:${query}`}
      actorId={String(user?.id ?? "")}
      initialQuery={query}
      adminMode
    />
  );
}
