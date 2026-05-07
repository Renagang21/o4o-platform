/**
 * WO-O4O-GUIDE-CLIENT-EXTRACTION-V1: thin wrapper.
 *
 * 실제 UI 는 @o4o/shared-space-ui 의 GuideEditableSection 이 담당.
 * KPA 측에서는 (1) serviceKey, (2) client, (3) canEdit 을 주입한다.
 *
 * WO-O4O-GUIDE-INLINE-EDIT-KPA-MEMBERSHIP-ROLE-FIX-V1:
 *   KPA 운영자 권한은 두 채널로 보관된다.
 *     - user.roles[]            : platform-level 역할 (예: kpa:operator)
 *     - user.membershipRole     : service-level 역할 (kpa_members.role: member|operator|admin)
 *   분회/지부 단위 운영자는 user.roles[]에 등장하지 않으므로(role-constants.ts 주석 참조)
 *   canEdit 판정은 두 채널을 모두 본다.
 */

import {
  GuideEditableSection as Base,
  isOperatorOrAbove,
} from '@o4o/shared-space-ui';
import { useAuth } from '../../contexts/AuthContext';
import { guideClient } from '../../api/guideContent';

const SERVICE_KEY = 'kpa-society';

interface Props {
  pageKey: string;
  sectionKey: string;
  defaultContent: string;
}

export function GuideEditableSection({ pageKey, sectionKey, defaultContent }: Props) {
  const { user } = useAuth();
  const canEdit =
    isOperatorOrAbove(user?.roles) ||
    user?.membershipRole === 'operator' ||
    user?.membershipRole === 'admin';
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
