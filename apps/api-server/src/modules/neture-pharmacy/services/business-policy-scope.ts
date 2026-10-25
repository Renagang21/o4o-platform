/** Existing policy columns are 50 characters; a stable business UUID fits without a schema change. */
const SCOPE =
  /^business:([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})$/i;
export function isBusinessPolicyScope(scope: string): boolean {
  return SCOPE.test(scope);
}
export function businessPolicyScope(id: string): string {
  const scope = `business:${id}`;
  if (!isBusinessPolicyScope(scope))
    throw new Error("Invalid business policy scope");
  return scope;
}
