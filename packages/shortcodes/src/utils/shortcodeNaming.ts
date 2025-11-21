/**
 * Shortcode Naming Utilities
 * Standardizes conversion between PascalCase and snake_case
 *
 * Naming Convention:
 * - File name: PascalCase + "Shortcode" suffix (e.g., SellerApplicationShortcode.tsx)
 * - Shortcode name: snake_case without suffix (e.g., seller_application)
 */

/**
 * Convert PascalCase to snake_case
 * Example: "SellerApplicationShortcode" → "seller_application"
 *
 * Handles special cases:
 * - Removes "Shortcode" suffix
 * - OAuth → oauth (consecutive capitals)
 * - AI → ai (consecutive capitals)
 */
export function toShortcodeName(pascalCase: string): string {
  // Remove "Shortcode" suffix if present
  const withoutSuffix = pascalCase.replace(/Shortcode$/, '');

  // Handle consecutive capitals (OAuth → oauth, AI → ai)
  // Insert underscore before capitals, but merge consecutive capitals
  const result = withoutSuffix
    // Insert underscore before capital letters that follow lowercase
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    // Insert underscore before capital letters that follow numbers
    .replace(/([0-9])([A-Z])/g, '$1_$2')
    // Handle consecutive capitals (keep them together)
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
    // Convert to lowercase
    .toLowerCase()
    // Remove leading underscore if any
    .replace(/^_/, '');

  return result;
}

/**
 * Convert snake_case to PascalCase
 * Example: "seller_application" → "SellerApplicationShortcode"
 */
export function fromShortcodeName(snakeCase: string): string {
  const pascalCase = snakeCase
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');

  return pascalCase + 'Shortcode';
}

/**
 * Extract shortcode name from file path
 * Example:
 * - "SellerDashboard.tsx" → "seller_dashboard"
 * - "SocialLoginShortcode.tsx" → "social_login"
 */
export function fileNameToShortcodeName(fileName: string): string {
  // Remove file extension
  const baseName = fileName.replace(/\.tsx?$/, '');

  // Convert to snake_case
  return toShortcodeName(baseName);
}

/**
 * Validate shortcode name format (must be snake_case)
 */
export function isValidShortcodeName(name: string): boolean {
  // Must be lowercase with underscores, no leading/trailing underscores
  return /^[a-z][a-z0-9]*(_[a-z0-9]+)*$/.test(name);
}

/**
 * Test cases for validation
 */
export const testCases = [
  { input: 'SellerApplicationShortcode', expected: 'seller_application' },
  { input: 'SellerApplication', expected: 'seller_application' },
  { input: 'SocialLogin', expected: 'social_login' },
  { input: 'OAuthLogin', expected: 'oauth_login' },
  { input: 'AIAssistant', expected: 'ai_assistant' },
  { input: 'ProductGrid', expected: 'product_grid' },
  { input: 'Cart', expected: 'cart' },
];

/**
 * Run self-tests
 */
export function runNamingTests(): boolean {
  let allPassed = true;

  for (const { input, expected } of testCases) {
    const result = toShortcodeName(input);
    if (result !== expected) {
      console.error(`❌ Test failed: ${input} → ${result} (expected: ${expected})`);
      allPassed = false;
    } else {
      console.log(`✅ Test passed: ${input} → ${result}`);
    }
  }

  return allPassed;
}
