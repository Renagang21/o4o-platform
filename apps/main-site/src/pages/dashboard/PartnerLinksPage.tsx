/**
 * Partner Links Page
 * Full-page view for affiliate link management
 */

import React from 'react';
import Breadcrumb from '../../components/common/Breadcrumb';
import { PartnerLinksSection } from '../../components/dashboard/partner/PartnerLinksSection';

export const PartnerLinksPage: React.FC = () => {
  return (
    <>
      <Breadcrumb
        items={[
          { label: '파트너 대시보드', href: '/dashboard/partner' },
          { label: '링크 관리', isCurrent: true },
        ]}
      />

      <PartnerLinksSection mode="full-page" />
    </>
  );
};

export default PartnerLinksPage;
