import { useLayoutEffect, useState } from "react";
import {
  configurePharmacyManagementClient,
  OperatorSemiFranchisePage,
  SemiFranchiseContentFormPage,
  type PharmacyManagementClient,
} from "@o4o/operator-core-ui/modules/pharmacy-management";

/** Host supplies authenticated transport and an explicit cooperative → business key binding. */
export default function CooperativeBusinessOperator({
  businessKey,
  slug,
  client,
  editor = false,
}: {
  businessKey: string;
  slug: string;
  client: PharmacyManagementClient;
  editor?: boolean;
}) {
  const [configured, setConfigured] = useState<PharmacyManagementClient | null>(
    null,
  );
  useLayoutEffect(() => {
    configurePharmacyManagementClient(client);
    setConfigured(client);
  }, [client]);
  if (configured !== client) return <p>업무 연결을 확인하고 있습니다…</p>;
  const base = `/${encodeURIComponent(slug)}/operator`;
  return editor ? (
    <SemiFranchiseContentFormPage
      businessKey={businessKey}
      returnPath={`${base}?tab=contents`}
    />
  ) : (
    <OperatorSemiFranchisePage
      businessKey={businessKey}
      tabs={["proposals", "contents", "content-submissions"]}
      contentEditHref={(_key, id) =>
        id
          ? `${base}/contents/${encodeURIComponent(id)}/edit`
          : `${base}/contents/new`
      }
    />
  );
}
