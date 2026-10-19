/** Business-scoped operator roles. Account membership remains the canonical Neture membership. */
export const PHARMACY_COLLABORATORS = {
  pharmacy: { label: '약국 협력사업', domain: 'pharmacy.neture.co.kr' },
  carepharm: { label: 'CarePharm · 만성질환관리', domain: 'carepharm.neture.co.kr' },
  megapharm: { label: 'MegaPharm · 창고형약국', domain: 'megapharm.neture.co.kr' },
  pharmcoop: { label: '약국·약사 협동조합', domain: 'pharmcoop.neture.co.kr' },
} as const;
export type PharmacyCollaboratorKey = keyof typeof PHARMACY_COLLABORATORS;
export function pharmacyCollaboratorRoles(key: string): string[] {
  if (!Object.prototype.hasOwnProperty.call(PHARMACY_COLLABORATORS, key)) return [];
  return [`neture:${key}_admin`, `neture:${key}_operator`];
}
export const PHARMACY_COLLABORATOR_ROLES = Object.keys(PHARMACY_COLLABORATORS)
  .flatMap(key => pharmacyCollaboratorRoles(key as PharmacyCollaboratorKey));
export function parsePharmacyCollaboratorRole(role: string): { businessKey: PharmacyCollaboratorKey; level: 'admin' | 'operator' } | null {
  const match = /^neture:(pharmacy|carepharm|megapharm|pharmcoop)_(admin|operator)$/.exec(role);
  return match ? { businessKey: match[1] as PharmacyCollaboratorKey, level: match[2] as 'admin' | 'operator' } : null;
}
