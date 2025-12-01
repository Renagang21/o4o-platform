/**
 * JSX Parser
 * Parses JSX code using Babel and converts to ReactElement structure
 */

import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import type { ReactElement } from './types';

/**
 * Parse JSX code and extract React elements
 * Uses Babel parser to convert JSX to AST, then traverses to build ReactElement tree
 */
export function parseJSXCode(jsxCode: string): ReactElement[] {
  try {
    // Parse JSX code to AST
    const ast = parser.parse(jsxCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });

    const elements: ReactElement[] = [];

    // Traverse AST and extract JSX elements
    traverse(ast, {
      // Find function component return statements
      ReturnStatement(path) {
        if (t.isJSXElement(path.node.argument) || t.isJSXFragment(path.node.argument)) {
          const element = convertJSXToReactElement(path.node.argument);
          if (element) {
            elements.push(element);
          }
        }
      },

      // Find direct JSX expressions (for simple cases)
      ExpressionStatement(path) {
        if (t.isJSXElement(path.node.expression)) {
          const element = convertJSXToReactElement(path.node.expression);
          if (element) {
            elements.push(element);
          }
        }
      },
    });

    return elements;
  } catch (error) {
    console.error('Failed to parse JSX:', error);
    throw new Error(`JSX parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Convert Babel JSX AST node to ReactElement
 */
function convertJSXToReactElement(node: any): ReactElement | null {
  if (t.isJSXElement(node)) {
    return convertJSXElement(node);
  }

  if (t.isJSXFragment(node)) {
    return convertJSXFragment(node);
  }

  if (t.isJSXText(node)) {
    const text = node.value.trim();
    return text ? ({ type: 'text', props: {}, children: [text] } as ReactElement) : null;
  }

  return null;
}

/**
 * Convert JSXElement to ReactElement
 */
function convertJSXElement(element: t.JSXElement): ReactElement {
  const openingElement = element.openingElement;
  const elementName = getElementName(openingElement.name);
  const props = extractProps(openingElement.attributes);
  const children = extractChildren(element.children);

  return {
    type: elementName,
    props,
    children,
  };
}

/**
 * Convert JSXFragment to ReactElement (treat as div)
 */
function convertJSXFragment(fragment: t.JSXFragment): ReactElement {
  const children = extractChildren(fragment.children);

  return {
    type: 'div',
    props: {},
    children,
  };
}

/**
 * Get element name from JSX name node
 */
function getElementName(name: t.JSXElement['openingElement']['name']): string {
  if (t.isJSXIdentifier(name)) {
    return name.name;
  }

  if (t.isJSXMemberExpression(name)) {
    // Handle cases like <Motion.div>
    return getJSXMemberName(name);
  }

  if (t.isJSXNamespacedName(name)) {
    // Handle cases like <svg:path>
    return `${name.namespace.name}:${name.name.name}`;
  }

  return 'div';
}

/**
 * Get member expression name recursively
 */
function getJSXMemberName(member: t.JSXMemberExpression): string {
  const object = t.isJSXIdentifier(member.object)
    ? member.object.name
    : getJSXMemberName(member.object as t.JSXMemberExpression);

  return `${object}.${member.property.name}`;
}

/**
 * Extract props from JSX attributes
 */
function extractProps(attributes: Array<t.JSXAttribute | t.JSXSpreadAttribute>): Record<string, any> {
  const props: Record<string, any> = {};

  for (const attr of attributes) {
    if (t.isJSXAttribute(attr)) {
      const name = t.isJSXIdentifier(attr.name) ? attr.name.name : attr.name.name.name;
      const value = extractPropValue(attr.value);
      props[name] = value;
    } else if (t.isJSXSpreadAttribute(attr)) {
      // Spread attributes - mark as expression
      props['...spread'] = '[expression]';
    }
  }

  return props;
}

/**
 * Extract prop value from JSX attribute value
 */
function extractPropValue(value: t.JSXAttribute['value']): any {
  if (!value) {
    // Boolean prop without value (e.g., <button disabled />)
    return true;
  }

  if (t.isStringLiteral(value)) {
    return value.value;
  }

  if (t.isJSXExpressionContainer(value)) {
    const expression = value.expression;

    if (t.isStringLiteral(expression)) {
      return expression.value;
    }

    if (t.isNumericLiteral(expression)) {
      return expression.value;
    }

    if (t.isBooleanLiteral(expression)) {
      return expression.value;
    }

    if (t.isNullLiteral(expression)) {
      return null;
    }

    if (t.isObjectExpression(expression)) {
      try {
        return extractObjectExpression(expression);
      } catch (e) {
        return '[object]';
      }
    }

    if (t.isArrayExpression(expression)) {
      try {
        return extractArrayExpression(expression);
      } catch (e) {
        return '[array]';
      }
    }

    // Other expressions (functions, identifiers, etc.)
    return '[expression]';
  }

  return null;
}

/**
 * Extract object expression to plain object (best effort)
 */
function extractObjectExpression(obj: t.ObjectExpression): Record<string, any> {
  const result: Record<string, any> = {};

  for (const prop of obj.properties) {
    if (t.isObjectProperty(prop)) {
      const key = t.isIdentifier(prop.key) ? prop.key.name : String(prop.key);

      if (t.isStringLiteral(prop.value)) {
        result[key] = prop.value.value;
      } else if (t.isNumericLiteral(prop.value)) {
        result[key] = prop.value.value;
      } else if (t.isBooleanLiteral(prop.value)) {
        result[key] = prop.value.value;
      } else {
        result[key] = '[expression]';
      }
    }
  }

  return result;
}

/**
 * Extract array expression to plain array (best effort)
 */
function extractArrayExpression(arr: t.ArrayExpression): any[] {
  return arr.elements.map((element) => {
    if (!element) return null;

    if (t.isStringLiteral(element)) return element.value;
    if (t.isNumericLiteral(element)) return element.value;
    if (t.isBooleanLiteral(element)) return element.value;

    return '[expression]';
  });
}

/**
 * Extract children from JSX children nodes
 */
function extractChildren(
  children: Array<t.JSXElement['children'][number]>
): (string | ReactElement)[] {
  const result: (string | ReactElement)[] = [];

  for (const child of children) {
    if (t.isJSXText(child)) {
      const text = child.value.trim();
      if (text) {
        result.push(text);
      }
    } else if (t.isJSXElement(child)) {
      const element = convertJSXElement(child);
      result.push(element);
    } else if (t.isJSXFragment(child)) {
      const fragment = convertJSXFragment(child);
      result.push(fragment);
    } else if (t.isJSXExpressionContainer(child)) {
      // Handle expressions in children
      if (t.isStringLiteral(child.expression)) {
        result.push(child.expression.value);
      } else if (t.isNumericLiteral(child.expression)) {
        result.push(String(child.expression.value));
      } else {
        // Other expressions (variables, function calls, etc.)
        result.push('[expression]');
      }
    }
  }

  return result;
}

/**
 * Extract text content recursively from ReactElement
 */
export function extractTextContent(children: (string | ReactElement)[]): string {
  return children
    .map((child) =>
      typeof child === 'string' ? child : extractTextContent(child.children || [])
    )
    .join('');
}
