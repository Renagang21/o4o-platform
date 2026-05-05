/**
 * WO-O4O-GUIDE-CLIENT-EXTRACTION-V1: thin wrapper.
 */

import {
  GuideEditableSection as Base,
  isOperatorOrAbove,
} from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import { guideClient } from '../../api/guideContent';

const SERVICE_KEY = 'k-cosmetics';

interface Props {
  pageKey: string;
  sectionKey: string;
  defaultContent: string;
}

export function GuideEditableSection({ pageKey, sectionKey, defaultContent }: Props) {
  const { user } = useAuth();
  const canEdit = isOperatorOrAbove(user?.roles);
  return (
    <Base
      serviceKey={SERVICE_KEY}
      pageKey={pageKey}
      sectionKey={sectionKey}
      defaultContent={defaultContent}
      canEdit={canEdit}
      client={guideClient}
    />
  );
}
