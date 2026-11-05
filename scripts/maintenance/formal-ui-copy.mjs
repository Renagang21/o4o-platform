/** Reviewable, source-only copy migration. Never changes runtime/user content. */
import fs from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";
const files = execFileSync(
  "git",
  [
    "ls-files",
    "services",
    "packages",
    "apps/admin-dashboard/src",
    "apps/api-server/src",
  ],
  { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 },
)
  .trim()
  .split("\n")
  .filter(
    (f) =>
      (/\/src\/.*\.(tsx?|jsx?)$/.test(f) ||
        /\/tests\/.*\.(test|spec)\.tsx?$/.test(f)) &&
      !/(fixture|mock|seed|prompt|knowledge|example|context-builder|editing-preset|content-authoring-guide|localIntent|nl\.ts|forum-cosmetics|\/data\/)/i.test(
        f,
      ),
  );
const rules = [
  ["도와드릴까요", "도와드리겠습니까"],
  ["만들까요", "만드시겠습니까"],
  ["되돌릴까요", "되돌리시겠습니까"],
  ["불러올까요", "불러오시겠습니까"],
  ["지울까요", "지우시겠습니까"],
  ["들려줄까요", "들려드리겠습니까"],
  ["주시겠어요", "주시겠습니까"],
  ["하나요", "합니까"],
  ["다루나요", "다룹니까"],
  ["쓰나요", "씁니까"],
  ["받나요", "받습니까"],
  ["정하나요", "정합니까"],
  ["사용하나요", "사용합니까"],
  ["소개하나요", "소개합니까"],
  ["옮기나요", "옮깁니까"],
  ["받았나요", "받았습니까"],
  ["적용했나요", "적용했습니까"],
  ["확인했나요", "확인했습니까"],
  ["바꿨나요", "바꿨습니까"],
  ["옮겼어요", "옮겼습니다"],
  ["되돌렸어요", "되돌렸습니다"],
  ["담아요", "담습니다"],

  ["안녕하시기 바랍니다", "안녕하십니까"],
  ["안녕하세요", "안녕하십니까"],
  ["해주세요", "해 주시기 바랍니다"],
  ["주세요", "주시기 바랍니다"],
  ["하세요", "하시기 바랍니다"],
  ["으세요", "으시기 바랍니다"],
  ["세요", "시기 바랍니다"],
  ["할까요", "하시겠습니까"],
  ["볼까요", "보시겠습니까"],
  ["될까요", "됩니까"],
  ["있나요", "있습니까"],
  ["없나요", "없습니까"],
  ["되나요", "됩니까"],
  ["인가요", "입니까"],
  ["못했어요", "못했습니다"],
  ["않았어요", "않았습니다"],
  ["했어요", "했습니다"],
  ["됐어요", "됐습니다"],
  ["바뀌었어요", "바뀌었습니다"],
  ["멈췄어요", "멈췄습니다"],
  ["불러왔어요", "불러왔습니다"],
  ["받았어요", "받았습니다"],
  ["끝났어요", "끝났습니다"],
  ["지났어요", "지났습니다"],
  ["있어요", "있습니다"],
  ["없어요", "없습니다"],
  ["않아요", "않습니다"],
  ["몰라요", "모릅니다"],
  ["수 없어요", "수 없습니다"],
  ["거예요", "것입니다"],
  ["이에요", "입니다"],
  ["예요", "입니다"],
  ["돼요", "됩니다"],
  ["해요", "합니다"],
];
let changed = 0,
  fragments = 0;
for (const file of files) {
  const source = fs.readFileSync(file, "utf8");
  const ast = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const edits = [];
  function visit(node) {
    if (
      (/\.(test|spec)\./.test(file) && ts.isRegularExpressionLiteral(node)) ||
      ts.isStringLiteral(node) ||
      ts.isNoSubstitutionTemplateLiteral(node) ||
      ts.isJsxText(node) ||
      [
        ts.SyntaxKind.TemplateHead,
        ts.SyntaxKind.TemplateMiddle,
        ts.SyntaxKind.TemplateTail,
      ].includes(node.kind)
    ) {
      for (let owner = node.parent; owner; owner = owner.parent) {
        if (
          ts.isNewExpression(owner) &&
          owner.expression.getText(ast) === "Set"
        )
          return;
        if (
          ts.isPropertyAssignment(owner) &&
          /^(systemPrompt|systemPromptOverride|guideText|instructions?|prompt|examples?|samples?)$/.test(
            owner.name.getText(ast).replaceAll(/['"]/g, ""),
          )
        )
          return;
      }
      if (
        node.parent &&
        ts.isCallExpression(node.parent) &&
        /^expect\(.*(prompt|guide|instruction)/i.test(
          node.parent.expression.getText(ast),
        )
      )
        return;
      if (file.startsWith("apps/api-server/")) {
        const parent = node.parent;
        const publicMessage =
          parent &&
          ((ts.isPropertyAssignment(parent) &&
            /^(error|message)$/.test(
              parent.name.getText(ast).replaceAll(/['"]/g, ""),
            )) ||
            (ts.isNewExpression(parent) &&
              /Error$/.test(parent.expression.getText(ast))));
        if (!publicMessage) return;
      }
      const start = node.getStart(ast),
        end = node.end;
      let text = source.slice(start, end);
      for (const [from, to] of rules) text = text.replaceAll(from, to);
      if (text !== source.slice(start, end)) edits.push({ start, end, text });
    }
    ts.forEachChild(node, visit);
  }
  visit(ast);
  let output = source;
  for (const e of edits.sort((a, b) => b.start - a.start))
    output = output.slice(0, e.start) + e.text + output.slice(e.end);
  if (edits.length) {
    changed++;
    fragments += edits.length;
    if (process.argv.includes("--write")) fs.writeFileSync(file, output);
  }
}
process.stdout.write(
  JSON.stringify({
    mode: process.argv.includes("--write") ? "write" : "check",
    files: changed,
    fragments,
  }) + "\n",
);
if (!process.argv.includes("--write") && changed) process.exitCode = 1;
