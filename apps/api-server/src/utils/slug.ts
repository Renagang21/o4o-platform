/**
 * Generate a URL-friendly slug from a string
 */
export function generateSlug(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[\s\W-]+/g, '-') // Replace spaces and non-word chars with -
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing dashes
}

/**
 * Generate a store slug from a name (한글 허용)
 * "강남약국" → "강남약국"
 * "ABC Pharmacy" → "abc-pharmacy"
 * "서울 강남 약국" → "서울-강남-약국"
 */
export function generateStoreSlug(name: string): string {
  return name
    .toString()
    .toLowerCase()
    .trim()
    .replace(/[^\w\u3131-\u318E\u3200-\u321E\uAC00-\uD7AF\s-]/g, '') // keep alphanumeric, Korean, spaces, hyphens
    .replace(/[\s]+/g, '-')  // spaces → hyphens
    .replace(/-+/g, '-')     // collapse multiple hyphens
    .replace(/^-+|-+$/g, '') // trim leading/trailing hyphens
    .slice(0, 120);          // max 120 chars
}

/**
 * Validate if a string is a valid slug
 */
export function isValidSlug(slug: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);
}

/**
 * Generate a unique slug by appending a number if needed
 */
export async function generateUniqueSlug(
  baseSlug: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  let slug = generateSlug(baseSlug);
  let counter = 1;

  while (await checkExists(slug)) {
    slug = `${generateSlug(baseSlug)}-${counter}`;
    counter++;
  }

  return slug;
}

/**
 * Generate a unique store slug with sequential -1/-2/-3 suffix (한글 보존)
 * WO-O4O-STOREFRONT-STABILIZATION-V1 Phase 4
 *
 * "강남약국" → "강남약국" (first) or "강남약국-1" (collision)
 */
export async function generateUniqueStoreSlug(
  name: string,
  checkExists: (slug: string) => Promise<boolean>
): Promise<string> {
  const baseSlug = generateStoreSlug(name);

  if (!(await checkExists(baseSlug))) {
    return baseSlug;
  }

  let counter = 1;
  while (counter <= 100) {
    const candidate = `${baseSlug}-${counter}`;
    if (!(await checkExists(candidate))) {
      return candidate;
    }
    counter++;
  }

  throw new Error(`Unable to generate unique slug for: ${name}`);
}