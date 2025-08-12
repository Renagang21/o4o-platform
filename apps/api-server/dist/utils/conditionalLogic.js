"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.evaluateConditionalLogic = evaluateConditionalLogic;
function evaluateConditionalLogic(logic, data) {
    const results = logic.rules.map((rule) => evaluateRule(rule, data));
    if (logic.logicType === 'all') {
        return results.every((result) => result);
    }
    else {
        return results.some((result) => result);
    }
}
function evaluateRule(rule, data) {
    const fieldValue = data[rule.field];
    const compareValue = rule.value;
    switch (rule.operator) {
        case 'equals':
            return fieldValue == compareValue;
        case 'not_equals':
            return fieldValue != compareValue;
        case 'contains':
            return String(fieldValue).includes(String(compareValue));
        case 'not_contains':
            return !String(fieldValue).includes(String(compareValue));
        case 'starts_with':
            return String(fieldValue).startsWith(String(compareValue));
        case 'ends_with':
            return String(fieldValue).endsWith(String(compareValue));
        case 'greater_than':
            return Number(fieldValue) > Number(compareValue);
        case 'less_than':
            return Number(fieldValue) < Number(compareValue);
        case 'greater_than_or_equal':
            return Number(fieldValue) >= Number(compareValue);
        case 'less_than_or_equal':
            return Number(fieldValue) <= Number(compareValue);
        case 'is_empty':
            return !fieldValue || fieldValue === '' || (Array.isArray(fieldValue) && fieldValue.length === 0);
        case 'is_not_empty':
            return !!fieldValue && fieldValue !== '' && (!Array.isArray(fieldValue) || fieldValue.length > 0);
        default:
            return false;
    }
}
//# sourceMappingURL=conditionalLogic.js.map