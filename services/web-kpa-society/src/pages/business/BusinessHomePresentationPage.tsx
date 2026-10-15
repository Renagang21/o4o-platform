import { HomePresentationEditor } from "@o4o/shared-space-ui";
import { useAuth, authClient } from "../../contexts/AuthContext";
import { useBusiness } from "./BusinessWorkspace";
export default function BusinessHomePresentationPage() {
  const { business, access } = useBusiness();
  const { user } = useAuth();
  if (!user || !access?.canManage)
    return <p role="alert">담당 사업의 운영 권한이 필요합니다.</p>;
  return (
    <HomePresentationEditor
      key={business.key}
      surface="pharmacy"
      businessKey={business.key}
      client={authClient.api}
    />
  );
}
