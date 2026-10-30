export interface Cooperative {
  /** Explicit backend business binding, never inferred from the display slug or personal membership. */
  businessKey?: string;
  policyScope?: string;
  id: string;
  slug: string;
  name: string;
  introduction: string;
  eligibilityDescription: string;
}
