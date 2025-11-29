/**
 * Semantic Versioning Utilities
 *
 * Simple semver comparison utilities for version management.
 * Follows major.minor.patch format.
 */

/**
 * Compare two semantic version strings
 * @param a First version string (e.g., "1.0.0")
 * @param b Second version string (e.g., "1.1.0")
 * @returns 1 if a > b, -1 if a < b, 0 if equal
 */
export function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map((n) => parseInt(n, 10));
  const pb = b.split('.').map((n) => parseInt(n, 10));

  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na > nb) return 1;
    if (na < nb) return -1;
  }
  return 0;
}

/**
 * Check if next version is newer than current version
 * @param current Current version (e.g., "1.0.0")
 * @param next Next version to compare (e.g., "1.1.0")
 * @returns true if next > current
 */
export function isNewerVersion(current: string, next: string): boolean {
  return compareSemver(next, current) > 0;
}
