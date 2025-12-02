export function executeLoop(loopExpr: string, data: any) {
  // Parse "item in data.items" format
  const parts = loopExpr.split(' in ');

  if (parts.length !== 2) {
    console.error('Invalid loop expression:', loopExpr);
    return [];
  }

  const [varName, listExpr] = parts.map(p => p.trim());

  try {
    // Evaluate the list expression
    const func = new Function('data', `return ${listExpr}`);
    const list = func(data);

    if (!Array.isArray(list)) {
      console.warn('Loop expression did not return an array:', loopExpr);
      return [];
    }

    return list.map(item => ({
      local: { [varName]: item },
    }));
  } catch (error) {
    console.error('Loop evaluation error:', loopExpr, error);
    return [];
  }
}

export function resolveProps(props: Record<string, any>, localContext: Record<string, any>): Record<string, any> {
  const resolved: Record<string, any> = {};

  for (const [key, value] of Object.entries(props)) {
    if (typeof value === 'string' && value.includes('{{')) {
      // Replace {{varName.field}} with actual values
      resolved[key] = value.replace(/\{\{(.+?)\}\}/g, (_, expr) => {
        try {
          const func = new Function(...Object.keys(localContext), `return ${expr}`);
          return func(...Object.values(localContext));
        } catch (error) {
          console.error('Template resolution error:', expr, error);
          return value;
        }
      });
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}
