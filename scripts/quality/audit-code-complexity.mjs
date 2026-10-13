/** Read-only candidate census. Metrics are review hints, not correctness gates or a business-function inventory.
 * node scripts/quality/audit-code-complexity.mjs --ai
 * node scripts/quality/audit-code-complexity.mjs path/to/source.ts ...
 * Reports metadata/hashes only, never source literals. No installs or file writes.
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname, relative } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const tracked = execFileSync('git', ['ls-files', '-z'], {
  cwd: root,
  maxBuffer: 32 * 1024 * 1024,
})
  .toString()
  .split('\0')
  .filter(Boolean);
const eligible = (path) =>
  /^(apps|services|packages)\/[^/]+\/src\//.test(path) &&
  /\.(ts|tsx|mts|cts)$/.test(path) &&
  !/(\/(__tests__|fixtures|dist|node_modules|database\/migrations)\/|\.d\.ts$|\.(test|spec)\.)/.test(
    path,
  );
const seed = (path) =>
  /\/ai[-/]|\/ai-tools\/|AI|Ai|ai-core|content-editor/.test(path);
const aiImport =
  /@o4o\/(ai[^'"\s]*|content-editor)|[/](ai-tools|ai-policy|ai-query|ai-proxy)[/\.]/;
const args = process.argv.slice(2);
if (!args.length)
  throw new Error('Use --ai or explicit repository-relative source paths');
const paths =
  args[0] === '--ai'
    ? tracked.filter(
        (path) =>
          eligible(path) &&
          (seed(path) ||
            aiImport.test(readFileSync(resolve(root, path), 'utf8'))),
      )
    : args.map((path) =>
        relative(root, resolve(root, path)).replaceAll('\\', '/'),
      );
if (
  paths.some(
    (path) =>
      path.startsWith('../') ||
      !/\.(ts|tsx|mts|cts)$/.test(path) ||
      !existsSync(resolve(root, path)),
  )
)
  throw new Error(
    'Only existing source paths within the repository are allowed',
  );
const functions = [],
  fingerprints = new Map(),
  edges = new Map();
const isFunction = (node) =>
  ts.isFunctionDeclaration(node) ||
  ts.isFunctionExpression(node) ||
  ts.isArrowFunction(node) ||
  ts.isMethodDeclaration(node) ||
  ts.isGetAccessorDeclaration(node) ||
  ts.isSetAccessorDeclaration(node);
const branch = (node) =>
  ts.isIfStatement(node) ||
  ts.isConditionalExpression(node) ||
  ts.isForStatement(node) ||
  ts.isForOfStatement(node) ||
  ts.isForInStatement(node) ||
  ts.isWhileStatement(node) ||
  ts.isDoStatement(node) ||
  ts.isCaseClause(node) ||
  ts.isCatchClause(node) ||
  (ts.isBinaryExpression(node) &&
    [
      ts.SyntaxKind.AmpersandAmpersandToken,
      ts.SyntaxKind.BarBarToken,
      ts.SyntaxKind.QuestionQuestionToken,
    ].includes(node.operatorToken.kind));
const nestedControl = (node) =>
  ts.isIfStatement(node) ||
  ts.isConditionalExpression(node) ||
  ts.isIterationStatement(node, false) ||
  ts.isSwitchStatement(node) ||
  ts.isCatchClause(node);
function bodyHash(body, file) {
  const tokens = [];
  function collect(node) {
    // Use parsed leaves so regex/template/JSX literals retain their context and whitespace.
    if (
      node.kind >= ts.SyntaxKind.FirstJSDocNode &&
      node.kind <= ts.SyntaxKind.LastJSDocNode
    )
      return;
    const children = node.getChildren(file);
    if (children.length) children.forEach(collect);
    else if (node.getWidth(file)) tokens.push([node.kind, node.getText(file)]);
  }
  collect(body);
  return {
    hash: createHash('sha256').update(JSON.stringify(tokens)).digest('hex'),
    tokens: tokens.length,
  };
}
for (const path of [...new Set(paths)].sort()) {
  const source = readFileSync(resolve(root, path), 'utf8');
  const file = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  if (file.parseDiagnostics.length) throw new Error(`Cannot parse ${path}`);
  const line = (position) =>
    file.getLineAndCharacterOfPosition(position).line + 1;
  const runtimeImports = [];
  for (const stmt of file.statements) {
    if (
      !ts.isImportDeclaration(stmt) ||
      !ts.isStringLiteral(stmt.moduleSpecifier) ||
      stmt.importClause?.isTypeOnly
    )
      continue;
    const bindings = stmt.importClause?.namedBindings;
    if (
      !stmt.importClause?.name &&
      bindings &&
      ts.isNamedImports(bindings) &&
      bindings.elements.length &&
      bindings.elements.every((el) => el.isTypeOnly)
    )
      continue;
    const spec = stmt.moduleSpecifier.text;
    if (!spec.startsWith('.')) continue;
    const base = resolve(root, dirname(path), spec.replace(/\.js$/, ''));
    const target = [
      base + '.ts',
      base + '.tsx',
      resolve(base, 'index.ts'),
    ].find(existsSync);
    if (target)
      runtimeImports.push(relative(root, target).replaceAll('\\', '/'));
  }
  edges.set(path, runtimeImports);
  function walk(node) {
    if (isFunction(node) && node.body) {
      let name =
        node.name && ts.isIdentifier(node.name) ? node.name.text : undefined;
      if (
        !name &&
        ts.isVariableDeclaration(node.parent) &&
        ts.isIdentifier(node.parent.name)
      )
        name = node.parent.name.text;
      const row = {
        file: path,
        line: line(node.getStart(file)),
        name: name ?? `callback@${line(node.getStart(file))}`,
        lines: line(node.end) - line(node.getStart(file)) + 1,
        ownLines: 0,
        branches: 0,
        nesting: 0,
        params: node.parameters.length,
        awaits: 0,
        nestedFunctions: 0,
      };
      const nestedRanges = [];
      function inspect(child, depth) {
        if (child !== node && isFunction(child)) {
          row.nestedFunctions++;
          nestedRanges.push([line(child.getStart(file)), line(child.end)]);
          return;
        }
        if (branch(child)) row.branches++;
        if (ts.isAwaitExpression(child)) row.awaits++;
        const next = depth + (nestedControl(child) ? 1 : 0);
        row.nesting = Math.max(row.nesting, next);
        ts.forEachChild(child, (n) => inspect(n, next));
      }
      inspect(node.body, 0);
      const covered = new Set();
      for (const [start, end] of nestedRanges)
        for (let n = start + 1; n < end; n++) covered.add(n);
      row.ownLines = row.lines - covered.size;
      functions.push(row);
      const fingerprint = bodyHash(node.body, file);
      if (fingerprint.tokens >= 60) {
        const group = fingerprints.get(fingerprint.hash) ?? [];
        group.push({
          file: path,
          line: row.line,
          name: row.name,
          tokens: fingerprint.tokens,
        });
        fingerprints.set(fingerprint.hash, group);
      }
    }
    ts.forEachChild(node, walk);
  }
  walk(file);
}
const cycles = [],
  visiting = new Set(),
  done = new Set(),
  chain = [];
function visit(file) {
  if (visiting.has(file)) {
    const cycle = chain.slice(chain.indexOf(file)).concat(file);
    if (
      !cycles.some(
        (c) =>
          c.slice(0, -1).sort().join('|') ===
          cycle.slice(0, -1).sort().join('|'),
      )
    )
      cycles.push(cycle);
    return;
  }
  if (done.has(file)) return;
  visiting.add(file);
  chain.push(file);
  for (const dep of edges.get(file) ?? []) if (edges.has(dep)) visit(dep);
  chain.pop();
  visiting.delete(file);
  done.add(file);
}
for (const file of edges.keys()) visit(file);
const duplicates = [...fingerprints]
  .filter(([, members]) => members.length > 1)
  .map(([hash, members]) => ({ hash, members }));
const ranked = [...functions].sort(
  (a, b) =>
    b.branches * 3 +
    b.nesting * 5 +
    b.ownLines / 10 -
    (a.branches * 3 + a.nesting * 5 + a.ownLines / 10),
);
process.stdout.write(
  JSON.stringify(
    {
      scope:
        args[0] === '--ai'
          ? 'AI path/import candidate census'
          : 'explicit sources',
      limitations:
        'Branch count is an AST heuristic, not ESLint cyclomatic or Sonar cognitive complexity. Duplicate hashes preserve names/literals, ignore comments/whitespace and require semantic review. Runtime cycles cover included relative import declarations resolved as .ts/.tsx/index.ts only (not reexports/aliases/dynamic imports); type-only imports are excluded. No runtime registration/dead-code conclusion.',
      files: [...edges.keys()],
      functions: ranked,
      duplicates,
      runtimeCycles: cycles,
    },
    null,
    2,
  ) + '\n',
);
