// Test-only compilation of the same pure .mjs contract used by PC and Main.
const ts = require('typescript');
module.exports = {
  process(source, filename) {
    const result = ts.transpileModule(source, {
      fileName: filename.replace(/\.mjs$/, '.js'),
      compilerOptions: { allowJs: true, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    });
    return { code: result.outputText, map: result.sourceMapText ?? null };
  },
};
