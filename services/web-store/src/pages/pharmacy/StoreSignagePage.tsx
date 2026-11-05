import { useStoreOperationScope } from "../../hooks/useStoreOperationScope";
import { useSignageWorkspace } from "./useSignageWorkspace";
import { SignageWorkspaceFrame } from "./signage/SignageWorkspaceFrame";

export function StoreSignagePage() {
  const scope = useStoreOperationScope();
  return <SignageSession key={scope.key} isCurrent={scope.isCurrent} />;
}
function SignageSession({ isCurrent }: Readonly<{ isCurrent: () => boolean }>) {
  const state = useSignageWorkspace({ isCurrent });
  return <SignageWorkspaceFrame state={state} />;
}
