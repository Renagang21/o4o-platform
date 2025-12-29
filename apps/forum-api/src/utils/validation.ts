/**
 * Validation Utilities
 * =============================================================================
 * Input validation for Forum API endpoints.
 *
 * Alpha Level Validation:
 * - Required field checking
 * - Length constraints
 * - Format validation
 * =============================================================================
 */

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// THREAD VALIDATION
// =============================================================================

export const THREAD_LIMITS = {
  TITLE_MIN: 2,
  TITLE_MAX: 200,
  CONTENT_MIN: 10,
  CONTENT_MAX: 50000,
  CATEGORY_MAX: 50,
};

export function validateCreateThread(data: {
  title?: string;
  content?: string;
  category?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  // Title validation
  if (!data.title || data.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: '제목을 입력해주세요.',
      code: 'TITLE_REQUIRED',
    });
  } else {
    const titleLength = data.title.trim().length;
    if (titleLength < THREAD_LIMITS.TITLE_MIN) {
      errors.push({
        field: 'title',
        message: `제목은 최소 ${THREAD_LIMITS.TITLE_MIN}자 이상이어야 합니다.`,
        code: 'TITLE_TOO_SHORT',
      });
    }
    if (titleLength > THREAD_LIMITS.TITLE_MAX) {
      errors.push({
        field: 'title',
        message: `제목은 ${THREAD_LIMITS.TITLE_MAX}자를 초과할 수 없습니다.`,
        code: 'TITLE_TOO_LONG',
      });
    }
  }

  // Content validation
  if (!data.content || data.content.trim().length === 0) {
    errors.push({
      field: 'content',
      message: '내용을 입력해주세요.',
      code: 'CONTENT_REQUIRED',
    });
  } else {
    const contentLength = data.content.trim().length;
    if (contentLength < THREAD_LIMITS.CONTENT_MIN) {
      errors.push({
        field: 'content',
        message: `내용은 최소 ${THREAD_LIMITS.CONTENT_MIN}자 이상이어야 합니다.`,
        code: 'CONTENT_TOO_SHORT',
      });
    }
    if (contentLength > THREAD_LIMITS.CONTENT_MAX) {
      errors.push({
        field: 'content',
        message: `내용은 ${THREAD_LIMITS.CONTENT_MAX}자를 초과할 수 없습니다.`,
        code: 'CONTENT_TOO_LONG',
      });
    }
  }

  // Category validation (optional but if provided, check length)
  if (data.category && data.category.length > THREAD_LIMITS.CATEGORY_MAX) {
    errors.push({
      field: 'category',
      message: `카테고리는 ${THREAD_LIMITS.CATEGORY_MAX}자를 초과할 수 없습니다.`,
      code: 'CATEGORY_TOO_LONG',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// REPLY VALIDATION
// =============================================================================

export const REPLY_LIMITS = {
  CONTENT_MIN: 2,
  CONTENT_MAX: 10000,
};

export function validateCreateReply(data: {
  content?: string;
}): ValidationResult {
  const errors: ValidationError[] = [];

  if (!data.content || data.content.trim().length === 0) {
    errors.push({
      field: 'content',
      message: '내용을 입력해주세요.',
      code: 'CONTENT_REQUIRED',
    });
  } else {
    const contentLength = data.content.trim().length;
    if (contentLength < REPLY_LIMITS.CONTENT_MIN) {
      errors.push({
        field: 'content',
        message: `내용은 최소 ${REPLY_LIMITS.CONTENT_MIN}자 이상이어야 합니다.`,
        code: 'CONTENT_TOO_SHORT',
      });
    }
    if (contentLength > REPLY_LIMITS.CONTENT_MAX) {
      errors.push({
        field: 'content',
        message: `내용은 ${REPLY_LIMITS.CONTENT_MAX}자를 초과할 수 없습니다.`,
        code: 'CONTENT_TOO_LONG',
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

// =============================================================================
// PAGINATION VALIDATION
// =============================================================================

export const PAGINATION_LIMITS = {
  PAGE_MIN: 1,
  LIMIT_MIN: 1,
  LIMIT_MAX: 100,
  LIMIT_DEFAULT: 20,
};

export function validatePagination(query: {
  page?: string;
  limit?: string;
}): { page: number; limit: number } {
  let page = parseInt(query.page || '1', 10);
  let limit = parseInt(query.limit || String(PAGINATION_LIMITS.LIMIT_DEFAULT), 10);

  // Ensure page is at least 1
  if (isNaN(page) || page < PAGINATION_LIMITS.PAGE_MIN) {
    page = PAGINATION_LIMITS.PAGE_MIN;
  }

  // Ensure limit is within bounds
  if (isNaN(limit) || limit < PAGINATION_LIMITS.LIMIT_MIN) {
    limit = PAGINATION_LIMITS.LIMIT_DEFAULT;
  }
  if (limit > PAGINATION_LIMITS.LIMIT_MAX) {
    limit = PAGINATION_LIMITS.LIMIT_MAX;
  }

  return { page, limit };
}
