/**
 * DTO for Post Meta CRUD operations
 * Phase 4-1: Normalized post_meta table endpoints
 */

/**
 * DTO for upserting post metadata
 * Used in PUT /api/v1/posts/:id/meta
 */
export interface UpsertMetaDto {
  meta_key: string
  meta_value: unknown
}

/**
 * DTO for incrementing counter metadata
 * Used in PATCH /api/v1/posts/:id/meta/:key/increment
 */
export interface IncrementMetaDto {
  by?: number // Default: 1
}

/**
 * Response format for meta item
 */
export interface MetaItemResponse {
  id: string
  post_id: string
  meta_key: string
  meta_value: unknown
  created_at: Date
  updated_at: Date
}

/**
 * Validation helper for meta_key
 * Pattern: alphanumeric, underscore, colon, hyphen (1-255 chars)
 */
export function validateMetaKey(key: string): boolean {
  const pattern = /^[a-zA-Z0-9_:-]{1,255}$/
  return pattern.test(key)
}

/**
 * Validation error for invalid meta_key
 */
export class InvalidMetaKeyError extends Error {
  constructor(key: string) {
    super(`Invalid meta_key: "${key}". Must match pattern: ^[a-zA-Z0-9_:-]{1,255}$`)
    this.name = 'InvalidMetaKeyError'
  }
}
