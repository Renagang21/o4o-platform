import { AiOverviewPanel, type AiOverviewData } from '@o4o/ai-components';
import { apiClient } from '../../api/client';
import { useUnifiedStore } from '../../contexts/StoreContext';
import { storeAiError } from '../../api/storeAi';

export function StoreOverviewExplanation() {
  const { organizationId } = useUnifiedStore();
  return <AiOverviewPanel scopeKey={organizationId ?? ''} disabled={!organizationId} errorMessage={storeAiError} load={async () => {
    const response = await apiClient.post<{ success: boolean; data: AiOverviewData & { organizationId: string } }>('/store-hub/ai-overview', {});
    if (response.success !== true || response.data?.organizationId !== organizationId) throw new Error('AI_RESPONSE_UNAVAILABLE');
    return response.data;
  }} />;
}
