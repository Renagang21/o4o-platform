import {api} from '../apiClient';
import {createNetureCommunityApi} from '@o4o/operator-core-ui/modules/neture-service-operations';
export * from '@o4o/operator-core-ui/modules/neture-service-operations/community-api';
export const {communityManageApi}=createNetureCommunityApi(api);
