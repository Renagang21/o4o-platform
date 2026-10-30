import { useMemo } from 'react';
import { authClient } from '@o4o/auth-client';
import { HomePresentationEditor, type GuideClient } from '@o4o/shared-space-ui';
import type { HomeSurface } from '@o4o/types';
import { ServiceLegalSettingsPage, type ServiceLegalApi } from '@o4o/operator-core-ui/modules/service-legal';
import { ServiceContactSettingsPage, type ContactSettingsApi } from '@o4o/operator-core-ui/modules/service-contact-settings';
import { ContactInquiryAdminPage, LegacyEducationRequestsPanel, type ContactInquiryApi } from '@o4o/operator-core-ui/modules/contact-inquiry';
import { GuideContentsConsolePage } from '@o4o/operator-core-ui/modules/guide-contents';

const http = authClient.api;
const servicePath = (service: string) => `/admin/services/${encodeURIComponent(service)}`;
const legal: ServiceLegalApi = {
  getLegalProfile: async service => (await http.get(`${servicePath(service)}/legal-profile`)).data.data ?? null,
  updateLegalProfile: async (service, input) => (await http.put(`${servicePath(service)}/legal-profile`, input)).data.data,
  listPolicies: async service => (await http.get(`${servicePath(service)}/policies`)).data.data,
  createPolicy: async (service, input) => (await http.post(`${servicePath(service)}/policies`, input)).data.data,
  updatePolicy: async (service, id, input) => (await http.put(`${servicePath(service)}/policies/${encodeURIComponent(id)}`, input)).data.data,
  publishPolicy: async (service, id, action) => (await http.patch(`${servicePath(service)}/policies/${encodeURIComponent(id)}/publish`, { action })).data.data,
  changePolicyLifecycle: async (service, id, action) => (await http.patch(`${servicePath(service)}/policies/${encodeURIComponent(id)}/lifecycle`, { action })).data.data,
};
const contactSettings: ContactSettingsApi = {
  getSettings: async service => (await http.get(`${servicePath(service)}/contact-settings`)).data.data,
  updateSettings: async (service, input) => (await http.put(`${servicePath(service)}/contact-settings`, input)).data.data,
};
const guide: GuideClient = {
  fetchGuidePageContent: async (serviceKey, pageKey) => (await http.get('/guide/contents', { params: { serviceKey, pageKey } })).data.data.sections,
  // This adapter always reads the server and therefore retains no page cache to invalidate.
  clearGuidePageCache: () => undefined,
  saveGuideContent: async (serviceKey, pageKey, sectionKey, content) => { await http.post('/guide/contents', { serviceKey, pageKey, sectionKey, content }); },
  deleteGuideContent: async (serviceKey, pageKey, sectionKey) => { await http.delete('/guide/contents', { params: { serviceKey, pageKey, sectionKey } }); },
};

export default function CentralSharedWork({ serviceKey, area }: { serviceKey: string; area: string }) {
  if (area === 'home') return <HomePresentationEditor surface={serviceKey as HomeSurface} client={http} heading="h2" />;
  if (area === 'legal') return <ServiceLegalSettingsPage serviceKey={serviceKey} api={legal} />;
  if (area === 'contact-settings') return <ServiceContactSettingsPage serviceKey={serviceKey} api={contactSettings} />;
  if (area === 'guides') return <GuideContentsConsolePage serviceKey={serviceKey} client={guide} />;
  if (area === 'contact') return <section className="central-service-work space-y-6"><CentralServiceContactInquiry serviceKey={serviceKey} />{serviceKey === 'lecture' && <LegacyEducationRequestsPanel client={http} />}</section>;
  return null;
}

export function CentralServiceContactInquiry({serviceKey}: {serviceKey: string}) {
  const contact = useMemo<ContactInquiryApi>(() => {
    const base = `${servicePath(serviceKey)}/contact-inquiries`;
    return {
      list: async (_service, params) => (await http.get(base, { params })).data.data,
      getDetail: async (_service, id) => (await http.get(`${base}/${encodeURIComponent(id)}`)).data.data,
      setStatus: async (_service, id, status) => (await http.patch(`${base}/${encodeURIComponent(id)}/status`, { status })).data.data,
      setNote: async (_service, id, internalNote) => (await http.patch(`${base}/${encodeURIComponent(id)}/note`, { internalNote })).data.data,
      getReplies: async (_service, id) => (await http.get(`${base}/${encodeURIComponent(id)}/replies`)).data.data,
      sendReply: async (_service, id, input) => (await http.post(`${base}/${encodeURIComponent(id)}/replies`, input)).data.data,
      retryNotifications: async (_service, id) => (await http.post(`${base}/${encodeURIComponent(id)}/retry-notifications`, {})).data.data,
    };
  }, [serviceKey]);
  return <ContactInquiryAdminPage serviceKey={serviceKey} api={contact} />;
}
