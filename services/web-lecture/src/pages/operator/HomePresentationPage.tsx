import { HomePresentationEditor } from "@o4o/shared-space-ui";
import { authClient } from "../../lib/apiClient";
export default function HomePresentationPage() {
  return <HomePresentationEditor surface="lecture" client={authClient.api} />;
}
