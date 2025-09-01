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