import { api } from '../apiClient';
import { configurePharmacyManagementClient } from '@o4o/operator-core-ui/modules/pharmacy-management';
configurePharmacyManagementClient(api);
export * from '@o4o/operator-core-ui/modules/pharmacy-management';
