/**
 * Location Rule Evaluation Utilities
 * Functions for evaluating location rules to determine field group visibility
 */

import type { FieldLocation } from '../types/acf.types';

/**
 * Evaluation context - information about the current page/post/user
 */
export interface LocationContext {
  // Post/Page context
  postType?: string;
  postId?: string;
  postStatus?: string;
  postFormat?: string;
  postTemplate?: string;
  categories?: string[];
  taxonomies?: Record<string, string[]>; // taxonomy => term IDs

  // Page specific
  pageType?: 'front_page' | 'posts_page' | 'top_level' | 'parent' | 'child';
  pageTemplate?: string;
  pageParent?: string;

  // User context
  userRole?: string;
  userRoles?: string[];
  userId?: string;
}

/**
 * Evaluate a single location rule
 * @param rule - The location rule to evaluate
 * @param context - The current context (page, post, user, etc.)
 * @returns true if the rule matches, false otherwise
 */
export function evaluateLocationRule(
  rule: FieldLocation,
  context: LocationContext
): boolean {
  const { param, operator, value } = rule;

  // Get the actual value from context based on param
  let actualValue: any;

  switch (param) {
    case 'post_type':
      actualValue = context.postType;
      break;

    case 'user_role':
    case 'current_user_role':
      // Check if user has the specified role
      actualValue = context.userRole;
      // Also check in userRoles array if available
      if (!actualValue && context.userRoles) {
        actualValue = context.userRoles.includes(value) ? value : null;
      }
      break;

    case 'post_taxonomy':
      // Check if post has any terms in the specified taxonomy
      actualValue = context.taxonomies?.[value];
      break;

    case 'post_category':
      actualValue = context.categories;
      break;

    case 'page_template':
      actualValue = context.pageTemplate;
      break;

    case 'post_template':
      actualValue = context.postTemplate;
      break;

    case 'post_status':
      actualValue = context.postStatus;
      break;

    case 'post_format':
      actualValue = context.postFormat;
      break;

    case 'page_type':
      actualValue = context.pageType;
      break;

    case 'page_parent':
      actualValue = context.pageParent;
      break;

    case 'current_user':
      actualValue = context.userId;
      break;

    default:
      // Unknown parameter
      return false;
  }

  // Evaluate based on operator
  return evaluateOperator(actualValue, operator, value);
}

/**
 * Evaluate an operator comparison
 * @param actualValue - The actual value from context
 * @param operator - The comparison operator
 * @param ruleValue - The expected value from the rule
 * @returns true if the comparison passes
 */
function evaluateOperator(
  actualValue: any,
  operator: FieldLocation['operator'],
  ruleValue: string
): boolean {
  // Handle array values (like categories, roles)
  if (Array.isArray(actualValue)) {
    switch (operator) {
      case '==':
        return actualValue.includes(ruleValue);
      case '!=':
        return !actualValue.includes(ruleValue);
      case 'contains':
        return actualValue.some(v => String(v).includes(ruleValue));
      case 'not_contains':
        return !actualValue.some(v => String(v).includes(ruleValue));
      default:
        return false;
    }
  }

  // Normalize values for comparison
  const normalizedActual = String(actualValue || '').toLowerCase();
  const normalizedRule = String(ruleValue || '').toLowerCase();

  switch (operator) {
    case '==':
      return normalizedActual === normalizedRule;

    case '!=':
      return normalizedActual !== normalizedRule;

    case 'contains':
      return normalizedActual.includes(normalizedRule);

    case 'not_contains':
      return !normalizedActual.includes(normalizedRule);

    default:
      return false;
  }
}

/**
 * Evaluate a group of location rules with AND logic
 * All rules in the group must match
 * @param rules - Array of location rules (AND logic)
 * @param context - The current context
 * @returns true if all rules match
 */
export function evaluateLocationRuleGroup(
  rules: FieldLocation[],
  context: LocationContext
): boolean {
  // Empty group = no match
  if (rules.length === 0) {
    return false;
  }

  // All rules must match (AND logic)
  return rules.every(rule => {
    // Skip empty rules
    if (!rule.param || !rule.value) {
      return true;
    }

    return evaluateLocationRule(rule, context);
  });
}

/**
 * Evaluate multiple location rule groups with OR logic
 * At least one group must match
 * @param ruleGroups - Array of rule groups (OR logic between groups)
 * @param context - The current context
 * @returns true if at least one group matches
 */
export function evaluateLocationRules(
  ruleGroups: FieldLocation[][],
  context: LocationContext
): boolean {
  // No rules = no match
  if (!ruleGroups || ruleGroups.length === 0) {
    return false;
  }

  // At least one group must match (OR logic)
  return ruleGroups.some(group => evaluateLocationRuleGroup(group, context));
}

/**
 * Build location context from current environment
 * This would typically be called with data from the current page/post
 * @returns LocationContext
 */
export function buildLocationContext(data?: {
  postType?: string;
  postId?: string;
  userRole?: string;
  userRoles?: string[];
  userId?: string;
  [key: string]: any;
}): LocationContext {
  return {
    postType: data?.postType,
    postId: data?.postId,
    postStatus: data?.postStatus,
    postFormat: data?.postFormat,
    postTemplate: data?.postTemplate,
    categories: data?.categories,
    taxonomies: data?.taxonomies,
    pageType: data?.pageType,
    pageTemplate: data?.pageTemplate,
    pageParent: data?.pageParent,
    userRole: data?.userRole,
    userRoles: data?.userRoles,
    userId: data?.userId,
  };
}

/**
 * Check if a field group should be shown based on location rules
 * @param location - Field group location rules
 * @param context - Current context
 * @returns true if field group should be shown
 */
export function shouldShowFieldGroup(
  location: FieldLocation[][] | undefined,
  context: LocationContext
): boolean {
  if (!location || location.length === 0) {
    // No location rules = don't show by default
    return false;
  }

  return evaluateLocationRules(location, context);
}

export default {
  evaluateLocationRule,
  evaluateLocationRuleGroup,
  evaluateLocationRules,
  buildLocationContext,
  shouldShowFieldGroup,
};
