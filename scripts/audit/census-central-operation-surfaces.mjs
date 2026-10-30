#!/usr/bin/env node
// Discovery is evidence to review, never authority to activate a retired/private feature.
import ts from 'typescript';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../../',import.meta.url));
if (process.argv.length !== 2) throw new Error('Usage: node scripts/audit/census-central-operation-surfaces.mjs (no path arguments)');
const output = path.join(root,'.tmp','central-operation-census','surfaces.json');
const files = [];
const excluded = new Set(['node_modules','dist','build','coverage','tmp','__tests__','test-results','playwright-report']);
function collect(directory) {
  for (const entry of fs.readdirSync(directory,{withFileTypes:true})) {
    if (entry.isSymbolicLink() || entry.name.startsWith('.') || excluded.has(entry.name)) continue;
    const absolute=path.join(directory,entry.name);
    if(entry.isDirectory()) collect(absolute);
    else if(entry.isFile() && /[.]tsx?$/.test(entry.name) && !/[.](test|spec)[.]/.test(entry.name)) files.push(path.relative(root,absolute));
  }
}
for(const directory of ['services','packages/operator-core-ui/src']) collect(path.join(root,directory));
files.sort((left,right)=>left.localeCompare(right));
const routes = [], controls = [];
const compact = node => node?.getText().replace(/\s+/g, ' ') ?? '';
const opening = node => ts.isJsxElement(node) ? node.openingElement : ts.isJsxSelfClosingElement(node) ? node : null;
const attr = (node, key) => node.attributes.properties.find(item => ts.isJsxAttribute(item) && item.name.getText() === key)?.initializer;
const literal = node => node && ts.isStringLiteral(node) ? node.text : node && ts.isJsxExpression(node) && node.expression && ts.isStringLiteral(node.expression) ? node.expression.text : null;
function resolveSource(base, target) {
  if (!target.startsWith('.')) return target;
  const stem = path.resolve(root,path.dirname(base), target);
  for (const suffix of ['', '.tsx', '.ts', '/index.tsx', '/index.ts']) {
    const candidate = stem + suffix;
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return path.relative(root, candidate);
  }
  return null;
}
for (const file of files) {
  const source = fs.readFileSync(path.join(root,file), 'utf8');
  if (!/<Route\b|\b(?:tabs|TABS|SCOPED_MENU|UNIFIED_MENU|pages|menuItems|tabItems)\b/.test(source)) continue;
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const imports = new Map();
  for (const node of ast.statements) {
    if (ts.isImportDeclaration(node) && node.importClause && ts.isStringLiteral(node.moduleSpecifier)) {
      const resolved = resolveSource(file, node.moduleSpecifier.text);
      if (node.importClause.name) imports.set(node.importClause.name.text, resolved);
      for (const item of node.importClause.namedBindings?.elements ?? []) imports.set(item.name.text, resolved);
    }
  }
  function walk(node) {
    const element = opening(node);
    // Only inspect each route once: an opening element is visited below its JSX element.
    if (element?.tagName.getText() === 'Route') {
      const declaredPath = literal(attr(element, 'path'));
      const parts = [declaredPath ?? ''];
      const gates = [], conditions = [];
      let parent = node.parent;
      while (parent) {
        const route = opening(parent);
        if (route?.tagName.getText() === 'Route') {
          const segment = literal(attr(route, 'path'));
          if (segment) parts.unshift(segment);
          const gate = attr(route, 'element');
          if (gate) gates.unshift(compact(gate));
        }
        if (ts.isConditionalExpression(parent)) conditions.unshift(compact(parent.condition));
        if (ts.isBinaryExpression(parent) && parent.operatorToken.kind === ts.SyntaxKind.AmpersandAmpersandToken) conditions.unshift(compact(parent.left));
        parent = parent.parent;
      }
      const fullPath = parts.filter(Boolean).join('/').replace(/\/+/g, '/');
      if (/(?:^|\/)(?:operator|admin)(?:\/|$)/.test(fullPath)) {
        const rendered = compact(attr(element, 'element'));
        const components = [...new Set([...rendered.matchAll(/<([A-Z]\w*)\b/g)].map(match => match[1]))];
        routes.push({ file, line: ast.getLineAndCharacterOfPosition(element.getStart()).line + 1, declaredPath, fullPath, rendered, gates, conditions, components: components.map(name => ({ name, source: imports.get(name) ?? null })), alias: components.includes('Navigate') });
      }
    }
    if (ts.isVariableDeclaration(node) && /^(?:tabs|TABS|SCOPED_MENU|UNIFIED_MENU|pages|menuItems|tabItems)$/.test(node.name.getText()) && /operator|Operator|Admin|admin|PartnerSite/.test(file)) {
      controls.push({ file, line: ast.getLineAndCharacterOfPosition(node.getStart()).line + 1, name: node.name.getText(), declaration: compact(node) });
    }
    ts.forEachChild(node, walk);
  }
  walk(ast);
}
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, JSON.stringify({ schemaVersion: 1, sourceFilesScanned: files.length, routes, controls, limitations: ['Static JSX routes and known menu/tab declarations; computed navigation requires manual verification.', 'Presence does not prove current policy, API operation, or completed central integration.'] }, null, 2) + '\n');
console.log(JSON.stringify({ sourceFilesScanned: files.length, routes: routes.length, aliases: routes.filter(route => route.alias).length, controlSources: controls.length, output }));
