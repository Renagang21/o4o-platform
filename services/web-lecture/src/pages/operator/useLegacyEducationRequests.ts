import { useLegacyEducationRequests as useSharedRequests } from '@o4o/operator-core-ui/modules/contact-inquiry';
import { api } from '../../lib/apiClient';
export function useLegacyEducationRequests() { return useSharedRequests(api); }
