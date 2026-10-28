import { CommunityManagementWorkspace } from "@o4o/operator-core-ui";
import { api } from "../../lib/apiClient";
export default function CommunityManagementPage({
  kind,
  permanent = false,
}: Readonly<{ kind: "boards" | "members"; permanent?: boolean }>) {
  return (
    <CommunityManagementWorkspace api={api} kind={kind} permanent={permanent} />
  );
}
