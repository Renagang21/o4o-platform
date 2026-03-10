export function hasRole(userRoles: string[], role: string): boolean {
  return userRoles.includes(role);
}

export function hasAnyRole(userRoles: string[], roles: readonly string[]): boolean {
  return roles.some(r => userRoles.includes(r));
}
