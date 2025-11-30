import { parse } from '@babel/parser';
import traverse from '@babel/traverse';
import * as t from '@babel/types';
import { ReactElement } from './blockMapper';

/**
 * Parse JSX code string to AST
 */
function parseJSXToAST(jsxCode: string) {
  try {
    return parse(jsxCode, {
      sourceType: 'module',
      plugins: ['jsx', 'typescript'],
    });
  } catch (error) {
    throw new Error(`Failed to parse JSX: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract JSX attribute value
 */
function getAttributeValue(attr: t.JSXAttribute): any {
  if (!attr.value) return true; // Boolean attribute

  if (t.isStringLiteral(attr.value)) {
    return attr.value.value;
  }

  if (t.isJSXExpressionContainer(attr.value)) {
    const expression = attr.value.expression;

    if (t.isNumericLiteral(expression)) {
      return expression.value;
    }

    if (t.isStringLiteral(expression)) {
      return expression.value;
    }

    if (t.isBooleanLiteral(expression)) {
      return expression.value;
    }

    // For complex expressions, return string representation
    return '[expression]';
  }

  return null;
}

/**
 * Convert Babel JSXElement to ReactElement
 */
function convertJSXElement(node: t.JSXElement | t.JSXFragment): ReactElement | null {
  if (t.isJSXFragment(node)) {
    // Handle fragment by processing children
    const children = node.children
      .map((child) => {
        if (t.isJSXElement(child)) {
          return convertJSXElement(child);
        }
        if (t.isJSXText(child)) {
          const text = child.value.trim();
          return text ? text : null;
        }
        return null;
      })
      .filter((child): child is ReactElement | string => child !== null);

    // Wrap fragment children in a div
    return {
      type: 'div',
      props: {},
      children,
    };
  }

  const opening = node.openingElement;
  const tagName = t.isJSXIdentifier(opening.name)
    ? opening.name.name
    : 'div';

  // Extract props
  const props: Record<string, any> = {};
  opening.attributes.forEach((attr) => {
    if (t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name)) {
      props[attr.name.name] = getAttributeValue(attr);
    }
  });

  // Extract children
  const children: (string | ReactElement)[] = [];
  node.children.forEach((child) => {
    if (t.isJSXElement(child)) {
      const converted = convertJSXElement(child);
      if (converted) {
        children.push(converted);
      }
    } else if (t.isJSXText(child)) {
      const text = child.value.trim();
      if (text) {
        children.push(text);
      }
    } else if (t.isJSXExpressionContainer(child)) {
      if (t.isStringLiteral(child.expression)) {
        children.push(child.expression.value);
      }
    }
  });

  return {
    type: tagName,
    props,
    children,
  };
}

/**
 * Parse React JSX code and extract React elements
 * @param jsxCode JSX code as string
 * @returns Array of ReactElement objects
 */
export function parseReactCode(jsxCode: string): ReactElement[] {
  const ast = parseJSXToAST(jsxCode);
  const elements: ReactElement[] = [];

  traverse(ast, {
    // Find JSX elements at the top level
    ExportDefaultDeclaration(path) {
      const declaration = path.node.declaration;

      // Handle: export default () => <div>...</div>
      if (t.isArrowFunctionExpression(declaration) && t.isJSXElement(declaration.body)) {
        const element = convertJSXElement(declaration.body);
        if (element) {
          elements.push(element);
        }
      }

      // Handle: export default function Component() { return <div>...</div> }
      if (t.isFunctionDeclaration(declaration)) {
        traverse(
          t.file(t.program([declaration])),
          {
            ReturnStatement(returnPath) {
              if (t.isJSXElement(returnPath.node.argument)) {
                const element = convertJSXElement(returnPath.node.argument);
                if (element) {
                  elements.push(element);
                }
              }
            },
          },
          path.scope
        );
      }
    },

    // Handle standalone JSX (no export)
    Program(path) {
      path.node.body.forEach((statement) => {
        if (t.isExpressionStatement(statement) && t.isJSXElement(statement.expression)) {
          const element = convertJSXElement(statement.expression);
          if (element) {
            elements.push(element);
          }
        }
      });
    },
  });

  // If no elements found, try to find any JSX element in the code
  if (elements.length === 0) {
    traverse(ast, {
      JSXElement(path) {
        // Only get root-level JSX elements (not nested)
        if (!path.findParent((p) => p.isJSXElement())) {
          const element = convertJSXElement(path.node);
          if (element) {
            elements.push(element);
          }
        }
      },
    });
  }

  return elements;
}
