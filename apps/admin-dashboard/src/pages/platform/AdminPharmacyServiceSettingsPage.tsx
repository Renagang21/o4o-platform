import { AdminPharmacyServiceSettingsPage as Settings } from "@o4o/operator-core-ui/modules/pharmacy-management";
import AdminCooperativePanel from "./AdminCooperativePanel";
const federation = <AdminCooperativePanel />;
export default function AdminPharmacyServiceSettingsPage() {
  return <Settings federationPanel={federation} />;
}
