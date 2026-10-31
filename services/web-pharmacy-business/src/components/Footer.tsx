import { BUSINESS_SITE } from '../config/businessSite';
/** Shared footer chrome; links and business legal profiles keep their existing owners. */

import { PublicLegalFooterInfo } from '@o4o/shared-space-ui';
import { ServiceFooter } from '@o4o/auth-react';
import { Link } from 'react-router-dom';
import { KPA_FOOTER_SECTIONS } from '../config/navigation';
import { loadFooterLegal } from '../lib/footerLegal';

export function Footer() {
  return (
    <ServiceFooter
      brand={BUSINESS_SITE.name}
      copyright={`© ${new Date().getFullYear()} Neture · ${BUSINESS_SITE.name}`}
      links={KPA_FOOTER_SECTIONS.flatMap(section => section.links).map(link => <Link key={link.href} to={link.href}>{link.label}</Link>)}
    >
      <PublicLegalFooterInfo serviceKey={BUSINESS_SITE.key} loadProfile={loadFooterLegal} />
    </ServiceFooter>
  );
}

export default Footer;
