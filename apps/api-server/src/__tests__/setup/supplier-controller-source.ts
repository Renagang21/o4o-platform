import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';

/** Follow the public route's actual handler reference, then include all extracted code in boundary checks. */
export function readSupplierControllerSource(root: string, relative: string): string {
  const filename = path.join(root, relative);
  const original = fs.readFileSync(filename, 'utf8');
  const directory = relative.endsWith('/supplier-management.controller.ts')
    ? 'supplier-management'
    : relative.endsWith('/supplier-product.controller.ts')
      ? 'supplier-products'
      : null;
  if (!directory) return original;
  const parse = (p: string) =>
    ts.createSourceFile(p, fs.readFileSync(p, 'utf8'), ts.ScriptTarget.Latest, true);
  const facade = parse(filename);
  const imports = new Map<string, string>();
  for (const statement of facade.statements) {
    if (!ts.isImportDeclaration(statement) || !ts.isStringLiteral(statement.moduleSpecifier))
      continue;
    const bindings = statement.importClause?.namedBindings;
    if (!bindings || !ts.isNamedImports(bindings)) continue;
    for (const binding of bindings.elements)
      imports.set(
        binding.name.text,
        path.resolve(
          path.dirname(filename),
          statement.moduleSpecifier.text.replace(/\.js$/, '.ts'),
        ),
      );
  }
  const factories = new Map<string, string>();
  function collect(node: ts.Node) {
    if (
      ts.isVariableDeclaration(node) &&
      ts.isIdentifier(node.name) &&
      node.initializer &&
      ts.isCallExpression(node.initializer) &&
      ts.isIdentifier(node.initializer.expression)
    ) {
      const module = imports.get(node.initializer.expression.text);
      if (module && path.dirname(module) === path.join(path.dirname(filename), directory)) {
        factories.set(node.name.text, module);
      }
    }
    ts.forEachChild(node, collect);
  }
  collect(facade);
  const replacements: Array<{ start: number; end: number; text: string }> = [];
  function visit(node: ts.Node) {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.expression.getText(facade) === 'router'
    ) {
      const args = [...node.arguments];
      const last = args.at(-1)!;
      let handler = last.getText(facade);
      if (ts.isPropertyAccessExpression(last) && ts.isIdentifier(last.expression)) {
        const module = factories.get(last.expression.text);
        if (module) {
          const source = parse(module);
          let matched: ts.PropertyAssignment | undefined;
          function find(n: ts.Node) {
            if (ts.isPropertyAssignment(n) && n.name.getText(source) === last.name.text)
              matched = n;
            ts.forEachChild(n, find);
          }
          find(source);
          if (!matched) throw new Error(`Missing route handler: ${last.getText(facade)}`);
          handler = matched.initializer.getText(source);
        }
      }
      replacements.push({
        start: node.getStart(facade),
        end: node.end,
        text: `${node.expression.getText(facade)}(${args
          .slice(0, -1)
          .map((a) => a.getText(facade).replace(/\s+/g, ' '))
          .join(', ')}, ${handler})`,
      });
    }
    ts.forEachChild(node, visit);
  }
  visit(facade);
  let view = original;
  for (const r of replacements.sort((a, b) => b.start - a.start))
    view = view.slice(0, r.start) + r.text + view.slice(r.end);
  const modules = fs
    .readdirSync(path.join(path.dirname(filename), directory))
    .filter((n) => n.endsWith('.ts'))
    .sort()
    .map((n) => fs.readFileSync(path.join(path.dirname(filename), directory, n), 'utf8'));
  if (directory === 'supplier-products')
    modules.push(
      fs.readFileSync(
        path.join(path.dirname(filename), '../services/supplier-bulk-candidate.service.ts'),
        'utf8',
      ),
    );
  // The existing assertions use the original single-line route/ternary formatting.
  // Normalize comments/formatting only; the expressions come from the actual wired code.
  return [view, ...modules]
    .join('\n')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/\s*\?\s*(\d+)/g, ' ? $1');
}
