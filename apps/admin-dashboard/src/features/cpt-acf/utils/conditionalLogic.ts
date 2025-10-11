/**
 * Conditional Logic Evaluation Engine
 * Evaluates conditional rules and determines field visibility
 */

import type {
  ConditionalRule,
  ConditionalLogic,
  ConditionalOperator,
} from '../types/acf.types';

/**
 * Evaluate a single conditional rule
 * @param rule - The rule to evaluate
 * @param fieldValue - The current value of the field being checked
 * @returns true if the rule passes, false otherwise
 */
export function evaluateRule(rule: ConditionalRule, fieldValue: any): boolean {
  const { operator, value: ruleValue } = rule;

  // Handle empty/!empty operators (don't need comparison value)
  if (operator === 'empty') {
    return (
      fieldValue === undefined ||
      fieldValue === null ||
      fieldValue === '' ||
      (Array.isArray(fieldValue) && fieldValue.length === 0)
    );
  }

  if (operator === '!empty') {
    return (
      fieldValue !== undefined &&
      fieldValue !== null &&
      fieldValue !== '' &&
      !(Array.isArray(fieldValue) && fieldValue.length === 0)
    );
  }

  // Convert values for comparison
  const normalizedFieldValue = normalizeValue(fieldValue);
  const normalizedRuleValue = normalizeValue(ruleValue);

  switch (operator) {
    case '==':
      return normalizedFieldValue === normalizedRuleValue;

    case '!=':
      return normalizedFieldValue !== normalizedRuleValue;

    case '>':
      return Number(normalizedFieldValue) > Number(normalizedRuleValue);

    case '<':
      return Number(normalizedFieldValue) < Number(normalizedRuleValue);

    case '>=':
      return Number(normalizedFieldValue) >= Number(normalizedRuleValue);

    case '<=':
      return Number(normalizedFieldValue) <= Number(normalizedRuleValue);

    case 'contains':
      return String(normalizedFieldValue)
        .toLowerCase()
        .includes(String(normalizedRuleValue).toLowerCase());

    case 'not_contains':
      return !String(normalizedFieldValue)
        .toLowerCase()
        .includes(String(normalizedRuleValue).toLowerCase());

    case 'pattern':
      try {
        const regex = new RegExp(String(normalizedRuleValue));
        return regex.test(String(normalizedFieldValue));
      } catch {
        return false;
      }

    case '!pattern':
      try {
        const regex = new RegExp(String(normalizedRuleValue));
        return !regex.test(String(normalizedFieldValue));
      } catch {
        return false;
      }

    default:
      return false;
  }
}

/**
 * Normalize value for comparison
 * Handles booleans, numbers, and strings consistently
 */
function normalizeValue(value: any): any {
  if (value === true || value === 'true') return true;
  if (value === false || value === 'false') return false;
  if (value === null || value === undefined) return '';
  return value;
}

/**
 * Evaluate conditional logic with multiple rules
 * @param conditionalLogic - The conditional logic configuration
 * @param fieldValues - Object containing all field values { fieldName: value }
 * @returns true if the field should be shown, false if hidden
 */
export function evaluateConditionalLogic(
  conditionalLogic: ConditionalLogic | undefined,
  fieldValues: Record<string, any>
): boolean {
  // If no conditional logic or disabled, always show
  if (!conditionalLogic || !conditionalLogic.enabled) {
    return true;
  }

  const { logic, rules } = conditionalLogic;

  // No rules means show
  if (!rules || rules.length === 0) {
    return true;
  }

  // Evaluate each rule
  const ruleResults = rules.map((rule) => {
    const fieldValue = fieldValues[rule.field];
    return evaluateRule(rule, fieldValue);
  });

  // Apply AND/OR logic
  if (logic === 'and') {
    // ALL rules must pass
    return ruleResults.every((result) => result === true);
  } else {
    // ANY rule must pass (OR)
    return ruleResults.some((result) => result === true);
  }
}

/**
 * Get all field dependencies from conditional logic
 * Returns array of field names that this field depends on
 */
export function getFieldDependencies(
  conditionalLogic: ConditionalLogic | undefined
): string[] {
  if (!conditionalLogic || !conditionalLogic.enabled) {
    return [];
  }

  return conditionalLogic.rules.map((rule) => rule.field).filter(Boolean);
}

/**
 * Detect circular dependencies in conditional logic
 * @param fieldName - Current field name
 * @param conditionalLogic - Conditional logic to check
 * @param allFieldsLogic - Map of all fields and their conditional logic
 * @param visited - Set of already visited fields (for recursion)
 * @returns true if circular dependency detected
 */
export function hasCircularDependency(
  fieldName: string,
  conditionalLogic: ConditionalLogic | undefined,
  allFieldsLogic: Map<string, ConditionalLogic | undefined>,
  visited: Set<string> = new Set()
): boolean {
  if (!conditionalLogic || !conditionalLogic.enabled) {
    return false;
  }

  // Mark current field as visited
  visited.add(fieldName);

  // Check each dependency
  const dependencies = getFieldDependencies(conditionalLogic);

  for (const depField of dependencies) {
    // If we've already visited this field, it's a circular dependency
    if (visited.has(depField)) {
      return true;
    }

    // Recursively check the dependency's dependencies
    const depLogic = allFieldsLogic.get(depField);
    if (depLogic && hasCircularDependency(depField, depLogic, allFieldsLogic, new Set(visited))) {
      return true;
    }
  }

  return false;
}

/**
 * Build dependency graph for field evaluation order
 * @param fieldsLogic - Map of field names to their conditional logic
 * @returns Array of field names in evaluation order (dependencies first)
 */
export function buildEvaluationOrder(
  fieldsLogic: Map<string, ConditionalLogic | undefined>
): string[] {
  const order: string[] = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  function visit(fieldName: string) {
    if (visited.has(fieldName)) return;
    if (visiting.has(fieldName)) {
      // Circular dependency - skip
      return;
    }

    visiting.add(fieldName);

    const logic = fieldsLogic.get(fieldName);
    if (logic && logic.enabled) {
      const deps = getFieldDependencies(logic);
      deps.forEach(visit);
    }

    visiting.delete(fieldName);
    visited.add(fieldName);
    order.push(fieldName);
  }

  // Visit all fields
  Array.from(fieldsLogic.keys()).forEach(visit);

  return order;
}

/**
 * Evaluate all fields and return visibility map
 * @param fieldsLogic - Map of field names to their conditional logic
 * @param fieldValues - Current values of all fields
 * @returns Map of field names to visibility (true = show, false = hide)
 */
export function evaluateAllFields(
  fieldsLogic: Map<string, ConditionalLogic | undefined>,
  fieldValues: Record<string, any>
): Map<string, boolean> {
  const visibility = new Map<string, boolean>();

  // Get evaluation order (respecting dependencies)
  const evaluationOrder = buildEvaluationOrder(fieldsLogic);

  // Evaluate each field in order
  for (const fieldName of evaluationOrder) {
    const logic = fieldsLogic.get(fieldName);
    const isVisible = evaluateConditionalLogic(logic, fieldValues);
    visibility.set(fieldName, isVisible);
  }

  return visibility;
}
