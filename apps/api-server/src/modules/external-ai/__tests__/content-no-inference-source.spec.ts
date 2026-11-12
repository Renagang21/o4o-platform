import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import ts from "typescript";

// A source guard complements dispatcher mocks: inspect the actual adapters and
// direct persistence services, including aliased/dynamic provider imports.
// This is not a transitive call-graph proof or a production billing assertion.
const files = [
  "modules/external-ai/tools/tool.service.ts",
  "modules/external-ai/adapters/registry.ts",
  "modules/external-ai/adapters/adapter.ts",
  "modules/external-ai/adapters/store.adapter.ts",
  "modules/external-ai/adapters/store-product-content.adapter.ts",
  "modules/external-ai/adapters/supplier.adapter.ts",
  "modules/external-ai/adapters/organization.adapter.ts",
  "modules/external-ai/adapters/community.adapter.ts",
  "services/store/store-library.service.ts",
  "services/store/store-product-content.service.ts",
  "modules/neture/services/neture-library.service.ts",
  "modules/neture/services/shared-product-description.service.ts",
  "modules/neture/services/supplier-store-description-authoring.service.ts",
  "modules/neture-pharmacy/services/semi-franchise-content.service.ts",
];
const providerModule =
  /(?:^|\/)(?:ai-core|ai-policy|ai-management|store-ai|ai-proxy|ai-extension|ai-runner|ai-execution)(?:\/|$)|(?:^|\/)(?:openai|anthropic|generative-ai|genai|vision|speech|text-to-speech|translate)(?:\/|$)|ai-accounted-execution|consultation-(?:support|translator|google)|content-ai-translation/;
const generationCall =
  /^(?:executeAccountedAi|executeAccountedNativeAi|executeManagedAccountedAi|runAiExtension|generateContent|generateAllContents|generateTags|generateText|executeMultimodalChat|fetch)$/;

function violations(source: string): string[] {
  const tree = ts.createSourceFile(
    "boundary.ts",
    source,
    ts.ScriptTarget.Latest,
    true,
  );
  const found: string[] = [];
  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      if (
        !(ts.isImportDeclaration(node) && node.importClause?.isTypeOnly) &&
        providerModule.test(node.moduleSpecifier.text)
      )
        found.push(node.moduleSpecifier.text);
    }
    if (ts.isCallExpression(node)) {
      const expr = node.expression;
      const name = ts.isIdentifier(expr)
        ? expr.text
        : ts.isPropertyAccessExpression(expr)
          ? expr.name.text
          : "";
      if (generationCall.test(name)) found.push(name);
      if (
        (expr.kind === ts.SyntaxKind.ImportKeyword || name === "require") &&
        node.arguments[0] &&
        ts.isStringLiteral(node.arguments[0]) &&
        providerModule.test(node.arguments[0].text)
      )
        found.push(node.arguments[0].text);
    }
    ts.forEachChild(node, visit);
  };
  visit(tree);
  return found;
}

describe("external content read/save source boundary", () => {
  it.each(files)(
    "%s does not introduce direct inference dependencies",
    (file) => {
      expect(
        violations(readFileSync(resolve(__dirname, "../../..", file), "utf8")),
      ).toEqual([]);
    },
  );
  it.each([
    'import { executeAccountedAi as hidden } from "../../ai-policy/ai-accounted-execution.js"; hidden();',
    'await import("@google-cloud/vision");',
    'const provider = require("openai");',
    'await globalThis.fetch("https://example.invalid/model");',
    "await generator.generateContent(input);",
  ])("detects injected generation: %s", (source) => {
    expect(violations(source).length).toBeGreaterThan(0);
  });
  it("does not mistake documentation or supplied content for a call", () => {
    expect(violations('// fetch()\nconst text = "generateContent()";')).toEqual(
      [],
    );
  });
});
