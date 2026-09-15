/**
 * Migration identity parser — single source of truth for how a migration file maps to the name
 * TypeORM records in `typeorm_migrations`.
 * (WO-O4O-MIGRATION-HISTORICAL-MANIFEST-IDENTITY-AND-LOCAL-DB-CREDENTIAL-LOG-FINAL-CLOSURE-V1)
 *
 *   className    `export class X`
 *   declaredName the class's own `name` property when it is a static string literal
 *                (`name = 'X'` · `readonly name = 'X'` · `public name: string = 'X'` · `this.name = 'X'` in the constructor)
 *   runtimeName  what TypeORM uses: declaredName ?? className
 *
 * Uses the TypeScript AST, so `name` occurrences that are NOT a class property — SQL text
 * (`SET name = 'pharmacy'`), local variables, object literals, column options — never count.
 * A dynamic `name` (template with substitutions, call, identifier …) is a hard error: identity is
 * never guessed.
 *
 * Consumers: scripts/db/check-migration-contract.mjs (CI guard + manifest maintenance) and
 * scripts/db/__tests__/migration-identity.test.mjs. The runtime classifier never imports this
 * module — it reads the generated historical-migration-names.ts, which CI keeps in lockstep.
 */
import ts from 'typescript';

export class MigrationIdentityError extends Error {
  constructor(file, code, message) {
    super(`${file}: ${message}`);
    this.file = file;
    this.code = code;
  }
}

const isExported = (node) => (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Export) !== 0;
const isStatic = (node) => (ts.getCombinedModifierFlags(node) & ts.ModifierFlags.Static) !== 0;
const propName = (node) => (node.name && (ts.isIdentifier(node.name) || ts.isStringLiteral(node.name)) ? node.name.text : null);

function staticString(expr) {
  if (!expr) return undefined;
  if (ts.isStringLiteral(expr) || ts.isNoSubstitutionTemplateLiteral(expr)) return expr.text;
  if (ts.isParenthesizedExpression(expr)) return staticString(expr.expression);
  if (ts.isAsExpression(expr) || ts.isTypeAssertionExpression(expr) || ts.isSatisfiesExpression?.(expr)) return staticString(expr.expression);
  return undefined;
}

/** `this.name = <literal>` inside the constructor body. */
function constructorAssignedName(cls, file) {
  for (const m of cls.members) {
    if (!ts.isConstructorDeclaration(m) || !m.body) continue;
    for (const st of m.body.statements) {
      if (!ts.isExpressionStatement(st) || !ts.isBinaryExpression(st.expression)) continue;
      const { left, operatorToken, right } = st.expression;
      if (operatorToken.kind !== ts.SyntaxKind.EqualsToken) continue;
      if (!ts.isPropertyAccessExpression(left) || left.expression.kind !== ts.SyntaxKind.ThisKeyword || left.name.text !== 'name') continue;
      const v = staticString(right);
      if (v === undefined) throw new MigrationIdentityError(file, 'DYNAMIC_NAME', 'constructor assigns a non-literal `this.name`');
      return v;
    }
  }
  return undefined;
}

/**
 * @param {string} source migration file contents
 * @param {string} file   file name (for messages)
 * @returns {{ file: string, className: string, declaredName: string | null, runtimeName: string }}
 */
export function parseMigrationIdentity(source, file) {
  const sf = ts.createSourceFile(file, source.replace(/\r\n/g, '\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const exported = sf.statements.filter((s) => ts.isClassDeclaration(s) && isExported(s));
  let candidates = exported;
  if (candidates.length > 1) {
    candidates = exported.filter((c) => (c.heritageClauses ?? []).some((h) => h.token === ts.SyntaxKind.ImplementsKeyword && h.types.some((t) => t.expression.getText(sf) === 'MigrationInterface')));
  }
  if (candidates.length !== 1) {
    throw new MigrationIdentityError(file, candidates.length === 0 ? 'NO_MIGRATION_CLASS' : 'AMBIGUOUS_MIGRATION_CLASS', `expected exactly one exported migration class, found ${candidates.length}`);
  }
  const cls = candidates[0];
  if (!cls.name) throw new MigrationIdentityError(file, 'ANONYMOUS_CLASS', 'exported migration class has no name');
  const className = cls.name.text;

  const nameProps = cls.members.filter((m) => (ts.isPropertyDeclaration(m) || ts.isGetAccessorDeclaration(m)) && propName(m) === 'name' && !isStatic(m));
  if (nameProps.length > 1) throw new MigrationIdentityError(file, 'DUPLICATE_NAME_PROPERTY', 'more than one `name` member');
  let declaredName = null;
  if (nameProps.length === 1) {
    const m = nameProps[0];
    if (ts.isGetAccessorDeclaration(m)) throw new MigrationIdentityError(file, 'DYNAMIC_NAME', '`name` is a getter — identity cannot be determined statically');
    if (m.initializer) {
      const v = staticString(m.initializer);
      if (v === undefined) throw new MigrationIdentityError(file, 'DYNAMIC_NAME', '`name` initializer is not a string literal');
      declaredName = v;
    } else {
      const v = constructorAssignedName(cls, file);
      if (v === undefined) throw new MigrationIdentityError(file, 'DYNAMIC_NAME', '`name` is declared without a static value');
      declaredName = v;
    }
  } else {
    const v = constructorAssignedName(cls, file);
    if (v !== undefined) declaredName = v;
  }
  if (declaredName !== null && !/^[A-Za-z0-9_]+$/.test(declaredName)) throw new MigrationIdentityError(file, 'INVALID_NAME', `declared name '${declaredName}' is not a plain identifier`);
  return { file, className, declaredName, runtimeName: declaredName ?? className };
}
