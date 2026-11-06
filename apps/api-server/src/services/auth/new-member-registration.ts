import { MEMBER_REGISTRATION_KEY } from '@o4o/types';
import type { BusinessInfo } from '../../types/user.js';
/** Initial signup only. Existing logins, linked identities and old users are untouched. */
export function initialMemberRegistration(): BusinessInfo {
  return {
    [MEMBER_REGISTRATION_KEY]: { type: null, state: 'pending', fields: {} },
  };
}
