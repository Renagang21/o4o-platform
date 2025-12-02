import { ViewContext } from '../types';

export function checkCondition(expr: string, context: ViewContext): boolean {
  try {
    // Create a new function with context as parameter
    // WARNING: This uses eval-like behavior, use with caution
    const func = new Function('context', `return ${expr}`);
    return func(context);
  } catch (error) {
    console.error('Condition evaluation error:', expr, error);
    return false;
  }
}
