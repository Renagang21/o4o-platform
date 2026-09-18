import { PolicyDocumentViewer, type PolicyDocumentDto } from '@o4o/shared-space-ui';
import { api } from '../../lib/apiClient';
import { SERVICE_KEY } from '../../config/service';

export async function loadPolicy(serviceKey: string, documentType: string): Promise<PolicyDocumentDto | null> {
  try {
    const res = await api.get(`/public/services/${serviceKey}/policies/${documentType}`);
    return res.data?.data ?? null;
  } catch (err: any) {
    if (err?.response?.status === 404) return null;
    throw err;
  }
}
export function TermsPage() {
  return <PolicyDocumentViewer serviceKey={SERVICE_KEY} documentType="terms" heading="이용약관" loadPolicy={loadPolicy} />;
}
export function PrivacyPage() {
  return <PolicyDocumentViewer serviceKey={SERVICE_KEY} documentType="privacy" heading="개인정보처리방침" loadPolicy={loadPolicy} />;
}
