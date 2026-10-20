import Settings from '@o4o/operator-core-ui/modules/pharmacy-management/AdminPharmacyServiceSettingsPage';
import { PlatformRoute } from '../../components/auth/RoleGuard';

export default function AdminPharmacyServiceSettingsPage() {
  return <PlatformRoute><Settings /></PlatformRoute>;
}
