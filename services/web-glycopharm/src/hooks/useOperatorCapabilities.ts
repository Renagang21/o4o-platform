import { OperatorCapability } from '@o4o/types';
import { ENABLED_CAPABILITIES } from '../config/operatorCapabilities';

export function useOperatorCapabilities() {
  function hasCapability(cap: OperatorCapability): boolean {
    return ENABLED_CAPABILITIES.includes(cap);
  }
  return { capabilities: ENABLED_CAPABILITIES, hasCapability };
}
