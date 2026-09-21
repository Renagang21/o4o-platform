import { createFooterLegalLoader } from '@o4o/shared-space-ui';
import { api } from './apiClient';
export const loadFooterLegal = createFooterLegalLoader(async (path) => (await api.get(path)).data);
